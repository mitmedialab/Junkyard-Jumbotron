Junkyard Jumbotron Deployment
=============================

You need to configure a couple more things to get a JJ server working.
The Junkyard Jumbotron is intended to be deployed on an Ubuntu server.  By
default it takes over port 80.  Here are the steps to setting it up.

1. Code
-------

Get the code onto your server.  Put it some place like 
/home/jumbotron/jumbotron-node or something.  Remember this location.

2. Upstart Config
-----------------
The JJ presumes you will use [upstart](http://upstart.ubuntu.com/) 
to manage the service.  Do this to set that up:
 1. Copy jjdaemon.conf to /etc/init/jumbotron.conf.  
 1. Edit that file to change the PATH variable on line 12 to point at 
where you put the code in step 0.
 1. Edit that file to change line 20 to point at the same dir from 
step 0.

3) Set up the daemon
--------------------

1. copy jjdaemon.init.d to /etc/init.d/jumbotron.
1. edit that file, changing the DAEMON_DIR var on line 48 to point to
the directory you installed to in step 0.

4) Make your own junkyard jumbotrons
------------------------------------

Now you can use upstart to manage the "jumbotron" service.
