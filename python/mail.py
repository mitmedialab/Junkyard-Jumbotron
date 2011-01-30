"""
Download email attachments
"""

import sys
import os
import pwd
import errno
import time
import signal
import threading
import tempfile
import json
import logging
from logging.handlers import TimedRotatingFileHandler
import smtplib
import mailbox
from email.mime.text import MIMEText

class Mail(object):
    """Mail checker"""


    # Methods

    def __init__(self, params):

        self.thread = threading.Thread(target=self._idle, name="Mail-Checker")
        self.thread.daemon = True
        self._need_stop = False

        self._email_path = params['mboxPath']
        self._email_smtp_server = params['smtpServer']
        self._email_user = params['smtpUser']
        self._email_pwd = params['smtpPwd']

        # Find uid of the mailbox owner
        uname = params['mboxUser']
        try:
            self._email_uid = pwd.getpwnam(uname).pw_uid
        except KeyError:
            logging.warning("Couldn't find user %s", uname)
            self._email_uid = None

    def __del__(self):
        if self.thread.is_alive():
            self.stop() 
 
    def start(self): 
        """Start the idler thread."""
        logging.info("Starting mail checker")
        self._need_stop = False
        self.thread.start()
 
    def stop(self):
        """Stop the idler thread."""
        logging.info("Stopping mail checker")
        self._need_stop = True
 
    def join(self, timeout=0):
        """Wait for thread to stop"""
        self.thread.join(timeout)

    def is_alive(self):
        return self.thread.is_alive()

    def _idle(self):
        """Loop until a stop request, waiting for mailbox changes and
        processing new messages. Polls or uses the 'idle' protocol."""

        # Loop until stop is called
        while not self._need_stop:
            try:
                line = sys.stdin.readline()
                if line:
                    self._handle_cmd(json.loads(line))
                else:
                    # Got EOF, stop everything
                    self._need_stop = True

            except KeyboardInterrupt:
                # User initiated break (ctrl-C at console)
                self._need_stop = true

            except ValueError as ve: 
                # Bad formatted JSON
                logging.error("%s: %s", str(ve), line)

            except AttributeError as ae: 
                # Unknown data or command
                logging.error("%s: %s", str(ae), line)

            except Exception as e:
                # IOError or other. Log and keep going.
                logging.error(str(e))

    def _handle_cmd(self, data):
        cmd = data['cmd']
        if cmd == "check":
            self._check_mail()
        elif cmd == "send":
            args = data['args']
            self._send_mail(args['receiver'], args['subject'], args['body'])
        else:
            raise AttributeError("Unknown command: " + cmd)

    def _open(self):
        path = self._email_path
        mbox = mailbox.mbox(path)
        for i in range(10):
            try:
                mbox.lock()
                return mbox
            except IOError as ioe:
                # mbox will open the mailbox read-only if we don't
                # have write access, but fcntl will then raise EBADF.
                if ioe.errno == errno.EBADF:
                    ioe = IOError(errno.EACCES,
                                  "Don't have permission to access " + path)
                raise ioe
            except mailbox.ExternalClashError:
                # Try again unless we need to stop
                if (self._need_stop):
                    mbox.close()
                    return None
                time.sleep(1)
        mbox.close()
        raise IOError("Can't lock mbox after 10 tries (check " + path + ".lock)")

    def _close(self, mbox):
        if mbox != None:
            # Retain mailbox owner
            os.chown(self._email_path, self._email_uid, -1)
            # Unlock mailbox
            mbox.unlock()

    def _check_mail(self):
        """Check mail"""
        #logging.debug('Checking mail')
        mbox = None

        try :
            # Open and lock
            mbox = self._open()
            if not mbox:
                return

            # Process each message in the mailbox
            for email_msg in mbox:
                self._handle_msg(email_msg)

            # Delete everything
            if len(mbox):
                mbox.clear()
                mbox.flush()

        finally:
            # Close and unlock
            self._close(mbox)

    def _handle_msg(self, msg):
        """Handle an individual mail message, look for an attachment
        and calibrate jumbotron if appropriate."""

        # Parse message details
        receiver = msg['To']
        sender = msg['Reply-To'] if 'Reply-To' in msg else msg["From"]
        jumbotron = receiver[:receiver.index('@')]
        synopsis = dict(error="no attachments",
                        sender=sender,
                        jumbotron=jumbotron)

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
        logging.debug(synopsis)
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
        logging.debug("> %s: %s", receiver, subject)
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

    # Get parameters from stdin. Don't pass as arguments otherwise
    # everyone can see the password in the process listing.
    params = json.loads(sys.stdin.readline())

    # Set up logging
    fmt = "%(asctime)s %(levelname)s: %(message)s"
    handler = TimedRotatingFileHandler(params['logFile'], when='midnight',
                                       interval=1, backupCount=7)
    handler.setFormatter(logging.Formatter(fmt))
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.DEBUG if params['debug'] else logging.INFO)
    logging.info("-------------------------------------------------------")

    # Start mail checker
    try :
        global mail
        mail = Mail(params)
        mail.start()
        while (mail.is_alive()) :
            time.sleep(60)
            # TODO: check to make sure the other side is still alive
            # TODO: wait on an event rather than sleep

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
