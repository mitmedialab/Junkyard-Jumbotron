################################
#
# QMake definitions for IdPatGen
#

include ($$(ARTKP)/build/linux/options.pro)

TEMPLATE = app

TARGET   = idpatgen

QMAKE_CLEAN = $$(ARTKP)/bin/idpatgen

LIBS += -L$$(ARTKP)/lib -lARToolKitPlus

debug {
  OBJECTS_DIR     = $$(ARTKP)/tools/IdPatGen/build/linux/debug
}

release {
  OBJECTS_DIR     = $$(ARTKP)/tools/IdPatGen/build/linux/release
}


DESTDIR  = $$(ARTKP)/bin

debug {
  message("Building IdPatGen in debug mode ...")
}

release {
  message("Building IdPatGen in release mode ...")
}

SOURCES         = src/PN/Image.cpp \
                  src/PN/ImageTool.cpp \
                  src/main.cpp

target.path = ""/$$PREFIX/bin
INSTALLS += target

################################
