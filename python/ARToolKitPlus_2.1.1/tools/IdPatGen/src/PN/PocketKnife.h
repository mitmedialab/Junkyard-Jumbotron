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
 * $Id: PocketKnife.h 44 2006-01-03 18:48:43Z daniel $
 * @file                                                                    */
/* ======================================================================== */



#ifndef __POCKETKNIFE_HEADERFILE__
#define __POCKETKNIFE_HEADERFILE__


#ifndef NULL
#define NULL 0
#endif


// define host specific preprocessor definitions
//
#if defined(__SYMBIAN32__)				// Symbian emulator builds also use MS VC compiler, so we have to check it first
#   define  TARGET_HOST_WIN32       0
#   define  TARGET_HOST_WINCE       0
#   define  TARGET_HOST_SYMBIAN     1
#elif defined(_WIN32_WCE)
#   define  TARGET_HOST_WIN32       0
#   define  TARGET_HOST_WINCE       1
#   define  TARGET_HOST_SYMBIAN     0
#elif defined(_MSC_VER) || defined(__CYGWIN__) || defined(__MINGW32__)
#   define  TARGET_HOST_WIN32       1
#   define  TARGET_HOST_WINCE       0
#   define  TARGET_HOST_SYMBIAN     0
#endif

#if TARGET_HOST_SYMBIAN
#include <stddef.h>	// include standard definitions like wchar_t
#endif

namespace PN {

	const unsigned short RED_MASK    = 0x1F << 11;
	const unsigned short GREEN_MASK  = 0x3F << 5;
	const unsigned short BLUE_MASK   = 0x1F;
	const unsigned int   RED_SHIFT   = 11;
	const unsigned int   GREEN_SHIFT = 5;
	const unsigned int   BLUE_SHIFT  = 0;
	const unsigned int   RED_BITS    = 5;
	const unsigned int   GREEN_BITS  = 6;
	const unsigned int   BLUE_BITS   = 5;


	enum PIXELFORMAT
	{
		YUV16,
		GRAY8,
		RGB16,
		RGB24,
		RGB32,
		BGR24,
		BGR32
	};


	enum FORMAT {
		FORMAT_UNDEFINED = 0,
		FORMAT_RLE8 = 1,
		FORMAT_RLE16 = 2,
		FORMAT_RLE24 = 3,
		FORMAT_RAW8 = 4,
		FORMAT_RAW16 = 5,
		FORMAT_RAW24 = 6,

		MAX_WIDTH = 10000,
		MAX_HEIGHT = 10000
	};


	enum ROTATION
	{
		ROTATE_0 = 0,
		ROTATE_90 = 1,
		ROTATE_180 = 2,
		ROTATE_270 = 3
	};


}	// namespace PN


#endif //__POCKETKNIFE_HEADERFILE__
