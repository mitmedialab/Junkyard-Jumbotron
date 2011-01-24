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
 * $Id: ImageTool.h 44 2006-01-03 18:48:43Z daniel $
 * @file                                                                    */
/* ======================================================================== */



#ifndef __IMAGETOOL_HEADERFILE__
#define __IMAGETOOL_HEADERFILE__

#include "PocketKnife.h"
#include "Image.h"


namespace PN
{


/// PN::ImageTool provides many utility methods for image handling
namespace ImageTool
{

	/// Flips an image in Y-direction.
	/**
	 * This method does simple scanline copying and can therefore flip any pixel buffer.
	 * nPixelSize is the number of bytes per pixel.
	 */
	void flipImageY(unsigned char* nDstBuffer, unsigned const char* nSrcBuffer, int nWidth, int nHeight, int nPixelSize);


	/// Converts a single pixel from 24-bits RGB to 16-bits (565) RGB
	inline unsigned short convertPixel24To16(int nRed, int nGreen, int nBlue)
	{
		return (unsigned short)(((nRed << 8) & RED_MASK) | ((nGreen << 3) & GREEN_MASK) | (nBlue >> 3));
	}


	/// Converts a single pixel from 16-bits (565) RGB to 24-bits RGB
	inline void convertPixel16To24(unsigned short nPixel, unsigned char& nRed, unsigned char& nGreen, unsigned char& nBlue)
	{
		nRed =   (unsigned char)((nPixel&RED_MASK) >> 8);
		nGreen = (unsigned char)((nPixel&GREEN_MASK) >> 3);
		nBlue =  (unsigned char)((nPixel&BLUE_MASK) << 3);
	}


	/// Blends a single pixel in 16-bits RGB565 format.
	inline unsigned short blendPixel16(unsigned short nSrc, unsigned short nDst, int nOpacity)
	{
		// shamelessly stolen from Thierry Tremblay's PocketFrog...
		//
		unsigned short RB1 = (unsigned short)(nDst & (RED_MASK | BLUE_MASK));
		unsigned short G1  = (unsigned short)(nDst & (GREEN_MASK ));
		unsigned short RB2 = (unsigned short)(nSrc & (RED_MASK | BLUE_MASK));
		unsigned short G2  = (unsigned short)(nSrc & (GREEN_MASK));
		unsigned short RB = (unsigned short)(RB1 + (((RB2-RB1) * (nOpacity>>3)) >> 5));
		unsigned short G  = (unsigned short)(G1 + (((G2-G1)*(nOpacity>>2))>>6));

		RB &= (RED_MASK | BLUE_MASK);
		G  &= (GREEN_MASK);

		return (unsigned short)(RB | G);
	}


	/// Save an Image into a TGA file.
	/**
	 * The TGA file is always 24-bits and uncompressed.
	 */
	bool saveAsTGA(Image* nImage, const char* nFileName);


};	// namespace ImageTool


}; // namespace PN


#endif //__IMAGETOOL_HEADERFILE__
