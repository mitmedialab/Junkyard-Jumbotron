"""Run jumbotron locally, using a test account"""

import os
import core
import params
import bottle
import mail
from server import *

# Set up debugging
core.config_logging(use_file=False, debug=params.debug_jumbotron)
bottle.debug(params.debug_server)

# The reloader runs this file multiple times. Make sure we only create
# the mail checker in the child process.
mail_checker = None
if os.environ.get('BOTTLE_CHILD') == 'true':
    mail_checker = mail.Mail(debug=params.debug_mail)
    mail_checker.start()

# Suppress server-request messages if verbose flag is off
wsgi_server = bottle.WSGIRefServer
if not params.verbose_server:
    from wsgiref.simple_server import make_server, WSGIRequestHandler
    class QuietWSGIRequestHandler(WSGIRequestHandler):
        def log_message(self, format, *args):
            pass
    class QuietWSGIServer(bottle.WSGIRefServer):
        def run(self, handler):
            srv = make_server(self.host, self.port, handler,
                              handler_class=QuietWSGIRequestHandler)
            srv.serve_forever()
    wsgi_server = QuietWSGIServer

# Start server
logging.info("Starting jumbotron server")
try:
    bottle.run(host='localhost', server=wsgi_server, port=8080,
               reloader=True, quiet=not params.verbose_server)
finally:
    # Kill mail checker before exiting
    if mail_checker:
        mail_checker.stop()
        mail_checker.join()
