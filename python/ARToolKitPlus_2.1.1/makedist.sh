#!/bin/sh

NAME=artoolkitplus-2.1.0

make clean > /dev/null 2> /dev/null
rm -f ../$NAME
ln -s `pwd` ../$NAME
pushd .. > /dev/null
tar cfjh $NAME.tar.bz2 \
--exclude Makefile \
--exclude ".svn" \
--exclude "*.dll" \
--exclude "*.vcproj" \
--exclude "*~" \
--exclude "*.o" \
--exclude "*.so*" \
--exclude .sconf_temp \
--exclude .sconsign \
--exclude build.opts \
--exclude $NAME.tar.bz2 \
$NAME
popd > /dev/null
mv ../$NAME.tar.bz2 .
rm ../$NAME
