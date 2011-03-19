Junkyard Jumbotron Deployment
=============================

You need to configure a couple more things to get a JJ server working.
The Junkyard Jumbotron is intended to be deployed on an Linux server,
and has been tested on Ubuntu, Debian, and OS-X.  By default it takes
over port 80.  Here are the steps to setting it up.

1. Code
-------

Get the code onto your server and follow the instructions in
README.md.  Put it in /home/jumbotron/jumbotron-node or something
similar.  Remember this location.

2. Setup as a Daemon
--------------------
There are example JJ daemon scripts for both upstart and init.d

If you are using upstartL
 1. Copy jjdaemon.conf to /etc/init/jumbotron.conf.  
 1. Edit that file to change the PATH variable on line 12 to point at 
where you put the code in step 1.
 1. Edit that file to change line 20 to point at the same dir from 
step 1.
Now you can use upstart to manage the "jumbotron" service.

If you are using init.d:
 1. copy jjdaemon.init.d to /etc/init.d/jumbotron.
 1. edit that file, changing the DAEMON_DIR var on line 48 to point to
the directory you installed to in step 1.
Now you can use /etc/init.d/jumbotron <start|stop|restart|status>

3) Make your own junkyard jumbotrons
------------------------------------
