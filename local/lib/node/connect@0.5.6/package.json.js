module.exports = {
  "name": "connect",
  "description": "High performance middleware framework",
  "version": "0.5.6",
  "contributors": [
    {
      "name": "TJ Holowaychuk",
      "email": "tj@vision-media.ca"
    },
    {
      "name": "Tim Caswell",
      "email": "tim@sencha.com"
    }
  ],
  "directories": {
    "lib": "./lib/connect"
  },
  "engines": {
    "node": ">= 0.2.2"
  },
  "_id": "connect@0.5.6",
  "_engineSupported": true,
  "_npmVersion": "0.2.15",
  "_nodeVersion": "v0.3.7-pre",
  "modules": {
    "index.js": "lib/connect/index.js",
    "utils.js": "lib/connect/utils.js",
    "public/error.html": "lib/connect/public/error.html",
    "public/favicon.ico": "lib/connect/public/favicon.ico",
    "public/style.css": "lib/connect/public/style.css",
    "middleware/basicAuth.js": "lib/connect/middleware/basicAuth.js",
    "middleware/bodyDecoder.js": "lib/connect/middleware/bodyDecoder.js",
    "middleware/cache.js": "lib/connect/middleware/cache.js",
    "middleware/cacheManifest.js": "lib/connect/middleware/cacheManifest.js",
    "middleware/compiler.js": "lib/connect/middleware/compiler.js",
    "middleware/conditionalGet.js": "lib/connect/middleware/conditionalGet.js",
    "middleware/cookieDecoder.js": "lib/connect/middleware/cookieDecoder.js",
    "middleware/errorHandler.js": "lib/connect/middleware/errorHandler.js",
    "middleware/favicon.js": "lib/connect/middleware/favicon.js",
    "middleware/gzip-compress.js": "lib/connect/middleware/gzip-compress.js",
    "middleware/gzip-proc.js": "lib/connect/middleware/gzip-proc.js",
    "middleware/gzip.js": "lib/connect/middleware/gzip.js",
    "middleware/lint.js": "lib/connect/middleware/lint.js",
    "middleware/logger.js": "lib/connect/middleware/logger.js",
    "middleware/methodOverride.js": "lib/connect/middleware/methodOverride.js",
    "middleware/repl.js": "lib/connect/middleware/repl.js",
    "middleware/router.js": "lib/connect/middleware/router.js",
    "middleware/session.js": "lib/connect/middleware/session.js",
    "middleware/staticGzip.js": "lib/connect/middleware/staticGzip.js",
    "middleware/staticProvider.js": "lib/connect/middleware/staticProvider.js",
    "middleware/vhost.js": "lib/connect/middleware/vhost.js",
    "middleware/session/memory.js": "lib/connect/middleware/session/memory.js",
    "middleware/session/session.js": "lib/connect/middleware/session/session.js",
    "middleware/session/store.js": "lib/connect/middleware/session/store.js"
  },
  "files": [
    ""
  ],
  "_defaultsLoaded": true,
  "dist": {
    "shasum": "057bb52d7fe527abe0dc9b112eb94c1326a77097",
    "tarball": "http://registry.npmjs.org/connect/-/connect-0.5.6.tgz"
  },
  "_bundledDeps": [],
  "_resolvedDeps": [],
  "_npmConfig": {
    "showlevel": 1,
    "argv": {
      "remain": [
        "express",
        "connect@>= 0.3.0"
      ],
      "cooked": [
        "install",
        "express"
      ],
      "original": [
        "install",
        "express"
      ]
    },
    "registry": "http://registry.npmjs.org/",
    "auto-activate": "always",
    "auto-deactivate": true,
    "binroot": "dep/bin",
    "browser": "open",
    "color": true,
    "description": true,
    "dev": false,
    "force": false,
    "globalconfig": "dep/etc/npmrc",
    "gzipbin": "gzip",
    "listopts": "",
    "logfd": 2,
    "loglevel": "info",
    "manroot": "dep/share/man",
    "must-install": true,
    "outfd": 1,
    "proxy": null,
    "rebuild-bundle": true,
    "recursive": false,
    "root": "dep/lib/node",
    "tag": "latest",
    "tar": "tar",
    "tmproot": "/var/folders/tQ/tQPTAN9gF-4tWJxTdAMZok+++TI/-Tmp-/",
    "update-dependents": true,
    "userconfig": "/Users/BK30/.npmrc"
  },
  "_env": {
    "PWD": "/Users/BK30/Documents/Work/BrownBag/jumbotron-0.2",
    "OLDPWD": "/Users/BK30/Documents/Work/BrownBag/jumbotron-0.2/dep",
    "LINES": "52",
    "COLUMNS": "95",
    "TERM": "dumb",
    "pyglet": "/Library/Frameworks/Python.framework/Versions/Current/lib/python2.6/site-packages/pyglet",
    "python": "/Library/Frameworks/Python.framework/Versions/Current/lib/python2.6",
    "INFOPATH": "/Applications/Emacs.app/Contents/Resources/info:",
    "EMACSDOC": "/Applications/Emacs.app/Contents/Resources/etc",
    "EMACSDATA": "/Applications/Emacs.app/Contents/Resources/etc",
    "EMACSPATH": "/Applications/Emacs.app/Contents/MacOS/bin",
    "EMACSLOADPATH": "/Applications/Emacs.app/Contents/Resources/site-lisp:/Applications/Emacs.app/Contents/Resources/lisp:/Applications/Emacs.app/Contents/Resources/leim",
    "__CF_USER_TEXT_ENCODING": "0x1F5:0:0",
    "COMMAND_MODE": "unix2003",
    "Apple_PubSub_Socket_Render": "/tmp/launch-OIgOvj/Render",
    "SSH_AUTH_SOCK": "/tmp/launch-zrmseW/Listeners",
    "DISPLAY": "/tmp/launch-lXc9H4/org.x:0",
    "LOGNAME": "BK30",
    "USER": "BK30",
    "HOME": "/Users/BK30",
    "SHELL": "/bin/bash",
    "TMPDIR": "/var/folders/tQ/tQPTAN9gF-4tWJxTdAMZok+++TI/-Tmp-/",
    "PATH": "dep/bin:/sw/bin:/sw/sbin:/usr/local/bin:/usr/local/git/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    "COPY_EXTENDED_ATTRIBUTES_DISABLE": "1"
  },
  "_npmPaths": {
    "root": "dep/lib/node",
    "dir": "dep/lib/node/.npm",
    "cache": "dep/lib/node/.npm/.cache",
    "tmp": "/var/folders/tQ/tQPTAN9gF-4tWJxTdAMZok+++TI/-Tmp-/npm-1295903282164",
    "package": "dep/lib/node/.npm/connect/0.5.6/package",
    "modules": "dep/lib/node/connect@0.5.6",
    "dependencies": "dep/lib/node/.npm/connect/0.5.6/node_modules"
  }
}
