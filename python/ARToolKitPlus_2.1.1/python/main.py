from ctypes import *

#include "ARToolKitPlus/TrackerSingleMarkerImpl.h"


class MyLogger : public ARToolKitPlus::Logger
{
    void artLog(const char* nStr)
    {
        printf(nStr);
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
    const char    *fName = useBCH ? "data/image_320_240_8_marker_id_bch_nr0100.raw" :
                                      "data/image_320_240_8_marker_id_simple_nr031.raw";
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
	//tracker->setLoadUndistLUT(true);

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


    // do the OpenGL camera setup
    //glMatrixMode(GL_PROJECTION)
    //glLoadMatrixf(tracker->getProjectionMatrix());

    // here we go, just one call to find the camera pose
    int markerId = tracker->calc(cameraBuffer);
    float conf = (float)tracker->getConfidence();

    // use the result of calc() to setup the OpenGL transformation
    //glMatrixMode(GL_MODELVIEW)
    //glLoadMatrixf(tracker->getModelViewMatrix());


    printf("\n\nFound marker %d  (confidence %d%%)\n\nPose-Matrix:\n  ", markerId, (int(conf*100.0f)));
	for(int i=0; i<16; i++)
		printf("%.2f  %s", tracker->getModelViewMatrix()[i], (i%4==3)?"\n  " : "");

    delete [] cameraBuffer;
	delete tracker;

	return 0;
}
