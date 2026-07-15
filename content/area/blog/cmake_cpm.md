---
titi: CMake and the Future of C++ package management
date: 2026-07-15
tags:
  - cmake
  - project
---
# What is `FetchContent`
By using two CMake functions: `FetchContent_declare` and `FetchContent_MakeAvailable` users can declare a named content item which can then be well fetched *in configure time*. The key there is, as opposed to `file(DOWNLOAD...)`, this allows three important things:
- define the means by which the content is produced (not just source, but also types of sources)
- have an identifiable name for the content
- maintain the coherency of the content in a well-defined manner

```cmake
include(FetchContent)
FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG        release-1.8.0
)
FetchContent_Declare(
  Catch2
  GIT_REPOSITORY https://github.com/catchorg/Catch2.git
  GIT_TAG        v2.5.0
)

# After the following call, the CMake targets defined by googletest and
# Catch2 will be defined and available to the rest of the build
FetchContent_MakeAvailable(googletest Catch2)
```

# CPM
CMake is, or at least getting really close to being, the de-facto standard build system for C++. But C++ doesn't have a default package manager, like Rust's Cargo. Because of this absence, the community has created some strategies to work around and there are even some pretty consolidated package managers out there, such as *Conan* and *Vcpkg*, but none of them are simple and easy to use like [CPM](https://github.com/cpm-cmake/cpm.cmake).

Usually, on a modern C++ and CMake project, the libraries are installed on the system and `find_package()` is called to load the library configuration, forcing every developer working on the project to have the same environment.

CPM let us call `CPMAddPackage` to install an external library (or `CPMFindPackage` to search the system, and, if it's not found, install it). There are two ways to download a library: through a Github repository or a link.

```cmake
CPMAddPackage (
	NAME nlohmann_json
	GITHUB_REPOSITORY nolhmann/json
	VERSION 3.6.1
)

# or

CPMAddPackage(
	NAME nlohmann_json
	VERSION 3.6.1|
	URL https://github.com/nlohmann/json/releases/download/v3.6.1/include.zip
	URL_HASH SHA256=69cc88207ce91347ea530b227ff0776db82dcb8de6704e1a3d74f4841bc651cf)

### -------------
if(nlohmann_json_ADDED)
	add_library(nlohmann_json INTERFACE)
	target_include_directories(nlohmann_json INTERFACE ${nlohmann_json_SOURCE_DIR})
endif()
```
## Why CPM 
CPM.cmake is a wrapper for CMake's `FetchContent` module and adds a number of features that turn it into a useful **dependency manager**.
- A simpler to use API
- Version checking
- Offline builds
- Automatic shallow clone:  if a version tag (e.g. `v2.2.0`) is provided and `CPM_SOURCE_CACHE` is used, CPM.cmake will perform a shallow clone of the dependency, which should be significantly faster while using less storage than a full clone.
- Overridable: all `CPMAddPackage` can be configured to use `find_package` by setting a [CMake flag](https://github.com/cpm-cmake/cpm.cmake#cpm_use_local_packages), making it easy to integrate into projects that may require local versioning through the system's package manager.
- [[#Package lock files]] for easier transitive dependency management.
- Dependencies can be overridden `per-build` using CMake CLI parameters
## How to use cpm in CMakeLists.txt
```cmake
file(DOWNLOAD
	https://github.com/cpm-cmake/CPM.cmake/releases/download/v0.40.5/CPM.cmake
	${CMAKE_CURRENT_BINARY_DIR}/cmake/CPM.cmake
)

include(${CMAKE_CURRENT_BINARY_DIR}/cmake/CPM.cmake)
```

Above snippet downside of CPM is that every time you run `git clean -fdx` or delete the build folder, it will remove the dependencies directory, and you will have to download everything again the next time you run cmake. But CPM lets you use a cache directory, passing the parameter **-DCPM_SOURCE_CACHE** to CMake and specifying a path:

```shell
cmake -DCPM_SOURCE_CACHE=/tmp/deps ...
```
With just a few lines of CMake code, we can manage our external dependencies of a project, making environment configuration so much easier.

## shorthand syntax
```cmake
# A git package from a given uri with a version
CPMAddPackage("uri@version")
# A git package from a given uri with a git tag or commit hash
CPMAddPackage("uri#tag")
# A git package with both version and tag provided
CPMAddPackage("uri@version#tag")
```

In the shorthand syntax if the URI is of the form `gh:user/name`, it is interpreted as GitHub URI and converted to `https://github.com/user/name.git`. `gl:user/name` would convert GitLab URI. `bb:user/name` would convert to bitbucket URI.

The single-argument syntax also work for URLs:
```cmake
# An archive package from a given url. The version is inferred
CPMAddPackage("https://example.com/my-package-1.2.3.zip")
# An archive package from a given url with an MD5 hash provided
CPMAddPackage("https://example.com/my-package-1.2.3.zip#MD5=68e20f674a48be38d60e129f600faf7d")
# An archive package from a given url. The version is explicitly given
CPMAddPackage("https://example.com/my-package.zip@1.2.3")
```

## Variables
After calling `CPMAddPackage`, the following variables are defined in the local scope, where `<dependency>` is the name of the dependency.

- `<dependency>_SOURCE_DIR` is the path to the source of the dependency.
- `<dependency>_BINARY_DIR` is the path to the build directory of the dependency.
- `<dependency>_ADDED` is set to `YES` if the dependency has not been added before, otherwise it is set to `NO`.
- `CPM_LAST_PACKAGE_NAME` is set to the determined name of the last added dependency (equivalent to `<dependency>`).

## Package lock files
In large projects with many transitive dependencies, it can be useful to introduce a package lock file. This will list all CPM.cmake dependencies and can be used to update dependencies without modifying the original `CMakeLists.txt`. To use a package lock, add the following line directly after including CPM.cmake.

```cmake
CPMUsePackageLock(package-lock.cmake)
```

To create or update the package lock file, build the `cpm-update-package-lock` target.

```shell
cmake -Bbuild
cmake --build build --target cpm-update-package-lock
```

## Options
### CPM_SOURCE_CACHE
To avoid re-downloading dependencies, CPM has an option `CPM_SOURCE_CACHE` that can be passed to CMake as `-DCPM_SOURCE_CACHE=<path to an external download directory>`
### CPM_DOWNLOAD_ALL
If set, CPM will forward all calls to `CPMFindPackage` as `CPMAddPackage`. This is useful to create reproducible builds or to determine if the source parameters have all been set correctly. This can also be set as an environmental variable. This can be controlled on a per package basis with the `CPM_DOWNLOAD_<dependency name>` variable.

### CPM_USE_LOCAL_PACKAGES
CPM can be configured to use `find_package` to search for locally installed dependencies first by setting the CMake option `CPM_USE_LOCAL_PACKAGES`.

If the option `CPM_LOCAL_PACKAGES_ONLY` is set, CPM will emit an error if the dependency is not found locally. These options can also be set as environmental variables.

In the case that `find_package` requires additional arguments, the parameter `FIND_PACKAGE_ARGUMENTS` may be specified in the `CPMAddPackage` call. The value of this parameter will be forwarded to `find_package`.

# reference
- https://ibob.bg/blog/2020/01/13/cmake-package-management/
- https://medium.com/swlh/cpm-an-awesome-dependency-manager-for-c-with-cmake-3c53f4376766
- 