#ifndef CALIB_DIST_H
#define CALIB_DIST_H

#define  H_NUM        6
#define  V_NUM        4
#define  LOOP_MAX    20
#define  THRESH     200

typedef struct {
    ARFloat   x_coord;
    ARFloat   y_coord;
} CALIB_COORD_T;

typedef struct patt {
    unsigned char  *savedImage[LOOP_MAX];
    CALIB_COORD_T  *world_coord;
    CALIB_COORD_T  *point[LOOP_MAX];
    int            h_num;
    int            v_num;
    int            loop_num;
} CALIB_PATT_T;

void calc_distortion( CALIB_PATT_T *patt, int xsize, int ysize, ARFloat dist_factor[3] );
int  calc_inp( CALIB_PATT_T *patt, ARFloat dist_factor[4], int xsize, int ysize, ARFloat mat[3][4] );

#endif
