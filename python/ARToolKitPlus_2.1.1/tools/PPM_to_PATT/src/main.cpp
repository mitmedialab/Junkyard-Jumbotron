//
//
//  This tool will read a portable pixmap file (binary only) and save
//  it as an ARToolKit pattern file.
//
//  Usage: PPM_to_PATT [infilename] [outfilename]
//
//  Author: Antonio Bleile, Seac02 S.r.l
//

#include <stdio.h>
#include <assert.h>
#include <stdlib.h>
#include <memory.h>


/* skip comments starting wit # */

void
skipComments(FILE* fp, char *word)
{
    char dummyChar;

    while( true ){
        if( fscanf(fp, "%s", word) ){
            if (word[0]=='#'){
                // line is a comment, eat up all chars till the end of line

                while( fscanf( fp, "%c", &dummyChar ) && dummyChar != '\n' )
                    ;
            }else
                return; // line did not start with a comment
        }else
            return; // eof reached
    }
}

/* read a ppm P6 (binary) image */
bool
readPPM( const char *fileName, unsigned char **data, int *width, int *height )
{
    int n, dummyInt;
    char word[1024];
    char cP, c6;
    FILE* fp = fopen(fileName, "rb");

    if(!fp){
        printf( "could not open %s for reading\n", fileName );
        return false;
    }

    // read magic number P6
    cP = fgetc( fp );
    c6 = fgetc( fp );

    if( cP != 'P' || c6 != '6'){
        printf( "%s is not a ppm P6 file!\n", fileName );
        return false;
    }

    // skip comments
    skipComments( fp, word );

    // read width and height
    sscanf( word, "%d", width );
    fscanf( fp, "%d", height );

    // skip comments
    skipComments( fp, word );

    //read number of colors, almost always 255, ignored!
    sscanf( word, "%d", &dummyInt );
    fgetc( fp ); // eat up newline

    int chunkSize = (*width)*(*height)*3*sizeof( unsigned char );
    if( *data == NULL )
        *data = new unsigned char[(*width)*(*height)*3];

    // read actual image data
    n = fread( *data, 1, chunkSize, fp );

    if( n != chunkSize ){
        printf( "read %d bytes, expected %d bytes, file truncated?\n", n,
chunkSize );
        return false;
    }

    fclose( fp );

    return true;
}

/* rotate left the data */
void
rotate( unsigned char *data, int width, int height )
{
    // rotate left
    int i, j;
    unsigned char *tmp = new unsigned char[width*height*3];

    for( i = 0; i < width; ++i )
        for( j = 0; j < height; ++j ){
            tmp[((width-i-1)*height+j)*3]   = data[(j*width+i)*3];
            tmp[((width-i-1)*height+j)*3+1] = data[(j*width+i)*3+1];
            tmp[((width-i-1)*height+j)*3+2] = data[(j*width+i)*3+2];
        }

    memcpy(data, tmp, width*height*3*sizeof(unsigned char));

    delete tmp;
}

/* write artoolkit marker pattern */
bool
writeMarkerFile(const char *fileName, unsigned char *data, int width, int
height)
{
    FILE *fp;
    int i, j, y, x, tmp;
    unsigned char *src;

    fp = fopen( fileName, "w" );
    if( fp == NULL ) return false;

    src = new unsigned char[width*height*3];
    memcpy( src, data, width*height*3*sizeof(unsigned char));

    for( i = 0; i < 4; i++ ) {
        for( j = 0; j < 3; j++ ) {
            for( y = 0; y < height; y++ ) {
                for( x = 0; x < width; x++ ) {
                    fprintf( fp, "%4d", src[(y*width+x)*3+j] );
                }
                fprintf(fp, "\n");
            }
        }
        fprintf(fp, "\n");

        // rotate left pattern
        rotate( src, width, height );

        // swap width and height
        tmp = width;
        width = height;
        height = tmp;
    }

    fclose( fp );
    delete src;

    return true;
}

/* convert RGB to BGR */
void
convert2BGR( unsigned char *data, int width, int height )
{
    int i, j;
    unsigned char tmp;

    // just swap R and B

    for( i = 0; i < width; ++i )
        for( j = 0; j < height; ++j ){
            tmp = data[(j*width+i)*3];
            data[(j*width+i)*3] = data[(j*width+i)*3+2];
            data[(j*width+i)*3+2] = tmp;
        }
}

int
main(int argc, char** argv)
{
    unsigned char *ppmData = NULL;
    int width = 0, height = 0;

    if(argc<3)
    {
        printf("ERROR: too few parameters\n");
        printf("Usage: %s ppm_infilename pattern_outfilename\n", argv[0] );
        printf("Example: %s patt_custom.ppm patt.custom\n", argv[0] );
        return -1;
    }

    const char    *inName = argv[1],
                *outName = argv[2];


    if( !readPPM(inName, &ppmData, &width, &height) )
        return -1;

    // not sure about this!
    convert2BGR( ppmData, width, height );

    if( ppmData )
        writeMarkerFile( outName, ppmData, width, height );

    return 0;
}
