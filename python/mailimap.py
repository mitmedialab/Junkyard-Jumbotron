"""
Download email attachments
"""

import sys
import os
import signal
import tempfile
import json
import logging
import re
import threading
import time
import smtplib
import email
from email.mime.text import MIMEText

class _Imap4Debug(object):
    """Act as a file object that funnels imaplib2 messages to the
    logging module"""
    @staticmethod
    def write(str):
        """Log string"""
        logging.debug(str.strip())
    @staticmethod
    def flush():
        """Nothing to do"""
        pass

class Mail(object):
    """Mail checker"""

    # Constants

    RETRY_DELAY = 10 # Sleep this much between connection attempts (in seconds)
    SOCKET_TIMEOUT = 20 # Timeout after this many seconds

    # Methods

    def __init__(self, params):
        # This may only work with SSL_IMAP because plain IMAP wraps
        # the sockets in a file manager, which requires that the
        # socket be blocking.

        import socket
        if not socket.getdefaulttimeout():
            socket.setdefaulttimeout(self.SOCKET_TIMEOUT)

        self.thread = threading.Thread(target=self._idle, name="Mail-Checker")
        self.thread.daemon = True
        self.event = threading.Event()
        self._imap = None
        self._need_stop = False

        self._email_imap_server = params['imapServer']
        self._email_smtp_server = params['smtpServer']
        self._email_user = params['user']
        self._email_pwd = params['pwd']
        self._poll = params['poll']
        self._poll_interval = params['pollInterval']
        self._debug = params['debug']

    def __del__(self):
        if self.thread.is_alive():
            self.stop() 
        #self._close()
 
    def start(self): 
        """Start the idler thread."""
        logging.info("Starting mail checker")
        self._need_stop = False
        self.event.clear()
        self.thread.start()
 
    def stop(self):
        """Stop the idler thread."""
        logging.info("Stopping mail checker")
        self._need_stop = True
        self.event.set() # Wake the thread
 
    def join(self, timeout=0):
        """Wait for thread to stop"""
        self.thread.join(timeout)

    def is_alive(self):
        return self.thread.is_alive()

    def _callback(self, args):
        """Called in idle-mode when new email arrives or the idle timeout passes."""
        logging.debug("Mail checker callback %s", str(args))
        self.event.set()

    def _idle(self):
        """Loop until a stop request, waiting for mailbox changes and
        processing new messages. Polls or uses the 'idle' protocol."""

        # Loop until stop is called
        while not self._need_stop:
            need_restart = False
            try:
                # Open if not already open
                self._open()

                # Check mail
                if not self._need_stop and self._is_ok():
                    self._check_mail()

                if not self._poll:
                    # Put imap into idle mode. Asynchronous, so returns immediately.
                    logging.debug("Idling mail checker")
                    self._imap.idle(callback=self._callback)
            
                # If polling, wait an interval, otherwise wait for the
                # event to be set in the idle callback. In both cases,
                # stop() sets the event and stops the waiting.
                self.event.wait(timeout=self._poll_interval if self._poll else None)
                self.event.clear()

            except Exception as exc: 
                # Should probably look for specific events, but can't
                # risk the mail-checker stopping
                logging.error("%s", exc)
                need_restart = True

            if not self._need_stop and (need_restart or not self._is_ok()):
                # If something goes wrong, wait a bit and try again
                logging.error(
                    "Connection to mail server closed (retrying in %d secs)",
                    self.RETRY_DELAY)
                self._close()
                # User wait rather than time.sleep in case we are
                # asked to stop while waiting (see self.stop)
                self.event.wait(timeout=self.RETRY_DELAY)
                self.event.clear()

        self._close()
 
    def _is_ok(self):
        return self._imap and (self._poll or not self._imap.Terminate)

    def _handle_cmd(self, data):
        cmd = data['cmd']
        if cmd == "send":
            args = data['args']
            self._send_mail(args['receiver'], args['subject'], args['body'])
        else:
            raise AttributeError("Unknown command: " + cmd)

    def _open(self):
        """Connect to mail server"""
        if not self._imap:
            logging.info("Connecting to mail server %s as %s",
                         self._email_imap_server, self._email_user)
            # Exceptions will be caught in _idle
            if self._poll:
                import imaplib
                imaplib.Debug = self._debug
                self._imap = imaplib.IMAP4_SSL(self._email_imap_server)
            else:
                import imaplib2
                self._imap = imaplib2.IMAP4_SSL(self._email_imap_server,
                                                debug=self._debug,
                                                debug_file=_Imap4Debug)
            self._imap.login(self._email_user, self._email_pwd)
            self._imap.select()

    def _close(self):
        """Close mailbox and connection"""
        if self._imap:
            if logging: # Might be called from __del__
                logging.info("Closing connection to mail server")
            # Ignore exceptions
            try:
                self._imap.close()
            except Exception:
                pass
            try:
                self._imap.logout()
            except Exception:
                pass
            try:
                self._imap.shutdown()
            except Exception:
                pass
            self._imap = None

    def _check_mail(self):
        """Check mail"""
        #logging.debug('Checking mail (' + self._email_user + ')')

        # Get message ids from inbox
        self._imap.noop()
        resp, email_items = self._imap.search(None, "ALL")
        email_ids = email_items[0].split()
        email_cnt = len(email_ids)
        if not email_cnt:
            return
        logging.debug("Found %d message(s)", email_cnt)

        # Run through each message, saving attachments
        for email_id in email_ids:
            # Fetch message (RFC822 means 'get everything')
            resp, email_data = self._imap.fetch(email_id, "(RFC822)")
            # Convert to a mail object
            email_body = email_data[0][1]
            email_msg = email.message_from_string(email_body)
            self._handle_msg(email_msg)
            # Delete message
            self._imap.store(email_id, '+FLAGS', '\\Deleted')

        # Commit deletions
        self._imap.expunge()

    def _handle_msg(self, msg):
        """Handle an individual mail message, look for an attachment
        and calibrate jumbotron if appropriate."""

        # Parse message details
        receiver = msg['To']
        sender = msg['Reply-To'] if 'Reply-To' in msg else msg['From']
        synopsis = dict(error="no attachments",
                        sender=sender,
                        receiver=receiver)

        try:
            # Check for attachments
            if msg.get_content_maintype() == 'multipart':

                # Use walk so we can iterate on the parts
                for part in msg.walk():
                    # Skip multiparts, they are just containers
                    if part.get_content_maintype() == 'multipart':
                        continue

                    # Skip parts without attachments
                    if part.get('Content-Disposition') is None:
                        continue

                    # Write the file
                    file_name = part.get_filename()
                    file_base, file_ext = os.path.splitext(file_name)
                    tmp_fd, tmp_file_name = tempfile.mkstemp(suffix=file_ext,
                                                             prefix="jj")
                    with os.fdopen(tmp_fd, 'w') as fp:
                        data = part.get_payload(decode=True)
                        fp.write(data)

                    # Setup synopsis
                    del synopsis['error']
                    synopsis['filename'] = tmp_file_name

        except IOError as ioe:
            synopsis['error'] = str(ioe)

        print(json.dumps(synopsis))
        #logging.debug(synopsis)
        sys.stdout.flush()

    def _send_mail(self, receiver, subject, feedback):
        """Send feedback to the user"""

        # Stop if no reply is wanted. This is for users who want to
        # write automation scripts and don't want the feedback email.
        if not receiver or receiver.lower().startswith("noreply"):
            return

        # Build the MIME Object
        msg = MIMEText(feedback)
        msg['Subject'] = subject
        msg['From'] = "Junkyard Jumbotron"
        msg['Reply-to'] = self._email_user
        msg['To'] = receiver
        sender = "Junkyard Jumbotron <" + self._email_user + ">"

        # Establish an SMTP object, connect, login, and send mail
        logging.debug(">: %s: %s", receiver, subject)
        smtp = smtplib.SMTP_SSL()
        try :
            smtp.connect(self._email_smtp_server)
            smtp.login(self._email_user, self._email_pwd)
            smtp.sendmail(sender, receiver, msg.as_string())
        except Exception as exc:
            logging.error(str(exc))
        finally:
            try:
                smtp.close()
            except AttributeError:
                pass

# ----------------------------------------------------------------------

mail = None

def main():

    # Set up signal handler: 
    def signal_handler(signum, frame):
        global mail
        if mail:
            mail.stop()
            mail.join(2)
        exit(1)
    signal.signal(signal.SIGTERM, signal_handler)

    # Set up logging. Format messages with json and pump to stdout.
    # Node.js will interpret and log them.
    def fmt(record):
        return json.dumps(dict(level=record.levelname, log=record.getMessage()));
    formatter = logging.Formatter()
    formatter.format = fmt
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)
    logging.info("-------------------------------------------------------")

    # Get parameters from stdin. Don't pass as arguments otherwise
    # everyone can see the password in the process listing.
    params = json.loads(sys.stdin.readline())
    logging.getLogger().setLevel(logging.DEBUG if params['debug'] else logging.INFO)

    # Start mail checker
    try :
        global mail
        mail = Mail(params)
        mail.start()
        while (mail.is_alive()) :
            try:
                line = sys.stdin.readline()
                if line:
                    mail._handle_cmd(json.loads(line))
                else:
                    # Got EOF, stop everything
                    self._need_stop = True

            except KeyboardInterrupt:
                # User initiated break (ctrl-C at console)
                break;

            except ValueError as ve: 
                # Bad formatted JSON
                logging.error("%s: %s", str(ve), line)

            except AttributeError as ae: 
                # Unknown data or command
                logging.error("%s: %s", str(ae), line)

            except Exception as e:
                # IOError or other. Log and keep going.
                logging.error(str(e))

    except Exception as e:
        # Unknown exception
        logging.exception(str(e))
        raise
        
    finally:
        # Cleanup mail checker
        if mail:
            mail.stop()
            mail.join(2)

    return 0

if __name__ == "__main__":
    sys.exit(main())
