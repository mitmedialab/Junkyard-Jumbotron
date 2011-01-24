

//
//
//  This tool will read ARToolKit pattern files (size 16x16) and save
//  them mirrored in y-direction.
//
//  Usage: MirrorPatt [infilename] [outfilename]
//
//

#include <stdio.h>
#include <assert.h>



void
readLine(FILE* fp, char* line)
{
	*line++ = fgetc(fp);

	while(line[-1] != '\n')
		*line++ = fgetc(fp);

	*line++ = 0;
}


void mirrorMarkerFile(const char* nInName, const char* nOutName, int nMarkerWidth, int nMarkerHeight)
{
	FILE	*finp = fopen(nInName, "r"),
			*foutp = fopen(nOutName, "w");

	if(!finp)
		return;

	const int strMax = 256, numPix = nMarkerWidth*nMarkerHeight;
	char str[32][strMax+1];
	int y,channel,rot;

	for(rot=0; rot<4; rot++)
	{
		for(channel=0; channel<3; channel++)
		{
			for(y=0; y<nMarkerHeight; y++)
			{
				readLine(finp, str[y]);
			}

			for(y=0; y<nMarkerHeight; y++)
			{
				fprintf(foutp, "%s", str[nMarkerHeight-1-y]);
//				fprintf(foutp, "%s", str[y]);
			}
		}

		readLine(finp, str[0]);
		fprintf(foutp, "\n");
	}

	fclose(finp);
	fclose(finp);
}


int main(int argc, char** argv)
{
	if(argc<3)
	{
		printf("ERROR: to few parameters\n");
		return -1;
	}

	const char	*inName = argv[1],
				*outName = argv[2];

	mirrorMarkerFile(inName, outName, 16,16);
	return 0;
}
