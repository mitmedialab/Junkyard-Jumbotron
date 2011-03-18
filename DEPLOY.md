The Junkyard Jumbotron is intended to be deployed on an Ubuntu server.  By
default it takes over port 80.  Here are the steps to setting it up.

0) Code
Get the code onto your server.  Put it some place like 
/home/jumbotron/jumbotron-node or something.

1) Upstart Config
The JJ presumes you will use upstart to manage the service.  Do this to 
set that up:
a) Copy jjdaemon.conf to /etc/init/jumbotron.conf.  
b) Edit that file to change the PATH variable on line 12 to point at 
where you put the code in step 0.
c) Edit that file to change line 20 to point at the same dir from 
step 0.

2) Set up the daemon
a) copy jjdaemon.init.d to /etc/init.d/jumbotron.
b) edit that file, changing the DAEMON_DIR var on line 48 to point to
the directory you installed to in step 0.

Now you can use upstart to manage the "jumbotron" service.
