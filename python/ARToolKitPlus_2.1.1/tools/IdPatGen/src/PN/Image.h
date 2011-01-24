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
 * $Id: Image.h 44 2006-01-03 18:48:43Z daniel $
 * @file                                                                    */
/* ======================================================================== */


#ifndef __IMAGE_HEADERFILE__
#define __IMAGE_HEADERFILE__

#include "PocketKnife.h"


namespace PN {

/// The Image class provides basic RGB565 image handing capabilities.

class Image
{
public:
	/// Creates an Image object directly from a pixel buffer.
	/**
	 * Pixels must be supplied in RGB565 format.
	 * If nOwner is true then the Image object will take care for deleting the pixel buffer during destruction.
	 */
	static Image* createFromPixelBuffer(int nWidth, int nHeight, unsigned short* nPixels, bool nOwner);

	virtual ~Image()
	{
		if( pixelsOwner )
			delete[] pixels;
	}

	/// Returns the width of the image
	int getWidth() const  {  return width;  }

	/// Returns the height of the image
	int getHeight() const  {  return height;  }

	/// Sets the color key that is treated as transparent.
	void setTransparentColor(int nRed, int nGreen, int nBlue);

	/// Clears the bitmap with the given RGB color.
	void clear(int nRed, int nGreen, int nBlue);

	/// Clears the bitmap with the given RGB565 color.
	void clear(unsigned short nColor);

	/// Draws another bitmap inside this bitmap.
	/**
	 * nImage is rendered to the position nX/nY.
	 * nSx0/nSy0 and nSx1/nSy1 present the left-top and bottom-right
	 * rectangle position of nImage that is used for blitting.
	 * If nTransparent is true, then nImage's transparent color is
	 * not copied with the other pixels.
	 */
	void drawImage(int nX, int nY, const Image* nImage,
				   int nSx0, int nSy0, int nSx1, int nSy1,
				   bool nTransparent=false);

	/// Draws another bitmap inside this bitmap.
	/**
	 * nImage is rendered to the position nX/nY.
	 * If nTransparent is true, then nImage's transparent color is
	 * not copied with the other pixels.
	 */
	void drawImage(int nX, int nY, const Image* nImage, bool nTransparent=false);


	/// Fills a rectangle with the given color ans transparency.
	/**
	 * A rectangle from nX0/nY0 (top-left) to nX1/nY1 (bottom-right) is rendered with the given
	 * color (RGB) and transparency (0 means fully visibile, 255 means invisible).
	 */
	void fillRect(int nX0, int nY0, int nX1, int nY1, int nRed, int nGreen, int nBlue, int nTransparency=0);

	/// Fills a rectangle with the given color ans transparency.
	/**
	 * A rectangle from nX0/nY0 (top-left) to nX1/nY1 (bottom-right) is rendered with the given
	 * color (RGB) and transparency (0 means fully visibile, 255 means invisible).
	 */
	void fillRect(int nX0, int nY0, int nX1, int nY1, unsigned short nColor, int nTransparency=0);

	/// Renders a straight line from x1/y1 to x2/y1 with the color 'col'.
	/**
	 * CAUTION: No clipping is performed!
	 */
	void drawLine(int x1, int y1, int x2, int y2, unsigned short col);

	/// Renders a straight line from x1/y1 to x2/y1 with the color (r,g,b).
	/**
	 * CAUTION: No clipping is performed!
	 */
	void drawLine(int x1, int y1, int x2, int y2, int r, int g, int b);

	/// Sets a pixel
	/**
	 * CAUTION: No clipping is performed!
	 */
	void setPixel(int x, int y, unsigned short col);

	/// Sets a pixel
	/**
	 * CAUTION: No clipping is performed!
	 */
	void setPixel(int x, int y, int r, int g, int b);

	/// Returns the pixel buffer
	unsigned short*			getPixels()			{ return pixels; }

	/// Returns the pixel buffer
	const unsigned short*	getPixels() const	{ return pixels; }

	/// Returns a pixel
	/**
	 *  Caution: no clipping is performed.
	 */
	unsigned short getPixel(int nX, int nY) const  {  return pixels[nY*width+nX];  }

	/// Sets a new pixel buffer
	/**
	 * If nPixelsOwner is true, then the image object will delete the buffer (calling delete)
	 * during destruction.
	 */
	void setPixels(int nWidth, int nHeight, unsigned short* nPixels, bool nPixelsOwner);

	unsigned short	getColorKey() const  {  return colorKey;  }

protected:
	Image(int nWidth, int nHeight, unsigned short* nPixels, bool nPixelsOwner)
	  : width(nWidth), height(nHeight), pixels(nPixels), pixelsOwner(nPixelsOwner)
	{}

	// used by Font, initialize from passed Image
	Image(Image* nImage)
	  : width(nImage->width), height(nImage->height), pixels(nImage->pixels), pixelsOwner(true)
	{
		nImage->pixelsOwner = false;
	}
	
	int				width, height;
	unsigned short* pixels;
	bool			pixelsOwner;

	unsigned short	colorKey;
};

}	//namespace PN


#endif //__IMAGE_HEADERFILE__
