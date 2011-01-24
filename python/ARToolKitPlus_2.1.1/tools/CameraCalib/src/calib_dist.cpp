#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <malloc.h>
//#include <ARToolKitPlus/param.h>
//#include <ARToolKitPlus/matrix.h>

#include <ARToolKitPlus/Tracker.h>

#include "calib_camera.h"

static ARFloat   get_fitting_error( CALIB_PATT_T *patt, ARFloat dist_factor[4] );
static ARFloat   check_error( ARFloat *x, ARFloat *y, int num, ARFloat dist_factor[4] );
static ARFloat   calc_distortion2( CALIB_PATT_T *patt, ARFloat dist_factor[4] );
static ARFloat   get_size_factor( ARFloat dist_factor[4], int xsize, int ysize );

void calc_distortion( CALIB_PATT_T *patt, int xsize, int ysize, ARFloat dist_factor[4] )
{
    int     i, j;
    ARFloat  bx, by;
    ARFloat  bf[4];
    ARFloat  error, min;
    ARFloat  factor[4];

    bx = xsize / (ARFloat)2;
    by = ysize / (ARFloat)2;
    factor[0] = bx;
    factor[1] = by;
    factor[3] = (ARFloat)1.0;
    min = calc_distortion2( patt, factor );
    bf[0] = factor[0];
    bf[1] = factor[1];
    bf[2] = factor[2];
    bf[3] = 1.0;
printf("[%5.1f, %5.1f, %5.1f] %f\n", bf[0], bf[1], bf[2], min);
    for( j = -10; j <= 10; j++ ) {
        factor[1] = by + j*5;
        for( i = -10; i <= 10; i++ ) {
            factor[0] = bx + i*5;
            error = calc_distortion2( patt, factor );
            if( error < min ) { bf[0] = factor[0]; bf[1] = factor[1];
                                bf[2] = factor[2]; min = error; }
        }
printf("[%5.1f, %5.1f, %5.1f] %f\n", bf[0], bf[1], bf[2], min);
    }

    bx = bf[0];
    by = bf[1];
    for( j = -10; j <= 10; j++ ) {
        factor[1] = by + (ARFloat)0.5 * j;
        for( i = -10; i <= 10; i++ ) {
            factor[0] = bx + (ARFloat)0.5 * i;
            error = calc_distortion2( patt, factor );
            if( error < min ) { bf[0] = factor[0]; bf[1] = factor[1];
                                bf[2] = factor[2]; min = error; }
        }
printf("[%5.1f, %5.1f, %5.1f] %f\n", bf[0], bf[1], bf[2], min);
    }

    dist_factor[0] = bf[0];
    dist_factor[1] = bf[1];
    dist_factor[2] = bf[2];
    dist_factor[3] = get_size_factor( bf, xsize, ysize );
}

static ARFloat get_size_factor(ARFloat dist_factor[4], int xsize, int ysize )
{
    ARFloat ox, oy, ix, iy;
    ARFloat olen, ilen;
    ARFloat sf, sf1;

    sf = 100.0;

    ox = 0.0;
    oy = dist_factor[1];
    olen = dist_factor[0];
	ARToolKitPlus::Tracker::arParamObserv2Ideal( dist_factor, ox, oy, &ix, &iy );
    ilen = dist_factor[0] - ix;
printf("Olen = %f, Ilen = %f\n", olen, ilen);
    if( ilen > 0 ) {
        sf1 = ilen / olen;
        if( sf1 < sf ) sf = sf1;
    }

    ox = (ARFloat)xsize;
    oy = dist_factor[1];
    olen = xsize - dist_factor[0];
    ARToolKitPlus::Tracker::arParamObserv2Ideal( dist_factor, ox, oy, &ix, &iy );
    ilen = ix - dist_factor[0];
printf("Olen = %f, Ilen = %f\n", olen, ilen);
    if( ilen > 0 ) {
        sf1 = ilen / olen;
        if( sf1 < sf ) sf = sf1;
    }

    ox = dist_factor[0];
    oy = 0.0;
    olen = dist_factor[1];
    ARToolKitPlus::Tracker::arParamObserv2Ideal( dist_factor, ox, oy, &ix, &iy );
    ilen = dist_factor[1] - iy;
printf("Olen = %f, Ilen = %f\n", olen, ilen);
    if( ilen > 0 ) {
        sf1 = ilen / olen;
        if( sf1 < sf ) sf = sf1;
    }

    ox = dist_factor[0];
    oy = (ARFloat)ysize;
    olen = ysize - dist_factor[1];
    ARToolKitPlus::Tracker::arParamObserv2Ideal( dist_factor, ox, oy, &ix, &iy );
    ilen = iy - dist_factor[1];
printf("Olen = %f, Ilen = %f\n", olen, ilen);
    if( ilen > 0 ) {
        sf1 = ilen / olen;
        if( sf1 < sf ) sf = sf1;
    }

    if( sf == 0.0 ) sf = 1.0;

    return sf;
}

static ARFloat calc_distortion2( CALIB_PATT_T *patt, ARFloat dist_factor[4] )
{
    ARFloat    min, err, f, fb;
    int       i;

    dist_factor[2] = 0.0;
    min = get_fitting_error( patt, dist_factor );

    f = dist_factor[2];
    for( i = -100; i < 200; i+=10 ) {
        dist_factor[2] = (ARFloat)i;
        err = get_fitting_error( patt, dist_factor );
        if( err < min ) { min = err; f = dist_factor[2]; }
    }

    fb = f;
    for( i = -10; i <= 10; i++ ) {
        dist_factor[2] = fb + i;
        //if( dist_factor[2] < 0 ) continue;
        err = get_fitting_error( patt, dist_factor );
        if( err < min ) { min = err; f = dist_factor[2]; }
    }

    fb = f;
    for( i = -10; i <= 10; i++ ) {
        dist_factor[2] = fb + (ARFloat)0.1 * i;
        //if( dist_factor[2] < 0 ) continue;
        err = get_fitting_error( patt, dist_factor );
        if( err < min ) { min = err; f = dist_factor[2]; }
    }

    dist_factor[2] = f;
    return min;
}

static ARFloat get_fitting_error( CALIB_PATT_T *patt, ARFloat dist_factor[4] )
{
    ARFloat   *x, *y;
    ARFloat   error;
    int      max;
    int      i, j, k, l;
    int      p, c;

    max = (patt->v_num > patt->h_num)? patt->v_num: patt->h_num;
    x = (ARFloat *)malloc( sizeof(ARFloat)*max );
    y = (ARFloat *)malloc( sizeof(ARFloat)*max );
    if( x == NULL || y == NULL ) exit(0);

    error = 0.0;
    c = 0;
    for( i = 0; i < patt->loop_num; i++ ) {
        for( j = 0; j < patt->v_num; j++ ) {
            for( k = 0; k < patt->h_num; k++ ) {
                x[k] = patt->point[i][j*patt->h_num+k].x_coord;
                y[k] = patt->point[i][j*patt->h_num+k].y_coord;
            }
            error += check_error( x, y, patt->h_num, dist_factor );
            c += patt->h_num;
        }

        for( j = 0; j < patt->h_num; j++ ) {
            for( k = 0; k < patt->v_num; k++ ) {
                x[k] = patt->point[i][k*patt->h_num+j].x_coord;
                y[k] = patt->point[i][k*patt->h_num+j].y_coord;
            }
            error += check_error( x, y, patt->v_num, dist_factor );
            c += patt->v_num;
        }

        for( j = 3 - patt->v_num; j < patt->h_num - 2; j++ ) {
            p = 0;
            for( k = 0; k < patt->v_num; k++ ) {
                l = j+k;
                if( l < 0 || l >= patt->h_num ) continue;
                x[p] = patt->point[i][k*patt->h_num+l].x_coord;
                y[p] = patt->point[i][k*patt->h_num+l].y_coord;
                p++;
            }
            error += check_error( x, y, p, dist_factor );
            c += p;
        }

        for( j = 2; j < patt->h_num + patt->v_num - 3; j++ ) {
            p = 0;
            for( k = 0; k < patt->v_num; k++ ) {
                l = j-k;
                if( l < 0 || l >= patt->h_num ) continue;
                x[p] = patt->point[i][k*patt->h_num+l].x_coord;
                y[p] = patt->point[i][k*patt->h_num+l].y_coord;
                p++;
            }
            error += check_error( x, y, p, dist_factor );
            c += p;
        }
    }

    free( x );
    free( y );

    return (ARFloat)sqrt(error/c);
}

static ARFloat check_error( ARFloat *x, ARFloat *y, int num, ARFloat dist_factor[4] )
{
	ARToolKitPlus::ARMat    *input, *evec;
    ARToolKitPlus::ARVec    *ev, *mean;
    ARFloat   a, b, c;
    ARFloat   error;
    int      i;

    ev     = ARToolKitPlus::Vector::alloc( 2 );
    mean   = ARToolKitPlus::Vector::alloc( 2 );
    evec   = ARToolKitPlus::Matrix::alloc( 2, 2 );

    input  = ARToolKitPlus::Matrix::alloc( num, 2 );
    for( i = 0; i < num; i++ ) {
        ARToolKitPlus::Tracker::arParamObserv2Ideal( dist_factor, x[i], y[i],
                             &(input->m[i*2+0]), &(input->m[i*2+1]) );
    }
    if( ARToolKitPlus::Tracker::arMatrixPCA(input, evec, ev, mean) < 0 ) exit(0);
    a =  evec->m[1];
    b = -evec->m[0];
    c = -(a*mean->v[0] + b*mean->v[1]);

    error = 0.0;
    for( i = 0; i < num; i++ ) {
        error += (a*input->m[i*2+0] + b*input->m[i*2+1] + c)
               * (a*input->m[i*2+0] + b*input->m[i*2+1] + c);
    }
    error /= (a*a + b*b);

    ARToolKitPlus::Matrix::free( input );
    ARToolKitPlus::Matrix::free( evec );
    ARToolKitPlus::Vector::free( mean );
    ARToolKitPlus::Vector::free( ev );

    return error;
}
