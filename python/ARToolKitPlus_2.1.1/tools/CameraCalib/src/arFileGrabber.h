 

#ifndef __ARFILEGRABBER_HEADERFILE__
#define __ARFILEGRABBER_HEADERFILE__


class ARFileGrabber  
{
public:
	ARFileGrabber(const char* nFileName, int nWidth=320, int nHeight=240, int nByterPerComp=4);
	virtual ~ARFileGrabber  ();

	void Init(int /*deviceId*/)  {}

	//void BindFilter(int deviceId, IBaseFilter **pFilter);
	//void GrabFrame(long* size, long** pBuffer);
	void GrabFrame();
	//void Grab32BitFrame();


	//long  GetBufferSize() {return bufferSize;}
	long* GetBuffer() {  return (long*)buffer;  }

	void SetFlippedImage(bool /*flag*/) {}

	void DisplayProperties();
	//void EnumDevices(DeviceInfo *head);

	void NextFile();

protected:
	int width,height;
	unsigned char* buffer;
	int bufferlen;
	bool showedWarning;

	char* filename;

	int fileIdx, oldIdx;
};


#endif //__ARFILEGRABBER_HEADERFILE__
