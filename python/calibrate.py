"""
Jumbotron Calibration.
Figures out how the markers found by artoolkit map to the jumbotron screen.
"""
from __future__ import print_function
import logging
import math
import operator 
import Image
import ImageDraw
from PIL.ExifTags import TAGS
import artoolkit 
from vectypes import Mat4, Vec3

# ----------------------------------------------------------------------

def _get_camera_xform(image):
    """Return the xform that maps world coordinates to image
    coordinates. Uses the Iphone's lens characteristics."""
    film_size    = 6.35 # Iphone sensor size, in mm
    focal_length = 3.85 # Iphone focal length, in mm
    width, height = image.size
    aspect = float(width) / height
    fov_y = 2 * math.atan2(film_size/aspect, 2 * focal_length)
    xform = Mat4.new_translate(width/2.0,  height/2.0, 0)
    xform.scale(-width/2.0, -height/2.0, 1)
    xform *= Mat4.new_perspective(fov_y, aspect, 1, 10)
    return xform

def _get_change_basis_xform(center, up, normal):
    """Return a matrix that changes from the given basis to the x-y-z
    basis. Basically, this 'straightens' out the plane described by
    the basis. The 'right' axis is calculated from the up and normal."""
    normal = normal.normalized()
    right = up.cross(normal).normalize()
    up    = normal.cross(right).normalize()

    xform = Mat4.new_translate(*center)
    xform *= Mat4.new_change_basis(right, up, normal, center).inverse()
    return xform

def _find_best_change_basis_xform(markers):
    """Find the plane that best fits the markers, and return the
    matrix that transforms this plane to the x-y-z plane."""
    centers = (marker.world_center for marker in markers)
    ups     = (marker.world_up     for marker in markers)
    normals = (marker.world_normal for marker in markers)
    avg_center = reduce(operator.add, centers) / len(markers)
    avg_up     = reduce(operator.add, ups    ) / len(markers)
    avg_normal = reduce(operator.add, normals) / len(markers)
    # Rotate about center for easier debugging latter
    avg_center.x = avg_center.y = 0
    return _get_change_basis_xform(avg_center, avg_up, avg_normal)

def _align_markers(markers):
    """Unused test"""
    centers = (marker.world_center for marker in markers)
    normals = (marker.world_normal for marker in markers)
    avg_center = reduce(operator.add, centers) / len(markers)
    avg_normal = (reduce(operator.add, normals) / len(markers)).normalize()

    planen = avg_normal
    planed = -avg_normal.dot(avg_center) 

    for marker in markers:
        # Determine where the ray from the origin (camera center) to
        # the marker intersects the plane
        rayd = marker.world_center.normalize()
        t = -planed / planen.dot(rayd)
        marker.world_center = rayd * t
        marker.world_vertices = [vertex * t for vertex in marker.world_vertices]
            
def _find_display_coords(marker, marker_vertices, display):
    """Calculate the display corners from the marker corners. For now,
    assume everything is orthogonal."""

    # I think a better way to do this might be to calculate the marker
    # coordinates in display space, find the transform from these to
    # marker coordinates in screen space, and apply that transform to
    # (0,0x1,1). This technique would work with non-orthogonal
    # displays, if we should ever want them.

    # Get bounding box
    minv = Vec3.min(*marker_vertices)
    maxv = Vec3.max(*marker_vertices)
    size = maxv - minv

    # Stretch to account for white border
    minv -= size / 8.0
    maxv += size / 8.0
    size = maxv - minv

    # Stretch to display aspect ratio
    direction = marker.world_direction
    dar = display.aspectRatio
    if direction == 1 or direction == 3 :
        dar = 1.0 / dar
    
    if dar > 1:
        # The display is bigger horizontally than vertically.
        width = size.y * dar
        stretch = (width - size.x) / 2.0
        # The image is centered, so stretch in both directions.
        minv.x -= stretch
        maxv.x += stretch

    else:
        # The display is bigger vertically than horizontally.
        height = size.x / dar
        stretch = (height - size.y) / 2.0
        # The image is centered, so stretch in both directions.
        minv.y -= stretch
        maxv.y += stretch

    # Done
    return [minv, maxv]

def _draw_vertices(draw, vertices, color="white", width=5):
    """Draw a polygon"""
    # Convert to 2d tuples
    vertices = [(v.x, v.y) for v in vertices]
    if width:
        vertices.append(vertices[0])
        for u, v in zip(vertices[:-1], vertices[1:]):
            draw.line((u, v), color, width)
    else:
        draw.polygon(vertices, color)

def _draw_rectangle(draw, minv, maxv, color="white", width=5):
    """Draw a rectangle"""
    # Convert to 2d tuples
    vertices = [minv, Vec3(minv.x, maxv.y), maxv, Vec3(maxv.x, minv.y)]
    _draw_vertices(draw, vertices, color, width)

def _debug(**kwargs):
    """Log a list of keyword/value pairs"""
    for key, value in kwargs.items():
        logging.debug("%s\t: %s", key, str(value))

def _debug_image(draw, coords, xform, plane_xform, cam_xform):
    """Draw debugging info on the calibration image"""
    minv, maxv = coords
    ixform = xform.inverse()
    iplane_xform = plane_xform.inverse()
    icam_xform = cam_xform.inverse()
    vertices = (Vec3(maxv.x, minv.y, minv.z),
                Vec3(maxv.x, maxv.y, minv.z), 
                Vec3(minv.x, maxv.y, minv.z), 
                Vec3(minv.x, minv.y, minv.z))
    _draw_vertices(draw, vertices, (255, 0, 0, 255), width=7)

    vertices = [icam_xform.transform(vertex) for vertex in vertices]
    vertices = [ixform.transform(vertex) for vertex in vertices]
    vertices1 = (cam_xform.transform(vertex) for vertex in vertices)
    _draw_vertices(draw, vertices1, (0, 255, 0, 200), width=5)

    vertices = [iplane_xform.transform(vertex) for vertex in vertices]
    vertices1 = (cam_xform.transform(vertex) for vertex in vertices)
    _draw_vertices(draw, vertices1, (0, 0, 255, 200), width=3)

def _reorient_image(image):
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

def _calibrate(jumbotron, displays, image, debug=False, debug_image=False):
    """Calibrate a jumbotron with a calibration images."""
    if debug_image:
        draw = ImageDraw.Draw(image, "RGBA")

    # Find markers
    found_markers = artoolkit.detect(image, confidence_threshold=0.5,
                                     debug=False, debug_image=debug_image)

    # Throw out unknown markers
    markers = [marker for marker in found_markers if marker.id in displays]
    if not markers:
        return 0
    if len(markers) < len(found_markers):
        # TODO: get this info to node.js
        #logging.warn("Found unknown markers in jumbotron %s", jumbotron.name)
        pass

    # The method used here has problems when combining very small
    # displays with very large displays. The small displays will seem
    # to be very far away, so any vertical or horizontal separation
    # between them and the larger display will be amplified. An
    # alternative might be to use the screen coordinates of each
    # marker. Needs more thought if this becomes an issue.

    # Get camera xform
    cam_xform = _get_camera_xform(image)

    # Find best fitting plane
    plane_xform = _find_best_change_basis_xform(markers)

    # Project each marker to x-y plane and stretch to display size
    coords = []
    for marker in markers:
        idx = marker.id

        # Rotate from the best-fitting plane to the x-y plane.
        rot_vertices = [plane_xform.transform(vertex)
                        for vertex in marker.world_vertices]

        # Then rotate about the marker's center to the x-y plane
        center = plane_xform.transform(marker.world_center)
        normal = plane_xform.transform_vector(marker.world_normal).normalize()
        up     = plane_xform.transform_vector(marker.world_up).normalize()
        xform = _get_change_basis_xform(center, up, normal)
        xy_vertices = [xform.transform(vertex) for vertex in rot_vertices]

        # Use the camera transform to project to the screen
        screen_vertices = [cam_xform.transform(vertex)
                           for vertex in xy_vertices]

        # Finally, stretch to the display corners
        coord = _find_display_coords(marker, screen_vertices, displays[idx])
        coords.append(coord)

        if debug:
            _debug(Display=marker.id,
                   world=marker.world_vertices, plane=rot_vertices,
                   xyplane=xy_vertices, cam=screen_vertices, bbox=coord)
        if debug_image:
            _debug_image(draw, coords[idx], xform, plane_xform, cam_xform)

    # Find the bounding box of all the markers
    allminv = Vec3.min(*(coord[0] for coord in coords))
    allmaxv = Vec3.max(*(coord[1] for coord in coords))
    allsize = allmaxv - allminv
    if debug_image:
        _draw_rectangle(draw, allminv, allmaxv, "white", width=1)
    jumbotron.aspectRatio = allsize.x / allsize.y

    # Initialize display viewports
    #print(displays, file=sys.stderr)
    for display in displays.values():
        display.viewport = dict(x=0, y=0, width=0, height=0, rotation=0)

    # Normalize viewports and set in displays
    for marker, coord in zip(markers, coords):
        idx = marker.id
        minv = (coord[0] - allminv)
        maxv = (coord[1] - allminv)
        size = maxv - minv

        displays[idx].viewport = dict(x=minv.x / allsize.x,
                                      y=minv.y / allsize.y,
                                      width=size.x / allsize.x,
                                      height=size.y / allsize.y,
                                      rotation=marker.world_direction)

    if debug:
        logging.debug("Final displays:")
        for marker, coord in zip(markers, coords):
            logging.debug("display {0} {1}".format(marker.id, coord))

    return len(markers)

# ----------------------------------------------------------------------

def main(argv):
    """Perform calibration from the command line. Doesn't actually
    change the database, just prints lots of debugging info.
    Usage: python calibrate.py [db_file] <jumbotron_name> <image_name>"""

    import json

    class attrdict(dict):
        def __init__(self, *args, **kwargs):
            dict.__init__(self, *args, **kwargs)
            self.__dict__ = self

    # parse jumbotron info argv
    image_name = argv[1]
    jumbotron = attrdict(json.loads(argv[2]))

    # Convert displays to a dict indexed by display.idx
    displays = {}
    for display in jumbotron.displays:
        displays[display['idx']] = attrdict(display)
    jumbotron.displays = displays

    # Open image, rotate and convert if necessary, based on exif tags and mode
    try:
        image = Image.open(image_name)
    except IOError as ioe:
        print(str(ioe), file=sys.stderr)
        return -1
    image = _reorient_image(image)
    if image.mode != 'RGB' or image.mode != 'RGBA':
        image = image.convert('RGB')

    # Calibrate
    _calibrate(jumbotron, jumbotron.displays, image, debug=False, debug_image=False)

    # Send to stdout (to node.js)
    print(json.dumps(jumbotron), file=sys.stdout)

    # Save
    #image.save("calibrate_out.jpg")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main(sys.argv))
