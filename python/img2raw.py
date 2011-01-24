"""
Utility program to convert an image file to raw luminance data.

Raw rgb data is used by the test programs that come with artoolkit. So
this file isn't used in normal jumbotron operation, just if needed for
testing.

"""

import sys, os, Image, ImageOps

filename = sys.argv[1]
img = Image.open(filename)
if img.mode != "L":
    img = ImageOps.grayscale(img)
data = img.tostring()

rawname = os.path.splitext(filename)[0] + ".raw"
file = open(rawname, "w")
file.write(data)
file.close()

print "Converted", filename, "to", rawname


