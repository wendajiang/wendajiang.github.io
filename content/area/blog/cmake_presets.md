---
title: CMake Presets
date: 2026-07-15
tags:
  - cmake
---
I think [CMake presets](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html) like traditional configure to configure a project. `CmakePresets.json` and `CMakeUserPresets.json` live in the project's root directory. `CMakePresets.json` may be checked into a version control system, and `CMakeUserPresets.json` should NOT be checked in.