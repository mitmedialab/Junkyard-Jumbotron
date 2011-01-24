"""
Download email attachments
"""

import sys
import os
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

    # Constants

    RETRY_DELAY = 10 # Sleep this much between connection attempts (in seconds)

    # Feedback messages. First line is the subject line of the mail msg.

    _no_attachments_msg = """No attachments
Whoops, your message has no attachments."""
    _instructions_msg = """To upload an image, use the name of your \
Junkyard Jumbotron as the Subject of the email message, and add the \
image as an attachment.

To recalibrate, bring up the markers by clicking the 'Recalibrate' \
button on the control page, take another picture and reupload it."""

    # Methods

    def __init__(self, params):

        self.thread = threading.Thread(target=self._idle, name="Mail-Checker")
        self.thread.daemon = True
        self.event = threading.Event()
        self._need_stop = False

        self._mbox = None
        self._email_path = params['mboxPath']
        self._email_smtp_server = params['smtpServer']
        self._email_user = params['smtpUser']
        self._email_pwd = params['smtpPwd']
        self._poll_interval = params['pollInterval']

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
 
    def join(self):
        """Wait for thread to stop"""
        self.thread.join()

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
                if not self._need_stop:
                    self._check_mail()

                # Wait an interval and try again.
                self.event.wait(timeout=self._poll_interval)
                self.event.clear()

            except Exception as exc: 
                # Should probably look for specific events, but can't
                # risk the mail-checker stopping
                logging.exception("%s", str(exc))
                need_restart = True

            if not self._need_stop and need_restart:
                # If something goes wrong, wait a bit and try again
                logging.info("Retrying mail watcher in %d secs",
                    self.RETRY_DELAY)
                self._close()
                # Use wait rather than time.sleep in case we are
                # asked to stop while waiting (see self.stop)
                self.event.wait(timeout=self.RETRY_DELAY)
                self.event.clear()

        self._close()
 
    def _open(self):
        """Connect to mail server"""
        if self._mbox == None:
            logging.info("Watching mail file %s", self._email_path)
            self._mbox = mailbox.mbox(self._email_path)

    def _close(self):
        """Close mailbox and connection"""
        if self._mbox != None:
            if logging: # Might be called from __del__
                logging.info("Stopping to watch mail")
            self._mbox = None

    def _check_mail(self):
        """Check mail"""
        #logging.debug('Checking mail')

        try :
            # Lock
            self._mbox.lock()

            # Process each message in the mailbox
            for email_msg in self._mbox:
                try:
                    self._handle_msg(email_msg)
                except IOError as ioe:
                    feedback = str(ioe)
                    subject, feedback = feedback.split('\n')
                    logging.info("User error: %s: %s", subject, feedback)
                    receiver = email_msg['Reply-To'] or email_msg["From"]
                    self.send_feedback(receiver, subject, feedback)

                email_msg.set_flags('RD') # TODO/necessary?

            # Delete everything
            self._mbox.clear()
            self._mbox.flush()

        finally:
            # Unlock
            self._mbox.unlock()

    def _handle_msg(self, msg):
        """Handle an individual mail message, look for an attachment
        and calibrate jumbotron if appropriate."""

        # Find jumbotron name
        msg_to = msg["To"]
        jumbotron_name = msg_to[:msg_to.index('@')]

        # Check for attachments
        if msg.get_content_maintype() != 'multipart':
            raise IOError(self._no_attachments_msg)

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
            tmp_fd, tmp_file_name = tempfile.mkstemp(suffix=file_ext, prefix="jj")
            with os.fdopen(tmp_fd, 'w') as fp:
                data = part.get_payload(decode=True)
                fp.write(data)

            # Send to stdout
            sender=msg["From"]
            logging.debug("< %s: %s: %s", sender, jumbotron_name, tmp_file_name)
            packet = json.dumps(dict(jumbotron=jumbotron_name,
                                     filename=tmp_file_name,
                                     sender=sender))
            print(packet)
            sys.stdout.flush()
            return

        raise IOError(self._no_attachments_msg)

    def send_feedback(self, receiver, subject, feedback):
        """Send feedback to the user"""

        # Stop if no reply is wanted. This is for users who want to
        # write automation scripts and don't want the feedback email.
        if not receiver or receiver.lower().startswith("noreply"):
            return

        # Build the feedback string
        feedback = "\n\n".join((feedback, self._instructions_msg))

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
            mail.join()
        exit(1)
    signal.signal(signal.SIGTERM, signal_handler)

    # Get parameters from stdin. Don't pass as arguments otherwise
    # everyone can see the email password in the process listing.
    params = json.loads(sys.stdin.readline())

    # Set up logging
    fmt = "%(asctime)s %(levelname)s: %(message)s"
    handler = TimedRotatingFileHandler(params['logFile'], when='midnight',
                                       interval=1, backupCount=7)
    handler.setFormatter(logging.Formatter(fmt))
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.DEBUG if params['debug'] else logging.INFO)

    logging.info("-------------------------------------------------------")

    try:
        # Start mail checker
        global mail
        mail = Mail(params)
        mail.start()

        # Process feedback from stdin (why doesn't 'for line in sys.stdin' work)

        while True:
            line = sys.stdin.readline()
            try:
                data = json.loads(line)
                mail.send_feedback(data['receiver'],
                                   data['subject'],
                                   data['body'])
            except ValueError as ve: 
                logging.error(str(ve))
            except AttributeError as ae: 
                logging.error(str(ae))

    except KeyboardInterrupt:
        # User initiated break
        return 0

    except Exception as e:
        # Unknown exception
        logging.exception(str(e))
        return 1
        
    finally:
        # Cleanup mail checker
        if mail:
            mail.stop()
            mail.join()

    return 0

if __name__ == "__main__":
    sys.exit(main())
