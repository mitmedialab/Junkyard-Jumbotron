# /bin/sh

cd public/jumbotrons

echo "Number of jumbotrons created"
ls -l | wc -l

echo "Jumbotrons with at least one uploaded calibration image"
find . -name '_calibrate_.*' -print | wc -l

echo "Jumbotrons with at least one uploaded image"
find . -name '*.*' -print | grep -v '_calibrate_' | awk 'BEGIN { FS = "/" } ; { print $2 }' | uniq | wc -l

echo "Total number of images uploaded"
find . -name '*.*' -print | grep -v '_calibrate_' | wc -l
