"""
Custom database types
"""

class JumbotronMode:
    """Current jumbotron mode"""

    # Calibrating
    CALIBRATING = 0

    # Showing an individual image
    IMAGE = 1

    # Showing a slide show
    SLIDE_SHOW = 2

class FitMode:
    """Specify how to fit the image into the jumbotron"""
    
    # Maximize image, maintain aspect ratio and fill the entire jumbotron
    MAXIMIZE    = 0

    # Minimuze image, maintain aspect ratio and show entire image
    MINIMIZE    = 1

    # Match image width and jumbotron width, maintain aspect ratio
    HORIZONTAL  = 2

    # Match image height and jumbotron height, maintain aspect ratio
    VERTICAL    = 3

    # Stretch the image to completely fill the jumbotron, non-uniform scale
    STRETCH     = 4

class Rect(object):
    """Rectangle defined by a point and a size"""

    def __init__(self, x, y, width, height):
        self.x = x
        self.y = y
        self.width  = width
        self.height = height

    def __repr__(self):
        return "{0.x:.3f};{0.y:.3f};{0.width:.3f};{0.height:.3f}".format(self)

    def __str__(self):
        return "{0.x:.2f},{0.y:.2f} {0.width:.2f}x{0.height:.2f}".format(self)

    def __iter__(self):
        return iter((self.x, self.y, self.width, self.height))
    
    def __len__(self):
        return 4

    @property
    def is_empty(self):
        return self.width <= 0 or self.height <= 0

    @classmethod
    def parse(cls, str):
        """Create a Rect from a database string"""
        x, y, width, height = (float(p) for p in str.split(";"))
        return cls(x, y, width, height)

