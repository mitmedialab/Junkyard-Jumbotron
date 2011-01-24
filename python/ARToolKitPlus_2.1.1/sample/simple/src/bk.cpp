#include "ARToolKitPlus/TrackerImpl.h"

class Logger : public ARToolKitPlus::Logger {
    void artLog(const char* nStr) {
        printf("%s", nStr);
    }
};

static ARToolKitPlus::Tracker *tracker = NULL;

void init(int width, int height) {
	printf("Init\n");

	if (tracker != NULL)
		return;
	
	tracker = new ARToolKitPlus::TrackerImpl<6, 6, 64, 1, 32>();

	// Set logger
	tracker->setLogger(new Logger());

	// Work with luminance images
	tracker->setPixelFormat(ARToolKitPlus::PIXEL_FORMAT_LUM);

	// Work at full res
	tracker->setImageProcessingMode(ARToolKitPlus::IMAGE_FULL_RES);

	// Set border
    tracker->setBorderWidth(0.125f);

	// Set threshold and activate automatic threshold. // TODO: lame autothreshold
	tracker->setThreshold(160);
	tracker->activateAutoThreshold(true);

	// Switch to BCH ID based markers
	tracker->setMarkerMode(ARToolKitPlus::MARKER_ID_BCH);
}

int detect(unsigned char *data) {
	printf("Detect\n");
	int				tmpNumDetected;
	ARToolKitPlus::ARMarkerInfo    *tmp_markers;
	if (tracker->arDetectMarker(data, tracker->getThreshold(), &tmp_markers, &tmpNumDetected) < 0)
		return 0;
	return tmpNumDetected;
}
  
int main(int argc, char** argv)
{
    const int     width = 320, height = 240, bpp = 1;
    size_t        numPixels = width*height*bpp;
    size_t        numBytesRead;
    const char    *fName = "data/image_320_240_8_marker_id_bch_nr0100.raw";
    unsigned char *cameraBuffer = new unsigned char[numPixels];

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

	init(width, height);
	detect(cameraBuffer);

    delete [] cameraBuffer;
	delete tracker;
	return 0;
}
