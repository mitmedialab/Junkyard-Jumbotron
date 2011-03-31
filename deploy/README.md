Junkyard Jumbotron Deployment
=============================

You need to configure a couple more things to get a JJ server working.
The Junkyard Jumbotron has been deployed on Ubuntu, Debian, and OS-X.
Unless changed in params.js, it takes over port 80.  Here are the
steps to setting it up.

1. Code
-------

Get the code onto your server and follow the instructions in
README.md.  Put it in /home/jumbotron or something similar. This is
the jumbotron home directory.

2. Parameters
-------------

   1. Copy jumbotron/paramsLocal.js.template to jumbotron/paramsLocal.js
   2. Edit imageReceiveServer to point to your mail server (see below).
   3. Edit emailReplyTo to point to your reply-to email address for feedback.

2. Setup as a Daemon
--------------------

   * If using [upstart](http://en.wikipedia.org/wiki/Upstart)
     1. Copy upstart.example to /etc/init/jumbotron.conf.
     2. Edit the PATH variable to point to jumbotron home.
     3. Use _start|stop|status jumbotron_

   * If using [init.d](http://www.ghacks.net/2009/04/04/get-to-know-linux-the-etcinitd-directory/)
     1. Copy init.d.example to /etc/init.d/jumbotron.
     2. Edit the DAEMON_DIR variable to point to jumbotron home.
     3. Use _/etc/init.d/jumbotron <start|stop|restart|status>_

3. Setup Mail Server
--------------------

   * Install sendmail

   * Add an alias to _/etc/mail/aliases_ that funnels mail to
     jjmailrelay.sh in the jumbotron home. For example:
     >jumbotron		|/home/jumbotron/jjmailrelay.sh

   * Setup a catchall that sends all mail to user jumbotron.
     We use a setting in _/etc/mail/virusertable_:
     >@thisserver.com	jumbotron

