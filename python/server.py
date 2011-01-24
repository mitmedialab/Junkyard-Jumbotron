"""
Definitions for the main jumbotron server.
Use 'runserver.py' to actually start up and run the server.
"""

import os
import functools
import logging
import re
import urllib
import Image
import bottle
import traceback
from bottle import route as _route, request as _request, response as _response
import params
import database
from dbtypes import JumbotronMode, FitMode, Rect
import core


# ----------------------------------------------------------------------
# Utility functions

def _view(tpl_name, **defaults):
    """ Decorator: Rendes a template for a handler.  Return a dict of
        template vars to fill out the template. Like bottle.view, but
        logs the 'error' parameter, if any, and adds defaults for
        'error' and 'info'"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            if isinstance(result, dict):
                tplvars = defaults.copy()
                tplvars.update(info=None, error=None)
                tplvars.update(result)
                if 'error' in result and tplvars['error']:
                    logging.info("User error: %s", tplvars['error'])
                return bottle.template(tpl_name, **tplvars)
            return result
        return wrapper
    return decorator

def _redirect(where, **query):
    """ Abort execution and cause a 303 redirect with the given query"""
    bottle.redirect("".join((where, "?", urllib.urlencode(query))))

def _restart():
    """Start over, usually due to user going directly to a non-advertised url"""
    logging.debug("Redirecting to root")
    bottle.redirect("")

def _get_param(name, default=''):
    """Return named parameter from GET or POST, stripping extra space."""
    try:
        param = _request.params.get(name, default)
        if isinstance(param, basestring) :
            param = param.strip()
    except IOError:
        # Occasionally raised by bottle.Request.body. Unsure why.
        param = default
    return param

def _get_url(path=None):
    """Return the absolute url of the current request plus the given path"""
    import urlparse

    # Get full url to given relative path
    url = _request.url
    if path:
        url = urlparse.urljoin(url, path)
    url = urlparse.urlparse(url)
    url = url.netloc + url.path
    if url[-1] == '/':
        url = url[:-1]
    return url

def _get_session_id():
    """Get current session-id from the request or create a new one."""
    if 'sid' in _request.params:
        sid = _get_param('sid')
    elif 'sid' in _request.COOKIES:
        sid = _request.COOKIES['sid']
    else:
        sid = _make_session_id()
        _response.set_cookie('sid', str(sid))
    return sid

def _make_session_id():
    """Create a (hopefully) unique session-id."""
    import hashlib, time, base64
    md5 = hashlib.md5()
    md5.update(b'jumbotron unique session id')
    md5.update(bytes(time.time()))
    return base64.urlsafe_b64encode(md5.digest())[:-2]

def _get_current_jumbotron(name=None):
    """Return the db-connection and jumbotron related to this session"""
    db = database.Db()
    if name:
        jumbotron = db.get_jumbotron(name)
    else:
        sid = _get_session_id()
        jumbotron = db.get_jumbotron(sid)
    return db, jumbotron

def _get_current_display():
    """Return the db, display and jumbotron related to this session"""
    db = database.Db()
    sid = _get_session_id()
    display = db.get_display(sid)
    if not display:
        return db, None, None
    jumbotron = db.get_jumbotron(display.jumbotron)
    if not jumbotron: # Should never happen
        raise Exception("Jumbotron doesn't exist for display, sid=" + str(sid))
    return db, jumbotron, display

# ----------------------------------------------------------------------
# Server routes

_jumbotron_route = '/:name#' + params.jumbotron_re[:-1] + '#'
_resource_route = '/' + params.resource_dir.replace(os.sep, '/')

@bottle.error(code=500)
@_view('error')
def _handle500(what):
    """Handle an exception in the jumbotron code."""
    error = "Sorry, something wrong happened, please try again."
    details = "\n".join((str(what.exception), what.traceback))
    logging.error(details)
    return dict(error=error, details=details)

@bottle.error(code=404)
@_view('error')
def _handle404(what):
    """Handle unknown-URL exception"""
    error = "URL not found, please go to the home page."
    logging.debug(what.output)
    return dict(error=error, details="")

@_route('/:name#[a-zA-Z0-9][a-zA-Z0-9_]*\.(css|js)#')
def _static(name):
    """Handle references to static files, like javascript and css."""
    return bottle.send_file(name, root='./static')

@_route('/favicon.ico')
def _static():
    """Handle references to favicon."""
    return bottle.send_file('favicon.ico', root='./resources/icons')

@_route('/')
@_route('/', method="POST")
@_view('create')
def _create():
    """Create a new jumbotron"""

    ret = dict(name="", error=None, info=None)

    if _get_param('create'):

        # Get and check arguments
        error = None
        name = _get_param('name')
        if not name:
            error = "Whoops, I need a name"
        elif name[0] == '_':
            error = "Whoops, names can not begin with an underscore"
        elif not re.match(params.jumbotron_re, name):
            error = "Whoops, names can be letters, numbers and underscores only"
        if error:
            ret['error'] = error
            return ret
        ret['name'] = name = name.lower()
        
        # Create jumbotron
        db  = database.Db()
        sid = _get_session_id()
        try:
            db.create_jumbotron(sid, name)
        except ValueError:
            ret['error'] = "Whoops, that name has already been used"
        else:
            # Redirect to control panel
            _redirect(name + "/control")

    return ret

@_route(_jumbotron_route + '/control')
@_route(_jumbotron_route + '/control', method="POST")
@_view('control')
def _control(name):
    """Jumbotron control panel"""

    ret = dict(name=name, error=None, info=None, root=_get_url('.'))

    # Get current jumbotron
    db, jumbotron = _get_current_jumbotron(name)
    if not jumbotron:
        ret['error'] = "Whoops, no jumbotron named '" + name + "'"
        return bottle.template('create', bottle.SimpleTemplate, **ret)

    if _get_param('upload'):
        # Upload an image to the jumbotron
        image = _get_param('image', None)
        url = _get_param('url', None)

        if url:
            filename = url[url.rfind('/')+1:]
            data = urllib.urlopen(url).read()

        elif image and not isinstance(image, basestring):
            filename = image.filename
            data = image.value

        else:
            ret['error'] = "Whoops, please specify an image to upload"
            return ret

        try:
            info = core.upload_image(db, jumbotron, filename, data)
            ret['info'] = info.split('\n')[0]
        except IOError as ioe:
            error = str(ioe).split('\n')
            ret['error'] = error[0]
            if len(error) > 2:
                ret['info'] = error[1]

    elif _get_param('recalibrate'):
        # Put the jumbotron into calibration mode
        db.update_jumbotron(jumbotron, mode=JumbotronMode.CALIBRATING)
        ret['info'] = "Recalibrating"

    elif _get_param('slideshow'):
        mode = _get_param('slideshow')
        if mode == 'stop':
            # Put the jumbotron into image mode
            db.update_jumbotron(jumbotron, mode=JumbotronMode.IMAGE)
            ret['info'] = "Stopping"
        else: # mode == 'play'
            # Put the jumbotron into image mode
            db.update_jumbotron(jumbotron, mode=JumbotronMode.SLIDE_SHOW)
            ret['info'] = "Playing"

    elif _get_param('fit'):
        mode = _get_param('fit')
        mode = dict(maximize=FitMode.MAXIMIZE, minimize=FitMode.MINIMIZE,
                    stretch=FitMode.STRETCH)[mode]
        jumbotron.fitmode = mode
        image = Image.open(jumbotron.image)
        viewport = core.get_jumbotron_viewport(jumbotron, image)
        db.update_jumbotron(jumbotron, viewport=viewport, fitmode=mode)

    # Return to control panel and display status message
    return ret

@_route('/_join', method="POST")
@_view('join')
def _join_post():
    """Join a jumbotron from a POST."""

    # Get and check arguments
    name = _get_param('name', None)
    if not name:
        error = "Whoops, I need the name of a JumboTron to join"
        return dict(error=error)

    # Redirect to display url
    _redirect(name)

@_route(_jumbotron_route)
@_route(_jumbotron_route + '/')
@_view('join')
def _join(name):
    """Join a jumbotron from jj.brownbag.me/name."""

    # Create display
    db  = database.Db()
    sid = _get_session_id()
    name = name.lower()
    try:
        db.create_display(sid, name)
    except ValueError:
        error = "Whoops, a JumboTron with that name doesn't exist"
        return dict(error=error)

    # Redirect to the display html
    return bottle.template('display', name=name, error=None, info=None)

@_route(_jumbotron_route + '/_event/resize', method="POST")
def _event_resize(name):
    """Handle event from jumbotron displays."""
    db, jumbotron, display = _get_current_display()
    if not display:
        return
    width  = int(_get_param('width' , 0))
    height = int(_get_param('height', 0))
    if width and height and float(width) / height != display.aspectratio:
        # This will only work if it happens *before* the calibration step...
        db.update_display(display, aspectratio = float(width) / height)

@_route(_jumbotron_route + '/_event/viewport', method="POST")
def _event_viewport(name):
    db, jumbotron, display = _get_current_display()
    if not display:
        return
    x = float(_get_param('x', 0))
    y = float(_get_param('y', 0))
    width = float(_get_param('width', 0))
    height = float(_get_param('height', 0))
    viewport = core.get_viewport_from_display_viewport(
        jumbotron, display, Rect(x, y, width, height))
    db.update_jumbotron(jumbotron, viewport=viewport)

@_route(_jumbotron_route + '/_event/error', method="POST")
def _event_error(name):
    db, jumbotron, display = _get_current_display()
    idx = display.idx if display else -1
    logging.error("[Display %d] %s", idx, _get_param('msg', 'None'));

@_route(_jumbotron_route + '/_event/info', method="POST")
def _event_info(name):
    db, jumbotron, display = _get_current_display()
    idx = display.idx if display else -1
    logging.info("[Display %d] %s", idx, _get_param('msg', 'None'));

@_route(_jumbotron_route + '/_event/debug', method="POST")
def _event_debug(name):
    db, jumbotron, display = _get_current_display()
    idx = display.idx if display else -1
    logging.debug("[Display %d] %s", idx, _get_param('msg', 'None'));

@_route(_jumbotron_route + '/_poll', method="GET")
def _poll(name):
    """Handle polling inquiries from jumbotron displays."""
    import json

    db, jumbotron, display = _get_current_display()
    if not display:
        return None

    mode = jumbotron.mode
    if mode == JumbotronMode.CALIBRATING:
        image = core.get_marker_image(db, jumbotron, display)
        viewport = core.get_marker_viewport(jumbotron, display, image)
        direction = 0
    else:
        image = core.get_display_image(db, jumbotron, display)
        viewport = core.get_display_viewport(jumbotron, display, image)
        direction = display.direction

    cmd = dict(cmd="load", image=image,
               x=viewport.x, y=viewport.y,
               width=viewport.width, height=viewport.height,
               direction=direction)
    return json.dumps(cmd)

@_route(_resource_route + '/:resource#.*#')
def _resource(resource):
    """Return a file from the resources directory"""
    if resource[0:8] == 'database':
        return HTTPError(404, "File does not exist.")
    return bottle.send_file(resource, root=params.resource_dir)

@_route('/_debug')
@_view('debug')
def _debug():
    """Display debugging information about the database."""
    db = database.Db()
    logging.info(str(db))
    jumbotrons = list(db.get_jumbotrons())
    displays   = list(db.get_displays())
    return dict(jumbotrons=jumbotrons, displays=displays)

@_route('/_threads')
@_view('error')
def _threads():
    """Display debugging information about the threads."""
    import sys, threading

    # Create map of id's to threads
    id_map = dict([(th.ident, th) for th in threading.enumerate()])

    msgs = []
    for th_id, th_stack in sys._current_frames().items():
        if th_id in id_map:
            th = id_map[th_id]
            msgs.append("{0.ident}: {0.name} {1} {2}".format(
                    th, "alive" if th.is_alive() else "dead",
                    "daemon" if th.daemon else ""))
        else:
            msgs.append("{0}: not-found".format(th_id))
        for filename, lineno, name, line in traceback.extract_stack(th_stack):
            msgs.append("\t{0}: line {1}, in {2}".format(
                    filename, lineno, name))
    msg = "\n".join(msgs)
    return dict(error="Threads", details=msg)

if __name__ == "__main__":
    from sys import stderr
    print >> stderr, "ERROR: Use runserver.py to run the server locally."
    print >> stderr, "ERROR: Or look at app.wsgi for running with Apache."
    exit(1)
