/* ========================================================================
* PROJECT: ARToolKitPlus
* ========================================================================
* This work is based on the original ARToolKit developed by
*   Hirokazu Kato
*   Mark Billinghurst
*   HITLab, University of Washington, Seattle
* http://www.hitl.washington.edu/artoolkit/
*
* Copyright of the derived and new portions of this work
*     (C) 2006 Graz University of Technology
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
* For further information please contact 
*   Dieter Schmalstieg
*   <schmalstieg@icg.tu-graz.ac.at>
*   Graz University of Technology, 
*   Institut for Computer Graphics and Vision,
*   Inffeldgasse 16a, 8010 Graz, Austria.
* ========================================================================
** @author   Daniel Wagner
*
* $Id: main.cpp 126 2006-01-26 14:01:41Z daniel $
* @file
 * ======================================================================== */


//
// Simple example to demonstrate multi-marker tracking with ARToolKitPlus
// This sample does not open any graphics window. It just
// loads test images and shows use to use the ARToolKitPlus API.
//

#include "ARToolKitPlus/TrackerMultiMarkerImpl.h"


class MyLogger : public ARToolKitPlus::Logger
{
    void artLog(const char* nStr)
    {
        printf(nStr);
    }
};


int main(int argc, char** argv)
{
    const int     width = 320, height = 240, bpp = 1;
    size_t        numPixels = width*height*bpp;
    size_t        numBytesRead;
    const char    *fName = "data/markerboard_480-499.raw";
    unsigned char *cameraBuffer = new unsigned char[numPixels];
    MyLogger      logger;

    // try to load a test camera image.
    // these images files are expected to be simple 8-bit raw pixel
    // data without any header. the images are expetected to have a
    // size of 320x240.
    //
    if(FILE* fp = fopen(fName, "rb"))
    {
        numBytesRead = fread(cameraBuffer, 1, numPixels, fp);
        fclose(fp);
    }
    else
    {
        printf("Failed to open %s\n", fName);
        delete cameraBuffer;
        return -1;
    }

    if(numBytesRead != numPixels)
    {
        printf("Failed to read %s\n", fName);
        delete cameraBuffer;
        return -1;
    }

    // create a tracker that does:
    //  - 6x6 sized marker images
    //  - samples at a maximum of 6x6
    //  - works with luminance (gray) images
    //  - can load a maximum of 1 pattern
    //  - can detect a maximum of 8 patterns in one image
    ARToolKitPlus::TrackerMultiMarker *tracker = new ARToolKitPlus::TrackerMultiMarkerImpl<6,6,6, 1, 16>(width,height);

	const char* description = tracker->getDescription();
	printf("ARToolKitPlus compile-time information:\n%s\n\n", description);

    // set a logger so we can output error messages
    //
    tracker->setLogger(&logger);
	tracker->setPixelFormat(ARToolKitPlus::PIXEL_FORMAT_LUM);

    // load a camera file. two types of camera files are supported:
    //  - Std. ARToolKit
    //  - MATLAB Camera Calibration Toolbox
	if(!tracker->init("../simple/data/PGR_M12x0.5_2.5mm.cal", "data/markerboard_480-499.cfg", 1.0f, 1000.0f))
	{
		printf("ERROR: init() failed\n");
		delete cameraBuffer;
		delete tracker;
		return -1;
	}

	// the marker in the BCH test image has a thiner border...
    tracker->setBorderWidth(0.125f);

    // set a threshold. we could also activate automatic thresholding
    tracker->setThreshold(160);

    // let's use lookup-table undistortion for high-speed
    // note: LUT only works with images up to 1024x1024
    tracker->setUndistortionMode(ARToolKitPlus::UNDIST_LUT);

    // RPP is more robust than ARToolKit's standard pose estimator
    //tracker->setPoseEstimator(ARToolKitPlus::POSE_ESTIMATOR_RPP);

    // switch to simple ID based markers
    // use the tool in tools/IdPatGen to generate markers
    tracker->setMarkerMode(ARToolKitPlus::MARKER_ID_SIMPLE);

    // do the OpenGL camera setup
    //glMatrixMode(GL_PROJECTION)
    //glLoadMatrixf(tracker->getProjectionMatrix());

    // here we go, just one call to find the camera pose
    int numDetected = tracker->calc(cameraBuffer);

    // use the result of calc() to setup the OpenGL transformation
    //glMatrixMode(GL_MODELVIEW)
    //glLoadMatrixf(tracker->getModelViewMatrix());

	printf("\n%d good Markers found and used for pose estimation.\nPose-Matrix:\n  ", numDetected);
	for(int i=0; i<16; i++)
		printf("%.2f  %s", tracker->getModelViewMatrix()[i], (i%4==3)?"\n  " : "");

	bool showConfig = false;

	if(showConfig)
	{
		const ARToolKitPlus::ARMultiMarkerInfoT *artkpConfig = tracker->getMultiMarkerConfig();
		printf("%d markers defined in multi marker cfg\n", artkpConfig->marker_num);

		printf("marker matrices:\n");
		for(int multiMarkerCounter = 0; multiMarkerCounter < artkpConfig->marker_num; multiMarkerCounter++)
		{
			printf("marker %d, id %d:\n", multiMarkerCounter, artkpConfig->marker[multiMarkerCounter].patt_id);
			for(int row = 0; row < 3; row++)
			{
				for(int column = 0; column < 4; column++)
					printf("%.2f  ", artkpConfig->marker[multiMarkerCounter].trans[row][column]);
				printf("\n");
			}
		}
	}

    delete [] cameraBuffer;
	delete tracker;
	return 0;
}
