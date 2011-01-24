//
// A simple C glue layer between ARToolKitPlus (ARTK+) and python.
//

#include "ARToolKitPlus/TrackerSingleMarkerImpl.h"

// ----------------------------------------------------------------------
// Logger
// ARTK+ uses this class for informational messages.

class Logger : public ARToolKitPlus::Logger {
    void artLog(const char* nStr) {
        printf("%s", nStr);
    }
};

// ----------------------------------------------------------------------
// Camera
// A dummy ARTK+ camera using the iphone-camera specifications.  We need to use
// a subclass for access to protected member undist_iterations

class Camera : public ARToolKitPlus::CameraAdvImpl {
  public:
	Camera(int width, int height) {

		// Iphone values from here:
		// www.flickr.com/groups/takenwithiphone/discuss/72157610993645448/
		float film_size = 6.35;			// Sensor width in mm (1/4in)
		float focal_length = 3.85;		// Focal length in mm

		// To calculate fov (see en.wikipedia.org/wiki/Angle_of_view):
		// fov = 2 * atan2(film_size, 2 * focal_length);
		float focal_length_h = width  * focal_length / film_size;
		float focal_length_v = focal_length_h;// * height / width;
		// TODO: For unknown reason I have to use the same focal length and width here

		xsize = width;
		ysize = height;
		for(int i = 0; i < 3; i++)
			for(int j = 0; j < 4; j++)
				mat[i][j] = 0;
		mat[0][0] = fc[0] = focal_length_h;
		mat[1][1] = fc[1] = focal_length_v;
		mat[0][2] = cc[0] = xsize/2.0f;
		mat[1][2] = cc[1] = ysize/2.0f;
		mat[2][2] = 1.0f;
		
		kc[0] = kc[1] = kc[2] = kc[3] = kc[4] = kc[5] = 0;
		undist_iterations = 1;
	}
};

// ----------------------------------------------------------------------
// Tracker
// The actual tracker, needed for access to protected method checkPixelFormat

class Tracker : public ARToolKitPlus::TrackerSingleMarkerImpl<6,6,1024, 1, 32> {
  public:
	Tracker(int width, int height, bool debug) :
		ARToolKitPlus::TrackerSingleMarkerImpl<6,6,1024, 1, 32>(width, height) {
		// Set logger
		if (debug)
			setLogger(new Logger());
	}

	virtual bool init() {
		// Work with luminance images
		setPixelFormat(ARToolKitPlus::PIXEL_FORMAT_LUM);
		if ( ! checkPixelFormat()) {	
			if (logger)
				logger->artLog("ARToolKitPlus: Invalid Pixel Format!");
			return false;
		}

		// Memory
		if (marker_infoTWO == NULL)
			marker_infoTWO = ARToolKitPlus::artkp_Alloc<ARToolKitPlus::ARMarkerInfo2>(32);

		// Camera
		Camera *camera = new Camera(screenWidth, screenHeight);
		setCamera(camera, 1, 1000);

		// const ARFloat* mat = getProjectionMatrix();
		// printf("Proj mat\n");
		// for(int j=0; j<4; j++) {
		// 	for(int i=0; i<4; i++) {
		// 		printf ("%f, ", mat[i*4 + j]);
		// 	}
		// 	printf ("\n");
		// }

		// Work at full res
		setImageProcessingMode(ARToolKitPlus::IMAGE_FULL_RES);

		// Set border
		setBorderWidth(0.125);

		// Set threshold and activate automatic threshold
		setThreshold(160);
		activateAutoThreshold(true);
		setNumAutoThresholdRetries(2);

		// Switch to BCH ID based markers
		setMarkerMode(ARToolKitPlus::MARKER_ID_BCH);

		// Choose pose estimator
		setPoseEstimator(ARToolKitPlus::
						 //POSE_ESTIMATOR_ORIGINAL);
						 //POSE_ESTIMATOR_ORIGINAL_CONT);
						 POSE_ESTIMATOR_RPP);

		return true;
	}

	ARToolKitPlus::ARMarkerInfo *getMarker(int which) {
		return which < wmarker_num ? &wmarker_info[which] : NULL;
	}
};

// ----------------------------------------------------------------------
// C API

extern "C" {

// Create a new tracker for images of a given size.
Tracker *create(int width, int height, bool debug) {
    Tracker *tracker = new Tracker(width, height, debug);
	if (! tracker->init()) {
		delete tracker;
		tracker = NULL;
	}
	return tracker;
}

// Destroy a tracker
void destroy(Tracker *tracker) {
	delete tracker;
}

// Set the tracker luminance and auto thresholds.
void set_thresholds(Tracker *tracker,
					int threshold, bool autothreshold, int autoretries) {
	tracker->setThreshold(threshold);
	tracker->activateAutoThreshold(autothreshold);
	tracker->setNumAutoThresholdRetries(autoretries);
}

// Return a marker
ARToolKitPlus::ARMarkerInfo *get_marker(Tracker *tracker, int which) {
	return tracker->getMarker(which);
}

// Return the transform associated with a marker
void get_marker_transform(Tracker *tracker, ARToolKitPlus::ARMarkerInfo *marker,
						  float* matrix) {
	float patt_center[2] = {0.0f,0.0f};
	float patt_size = 1.0f;
	tracker->calcOpenGLMatrixFromMarker(marker, patt_center, patt_size, matrix);
}

// Print the markers found by the tracker
void print_markers(Tracker *tracker, int num) {
	printf("found %d markers\n", num);
	for(int i=0; i<num; i++) {
		ARToolKitPlus::ARMarkerInfo *m = get_marker(tracker, i);
		printf("%d:\n", i);
		printf("\tcf %f\n", m->cf);
		//		if (m->cf > 0) {
			printf("\tarea %d\n", m->area);
			printf("\tid %d\n", m->id);
			printf("\tdir %d\n", m->dir);
			printf("\tpos %f, %f\n", m->pos[0], m->pos[1]);
			for (int j = 0; j < 4; j++)
				printf("\tline %d  %f, %f, %f\n", j,
					   m->line[j][0], m->line[j][1], m->line[j][2]);
			for (int j = 0; j < 4; j++)
				printf("\tver %d  %f, %f\n", j, m->vertex[j][0], m->vertex[j][1]);
			//		}
	}
}

// Detect markers in an image
int detect(Tracker *tracker, unsigned char *data) {
	ARToolKitPlus::ARMarkerInfo *markers = NULL;
	int num = 0;
	if (tracker->arDetectMarkerLite(data, tracker->getThreshold(), &markers, &num) < 0)
		return 0;
	//print_markers(tracker, num);
	return num;
}

} // extern "C"


// Testing

int main(int argc, char** argv) {
    const int     width = 320, height = 240, bpp = 1;
    size_t        numPixels = width*height*bpp;
    size_t        numBytesRead;
    const char    *fName = "resources/test_calib.raw";
    unsigned char *cameraBuffer = new unsigned char[numPixels];

    if (FILE* fp = fopen(fName, "rb")) {
        numBytesRead = fread(cameraBuffer, 1, numPixels, fp);
        fclose(fp);
    }
    else {
        printf("Failed to open %s\n", fName);
        delete cameraBuffer;
        return -1;
    }

    if (numBytesRead != numPixels) {
        printf("Failed to read %s\n", fName);
        delete cameraBuffer;
        return -1;
    }

	Tracker *tracker = (Tracker*) create(width, height, true);
	int num = detect(tracker, cameraBuffer);
	print_markers(tracker, num);
	destroy(tracker);

    delete [] cameraBuffer;
	return 0;
}
