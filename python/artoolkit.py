"""
Interface to ARToolkitPlus.
Find marker glyphs in an image.
"""

import os
import ctypes
from ctypes import c_void_p, c_char_p, c_bool, c_int, c_float
import copy
import logging
import math
import params
import Image
import ImageOps
import ImageDraw
from vectypes import Vec2, Vec3, Mat4

# ----------------------------------------------------------------------
# Ctypes definitions for interface with ARToolkitPlus library
        
try:
    root = os.path.dirname(os.path.abspath(__file__))
    artoolkitlib = ctypes.CDLL(root + "/lib/artoolkit_.so")
except OSError, ose:
    # Catastophic failure
    raise ose

class ARMarkerInfo(ctypes.Structure):
    """Python structure corresponding to C's ARMarkerInfo"""
    _fields_ = [("area", c_int),
                ("id", c_int),
                ("direction", c_int),
                ("confidence", c_float),
                ("position", Vec2),
                ("line", Vec3 * 4),
                ("vertices", Vec2 * 4)
                ]
    def init(self, xform):
        """Initialize with the given xform, calculating python-only variables"""
        self.xform = xform

        corners = (Vec3(-0.5, -0.5),
                   Vec3(-0.5,  0.5),
                   Vec3( 0.5,  0.5),
                   Vec3( 0.5, -0.5))
        self.world_vertices = [xform.transform(c) for c in corners]
        self.world_normal = xform.transform_vector(-Vec3.z_axis()).normalize()
        self.world_center = xform.transform(Vec3.origin())

        # Point upwards by rotating up vector by -90, -180, or -270 degrees.
        # Direction is the rotation angle (in units of 90-degrees).
        #     0=up, 1=left, 2=down, 3=right
        # In image space, up is negative.
        up = xform.transform_vector(-Vec3.y_axis()).normalized()
        direc = 0
        if abs(up.x) > abs(up.y):
            rot = Mat4.new_rotate_axis(self.world_normal, math.pi*0.5)
            up = rot.transform(up)
            direc = 1
        if  up.y < 0:
            rot = Mat4.new_rotate_axis(self.world_normal, math.pi)
            up = rot.transform(up)
            direc += 2
        self.world_up = up
        self.world_direction = direc

    def __str__(self) :
        return """id {0.id:2d}, conf {0.confidence:.2f}, \
dir {0.world_direction}, area {0.area:4d}, pos {0.position}, \
[{0.vertices[0]} {0.vertices[1]} {0.vertices[2]} \
{0.vertices[3]}]""".format(self)

ARMarkerInfo_p = ctypes.POINTER(ARMarkerInfo)

_create = artoolkitlib['create']
_create.restype = c_void_p
_create.argtypes = (c_int, c_int, c_bool)

_set_thresholds = artoolkitlib['set_thresholds']
_set_thresholds.argtypes = (c_void_p, c_int, c_bool, c_int)

_destroy = artoolkitlib['destroy']
_destroy.argtypes = (c_void_p, )

_detect = artoolkitlib['detect']
_detect.restype = c_int
_detect.argtypes = (c_void_p, c_char_p)

_get_marker = artoolkitlib['get_marker']
_get_marker.restype = ARMarkerInfo_p
_get_marker.argtypes = (c_void_p, c_int)

_get_marker_transform = artoolkitlib['get_marker_transform']
_get_marker_transform.argtypes = (c_void_p, ARMarkerInfo_p,
                                  ctypes.POINTER(c_float))

# ----------------------------------------------------------------------

def get_marker_image(idx):
    """Return the artoolkit glyph corresponding to the given index."""
    marker_name = params.marker_file_format.format(idx + 1)
    marker_file = os.path.join(params.marker_dir, marker_name)

    # Add border and resize here to prevent browser smoothing when resizing.
    # CSS styles can prevent smoothing on some browsers, but not all browsers.
    # See https://developer.mozilla.org/en/CSS/image-rendering.p
    if not os.path.exists(marker_file):
        source_file = os.path.join(params.marker_source_dir, marker_name)
        source = Image.open(source_file)
        # Convert from pallette mode, else expand doesn't work correctly
        marker = source.convert('L')
        marker = ImageOps.expand(marker, border=1, fill=255)
        size = marker.size[0] * 100, marker.size[1] * 100
        marker = marker.resize(size, Image.NEAREST)
        marker.save(marker_file)

    return marker_file

def detect(image, confidence_threshold=0.5, debug=False, debug_image=False):
    """Find marker glyphs in the image. 
    Try different thresholds, accumulate the results and return the
    best.  TODO: Look at local neighborhoods to find the best
    per-pixel threshold. Note: ARToolkitPlus autothresh is lame."""

    # Make grayscale if necessary
    grayimage = image if image.mode == "L" else ImageOps.grayscale(image)

    # Create the detector
    detector = _create(grayimage.size[0], grayimage.size[1], debug)

    # Build a map from marker-id to a list of markers with that id
    # detected at each successive threshold. 
    allmarkers = {}

    # Systematically try different thresholds
    data = grayimage.tostring()
    for thresh in xrange(16, 255, 16):

        # Set the current threshold and extract the markers
        _set_thresholds(detector, thresh, False, 0)
        num = _detect(detector, data)
        markers = [_get_marker(detector, m).contents for m in xrange(num)]
        if debug:
            msg = str(sorted([(m.id, m.confidence) for m in markers
                              if m.confidence > 0]))
            logging.debug("Thresh {0} found {1} {2}".format(thresh, num, msg))

        # Add markers with high enough confidence to the map
        for marker in markers:
            if marker.confidence >= confidence_threshold:
                # Copy because it will be overwritten on the next detection
                marker = copy.deepcopy(marker)
                xform = Mat4()
                _get_marker_transform(detector, marker, xform.ctypes)
                xform.transpose()
                marker.init(xform)

                # If confidence is higher than current highest, replace list
                if (not marker.id in allmarkers or
                    marker.confidence > allmarkers[marker.id][0].confidence):
                    allmarkers[marker.id] = [marker]

                # Otherwise append to the list
                else:
                    allmarkers[marker.id].append(marker)

    # At this point, the markers in each individual list have the same
    # confidence. To pick the 'best' marker, first throw out any
    # markers that don't share the median direction, then pick the
    # marker with the median area. This should exclude bad detections.
    # For clarity, use a loop rather than list comprehensions.
    markerlists = allmarkers.values()
    markers = []
    for markerlist in markerlists:
        markerlist = sorted(markerlist, key=lambda m:m.direction)
        direction = markerlist[len(markerlist)/2].direction
        markerlist = [marker for marker in markerlist
                      if marker.direction == direction]
        markerlist = sorted(markerlist, key=lambda m:m.area)
        markers.append(markerlist[len(markerlist)/2])

    # Print found markers and draw on the original image.
    if debug:
        logging.debug("Final markers:")
        logging.debug(str_markers(markers))
        if debug_image:
            draw_markers(markers, image)

    return markers

def _draw_direction(draw, start, direc, size=4, fill=(0,0,255,255)) :
    end = start + direc * 20
    size = Vec2(size, size)
    draw.ellipse((tuple(end-size), tuple(end+size)), fill=fill)

def draw_markers(markers, image):
    """Draw the markers on the given image"""
    draw = ImageDraw.Draw(image, "RGBA")
    for marker in markers:
        # Green is high confidence, Red is low confidence
        color = int (255 * marker.confidence)
        draw.polygon(marker.vertices, fill=(255-color, color, 0, 255))
        
        # Up is negative in image space
        v = Vec2(0,-1)
        if   marker.world_direction == 1: v = Vec2(-1,0)
        elif marker.world_direction == 2: v = Vec2(0,1)
        elif marker.world_direction == 3: v = Vec2(1,0)
        _draw_direction(draw, marker.position, v)

        draw.text(marker.position,
                  str(marker.id) + ": " + str(marker.confidence))

def str_markers(markers):
    """Return a string representing all the markers."""
    if not markers:
        return "None"
    return "\n".join(("{0:2d}: {1}".format(i, marker)
                      for i, marker in enumerate(markers)))

# ----------------------------------------------------------------------

def main(argv):
    """Perform detection from the command line.
    Usage: python artoolkit.py <image_name>"""
    import core

    logging.basicConfig(level=logging.DEBUG, format="%(message)s")

    if argv[1] == "-makeMarkers":
        for i in xrange(-1, 4095):
            if (i % 10) == 0:
                print i
            get_marker_image(i)
        return 0

    image = Image.open(argv[1])
    image = core.reorient_image(image);
    if image.mode != 'RGB' or image.mode != 'RGBA':
        image = image.convert('RGB')

    markers = detect(image, debug=True, debug_image=image)
    image.save("artoolkit_out.jpg")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main(sys.argv))
