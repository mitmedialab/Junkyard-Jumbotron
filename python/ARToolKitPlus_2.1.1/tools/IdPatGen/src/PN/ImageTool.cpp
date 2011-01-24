/* ========================================================================
 * Copyright (C) 2004-2005  Graz University of Technology
 *
 * This framework is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This framework is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this framework; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * For further information please contact Dieter Schmalstieg under
 * <schmalstieg@icg.tu-graz.ac.at> or write to Dieter Schmalstieg,
 * Graz University of Technology, Institut für Maschinelles Sehen und Darstellen,
 * Inffeldgasse 16a, 8010 Graz, Austria.
 * ========================================================================
 * PROJECT: PocketKnife
 * ======================================================================== */
/** @author   Daniel Wagner
 *
 * $Id: ImageTool.cpp 44 2006-01-03 18:48:43Z daniel $
 * @file                                                                    */
/* ======================================================================== */


#include "PocketKnife.h"
#include "ImageTool.h"

#include <cstdio>
#include <string>

#if defined(TARGET_HOST_WIN32) || defined(TARGET_HOST_WINCE)
#include <windows.h>
#endif

namespace PN  {


namespace ImageTool  {


void convertPixelDataFrom16BitRGBTo24BitBGR(unsigned char* nDestData, const unsigned short* nPixelData,
											unsigned int nWidth, unsigned int nHeight)
{
	unsigned int	i, size = nWidth * nHeight;

	for(i=0; i<size; i++)
	{
		convertPixel16To24(*nPixelData, nDestData[2], nDestData[1], nDestData[0]);

		nDestData+=3;
		nPixelData++;
	}
}



void flipImageY(unsigned char* nDstBuffer, unsigned const char* nSrcBuffer, int nWidth, int nHeight, int nPixelSize)
{
	int i, span = nPixelSize*nWidth;

	for(i=0; i<nHeight; i++)
		memcpy(nDstBuffer+i*span, nSrcBuffer+(nHeight-1-i)*span, span);
}


struct TGA_HEADER
{
#pragma pack( push, 1 )
	unsigned char  identsize;       // size of ID field that follows 18 unsigned char header (0 usually)
	unsigned char  colourmaptype;	// type of colour map 0=none, 1=has palette
	unsigned char  imagetype;       // type of image 0=none,1=indexed,2=rgb,3=grey,+8=rle packed

	short colourmapstart;			// first colour map entry in palette
	short colourmaplength;			// number of colours in palette
	unsigned char  colourmapbits;	// number of bits per palette entry 15,16,24,32

	short xstart;					// image x origin
	short ystart;					// image y origin
	short width;					// image width in pixels
	short height;					// image height in pixels
	unsigned char  bits;			// image bits per pixel 8,16,24,32
	unsigned char  descriptor;		// image descriptor bits (vh flip bits)
#pragma pack( pop )
};


bool
saveAsTGA(Image* nImage, const char* nFileName)
{
	TGA_HEADER	header;
	FILE*		fp = fopen(nFileName, "wb");

	if(!fp)
		return false;

	memset(&header, 0, sizeof(TGA_HEADER));

	header.imagetype = 2;
	header.width = (short)nImage->getWidth();
	header.height = (short)nImage->getHeight();
	header.bits = 24;
	header.descriptor = 0;


	fwrite(&header, 1, sizeof(TGA_HEADER), fp);

	int size = nImage->getWidth()*nImage->getHeight()*3;
	unsigned char *tmpBuf = new unsigned char[size], *tmpBuf2 = new unsigned char[size];

	convertPixelDataFrom16BitRGBTo24BitBGR(tmpBuf, nImage->getPixels(), nImage->getWidth(), nImage->getHeight());
	flipImageY(tmpBuf2, tmpBuf, nImage->getWidth(), nImage->getHeight(), 3);

	fwrite(tmpBuf2, 1, size, fp);
	fclose(fp);

	delete tmpBuf;
	delete tmpBuf2;

	return true;
}


}; // namespace ImageTool


}; // namespace PN
