"""Jumbotron database module.

Give access to the database. Can be run directly from the command line
to print or reset the database.
"""

import os
from datetime import datetime
import logging
import sqlite3
import params
from dbtypes import JumbotronMode, Rect

# Register adapters and converters
sqlite3.register_adapter(Rect, Rect.__repr__)
sqlite3.register_converter("rect", Rect.parse)

class Row(sqlite3.Row):
    """SQL return row with attributes corresponding to each returned column."""
    def __getattr__(self, name):
        return self[name]

class Db(object):
    """Interface to the underlying jumbotron database"""

    _schema = """
        create table jumbotrons(
                name text primary key,  -- name
                sid text,               -- session id
                mode int,               -- mode (calibrating, displaying, ...)
                image text,             -- image file being displayed
                aspectratio float,      -- aspect ratio
                fitmode int default 0,  -- how to fit the viewport
                viewport rect,          -- view into image (pixels)
                direction int default 0,-- 0=up, 1=90deg, 2=180deg, 3=270deg
                createtime timestamp,   -- creation time
                modtime timestamp       -- last modification time
        );
        create table displays(
                sid text primary key,   -- session id
                jumbotron text,         -- name of jumbotron
                idx int,                -- unique identifier in the jumbotron
                aspectratio float,      -- aspect ratio
                viewport rect,          -- view into jumbotron (normalized)
                direction int default 0,-- 0=up, 1=-90deg, 2=180deg, 3=90deg
                conntime timestamp,     -- connection time
                modtime timestamp       -- last modification time
        );
        """
    def __init__(self, db_file=params.database_file):
        exists = os.path.exists(db_file)
        self.con = sqlite3.connect(db_file,
                                   detect_types=sqlite3.PARSE_DECLTYPES)
        self.con.row_factory = Row
        if not exists:
            self.create()
            self.con.commit()

    def create(self):
        """Build the database tables."""
        logging.info("Building database")
        self.con.executescript(self._schema)

    def reset(self):
        """Clear the database and rebuild the tables."""
        try:
            self.con.execute("drop table jumbotrons")
            self.con.execute("drop table displays")
        except sqlite3.OperationalError:
            pass # Ignore nonexistent tables
        self.create()
        self.con.commit()

    def get_jumbotrons(self):
        """Return a list of all the jumbotrons ordered by creation time."""
        return self.con.execute("select * from jumbotrons order by createtime")

    def get_jumbotron(self, jid):
        """Return the jumbotron specified by name or session-id."""
        cur = self.con.execute("select * from jumbotrons where sid=? or name=?",
                               (jid,jid))
        return cur.fetchone()

    def get_displays(self, jumbotron=None):
        """Return a list of all displays connected to the given jumbotron.
           'jumbotron' can be either a string or a row returned from a
           previous SQL call. If "jumbotron" is None, return a list of
           all displays in the database ordered by jumbotron name.
        """
        if jumbotron:
            name = (jumbotron if isinstance(jumbotron, basestring) else
                    jumbotron.name)
            return self.con.execute(
                "select * from displays where jumbotron=? order by idx",
                (name,))
        return self.con.execute("select * from displays order by jumbotron")

    def get_display(self, sid):
        """Return the display specified by the session-id."""
        cur = self.con.execute("select * from displays where sid=?", (sid,))
        return cur.fetchone()

    def create_jumbotron(self, sid, name):
        """Create a new jumbotron with the given session-id and name.
           The new jumbotron starts in the 'calibrate' mode.
           Raise an exception if a jumbotron with that name already exists.
        """
        now = datetime.now()
        try:
            self.con.execute(
                """insert into jumbotrons(name, sid, mode, createtime, modtime) 
                   values (?, ?, ?, ?, ?)""",
                (name, sid, JumbotronMode.CALIBRATING, now, now))
        except sqlite3.IntegrityError:
            raise ValueError("jumbotron with that name already exists")
        else:
            self.con.commit()

    def create_display(self, sid, jumbotron):
        """Create a new display with the given session-id and jumbotron.
           Raise an exception if the jumbotron doesn't exist.
        """
        # TODO/SPEED: Combine these into 1 or 2 sql requests

        # Check if jumbotron exists
        if isinstance(jumbotron, basestring):
            jumbotron = self.get_jumbotron(jumbotron)
            if not jumbotron:
                raise ValueError("no jumbotron exists with that name")

        # Check for existant display joined to the same jumbotron
        display = self.get_display(sid)
        if display and display.jumbotron == jumbotron.name:
            return

        # Create/replace the display
        now = datetime.now()
        self.con.execute(
            """replace into displays(sid, jumbotron, conntime, modtime, idx)
               values (?, ?, ?, ?,
                       (select count (*) from displays where jumbotron=?))""",
            (sid, jumbotron.name, now, now, jumbotron.name))
        logging.info("Created display for jumbotron %s", jumbotron)
        self.con.commit()

    def _update_table(self, table, idname, idvalue, **kwargs) :
        """Update the columns in the specified table row."""
        cmd = "".join(("update ", table, " set ",
                       "=?,".join(kwargs.keys()),
                       "=? where ", idname, "=?"))
        args = list(kwargs.values())
        args.append(idvalue)
        self.con.execute(cmd, args)
        self.con.commit()

    def update_jumbotron(self, jumbotron, **kwargs):
        """Update the jumbotron with the specified values and commit to the db.
            update_jumbotron(jumbotron, a=1, b=2)
        is equivalent to:
            jumbotron.a = 1
            jumbotron.b = 2
            commit_jumbotron(jumbotron)
         """
        jumbotron.__dict__.update(kwargs)
        self.commit_jumbotron(jumbotron)

    def update_display(self, display, **kwargs):
        """Update the display with the specified values and commit to the db.
            update_display(display, a=1, b=2)
        is equivalent to:
            display.a = 1
            display.b = 2
            commit_display(display)
         """
        display.__dict__.update(kwargs)
        self.commit_display(display)

    def commit_jumbotron(self, jumbotron):
        """Commit to the db any values that have changed in the jumbotron.
           Also updates the modification time (modtime) to now."""
        jumbotron.modtime = datetime.now()
        self._update_table("jumbotrons", "name", jumbotron.name,
                           **jumbotron.__dict__)

    def commit_display(self, display):
        """Commit to the db any values that have changed in the display.
           Also updates the modification time (modtime) to now."""
        display.modtime = datetime.now()
        self._update_table("displays", "sid", display.sid,
                           **display.__dict__)

    def __str__(self):
        return "\n".join(self.con.iterdump())

# ----------------------------------------------------------------------

def usage(msg=None):
    """Print usage message."""
    if msg:
        print msg
    print "python database.py [--help|--print|--reset]"

def main(argv):
    """Command line program for debugging and resetting the database."""
    import getopt
    try:
        opts, args = getopt.getopt(argv[1:], "", ["print", "reset", "help"])
    except getopt.error as msg:
        usage(msg)
        return 2
    if len(opts) != 1:
        usage()
        return 1

    opt = opts[0][0]
    db_file = args[0] if args else params.database_file

    if opt == "--help" :
        usage()
    elif opt == "--print":
        print str(Db(db_file=db_file))
    elif opt == "--reset":
        ans = raw_input("Are you sure you want to reset the database? ")
        if ans.lower() in ('y', 'yes'):
            db = Db()
            db.reset()
            j = db.create_jumbotron(1, "test1")
            j = db.create_jumbotron(2, "test2")
            print "Database has been reset"
        else:
            print "Cancelling reset request"
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main(sys.argv))

