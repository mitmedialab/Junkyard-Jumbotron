#############################################################################
# Makefile for building: artoolkit_.so
# Hand generated.
#############################################################################

ARDIR   = ARToolKitPlus_2.1.1

CXX	= g++
CFLAGS	= -g -Wno-write-strings -I$(ARDIR)/include -I/usr/include
LFLAGS	= 

UNAME := $(shell uname)
ifeq ($(UNAME), Darwin)
	CFLAGS := -arch i386 -msse3 $(CFLAGS)
	LFLAGS := -bundle -undefined dynamic_lookup $(LDFLAGS)
else # Linux
	CFLAGS := -fPIC $(CFLAGS)
	LFLAGS := -shared $(LDFLAGS)
endif

TARGET = lib/artoolkit_.so

all: artoolkit_.cpp $(ARDIR)/lib/libARToolKitPlus.a
	$(CXX) $(CFLAGS) $(LFLAGS) $^ -o $(TARGET)

clean:
	/bin/rm -rf $(TARGET) $(TARGET).dSYM
	$(MAKE) -C $(ARDIR)/src -f Makefile.brownbag clean

# Recursively call make on ARToolKitPlus
.PHONY : $(ARDIR)/lib/libARToolKitPlus.a
ARToolKitPlus_2.1.1/lib/libARToolKitPlus.a: 
	$(MAKE) -C $(ARDIR)/src -f Makefile.brownbag all
