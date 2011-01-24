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
* $Id: main.cpp 172 2006-07-25 14:05:47Z daniel $
* @file
 * ======================================================================== */


//
// Simple example to demonstrate usage of ARToolKitPlus
// This sample does not open any graphics window. It just
// loads test images and shows use to use the ARToolKitPlus API.
//

#include "ARToolKitPlus/TrackerSingleMarkerImpl.h"


class MyLogger : public ARToolKitPlus::Logger
{
    void artLog(const char* nStr)
    {
        printf("%s\n", nStr);
    }
};


int main(int argc, char** argv)
{
    // switch this between true and false to test
    // simple-id versus BCH-id markers
    //
    const bool    useBCH = false;

    const int     width = 320, height = 240, bpp = 1;
    size_t        numPixels = width*height*bpp;
    size_t        numBytesRead;
    // const char    *fName = useBCH ? "data/image_320_240_8_marker_id_bch_nr0100.raw" :
    //                                   "data/image_320_240_8_marker_id_simple_nr031.raw";

	const char *fName = "../multi/data/markerboard_480-499.raw";
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
    ARToolKitPlus::TrackerSingleMarker *tracker = new ARToolKitPlus::TrackerSingleMarkerImpl<6,6,6, 1, 8>(width,height);

	const char* description = tracker->getDescription();
	printf("ARToolKitPlus compile-time information:\n%s\n\n", description);

    // set a logger so we can output error messages
    //
    tracker->setLogger(&logger);
	tracker->setPixelFormat(ARToolKitPlus::PIXEL_FORMAT_LUM);
	tracker->setLoadUndistLUT(true);

    // load a camera file. two types of camera files are supported:
    //  - Std. ARToolKit
    //  - MATLAB Camera Calibration Toolbox
    //if(!tracker->init("data/LogitechPro4000.dat", 1.0f, 1000.0f))            // load std. ARToolKit camera file
	if(!tracker->init("data/PGR_M12x0.5_2.5mm.cal", 1.0f, 1000.0f))        // load MATLAB file
	{
		printf("ERROR: init() failed\n");
		delete cameraBuffer;
		delete tracker;
		return -1;
	}

    // define size of the marker
    tracker->setPatternWidth(80);

	// the marker in the BCH test image has a thin border...
    tracker->setBorderWidth(useBCH ? 0.125f : 0.250f);

    // set a threshold. alternatively we could also activate automatic thresholding
    tracker->setThreshold(150);

    // let's use lookup-table undistortion for high-speed
    // note: LUT only works with images up to 1024x1024
    tracker->setUndistortionMode(ARToolKitPlus::UNDIST_LUT);

    // RPP is more robust than ARToolKit's standard pose estimator
    tracker->setPoseEstimator(ARToolKitPlus::POSE_ESTIMATOR_RPP);

    // switch to simple ID based markers
    // use the tool in tools/IdPatGen to generate markers
    tracker->setMarkerMode(useBCH ? ARToolKitPlus::MARKER_ID_BCH : ARToolKitPlus::MARKER_ID_SIMPLE);

	tracker->changeCameraSize(width, height);

    // do the OpenGL camera setup
    //glMatrixMode(GL_PROJECTION)
    //glLoadMatrixf(tracker->getProjectionMatrix());

    // here we go, just one call to find the camera pose
    // int markerId = tracker->calc(cameraBuffer);
    // float conf = (float)tracker->getConfidence();

	ARToolKitPlus::ARMarkerInfo    *marker_info;
    int             marker_num;

    // detect the markers in the video frame
	//
    if(tracker->arDetectMarker(const_cast<unsigned char*>(cameraBuffer), tracker->getThreshold(), &marker_info, &marker_num) < 0)
	{
        return -1;
	}
	printf("found %d markers\n", marker_num);
	for(int i=0; i<marker_num; i++) {
		int     area = marker_info[i].area;
		int     id = marker_info[i].id;
		int     dir = marker_info[i].dir;
		ARFloat  cf = marker_info[i].cf;
		ARFloat  *pos = marker_info[i].pos;
		printf("area %d\n", area);
		printf("id %d\n", id);
		printf("dir %d\n", dir);
		printf("cf %f\n", cf);
		printf("pos %f, %f\n", pos[0], pos[1]);
	}

    delete [] cameraBuffer;
	delete tracker;

	return 0;
}
