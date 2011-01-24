

#include "arFileGrabber.h"

#include <windows.h>
#include <stdio.h>
#include <stdlib.h>


ARFileGrabber::ARFileGrabber(const char* nFileName, int nWidth, int nHeight, int nByterPerComp)
{
	width=nWidth;
	height=nHeight;
	bufferlen = nByterPerComp*width*height;
	buffer = new unsigned char[bufferlen];

	filename = new char[strlen(nFileName)+1];
	strcpy(filename, nFileName);

	fileIdx = 0;
	oldIdx = -1;
	showedWarning = false;
}


ARFileGrabber::~ARFileGrabber()
{
	delete buffer;
}


void
ARFileGrabber::GrabFrame()
{
	char fname[MAX_PATH];

	sprintf(fname, filename, fileIdx);

	FILE* fp = fopen(fname, "rb");

	if(!fp)
	{
		if(!showedWarning)
			printf("ERROR: can not load file: '%s'\n", fname);
		showedWarning = true;
		return;
	}

	fread(buffer, 1, bufferlen, fp);
	fclose(fp);

	if(fileIdx!=oldIdx)
	{
		printf("reading file %s\n", fname);
		oldIdx=fileIdx;
	}
}


void
ARFileGrabber::NextFile()
{
	fileIdx++;
	//printf("setting fileIdx to %d\n", fileIdx);
	showedWarning = false;
}
