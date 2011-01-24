Summary:	Augmented Reality Tracking Library
Name:		artoolkitplus
Version:	2.1.0
Release:	1
License:	GPL
Group:		Development/Libraries
Source:		%{name}-%{version}.tar.bz2
Vendor:		Institute for Computer Graphics and Vision, Graz University of Technology, Austria
URL:		http://studierstube.icg.tu-graz.ac.at/handheld_ar/artoolkitplus.php
Packager:	Institute for Computer Graphics and Vision, Graz University of Technology, Austria
Prefix:		/usr
BuildRoot: 	%{_tmppath}/buildroot-%{name}-%{version}
#Requires:	
BuildRequires:	qt3-devel

%define _prefix %{prefix}

%description
ARToolKit is a software library that can be used to calculate camera position and orientation relative to physical markers in real time. This enables the easy development of a wide range of Augmented Reality applications. ARToolKitPlus is an extended version of ARToolKit's vision code that adds features, but breaks compatibility due to a new class-based API.

#'

%prep
[ "$RPM_BUILD_ROOT" != "/" ] && rm -rf $RPM_BUILD_ROOT
%setup
export ARTKP=$(pwd)
export PATH=$PATH:$QTDIR/bin
qmake %{name}.pro PREFIX=%{_prefix} LIBDIR=%{_libdir} ARCH=%{_arch}
# QMAKE_CXX="ccache g++"

%build
export ARTKP=$(pwd)
export PATH=$PATH:$QTDIR/bin
make sub-src 
make

%install
INSTALL_ROOT=$RPM_BUILD_ROOT make install

%clean
make clean
[ "$RPM_BUILD_ROOT" != "/" ] && rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
%{_libdir}/*
%{_bindir}/*
%{_prefix}/share/ARToolKitPlus
%doc %{_prefix}/share/doc/packages/ARToolKitPlus


%package devel
Summary:	Augmented Reality Tracking Library headers
Group:		Development/Libraries
Requires:	%{name} = %{version}

%description devel
This package contains header files and include files that are needed for development using ARToolKitPlus.

%files devel
%defattr(-,root,root)
%{_prefix}/include/*
