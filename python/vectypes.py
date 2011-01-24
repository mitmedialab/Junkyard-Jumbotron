"""
Vector and Matrix types.

Ideas from euclid,py by Alex Holkner, 3dkit, and other cookbook recipes
"""

import ctypes
import math
import operator

_eps = 1e-5

# ----------------------------------------------------------------------

class Vec2(ctypes.Structure):
    _fields_ = (('x', ctypes.c_float),
                ('y', ctypes.c_float))

    def __init__(self, x=0, y=0):
        self.x = x
        self.y = y
        ctypes.Structure.__init__(self)

    @classmethod
    def origin(cls):
        return cls()

    @classmethod
    def x_axis(cls):
        return cls(1, 0)

    @classmethod
    def y_axis(cls):
        return cls(0, 1)

    def __copy__(self):
        return self.__class__(self.x, self.y)

    copy = __copy__

    def __repr__(self):
        return 'Vec2({0.x:.3g}, {0.y:.3g})'.format(self)

    def __str__(self):
        return '({0.x:.3g}, {0.y:.3g})'.format(self)

    @classmethod
    def parse(cls, str):
        return cls(*eval(str))

    def __eq__(self, other):
        if isinstance(other, Vec2):
            ox, oy = other.x, other.y
        else:
            assert hasattr(other, '__len__') and len(other) == 2
            ox, oy = other
        return (self.x == ox and 
                self.y == oy)

    def __neq__(self, other):
        return not self.__eq__(other)

    def almost_equal(self, other, places):
        if isinstance(other, Vec2):
            ox, oy = other.x, other.y
        else:
            assert hasattr(other, '__len__') and len(other) == 2
            ox, oy = other
        return (round(self.x - ox, places) == 0 and 
                round(self.y - oy, places) == 0)

    def __nonzero__(self):
        return self.x != 0 or self.y != 0

    def __len__(self):
        return 2

    def __getitem__(self, key):
        return (self.x, self.y)[key]

    def __setitem__(self, key, value):
        l = [self.x, self.y]
        l[key] = value
        self.x, self.y = l

    def __iter__(self):
        return iter((self.x, self.y))

    def __add__(self, other):
        if isinstance(other, Vec2):
            return Vec2(self.x + other.x,
                        self.y + other.y)
        else:
            assert hasattr(other, '__len__') and len(other) == 2
            return Vec2(self.x + other[0],
                        self.y + other[1])
    __radd__ = __add__

    def __iadd__(self, other):
        if isinstance(other, Vec2):
            self.x += other.x
            self.y += other.y
        else:
            assert hasattr(other, '__len__') and len(other) == 2
            self.x += other[0]
            self.y += other[1]
        return self

    def __sub__(self, other):
        if isinstance(other, Vec2):
            return Vec2(self.x - other.x,
                        self.y - other.y)
        else:
            assert hasattr(other, '__len__') and len(other) == 2
            return Vec2(self.x - other[0],
                        self.y - other[1])
   
    def __rsub__(self, other):
        if isinstance(other, Vec2):
            return Vec2(other.x - self.x,
                        other.y - self.y)
        else:
            assert hasattr(other, '__len__') and len(other) == 2
            return Vec2(other.x - self[0],
                        other.y - self[1])

    def __mul__(self, other):
        assert type(other) in (int, long, float)
        return Vec2(self.x * other,
                    self.y * other)

    __rmul__ = __mul__

    def __imul__(self, other):
        assert type(other) in (int, long, float)
        self.x *= other
        self.y *= other
        return self

    def __div__(self, other):
        assert type(other) in (int, long, float)
        return Vec2(operator.div(self.x, other),
                    operator.div(self.y, other))

    def __rdiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec2(operator.div(other, self.x),
                    operator.div(other, self.y))

    def __floordiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec2(operator.floordiv(self.x, other),
                    operator.floordiv(self.y, other))

    def __rfloordiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec2(operator.floordiv(other, self.x),
                    operator.floordiv(other, self.y))

    def __truediv__(self, other):
        assert type(other) in (int, long, float)
        return Vec2(operator.truediv(self.x, other),
                    operator.truediv(self.y, other))


    def __rtruediv__(self, other):
        assert type(other) in (int, long, float)
        return Vec2(operator.truediv(other, self.x),
                    operator.truediv(other, self.y))
    
    def __neg__(self):
        return Vec2(-self.x,
                    -self.y)

    __pos__ = __copy__
    
    def __abs__(self):
        x = self.x
        y = self.y
        return math.sqrt(x * x + y * y)

    magnitude = __abs__

    def magnitude_squared(self):
        x = self.x
        y = self.y
        return x * x + y * y

    def normalize(self):
        d = self.magnitude()
        if d:
            self.x /= d
            self.y /= d
        return self

    def normalized(self):
        d = self.magnitude()
        if d:
            return Vec2(self.x / d, 
                        self.y / d)
        return self.copy()

    def is_normalized(self, places=5):
        return round(self.magnitude() - 1.0, places) == 0

    def dot(self, other):
        assert isinstance(other, Vec2)
        return (self.x * other.x + 
                self.y * other.y)

    def min(*vecs):
        return Vec2(min((v.x for v in vecs)),
                    min((v.y for v in vecs)))

    def max(*vecs):
        return Vec2(max((v.x for v in vecs)),
                    max((v.y for v in vecs)))

    def distance(self, other):
        assert isinstance(other, Vec2)
        x = self.x - other.x
        y = self.y - other.y
        return math.sqrt(x * x + y * y)

    def distance_squared(self, other):
        assert isinstance(other, Vec2)
        x = self.x - other.x
        y = self.y - other.y
        return x * x + y * y

    def cross(self):
        return Vec2(self.y, -self.x)

    def reflect(self, normal):
        # assume normal is normalized
        assert isinstance(normal, Vec2)
        d = 2 * (self.x * normal.x + self.y * normal.y)
        return Vec2(self.x - d * normal.x,
                    self.y - d * normal.y)

# ----------------------------------------------------------------------

class Vec3(ctypes.Structure):
    _fields_ = (('x', ctypes.c_float),
                ('y', ctypes.c_float),
                ('z', ctypes.c_float))

    def __init__(self, x=0, y=0, z=0):
        self.x = x
        self.y = y
        self.z = z
        ctypes.Structure.__init__(self)

    @classmethod
    def origin(cls):
        return cls()

    @classmethod
    def x_axis(cls):
        return cls(1, 0, 0)

    @classmethod
    def y_axis(cls):
        return cls(0, 1, 0)

    @classmethod
    def z_axis(cls):
        return cls(0, 0, 1)

    def __copy__(self):
        return self.__class__(self.x, self.y, self.z)

    copy = __copy__

    def __repr__(self):
        return 'Vec3({0.x:.3g}, {0.y:.3g}, {0.z:.3g})'.format(self)

    def __str__(self):
        return '({0.x:.3g}, {0.y:.3g}, {0.z:.3g})'.format(self)

    @classmethod
    def parse(cls, str):
        return cls(*eval(str))

    def __eq__(self, other):
        if isinstance(other, Vec3):
            return (self.x == other.x and
                    self.y == other.y and
                    self.z == other.z)
        else:
            assert hasattr(other, '__len__') and len(other) == 3
            return (self.x == other[0] and
                    self.y == other[1] and
                    self.z == other[2])

    def __neq__(self, other):
        return not self.__eq__(other)

    def almost_equal(self, other, places):
        if isinstance(other, Vec3):
            ox, oy, oz = other.x, other.y, other.z
        else:
            assert hasattr(other, '__len__') and len(other) == 3
            ox, oy, oz = other
        return (round(self.x - ox, places) == 0 and 
                round(self.y - oy, places) == 0 and
                round(self.z - oz, places) == 0)

    def __nonzero__(self):
        return self.x != 0 or self.y != 0 or self.z != 0

    def __len__(self):
        return 3

    def __getitem__(self, key):
        return (self.x, self.y, self.z)[key]

    def __setitem__(self, key, value):
        l = [self.x, self.y, self.z]
        l[key] = value
        self.x, self.y, self.z = l

    def __iter__(self):
        return iter((self.x, self.y, self.z))

    def __add__(self, other):
        if isinstance(other, Vec3):
            return Vec3(self.x + other.x,
                        self.y + other.y,
                        self.z + other.z)
        else:
            assert hasattr(other, '__len__') and len(other) == 3
            return Vec3(self.x + other[0],
                        self.y + other[1],
                        self.z + other[2])
    __radd__ = __add__

    def __iadd__(self, other):
        if isinstance(other, Vec3):
            self.x += other.x
            self.y += other.y
            self.z += other.z
        else:
            assert hasattr(other, '__len__') and len(other) == 3
            self.x += other[0]
            self.y += other[1]
            self.z += other[2]
        return self

    def __sub__(self, other):
        if isinstance(other, Vec3):
            return Vec3(self.x - other.x,
                        self.y - other.y,
                        self.z - other.z)
        else:
            assert hasattr(other, '__len__') and len(other) == 3
            return Vec3(self.x - other[0],
                           self.y - other[1],
                           self.z - other[2])

   
    def __rsub__(self, other):
        if isinstance(other, Vec3):
            return Vec3(other.x - self.x,
                        other.y - self.y,
                        other.z - self.z)
        else:
            assert hasattr(other, '__len__') and len(other) == 3
            return Vec3(other.x - self[0],
                        other.y - self[1],
                        other.z - self[2])

    def __mul__(self, other):
        if isinstance(other, Vec3):
            return Vec3(self.x * other.x,
                        self.y * other.y,
                        self.z * other.z)
        else: 
            assert type(other) in (int, long, float)
            return Vec3(self.x * other,
                        self.y * other,
                        self.z * other)

    __rmul__ = __mul__

    def __imul__(self, other):
        assert type(other) in (int, long, float)
        self.x *= other
        self.y *= other
        self.z *= other
        return self

    def __div__(self, other):
        assert type(other) in (int, long, float)
        return Vec3(operator.div(self.x, other),
                    operator.div(self.y, other),
                    operator.div(self.z, other))

    def __rdiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec3(operator.div(other, self.x),
                    operator.div(other, self.y),
                    operator.div(other, self.z))

    def __floordiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec3(operator.floordiv(self.x, other),
                    operator.floordiv(self.y, other),
                    operator.floordiv(self.z, other))

    def __rfloordiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec3(operator.floordiv(other, self.x),
                    operator.floordiv(other, self.y),
                    operator.floordiv(other, self.z))

    def __truediv__(self, other):
        assert type(other) in (int, long, float)
        return Vec3(operator.truediv(self.x, other),
                    operator.truediv(self.y, other),
                    operator.truediv(self.z, other))

    def __rtruediv__(self, other):
        assert type(other) in (int, long, float)
        return Vec3(operator.truediv(other, self.x),
                    operator.truediv(other, self.y),
                    operator.truediv(other, self.z))
    
    def __neg__(self):
        return Vec3(-self.x,
                    -self.y,
                    -self.z)

    __pos__ = __copy__
    
    def __abs__(self):
        x = self.x
        y = self.y
        z = self.z
        return math.sqrt(x * x + y * y + z * z)

    magnitude = __abs__

    def magnitude_squared(self):
        x = self.x
        y = self.y
        z = self.z
        return x * x + y * y + z * z

    def normalize(self):
        d = self.magnitude()
        if d:
            self.x /= d
            self.y /= d
            self.z /= d
        return self

    def normalized(self):
        d = self.magnitude()
        if d:
            return Vec3(self.x / d, 
                        self.y / d, 
                        self.z / d)
        return self.copy()

    def is_normalized(self, places=5):
        return round(self.magnitude() - 1.0, places) == 0

    def dot(self, other):
        assert isinstance(other, Vec3)
        return (self.x * other.x +
                self.y * other.y +
                self.z * other.z)

    def min(*vecs):
        return Vec3(min((v.x for v in vecs)),
                    min((v.y for v in vecs)),
                    min((v.z for v in vecs)))

    def max(*vecs):
        return Vec3(max((v.x for v in vecs)),
                    max((v.y for v in vecs)),
                    max((v.z for v in vecs)))

    def distance(self, other):
        assert isinstance(other, Vec3)
        x = self.x - other.x
        y = self.y - other.y
        z = self.z - other.z
        return math.sqrt(x * x + y * y + z * z)

    def distance_squared(self, other):
        assert isinstance(other, Vec3)
        x = self.x - other.x
        y = self.y - other.y
        z = self.z - other.z
        return x * x + y * y + z * z 

    def cross(self, other):
        assert isinstance(other, Vec3)
        return Vec3( self.y * other.z - self.z * other.y,
                    -self.x * other.z + self.z * other.x,
                     self.x * other.y - self.y * other.x)

    def reflect(self, normal):
        # assume normal is normalized
        assert isinstance(normal, Vec3)
        d = 2 * (self.x * normal.x + self.y * normal.y + self.z * normal.z)
        return Vec3(self.x - d * normal.x,
                    self.y - d * normal.y,
                    self.z - d * normal.z)

# ----------------------------------------------------------------------

class Vec4(ctypes.Structure):
    _fields_ = (('x', ctypes.c_float),
                ('y', ctypes.c_float),
                ('z', ctypes.c_float),
                ('w', ctypes.c_float))

    def __init__(self, x=0, y=0, z=0, w=0):
        self.x = x
        self.y = y
        self.z = z
        self.w = w
        ctypes.Structure.__init__(self)

    def __copy__(self):
        return self.__class__(self.x, self.y, self.z, self.w)

    copy = __copy__

    def __repr__(self):
        return 'Vec4({0.x:.3g}, {0.y:.3g}, {0.z:.3g}, {0.w:.3g})'.format(self)

    def __str__(self):
        return '({0.x:.3g}, {0.y:.3g}, {0.z:.3g}, {0.w:.3g})'.format(self)

    @classmethod
    def parse(cls, str):
        return cls(*eval(str))

    def __eq__(self, other):
        if isinstance(other, Vec4):
            return (self.x == other.x and
                    self.y == other.y and
                    self.z == other.z and
                    self.w == other.w)
        else:
            assert hasattr(other, '__len__') and len(other) == 4
            return (self.x == other[0] and
                    self.y == other[1] and
                    self.z == other[2] and
                    self.w == other[3])

    def __neq__(self, other):
        return not self.__eq__(other)

    def almost_equal(self, other, places):
        if isinstance(other, Vec3):
            ox, oy, oz, ow = other.x, other.y, other.z, other.w
        else:
            assert hasattr(other, '__len__') and len(other) == 4
            ox, oy, oz, ow = other
        return (round(self.x - ox, places) == 0 and 
                round(self.y - oy, places) == 0 and
                round(self.z - oz, places) == 0 and
                round(self.w - ow, places) == 0)

    def __nonzero__(self):
        return self.x != 0 or self.y != 0 or self.z != 0 or self.w != 0

    def __len__(self):
        return 4

    def __getitem__(self, key):
        return (self.x, self.y, self.z, self.w)[key]

    def __setitem__(self, key, value):
        l = [self.x, self.y, self.z, self.w]
        l[key] = value
        self.x, self.y, self.z, self.w = l

    def __iter__(self):
        return iter((self.x, self.y, self.z, self.w))

    def __add__(self, other):
        if isinstance(other, Vec4):
            return Vec4(self.x + other.x,
                        self.y + other.y,
                        self.z + other.z,
                        self.w + other.w)
        else:
            assert hasattr(other, '__len__') and len(other) == 4
            return Vec4(self.x + other[0],
                        self.y + other[1],
                        self.z + other[2],
                        self.w + other[3])
    __radd__ = __add__

    def __iadd__(self, other):
        if isinstance(other, Vec4):
            self.x += other.x
            self.y += other.y
            self.z += other.z
            self.w += other.w
        else:
            assert hasattr(other, '__len__') and len(other) == 4
            self.x += other[0]
            self.y += other[1]
            self.z += other[2]
            self.w += other[3]
        return self

    def __sub__(self, other):
        if isinstance(other, Vec4):
            return Vec4(self.x - other.x,
                        self.y - other.y,
                        self.z - other.z,
                        self.w - other.w)
        else:
            assert hasattr(other, '__len__') and len(other) == 4
            return Vec4(self.x - other[0],
                        self.y - other[1],
                        self.z - other[2],
                        self.w - other[3])

   
    def __rsub__(self, other):
        if isinstance(other, Vec4):
            return Vec4(other.x - self.x,
                        other.y - self.y,
                        other.z - self.z,
                        other.w - self.w)
        else:
            assert hasattr(other, '__len__') and len(other) == 4
            return Vec4(other.x - self[0],
                        other.y - self[1],
                        other.z - self[2],
                        other.w - self[3])

    def __mul__(self, other):
        if isinstance(other, Vec4):
            return Vec4(self.x * other.x,
                        self.y * other.y,
                        self.z * other.z,
                        self.w * other.w)
        else: 
            assert type(other) in (int, long, float)
            return Vec4(self.x * other,
                        self.y * other,
                        self.z * other,
                        self.w * other)

    __rmul__ = __mul__

    def __imul__(self, other):
        assert type(other) in (int, long, float)
        self.x *= other
        self.y *= other
        self.z *= other
        self.w *= other
        return self

    def __div__(self, other):
        assert type(other) in (int, long, float)
        return Vec4(operator.div(self.x, other),
                    operator.div(self.y, other),
                    operator.div(self.z, other),
                    operator.div(self.w, other))

    def __rdiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec4(operator.div(other, self.x),
                    operator.div(other, self.y),
                    operator.div(other, self.z),
                    operator.div(other, self.w))

    def __floordiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec4(operator.floordiv(self.x, other),
                    operator.floordiv(self.y, other),
                    operator.floordiv(self.z, other),
                    operator.floordiv(self.w, other))

    def __rfloordiv__(self, other):
        assert type(other) in (int, long, float)
        return Vec4(operator.floordiv(other, self.x),
                    operator.floordiv(other, self.y),
                    operator.floordiv(other, self.z),
                    operator.floordiv(other, self.w))

    def __truediv__(self, other):
        assert type(other) in (int, long, float)
        return Vec4(operator.truediv(self.x, other),
                    operator.truediv(self.y, other),
                    operator.truediv(self.z, other),
                    operator.truediv(self.w, other))

    def __rtruediv__(self, other):
        assert type(other) in (int, long, float)
        return Vec4(operator.truediv(other, self.x),
                    operator.truediv(other, self.y),
                    operator.truediv(other, self.z),
                    operator.truediv(other, self.w))
    
    def __neg__(self):
        return Vec4(-self.x,
                    -self.y,
                    -self.z,
                    -self.w)

    __pos__ = __copy__
    
    def __abs__(self):
        x = self.x
        y = self.y
        z = self.z
        w = self.w
        return math.sqrt(x * x + y * y + z * z + w * w)

    magnitude = __abs__

    def magnitude_squared(self):
        x = self.x
        y = self.y
        z = self.z
        w = self.w
        return x * x + y * y + z * z + w * w

    def normalize(self):
        d = self.magnitude()
        if d:
            self.x /= d
            self.y /= d
            self.z /= d
            self.w /= d
        return self

    def normalized(self):
        d = self.magnitude()
        if d:
            return Vec4(self.x / d, 
                        self.y / d, 
                        self.z / d,
                        self.w / d)
        return self.copy()

    def dot(self, other):
        assert isinstance(other, Vec4)
        return (self.x * other.x +
                self.y * other.y +
                self.z * other.z +
                self.w * other.w)

    def min(*vecs):
        return Vec4(min((v.x for v in vecs)),
                    min((v.y for v in vecs)),
                    min((v.z for v in vecs)),
                    min((v.w for v in vecs)))

    def max(*vecs):
        return Vec4(max((v.x for v in vecs)),
                    max((v.y for v in vecs)),
                    max((v.z for v in vecs)),
                    max((v.w for v in vecs)))

    def distance(self, other):
        assert isinstance(other, Vec4)
        x = self.x - other.x
        y = self.y - other.y
        z = self.z - other.z
        w = self.w - other.w
        return math.sqrt(x * x + y * y + z * z + w * w)

    def distance_squared(self, other):
        assert isinstance(other, Vec4)
        x = self.x - other.x
        y = self.y - other.y
        z = self.z - other.z
        w = self.w - other.w
        return x * x + y * y + z * z + w * w

    def cross(self, other):
        assert isinstance(other, Vec4)
        return Vec4( self.y * other.z - self.z * other.y,
                    -self.x * other.z + self.z * other.x,
                     self.x * other.y - self.y * other.x)

    def reflect(self, normal):
        # assume normal is normalized
        assert isinstance(normal, Vec4)
        d = 2 * (self.x * normal.x + self.y * normal.y + self.z * normal.z)
        return Vec4(self.x - d * normal.x,
                    self.y - d * normal.y,
                    self.z - d * normal.z)

# ----------------------------------------------------------------------

_c_float_3 = ctypes.c_float * 3

class Mat3(ctypes.Structure):

    _fields_ = ( ('_mat', _c_float_3 * 3), )

    ctypes = property(lambda self: ctypes.cast(self._mat,
                                               ctypes.POINTER(ctypes.c_float)))

    def __init__(self, data=None):
        if data:
            assert len(data) == 9
            m0, m1, m2 = self._mat
            m0[:] = data[0:3]
            m1[:] = data[3:6]
            m2[:] = data[6:9]
        else:
            self.identity()
        ctypes.Structure.__init__(self)

    def __copy__(self):
        other = Mat3()
        om = other._mat
        om[0], om[1], om[2] = self._mat
        return other

    copy = __copy__

    def __repr__(self):
        m0, m1, m2 = self._mat
        return 'Mat3([{0[0]:.3g}, {0[1]:.3g}, {0[2]:.3g}, \\\n' \
               '      {1[0]:.3g}, {1[1]:.3g}, {1[2]:.3g}, \\\n' \
               '      {2[0]:.3g}, {2[1]:.3g}, {2[2]:.3g}])'.format(m0, m1, m2)

    def __str__(self):
        m0, m1, m2 = self._mat
        return '({0[0]:.3g}, {0[1]:.3g}, {0[2]:.3g},\n' \
               ' {1[0]:.3g}, {1[1]:.3g}, {1[2]:.3g},\n' \
               ' {2[0]:.3g}, {2[1]:.3g}, {2[2]:.3g})'.format(m0, m1, m2)
    
    @classmethod            
    def parse(cls, str):
        m = eval(str)
        return m if isinstance(m, cls) else cls(m)

    def __eq__(self, other):
        assert isinstance(other, Mat3)
        sm = self._mat
        om = other._mat
        return (sm[0][:] == om[0][:] and 
                sm[1][:] == om[1][:] and 
                sm[2][:] == om[2][:])

    def __neq__(self, other):
        return not self.__eq__(other)

    def almost_equal(self, other, places):
        assert isinstance(other, Mat3)
        for row,otherrow  in zip(self, other):
            if (round(row[0] - otherrow[0], places) != 0 or
                round(row[1] - otherrow[1], places) != 0 or
                round(row[2] - otherrow[2], places) != 0):
                return False
        return True

    def __getitem__(self, key):
        return self._mat[key]

    def __setitem__(self, key, value):
        self._mat[key] = value

    def __mul__(self, other):
        sm = self._mat
        Aa, Ab, Ac = sm[0]
        Ae, Af, Ag = sm[1]
        Ai, Aj, Ak = sm[2]

        if isinstance(other, Mat3):
            om = other._mat
            Ba, Bb, Bc = om[0]
            Be, Bf, Bg = om[1]
            Bi, Bj, Bk = om[2]

            res = Mat3()
            resm = res._mat
            resm[0] = (Aa * Ba + Ab * Be + Ac * Bi,
                       Aa * Bb + Ab * Bf + Ac * Bj,
                       Aa * Bc + Ab * Bg + Ac * Bk)
            resm[1] = (Ae * Ba + Af * Be + Ag * Bi,
                       Ae * Bb + Af * Bf + Ag * Bj,
                       Ae * Bc + Af * Bg + Ag * Bk)
            resm[2] = (Ai * Ba + Aj * Be + Ak * Bi,
                       Ai * Bb + Aj * Bf + Ak * Bj,
                       Ai * Bc + Aj * Bg + Ak * Bk)
            return res

        elif isinstance(other, Vec3):
            x, y, z = other.x, other.y, other.z
            return Vec3(Aa * x + Ab * y + Ac * z,
                        Ae * x + Af * y + Ag * z,
                        Ai * x + Aj * y + Ak * z)

        elif isinstance(other, Vec2):
            x, y = other.x, other.y
            return Vec2(Aa * x + Ab * y,
                        Ae * x + Af * y)

        else:
            return other.__rmul__(self)

    def __imul__(self, other):
        assert isinstance(other, Mat3)

        sm = self._mat
        Aa, Ab, Ac = sm[0]
        Ae, Af, Ag = sm[1]
        Ai, Aj, Ak = sm[2]

        om = other._mat
        Ba, Bb, Bc = om[0]
        Be, Bf, Bg = om[1]
        Bi, Bj, Bk = om[2]

        sm[0] = (Aa * Ba + Ab * Be + Ac * Bi,
                 Aa * Bb + Ab * Bf + Ac * Bj,
                 Aa * Bc + Ab * Bg + Ac * Bk)
        sm[1] = (Ae * Ba + Af * Be + Ag * Bi,
                 Ae * Bb + Af * Bf + Ag * Bj,
                 Ae * Bc + Af * Bg + Ag * Bk)
        sm[2] = (Ai * Ba + Aj * Be + Ak * Bi,
                 Ai * Bb + Aj * Bf + Ak * Bj.
                 Ai * Bc + Aj * Bg + Ak * Bk)
        return self

    def identity(self):
        m = self._mat
        m[0] = 1, 0, 0
        m[1] = 0, 1, 0
        m[2] = 0, 0, 1
        return self

    def scale(self, x, y):
        self *= Mat3.new_scale(x, y)
        return self

    def translate(self, x, y):
        self *= Mat3.new_translate(x, y)
        return self 

    def rotate(self, angle):
        self *= Mat3.new_rotate(angle)
        return self

    def transpose(self):
        m0, m1, m2 = self._mat
        (m0[0], m1[0], m2[0],
         m0[1], m1[1], m2[1],
         m0[2], m1[2], m2[2]) = \
        (m0[0], m0[1], m0[2],
         m1[0], m1[1], m1[2],
         m2[0], m2[1], m2[2])
        return self

    def transposed(self):
        M = self.copy()
        M.transpose()
        return M

    # Static constructors

    @classmethod
    def new_identity(cls):
        self = cls()
        return self

    @classmethod
    def new_scale(cls, x, y):
        self = cls()
        m = self._mat
        m[0][0] = x
        m[1][1] = y
        return self

    @classmethod
    def new_translate(cls, x, y):
        self = cls()
        m = self._mat
        m[0][2] = x
        m[1][2] = y
        return self

    @classmethod
    def new_rotate(cls, angle):
        self = cls()
        m = self._mat
        s = math.sin(angle)
        c = math.cos(angle)
        m[0][0] =  c
        m[0][1] = -s
        m[1][0] =  s
        m[1][1] =  c
        return self

# ----------------------------------------------------------------------

_c_float_4 = ctypes.c_float * 4

class Mat4(ctypes.Structure):

    _fields_ = ( ('_mat', _c_float_4 * 4), )

    ctypes = property(lambda self: ctypes.cast(self._mat,
                                               ctypes.POINTER(ctypes.c_float)))

    def __init__(self, data=None):
        if data:
            assert len(data) == 16
            m0, m1, m2, m3 = self._mat
            m0[:] = data[0:4]
            m1[:] = data[4:8]
            m2[:] = data[8:12]
            m3[:] = data[12:16]
        else:
            self.identity()
        ctypes.Structure.__init__(self)

    def __copy__(self):
        other = Mat4()
        om = other._mat
        om[0], om[1], om[2], om[3] = self._mat
        return other

    copy = __copy__

    def __repr__(self):
        m0, m1, m2, m3 = self._mat
        return 'Mat4([{0[0]:.3g}, {0[1]:.3g}, {0[2]:.3g}, {0[3]:.3g}, \\\n' \
               '      {1[0]:.3g}, {1[1]:.3g}, {1[2]:.3g}, {1[3]:.3g}, \\\n' \
               '      {2[0]:.3g}, {2[1]:.3g}, {2[2]:.3g}, {2[3]:.3g}, \\\n' \
               '      {3[0]:.3g}, {3[1]:.3g}, {3[2]:.3g}, {3[3]:.3g}])'.    \
               format(m0, m1, m2, m3)

    def __str__(self):
        m0, m1, m2, m3 = self._mat
        return '({0[0]:7.3f}, {0[1]:7.3f}, {0[2]:7.3f}, {0[3]:7.3f},\n' \
               ' {1[0]:7.3f}, {1[1]:7.3f}, {1[2]:7.3f}, {1[3]:7.3f},\n' \
               ' {2[0]:7.3f}, {2[1]:7.3f}, {2[2]:7.3f}, {2[3]:7.3f},\n' \
               ' {3[0]:7.3f}, {3[1]:7.3f}, {3[2]:7.3f}, {3[3]:7.3f})'.  \
               format(m0, m1, m2, m3)
               
    @classmethod            
    def parse(cls, str):
        m = eval(str)
        return m if isinstance(m, cls) else cls(m)

    def __eq__(self, other):
        assert isinstance(other, Mat3)
        sm = self._mat
        om = other._mat
        return (sm[0][:] == om[0][:] and 
                sm[1][:] == om[1][:] and 
                sm[2][:] == om[2][:] and
                sm[3][:] == om[3][:])

    def __neq__(self, other):
        return not self.__eq__(other)

    def almost_equal(self, other, places):
        assert isinstance(other, Mat4)
        for row, otherrow in zip(self, other):
            if (round(row[0] - otherrow[0], places) != 0 or
                round(row[1] - otherrow[1], places) != 0 or
                round(row[2] - otherrow[2], places) != 0 or
                round(row[3] - otherrow[3], places) != 0):
                return False
        return True

    def __getitem__(self, key):
        return self._mat[key]

    def __setitem__(self, key, value):
        self._mat[key] = value

    def __mul__(self, other):
        sm = self._mat
        Aa, Ab, Ac, Ad = sm[0]
        Ae, Af, Ag, Ah = sm[1]
        Ai, Aj, Ak, Al = sm[2]
        Am, An, Ao, Ap = sm[3]

        if isinstance(other, Mat4):
            om = other._mat
            Ba, Bb, Bc, Bd = om[0]
            Be, Bf, Bg, Bh = om[1]
            Bi, Bj, Bk, Bl = om[2]
            Bm, Bn, Bo, Bp = om[3]

            res = Mat4()
            resm = res._mat
            resm[0] = (Aa * Ba + Ab * Be + Ac * Bi + Ad * Bm,
                       Aa * Bb + Ab * Bf + Ac * Bj + Ad * Bn,
                       Aa * Bc + Ab * Bg + Ac * Bk + Ad * Bo,
                       Aa * Bd + Ab * Bh + Ac * Bl + Ad * Bp)
            resm[1] = (Ae * Ba + Af * Be + Ag * Bi + Ah * Bm,
                       Ae * Bb + Af * Bf + Ag * Bj + Ah * Bn,
                       Ae * Bc + Af * Bg + Ag * Bk + Ah * Bo,
                       Ae * Bd + Af * Bh + Ag * Bl + Ah * Bp)
            resm[2] = (Ai * Ba + Aj * Be + Ak * Bi + Al * Bm,
                       Ai * Bb + Aj * Bf + Ak * Bj + Al * Bn,
                       Ai * Bc + Aj * Bg + Ak * Bk + Al * Bo,
                       Ai * Bd + Aj * Bh + Ak * Bl + Al * Bp)
            resm[3] = (Am * Ba + An * Be + Ao * Bi + Ap * Bm,
                       Am * Bb + An * Bf + Ao * Bj + Ap * Bn,
                       Am * Bc + An * Bg + Ao * Bk + Ap * Bo,
                       Am * Bd + An * Bh + Ao * Bl + Ap * Bp)
            return res

        elif isinstance(other, Vec4):
            x, y, z, w = other.x, other.y, other.z, other.w
            return Vec4(Aa * x + Ab * y + Ac * z + Ad * w,
                        Ae * x + Af * y + Ag * z + Ah * w,
                        Ai * x + Aj * y + Ak * z + Al * w,
                        Am * x + An * y + Ao * z + Ap * w)

        elif isinstance(other, Vec3):
            x, y, z = other.x, other.y, other.z
            return Vec3(Aa * x + Ab * y + Ac * z,
                        Ae * x + Af * y + Ag * z,
                        Ai * x + Aj * y + Ak * z)

        else:
            return other.__rmul__(self)

    def __imul__(self, other):
        assert isinstance(other, Mat4)

        sm = self._mat
        Aa, Ab, Ac, Ad = sm[0]
        Ae, Af, Ag, Ah = sm[1]
        Ai, Aj, Ak, Al = sm[2]
        Am, An, Ao, Ap = sm[3]

        om = other._mat
        Ba, Bb, Bc, Bd = om[0]
        Be, Bf, Bg, Bh = om[1]
        Bi, Bj, Bk, Bl = om[2]
        Bm, Bn, Bo, Bp = om[3]

        sm[0] = (Aa * Ba + Ab * Be + Ac * Bi + Ad * Bm,
                 Aa * Bb + Ab * Bf + Ac * Bj + Ad * Bn,
                 Aa * Bc + Ab * Bg + Ac * Bk + Ad * Bo,
                 Aa * Bd + Ab * Bh + Ac * Bl + Ad * Bp)
        sm[1] = (Ae * Ba + Af * Be + Ag * Bi + Ah * Bm,
                 Ae * Bb + Af * Bf + Ag * Bj + Ah * Bn,
                 Ae * Bc + Af * Bg + Ag * Bk + Ah * Bo,
                 Ae * Bd + Af * Bh + Ag * Bl + Ah * Bp)
        sm[2] = (Ai * Ba + Aj * Be + Ak * Bi + Al * Bm,
                 Ai * Bb + Aj * Bf + Ak * Bj + Al * Bn,
                 Ai * Bc + Aj * Bg + Ak * Bk + Al * Bo,
                 Ai * Bd + Aj * Bh + Ak * Bl + Al * Bp)
        sm[3] = (Am * Ba + An * Be + Ao * Bi + Ap * Bm,
                 Am * Bb + An * Bf + Ao * Bj + Ap * Bn,
                 Am * Bc + An * Bg + Ao * Bk + Ap * Bo,
                 Am * Bd + An * Bh + Ao * Bl + Ap * Bp)
        return self

    def transform(self, other):
        assert isinstance(other, Vec3)
        sm = self._mat
        Aa, Ab, Ac, Ad = sm[0]
        Ae, Af, Ag, Ah = sm[1]
        Ai, Aj, Ak, Al = sm[2]
        Am, An, Ao, Ap = sm[3]
        x, y, z = other.x, other.y, other.z

        nx = Aa * x + Ab * y + Ac * z + Ad
        ny = Ae * x + Af * y + Ag * z + Ah
        nz = Ai * x + Aj * y + Ak * z + Al
        nw = Am * x + An * y + Ao * z + Ap
        if nw != 0:
            nx /= nw
            ny /= nw
            nz /= nw
        return Vec3(nx, ny, nz)

    def transform_vector(self, other):
        assert isinstance(other, Vec3)
        sm = self._mat
        Aa, Ab, Ac, Ad = sm[0]
        Ae, Af, Ag, Ah = sm[1]
        Ai, Aj, Ak, Al = sm[2]
        Am, An, Ao, Ap = sm[3]
        x, y, z = other.x, other.y, other.z

        nx = Aa * x + Ab * y + Ac * z
        ny = Ae * x + Af * y + Ag * z
        nz = Ai * x + Aj * y + Ak * z
        # Ignore perspective xform
        return Vec3(nx, ny, nz)

    def identity(self):
        m = self._mat
        m[0] = 1, 0, 0, 0
        m[1] = 0, 1, 0, 0
        m[2] = 0, 0, 1, 0
        m[3] = 0, 0, 0, 1
        return self

    def scale(self, x, y, z):
        self *= Mat4.new_scale(x, y, z)
        return self

    def translate(self, x, y, z):
        self *= Mat4.new_translate(x, y, z)
        return self 

    def rotate_x(self, angle):
        self *= Mat4.new_rotate_x(angle)
        return self

    def rotate_y(self, angle):
        self *= Mat4.new_rotate_y(angle)
        return self

    def rotate_z(self, angle):
        self *= Mat4.new_rotate_z(angle)
        return self

    def rotate_axis(self, angle, axis):
        self *= Mat4.new_rotate_axis(angle, axis)
        return self

    def rotate_euler(self, heading, attitude, bank):
        self *= Mat4.new_rotate_euler(heading, attitude, bank)
        return self

    def change_basis(self, x_axis, y_axis, z_axis, origin=Vec3.origin()):
        self *= Mat4.new_change_basis(x_axis, y_axis, z_axis, origin)
        return self

    def rotate_vector_to_vector(self, src, dst):
        self *= Mat4.new_rotate_vector_to_vector(src, dst)
        return self

    def transpose(self):
        m0, m1, m2, m3 = self._mat
        (m0[0], m1[0], m2[0], m3[0],
         m0[1], m1[1], m2[1], m3[1],
         m0[2], m1[2], m2[2], m3[2],
         m0[3], m1[3], m2[3], m3[3]) = \
        (m0[0], m0[1], m0[2], m0[3],
         m1[0], m1[1], m1[2], m1[3],
         m2[0], m2[1], m2[2], m2[3],
         m3[0], m3[1], m3[2], m3[3])
        return self

    def transposed(self):
        M = self.copy()
        M.transpose()
        return M

    # Static constructors

    @classmethod
    def new_identity(cls):
        self = cls()
        return self

    @classmethod
    def new_scale(cls, x, y, z):
        self = cls()
        m = self._mat
        m[0][0] = x
        m[1][1] = y
        m[2][2] = z
        return self

    @classmethod
    def new_translate(cls, x, y, z):
        self = cls()
        m = self._mat
        m[0][3] = x
        m[1][3] = y
        m[2][3] = z
        return self

    @classmethod
    def new_rotate_x(cls, angle):
        self = cls()
        s = math.sin(angle)
        c = math.cos(angle)
        m = self._mat
        m[1][1] = c
        m[1][2] = -s
        m[2][1] = s
        m[2][2] = c
        return self

    @classmethod
    def new_rotate_y(cls, angle):
        self = cls()
        s = math.sin(angle)
        c = math.cos(angle)
        m = self._mat
        m[0][0] = c
        m[0][2] = s
        m[2][0] = -s
        m[2][2] = c
        return self    
    
    @classmethod
    def new_rotate_z(cls, angle):
        self = cls()
        s = math.sin(angle)
        c = math.cos(angle)
        m = self._mat
        m[0][0] = c
        m[0][1] = -s
        m[1][0] = s
        m[1][1] = c
        return self

    @classmethod
    def new_rotate_axis(cls, axis, angle):
        assert(isinstance(axis, Vec3) and axis.is_normalized())
        x = axis.x
        y = axis.y
        z = axis.z
        s = math.sin(angle)
        c = math.cos(angle)

        ci = 1.0 - c
        xci = x * ci
        yci = y * ci
        zci = z * ci
        xyci = x * yci
        xzci = x * zci
        yzci = y * zci
        xs = x * s
        ys = y * s
        zs = z * s
        
        # From the glRotate man page
        self = cls()
        m0, m1, m2, m3 = self._mat
        m0[0] = x * xci + c
        m0[1] = xyci - zs
        m0[2] = xzci + ys
        m1[0] = xyci + zs
        m1[1] = y * yci + c
        m1[2] = yzci - xs
        m2[0] = xzci - ys
        m2[1] = yzci + xs
        m2[2] = z * zci + c
        return self

    @classmethod
    def new_rotate_euler(cls, heading, attitude, bank):
        # from http://www.euclideanspace.com/
        ch = math.cos(heading)
        sh = math.sin(heading)
        ca = math.cos(attitude)
        sa = math.sin(attitude)
        cb = math.cos(bank)
        sb = math.sin(bank)

        self = cls()
        m0, m1, m2, m3 = self._mat
        m0[0] = ch * ca
        m0[1] = sh * sb - ch * sa * cb
        m0[2] = ch * sa * sb + sh * cb
        m1[0] = sa
        m1[1] = ca * cb
        m1[2] = -ca * sb
        m2[0] = -sh * ca
        m2[1] = sh * sa * cb + ch * sb
        m2[2] = -sh * sa * sb + ch * cb
        return self

    @classmethod
    def new_change_basis(cls, x_axis, y_axis, z_axis, origin=Vec3.origin()):
        self = cls()
        m0, m1, m2, m3 = self._mat
        m0[:] = x_axis.x, y_axis.x, z_axis.x, origin.x
        m1[:] = x_axis.y, y_axis.y, z_axis.y, origin.y
        m2[:] = x_axis.z, y_axis.z, z_axis.z, origin.z
        return self

    @classmethod
    def new_rotate_vector_to_vector(cls, src, dst):
        assert isinstance(src, Vec3) and src.is_normalized()
        assert isinstance(dst, Vec3) and dst.is_normalized()
        axis = src.cross(dst).noramlize()
        angle = math.acos(src.dot(dst))
        return cls.new_rotate_axis(angle, axis)

    @classmethod
    def new_look_at(cls, eye, at, up):
        z = (eye - at).normalize()
        x = up.cross(z).normalize()
        y = z.cross(x)
        return cls.new_change_basis(x, y, z, eye)
    
    @classmethod
    def new_perspective(cls, fov_y, aspect, near, far):
        # from the gluPerspective man page
        assert near != 0.0 and near != far
        f = 1 / math.tan(fov_y / 2)
        self = cls()
        m = self._mat
        m[0][0] = f / aspect
        m[1][1] = f
        m[2][2] = (far + near) / (near - far)
        m[2][3] = 2 * far * near / (near - far)
        m[3][2] = -1
        m[3][3] = 0
        return self

    @classmethod
    def new_warp_from_square(cls, dst):
        # Unpack dst
        x0, y0 = dst[0]
        x1, y1 = dst[1]
        x2, y2 = dst[2]
        x3, y3 = dst[3]

        dx1, dy1 = x1 - x2, y1 - y2
        dx2, dy2 = x3 - x2, y3 - y2
        sx = x0 - x1 + x2 - x3
        sy = y0 - y1 + y2 - y3
        g = (sx * dy2 - dx2 * sy) / (dx1 * dy2 - dx2 * dy1)
        h = (dx1 * sy - sx * dy1) / (dx1 * dy2 - dx2 * dy1)
        a = x1 - x0 + g * x1
        b = x3 - x0 + h * x3
        c = x0
        d = y1 - y0 + g * y1
        e = y3 - y0 + h * y3
        f = y0
        
        return cls((a, b, 0, c,
                    d, e, 0, f, 
                    0, 0, 1, 0,
                    g, h, 0, 1))
    
    @classmethod
    def new_warp_to_square(cls, src):
        # Get inverse warp
        m = cls.new_warp_from_square(src)

        # Unpack matrix, ignoring 3rd col and 3rd row (z is a dummy)
        a, d, z, g = m[0]
        b, e, z, h = m[1]
        c, f, z, z = m[3]

        # Invert through adjoint
        A =     e - f * h
        B = c * h - b
        C = b * f - c * e
        D = f * g - d
        E =     a - c * g
        F = c * d - a * f
        G = d * h - e * g
        H = b * g - a * h
        I = a * e - b * d

        # Probably unnecessary since 'I' is also scaled by the
        # determinant, and 'I' scales the homogeneous coordinate,
        # which, in turn, scales the X,Y coordinates.
        # Determinant =  a * (e - f * h) + b * (f * g - d) + c * (d * h - e * g)
        idet    = 1.0 / (a * A           + b * D           + c * G)

        return cls((A * idet, D * idet, 0, G * idet,
                    B * idet, E * idet, 0, H * idet,
                    0, 0, 1, 0,
                    C * idet, F * idet, 0, I * idet))

    @classmethod
    def new_warp(cls, src, dst):
        mat1 = cls.new_warp_to_square  (src)
        mat2 = cls.new_warp_from_square(dst)
        mat1 *= mat2
        return mat1

    def determinant(self):
        m0, m1, m2, m3 = self._mat
        a, b, c, d = m0
        e, f, g, h = m1
        i, j, k, l = m2
        m, n, o, p = m3
        return ((a * f - e * b)
              * (k * p - o * l)
              - (a * j - i * b)
              * (g * p - o * h)
              + (a * n - m * b)
              * (g * l - k * h)
              + (e * j - i * f)
              * (c * p - o * d)
              - (e * n - m * f)
              * (c * l - k * d)
              + (i * n - m * j)
              * (c * h - g * d))

    def inverse(self):
        tmp = Mat4()
        det = self.determinant()

        if abs(det) < _eps:
            # No inverse, return identity
            return tmp
        else:
            m0, m1, m2, m3 = self._mat
            a, b, c, d = m0
            e, f, g, h = m1
            i, j, k, l = m2
            m, n, o, p = m3

            det = 1.0 / det

            tm0, tm1, tm2, tm3 = tmp._mat
            tm0[0] = det * (f * (k * p - o * l) +
                            j * (o * h - g * p) +
                            n * (g * l - k * h))
            tm1[0] = det * (g * (i * p - m * l) +
                            k * (m * h - e * p) +
                            o * (e * l - i * h))
            tm2[0] = det * (h * (i * n - m * j) +
                            l * (m * f - e * n) +
                            p * (e * j - i * f))
            tm3[0] = det * (e * (n * k - j * o) +
                            i * (f * o - n * g) +
                            m * (j * g - f * k))
            
            tm0[1] = det * (j * (c * p - o * d) +
                            n * (k * d - c * l) +
                            b * (o * l - k * p))
            tm1[1] = det * (k * (a * p - m * d) +
                            o * (i * d - a * l) +
                            c * (m * l - i * p))
            tm2[1] = det * (l * (a * n - m * b) +
                            p * (i * b - a * j) +
                            d * (m * j - i * n))
            tm3[1] = det * (i * (n * c - b * o) +
                            m * (b * k - j * c) +
                            a * (j * o - n * k))
            
            tm0[2] = det * (n * (c * h - g * d) +
                            b * (g * p - o * h) +
                            f * (o * d - c * p))
            tm1[2] = det * (o * (a * h - e * d) +
                            c * (e * p - m * h) +
                            g * (m * d - a * p))
            tm2[2] = det * (p * (a * f - e * b) +
                            d * (e * n - m * f) +
                            h * (m * b - a * n))
            tm3[2] = det * (m * (f * c - b * g) +
                            a * (n * g - f * o) +
                            e * (b * o - n * c))
            
            tm0[3] = det * (b * (k * h - g * l) +
                            f * (c * l - k * d) +
                            j * (g * d - c * h))
            tm1[3] = det * (c * (i * h - e * l) +
                            g * (a * l - i * d) +
                            k * (e * d - a * h))
            tm2[3] = det * (d * (i * f - e * j) +
                            h * (a * j - i * b) +
                            l * (e * b - a * f))
            tm3[3] = det * (a * (f * k - j * g) +
                            e * (j * c - b * k) +
                            i * (b * g - f * c))

        return tmp
        

