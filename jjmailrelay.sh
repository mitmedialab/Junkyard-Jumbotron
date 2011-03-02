#! /bin/sh

# Mail sent to *@jumbotron.media.mit runs this sctipt with the full
# email text including header info passed on stdin. 
#
# Details are in /etc/aliases (from rahulb):
# The last line (be careful not to touch anything else), now says:
#     jumbotron:\jumbotron,|/home/jumbotron/jumbotron-node/jjmailrelay.sh
# You can change that last part to whatever you want, or
# to stop echoing to them mail file remove the "\jumbotron," on that line
# NOTE: Make sure to run "sudo newaliases" after savingyour changes.
#
# Two other FYIs (from rahulb):
# - we can add more aliases into that /etc/aliases file if we want to
#   reserve things like "help@jumbotron.media.mit.edu"
# - we shouldn't need to touch it, but the magic line that redirects
#   *@jumbotron.media.mit.edu to the setup for jumobtron@media.mit.edu
#   is in /etc/mail/virtusertable

# Simple POST the mail text to the web server
#   -F means to use a form (POST)
#   @- means to use stdin
exec curl -F mail=@- http://localhost/uploadMail
