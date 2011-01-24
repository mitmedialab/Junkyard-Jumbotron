"""

Global parameters go here

"""

from os.path import join as _join

# Debug flags
debug_mail = 0  # 0-4
debug_jumbotron = True
debug_server = True
verbose_server = True

# Resources directory
resource_dir = "resources"

# Sqlite3 database file
database_file      = _join(resource_dir, "database")

# Directory with jumbotron images
jumbotrons_dir     = _join(resource_dir, "jumbotrons")

# Maximum number of images per jumbotron
max_image_count    = 10

# Marker images
marker_source_dir  = _join(resource_dir, "markers", "bch")
marker_dir         = _join(resource_dir, "markers", "bch_large")
marker_file_format = "BchThin_{0:04d}.png"

# Image shown on all the displays after a calibration
calibration_file   = _join(resource_dir, "grid.png")

# Image shown on a display whose marker was not found
not_found_file   = _join(resource_dir, "notfound.png")

# File for log, warning, and error messages
log_file           = _join("logs", "output.log")

# Email server info
email_path = 'test.mbox'
email_imap_server = 'imap.gmail.com'
email_smtp_server = 'smtp.gmail.com'
email_user      = 'jj.brownbag@gmail.com'
email_pwd       = 'Br0wnB@g'

# Regexp for allowable jumbotron names
jumbotron_re = "[a-zA-Z0-9][a-zA-Z0-9_]*$"

try:
    from paramslocal import *
except ImportError:
    pass
