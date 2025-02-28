cmake_minimum_required(VERSION 3.28)
project(solver)

set(CMAKE_CXX_STANDARD 20)

include_directories("lib")

add_executable(solver src/main.cpp)
target_compile_options(solver PRIVATE -O3)

add_executable(performance src/main.cpp lib/json.hpp)
target_compile_options(performance PRIVATE -g -O0)