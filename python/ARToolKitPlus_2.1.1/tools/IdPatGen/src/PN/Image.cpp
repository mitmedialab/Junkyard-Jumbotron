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
 * $Id: Image.cpp 44 2006-01-03 18:48:43Z daniel $
 * @file                                                                    */
/* ======================================================================== */


#include "PocketKnife.h"
#include "Image.h"
#include "ImageTool.h"

#include <cstdio>
#include <cstdlib>
#include <string>

#if defined(TARGET_HOST_WIN32) || defined(TARGET_HOST_WINCE)
#include <windows.h>
#endif


namespace PN {


void
Image::clear(unsigned short nColor)
{
	int size = width*height;

	if((size&7)==0)
	{
		size >>= 3;
		unsigned int col32 = nColor | (nColor<<16);
		unsigned int* dst = (unsigned int*)getPixels();

		while(size--)
		{
			dst[0] = col32;
			dst[1] = col32;
			dst[2] = col32;
			dst[3] = col32;

			dst += 4;
		}
	}
	else
	{
		unsigned short *dst = getPixels();

		while(size--)
			*dst++ = nColor;
	}
}


void
Image::clear(int nRed, int nGreen, int nBlue)
{
	clear(ImageTool::convertPixel24To16(nRed, nGreen, nBlue));
}


void
Image::drawImage(int nX, int nY, const Image* nImage,
				 int nSx0, int nSy0, int nSx1, int nSy1,
				 bool nTransparent)
{
	int sw = nImage->getWidth(),
		sx0 = nSx0,  sy0 = nSy0,  sx1 = nSx1,    sy1 = nSy1,
		dx0 = nX, dy0 = nY, dx1 = nX+nSx1-nSx0, dy1 = nY+nSy1-nSy0;

	if(dx0>=width || dx1<0 || dy0>=height || dy1<0)
		return;

	const unsigned short* src = nImage->getPixels();
	unsigned short* dst = getPixels();

	if(dx0<0)
		{	sx0 += -dx0;	dx0 = 0;	}
	if(dy0<0)
		{	sy0 += -dy0;	dy0 = 0;	}

	if(dx1>width)
		{	sx1 -= dx1-width;	dx1 = width;	}
	if(dy1>height)
		{	sy1 -= dy1-height;	dy1 = height;	}

	int w = sx1-sx0,  h = sy1-sy0, x,y;

	src += sy0*sw + sx0;
	dst += dy0*width + dx0;

	if(!nTransparent)
		for(y=0; y<h; y++)
		{
			memcpy(dst, src, 2*w);
			dst += width;
			src += sw;
		}
	else
	{
		unsigned short key = nImage->getColorKey();

		for(y=0; y<h; y++)
		{
			for(x=0; x<w; x++)
			{
				if(*src != key)
					*dst = *src;
				dst++;
				src++;
			}
			dst += width-w;
			src += sw-w;
		}
	}
}

void
Image::drawImage(int nX, int nY, const Image* nImage, bool nTransparent)
{
	drawImage(nX, nY, nImage,
			  0,0, nImage->getWidth(),nImage->getHeight(),
			  nTransparent);
}


void
Image::fillRect(int nX0, int nY0, int nX1, int nY1, int nRed, int nGreen, int nBlue, int nOpacity)
{
	fillRect(nX0,nY0, nX1,nY1, ImageTool::convertPixel24To16(nRed,nGreen,nBlue), nOpacity);
}

void
Image::fillRect(int nX0, int nY0, int nX1, int nY1, unsigned short nColor, int nOpacity)
{
	if(nX0<0)		nX0 = 0;
	if(nY0<0)		nY0 = 0;
	if(nX1>width)	nX1 = width;
	if(nY1>height)	nY1 = height;

	int w,w0 = nX1-nX0, h = nY1-nY0;
	unsigned short* dst = (unsigned short*)getPixels();

	dst += nX0 + nY0*width;

	if(nOpacity==0)
		while(h--)
		{
			w = w0;
			while(w--)
				*dst++ = nColor;

			dst += width-w0;
		}
	else
	{
		while(h--)
		{
			w = w0;
			while(w--)
			{
				*dst = ImageTool::blendPixel16(*dst, nColor, nOpacity);
				dst++;
			}

			dst += width-w0;
		}
	}
}


void
Image::drawLine(int x1, int y1, int x2, int y2, int r, int g, int b)
{
	drawLine(x1,y1, x2,y2, ImageTool::convertPixel24To16(r, g, b));
}

void
Image::drawLine(int x1, int y1, int x2, int y2, unsigned short color)
{
	int	x=x1, y=y1;
	int dx, dy;
	int incx, incy;
	int balance;

	if(x2 >= x1)
	{	dx = x2 - x1;	incx = 1;	}
	else
	{	dx = x1 - x2;	incx = -1;	}

	if (y2 >= y1)
	{	dy = y2 - y1;	incy = 1;	}
	else
	{	dy = y1 - y2;	incy = -1;	}

	int	offset = y*width + x,
		incxBuf = incx,
		incyBuf = incy*width;

	unsigned short* pixels = getPixels();

	if(dx==0 && dy==0)
	{
		pixels[offset] = color;
		return;
	}

	if (dx >= dy)
	{
		dy <<= 1;
		balance = dy - dx;
		dx <<= 1;

		while (x != x2)
		{
			pixels[offset] = color;
			if (balance >= 0)
			{
				y += incy;		offset += incyBuf;
				balance -= dx;
			}
			balance += dy;
			x += incx;			offset += incxBuf;
		}
		pixels[offset] = color;
	}
	else
	{
		dx <<= 1;
		balance = dx - dy;
		dy <<= 1;
		while (y != y2)
		{
			pixels[offset] = color;
			if (balance >= 0)
			{
				x += incx;		offset += incxBuf;
				balance -= dy;
			}
			balance += dx;
			y += incy;			offset += incyBuf;
		} 
		pixels[offset] = color;
	}
}


void
Image::setPixel(int x, int y, unsigned short col)
{
	unsigned short* pixels = getPixels();
	pixels[y*width + x] = col;
}


void
Image::setPixel(int x, int y, int r, int g, int b)
{
	unsigned short* pixels = getPixels();
	pixels[y*width + x] = ImageTool::convertPixel24To16(r, g, b);
}

Image* Image::createFromPixelBuffer(int nWidth, int nHeight, unsigned short* nPixels, bool nOwner)
{
	if(nOwner && nPixels==NULL)
		nPixels = new unsigned short[nWidth*nHeight];
	return new Image(nWidth, nHeight, nPixels, nOwner);
}


void Image::setPixels(int nWidth, int nHeight, unsigned short* nPixels, bool nPixelsOwner)
{
	if( pixelsOwner )
		delete pixels;

	width = nWidth;
	height = nHeight;
	pixels = nPixels;
	pixelsOwner = nPixelsOwner;
}


}	//namespace PN
