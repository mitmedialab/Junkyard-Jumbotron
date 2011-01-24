#include <stdlib.h>
#include <stdio.h>
#include <time.h>
//#include <conio.h>
#include <assert.h>
#include <string>

#include <ARToolKitPlus/arBitFieldPattern.h>
#include <ARToolKitPlus/TrackerImpl.h>

#include "PN/ImageTool.h"


PN::Image* createImageFromPattern(ARToolKitPlus::IDPATTERN nPattern);


void
generatePattern(bool nBCH, int nID, ARToolKitPlus::IDPATTERN& nPattern)
{
	if(nBCH)
		ARToolKitPlus::generatePatternBCH(nID, nPattern);
	else
		ARToolKitPlus::generatePatternSimple(nID, nPattern);
}


int main(int argc, char **argv)
{
	if(argc<3)
	{
		printf("IdPatGen 1.1\n\n");
		printf("IdPatGen [-noborder] [-all] [-board] [id-number] filename\n\n");
		printf("  -noborder        create no border around the pattern image\n");
		printf("  -thinborder      creates thin border (1 pixel) around the pattern image\n");
		printf("                   instead of a normal border (3 pixels)\n");
		printf("  -all             creates all markers (no id-number required)\n");
		printf("                   will add id to the filename\n");
		printf("  -board           creates a large image with all markers\n");
		printf("                   counts as: first rows, then columns\n");
		printf("  -bch             creates marker for the BCH system rather than\n");
		printf("                   the simple (original ARToolKitPlus marker system\n");
		printf("  id-number        id of the marker to create\n");
		printf("                   do not apply this option when using board\n");
		printf("  filename         filename of the marker or board\n");
		printf("                   do not pass an extension\n");
		return 0;
	}

	bool _border=true, _all=false, _board=false, _thinborder=false, _bch=false;
	int idnumber=0, numOpts=argc-1;					// skip last two argv since this should be the id-number & filename
	std::string basefilename;
	char filename[256];
	int idMax;

	for(int optid=1; optid<numOpts; optid++)
	{
		std::string opt = argv[optid];

		if(opt=="-noborder")
			_border = false;
		else
		if(opt=="-thinborder")
			_thinborder = true;
		else
		if(opt=="-all")
			_all = true;
		else
		if(opt=="-board")
			_board = true;
		else
		if(opt=="-bch")
			_bch = true;
		else
		{
			if(!_all && optid==argc-2)
				break;

			printf("ERROR: unknown parameter '%s'\n", opt.c_str());
			return -1;
		}
	}

	idMax = _bch ? ARToolKitPlus::idMaxBCH : ARToolKitPlus::idMax;

	printf("Creating marker(s) for %s id-system\n", _bch ? "BCH" : "SIMPLE");

	if(!_all)
		idnumber = atoi(argv[argc-2]);
	basefilename = argv[argc-1];

	if(idnumber<0 || idnumber>idMax)
	{
		printf("ERROR: invalid id-number %d. must be in rage [0,%d]\n", idnumber, idMax);
		return -1;
	}


	int borderWidth = _thinborder ? 1 : 3;
	int markerSize = ARToolKitPlus::idPattWidth+2*borderWidth;
	PN::Image* markerImg = NULL;
	ARToolKitPlus::IDPATTERN pat;


	if(_board || _border)
	{
		markerImg = PN::Image::createFromPixelBuffer(markerSize, markerSize, new unsigned short[markerSize*markerSize], true);
		markerImg->clear(0);
	}

	if(!_board)
	{
		if(_all)															// creates all idMax markers
		{
			for(int i=0; i<=idMax; i++)
			{
				generatePattern(_bch, i, pat);

				sprintf(filename, "%s_%04d.tga", basefilename.c_str(), i);
				//filename.set("%s_%04d.tga", basefilename.c_str(), i);

				PN::Image* patImg = createImageFromPattern(pat);

				if(_border)
				{
					markerImg->drawImage(borderWidth,borderWidth, patImg);
					PN::ImageTool::saveAsTGA(markerImg, filename);
				}
				else
					PN::ImageTool::saveAsTGA(patImg, filename);

				delete patImg;
			}
			delete markerImg;
		}
		else																// creates one marker (idnumber)
		{
			generatePattern(_bch, idnumber, pat);

			sprintf(filename, "%s_%04d.tga", basefilename.c_str(), idnumber);
			//filename.set("%s_%04d.tga", basefilename.c_str(), idnumber);

			PN::Image* patImg = createImageFromPattern(pat);

			if(_border)
			{
				markerImg->drawImage(borderWidth,borderWidth, patImg);
				PN::ImageTool::saveAsTGA(markerImg, filename);
				delete markerImg;
			}
			else
				PN::ImageTool::saveAsTGA(patImg, filename);

			delete patImg;
		}
	}
	else
	{
		// create a board full with idMax markers...
		//
		int imgW = _bch ? 260*4 : 260,
			imgH = _bch ? 516*2 : 516;
		int markersPerRow = _bch ? 16*4 : 16,
			markersRows = _bch ? 32*2 : 32;

		PN::Image* board = PN::Image::createFromPixelBuffer(imgW, imgH, new unsigned short[imgW*imgH], true);
		board->clear(0xffff);

		int x=0,y=0;

		for(y=0; y<markersRows; y++)
			for(x=0; x<markersPerRow; x++)
			{
				int id = y*markersPerRow+x;
				generatePattern(_bch, id, pat);

				PN::Image* pattern = createImageFromPattern(pat);

				markerImg->drawImage(borderWidth,borderWidth, pattern);
				board->drawImage(4+x*(markerSize+4), 4+y*(markerSize+4), markerImg);

				delete pattern;
			}
		
		sprintf(filename, "%s.tga", basefilename.c_str());
		//filename.set("%s.tga", basefilename.c_str());
		PN::ImageTool::saveAsTGA(board, filename);
		delete markerImg;
	}


	return 0;
}


PN::Image*
createImageFromPattern(ARToolKitPlus::IDPATTERN nPattern)
{
	unsigned short* pixels = new unsigned short[ARToolKitPlus::idPattWidth*ARToolKitPlus::idPattHeight];

	for(int i=0; i<ARToolKitPlus::pattBits; i++)
	{
		if(ARToolKitPlus::isBitSet(nPattern, i))
			pixels[ARToolKitPlus::pattBits-1-i] = 0xffff;
		else
			pixels[ARToolKitPlus::pattBits-1-i] = 0;
	}

	return PN::Image::createFromPixelBuffer(ARToolKitPlus::idPattWidth, ARToolKitPlus::idPattHeight, pixels, true);
}

