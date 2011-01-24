#ifndef NODE_CONFIG_H
#define NODE_CONFIG_H

#define NODE_CFLAGS "-rdynamic -D_GNU_SOURCE -DHAVE_CONFIG_H=1 -pthread -arch x86_64 -g -O3 -DHAVE_OPENSSL=1 -DEV_FORK_ENABLE=0 -DEV_EMBED_ENABLE=0 -DEV_MULTIPLICITY=0 -DX_STACKSIZE=65536 -D_LARGEFILE_SOURCE -D_FILE_OFFSET_BITS=64 -DEV_MULTIPLICITY=0 -DHAVE_FDATASYNC=0 -DPLATFORM=\"darwin\" -D__POSIX__=1 -Wno-unused-parameter -D_FORTIFY_SOURCE=2 -DNDEBUG -I/Users/BK30/Documents/Work/BrownBag/jumbotron-0.2/dep/include/node"
#define NODE_PREFIX "/Users/BK30/Documents/Work/BrownBag/jumbotron-0.2/dep"

#endif /* NODE_CONFIG_H */
