################################
#
# QMake definitions for simple example
#

include ($$(ARTKP)/build/linux/options.pro)

TEMPLATE = app

TARGET   = simple

QMAKE_CLEAN = $$(ARTKP)/bin/simple

LIBS += -L$$(ARTKP)/lib -lARToolKitPlus

debug {
  OBJECTS_DIR     = $$(ARTKP)/sample/simple/build/linux/debug
}

release {
  OBJECTS_DIR     = $$(ARTKP)/sample/simple/build/linux/release
}


DESTDIR  = $$(ARTKP)/bin

debug {
  message("Building simple in debug mode ...")
}

release {
  message("Building simple in release mode ...")
}

SOURCES = src/main.cpp

target.path = ""/$$PREFIX/bin
INSTALLS += target

################################
