"""

Core methods for uploading images and calculating viewports.

"""

import os
from datetime import datetime, timedelta
import logging
import cStringIO
import Image
from PIL.ExifTags import TAGS
import artoolkit
import params
import calibrate
from dbtypes import JumbotronMode, FitMode, Rect

_no_displays_msg    = """No displays found
Whoops, I didn't find any displays in the image you emailed."""

_few_displays_msg   = """Not enough displays found
I found only {0} display(s) in the image you emailed, but there are \
{1} displays attached to your Junkyard Jumbotron '{2}'."""

_calibrated_msg     = """Calibrated '{0}'!
Junkyard Jumbotron '{0}' has successfully been calibrated."""

_uploaded_msg       = """Image uploaded to '{0}'!
Image has successfully been uploaded to Junkyard Jumbotron '{0}'."""

def _jumbotron_dir(jumbotron):
    return os.path.join(params.jumbotrons_dir, jumbotron.name)

def _uniquify_filename(dir_name, file_name):
    count = 1
    file_base, file_ext = os.path.splitext(file_name)
    while os.path.exists(os.path.join(dir_name, file_name)):
        file_name = file_base + str(count) + file_ext
        count += 1
    return file_name

def _munge_filename(jumbotron, file_name):
    """Return a path to the file_name in the jumbotron directory."""
    # Ensure directory exists
    dir_name = _jumbotron_dir(jumbotron)
    if not os.path.isdir(dir_name):
        os.mkdir(dir_name)

    # Generate path to image file, creating unique filename if needed
    if jumbotron.mode == JumbotronMode.CALIBRATING:
        file_name = "_calibration.jpg"
    elif not file_name:
        file_name = os.tempnam(dir_name)
    else:
        file_name = os.path.split(file_name)[1]
        file_name = _uniquify_filename(dir_name, file_name)
    full_file_name = os.path.join(dir_name, file_name)
    return full_file_name

def _list_ordered_images(dir_name):
    """Return a list of images in the given directory ordered by
    modification time. Ignore images beginning with '_'""" 
    from stat import ST_MTIME
    join = os.path.join
    entries = (join(dir_name, file_name) for file_name in os.listdir(dir_name)
               if file_name[0] != '_')
    return sorted(entries, key=lambda file_name:os.stat(file_name)[ST_MTIME])

def prune_directory(dir_name, max_count):
    entries = _list_ordered_images(dir_name)
    count = len(entries)
    if count > max_count:
        for entry in entries[:count - max_count]:
            os.remove(entry)

def reorient_image(image):
    """Reorient the image based on exif tags in the jpg file"""
    try:
        exif = image._getexif()
        if exif:
            for tag, value in exif.items():
                decoded = TAGS.get(tag, tag)
                if decoded == 'Orientation':
                    if   value == 3:
                        image = image.rotate(180)
                    elif value == 6:
                        image = image.rotate(270)
                    elif value == 8:
                        image = image.rotate(90)
                    break
    except KeyError as ke:
        logging.error("KeyError in reorient_image: " + str(ke))
        # The version of PIL on the server is OLD and throws key
        # errors if the exif isn't found
        pass
    except AttributeError:
        # No exif tags
        pass
    return image

def save_image(file_name, image_data, do_verify=True, do_compress=False):
    """Save raw image data, rotate, verify and compress if desired."""

    logging.info("Saving image %s to server", file_name)

    # Create image from the raw data
    stringio = cStringIO.StringIO(image_data)
    try:
        image = Image.open(stringio)
    except IOError:
        raise IOError("Whoops, having problems understanding the image data")

    # Verify that this is a readable image
    if do_verify:
        try:
            image.verify()
        except IOError:
            raise IOError("Whoops, having problems verifying the image data")
        else:
            # Need to reopen after a verify (see PIL doc)
            stringio = cStringIO.StringIO(image_data)
            image = Image.open(stringio)

    # Compress to save space
    if do_compress:
        file_base, file_ext = os.path.splitext(file_name)
        if not file_ext.lower() in (".jpg", ".png", ".gif"):
            file_name = file_base + ".jpg"
            if image.mode == 'P':
                image = image.convert()

    # Reorient according to exif tags, if any
    image = reorient_image(image)

    # Finally save
    image.save(file_name)

    return file_name, image

def _upload_calibration_image(db, jumbotron, file_name):
    """Upload a calibration image and calibrate the jumbotron"""
    displays = list(db.get_displays(jumbotron))
    found = calibrate.calibrate(db, jumbotron, displays,
                                file_name, debug=params.debug_jumbotron)
    if not found:
        raise IOError(_no_displays_msg)
    if found < len(displays):
        raise IOError(_few_displays_msg.format
                      (found, len(displays), jumbotron.name))
    return _calibrated_msg.format(jumbotron.name)

def _upload_jumbotron_image(db, jumbotron, file_name, image):
    """Upload a new image"""
    prune_directory(_jumbotron_dir(jumbotron), params.max_image_count)
    viewport = get_jumbotron_viewport(jumbotron, image)
    db.update_jumbotron(jumbotron, image=file_name, viewport=viewport)
    return _uploaded_msg.format(jumbotron.name)

def upload_image(db, jumbotron, file_name, image_data):
    """Upload a new image, either for calibration or display"""
    full_file_name = _munge_filename(jumbotron, file_name)
    full_file_name, image = save_image(full_file_name, image_data,
                                       do_verify=True, do_compress=True)
                             
    if jumbotron.mode == JumbotronMode.CALIBRATING:
        return _upload_calibration_image(db, jumbotron, full_file_name)

    return _upload_jumbotron_image(db, jumbotron, full_file_name, image)

def get_jumbotron_viewport(jumbotron, image):
    """Return the image coordinates to which the entire jumbotron
    maps."""
    # TODO: be consistent about passing around images or filenames
    if isinstance(image, basestring):
        image = Image.open(image)
    img_width, img_height = image.size

    jar = jumbotron.aspectratio
    iar = img_width / float(img_height)

    fit = jumbotron.fitmode

    if fit == FitMode.MAXIMIZE:
        fit = FitMode.VERTICAL if iar > jar else FitMode.HORIZONTAL
    elif fit == FitMode.MINIMIZE:
        fit = FitMode.VERTICAL if iar < jar else FitMode.HORIZONTAL
    
    if fit == FitMode.HORIZONTAL:
        width = img_width
        height = img_width / jar
        x = 0
        y = (img_height - height) // 2
            
    elif fit == FitMode.VERTICAL:
        width = img_height * jar
        height = img_height
        x = (img_width - width) // 2
        y = 0
    
    #elif fit == FitMode.STRETCH:
    else:
        x, y, width, height = 0, 0, img_width, img_height

    return Rect(x, y, width, height)

def get_marker_viewport(jumbotron, display, image):
    """Return the image coordinates to which a display maps."""

    # TODO: rather than open the image each time, we can cache the
    # results or, better yet, tell the display to center/stretch to
    # given image rather than use the viewport.
    img = Image.open(image)
    img_width, img_height = img.size

    ar = display.aspectratio
    #if display.direction == 1 or display.direction == 3 :
    #   ar = 1.0 / ar
    if ar > 1:
        view_height = img_height
        view_width = round(img_height * ar)
        view_x = (img_width - view_width) // 2
        view_y = 0
    else:
        view_width = img_width
        view_height = round(img_width / ar)
        view_y = (img_height - view_height) // 2
        view_x = 0

    return Rect(view_x, view_y, view_width, view_height)

def get_display_viewport(jumbotron, display, image):
    """Return the image coordinates to which a display maps."""
    jx, jy, jwidth, jheight = jumbotron.viewport

    # If the display has just been set up, return the marker image
    if not display.viewport:
        return get_marker_viewport(jumbotron, display, image)

    # If the display viewport is empty, it hasn't been found
    if display.viewport.is_empty:
        return get_marker_viewport(jumbotron, display, image)

    view_x = display.viewport.x * jwidth + jx
    view_y = display.viewport.y * jheight + jy
    view_width  = display.viewport.width  * jwidth
    view_height = display.viewport.height * jheight

    #print Rect(round(view_x), round(view_y), round(view_width), round(view_height))
    return Rect(round(view_x), round(view_y),
                round(view_width), round(view_height))

def get_viewport_from_display_viewport(jumbotron, display, viewport):
    """Calculate what the jumbotron viewport should to create the
    given viewport on the given display. Basically the inverse of
    get_display_viewport."""

    # Ignore if the display has just been set up or hasn't been found.
    if not display.viewport or display.viewport.is_empty:
        return jumbotron.viewport

    jwidth  = viewport.width  / display.viewport.width
    jheight = viewport.height / display.viewport.height
    jx = viewport.x - display.viewport.x * jwidth
    jy = viewport.y - display.viewport.y * jheight
    return Rect(jx, jy, jwidth, jheight)

def get_marker_image(db, jumbotron, display):
    """Return the name of the marker image associated with a display"""
    return artoolkit.get_marker_image(display.idx)

def get_display_image(db, jumbotron, display):
    """Return the name of the image associated with a display"""

    # If the display has just been set up, return the marker image
    if not display.viewport:
        return get_marker_image(db, jumbotron, display)

    # If the display viewport is empty, it hasn't been found
    if display.viewport.is_empty:
        return params.not_found_file

    # If jumbotron is in slide-show mode, check if we need to update
    if (jumbotron.mode == JumbotronMode.SLIDE_SHOW and
        datetime.now() - jumbotron.modtime > timedelta(seconds=15)):
        images = _list_ordered_images(_jumbotron_dir(jumbotron))
        try :
            i = (images.index(jumbotron.image) + 1) % len(images)
        except ValueError:
            i = 0

        if images:
            image = images[i]
        else:
            image = params.calibration_file
        try:
            jumbotron.viewport = get_jumbotron_viewport(jumbotron,
                                                        image)
            jumbotron.image = image
            db.commit_jumbotron(jumbotron)
        except IOError:
            # The image was removed out from under us
            pass
        except OperationalError:
            # Another thread was changing the image TODO: this should
            # be rewritten to have one consistent thread always
            # running that updates the slideshow, or better yet,
            # handles requests to update the slideshow. We don't want
            # the thread updating an unused jumbotron.
            pass

    # Return the jumbotron image
    return jumbotron.image

def config_logging(use_file=False, debug=False):
    """Configure logging options, such as whether to log to a file or
    stderr, and whether to print debug messages."""
    from logging.handlers import TimedRotatingFileHandler

    if use_file:
        fmt = "%(asctime)s %(levelname)s: %(message)s"
        handler = TimedRotatingFileHandler(params.log_file, when='midnight',
                                           interval=1, backupCount=7)
    else:
        fmt = "Jumbotron %(levelname)s: %(message)s"
        handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(fmt))
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.DEBUG if debug else logging.INFO)
