---
title: about CUDA
date: 2025-3-4
tags:
  - compiler
  - GPU
  - CUDA
---
## cuda 相关文章收录
- [知乎关于 CUDA 文章的精选](https://www.zhihu.com/column/c_1522503697624346624)
- [清华大佬](https://www.zhihu.com/people/youkaichao/posts)
	- 知乎大佬关于 GPU 执行与代码(stream and evetn)解释 https://zhuanlan.zhihu.com/p/699754357 
	  总结一下就是，GPU 执行的代码需要 CPU 调用，然后通过 stream （driver 的队列）将 kernel task offload 到 GPU，但是这些 task 的同步等工作还是在 CPU 中执行

这里提一下，[这里](https://hpcgpu.mini.pw.edu.pl/cuda-compilation-toolchain/)提到具体的编译拆解：

nvcc 会将 kernel function 在 main 函数之前注册一个 bin 地址，然后 fatbin 的内容会放在 elf 文件的某个 section 中，所以代码中关于 kernel function 会转换成 CUDA library 什么 launch 函数的调用，可以找到之前注册的地址传入到库函数中，Driver API 也有直接用的 API。
- [NVVM-IR(LLVM-IR) to generate PTX code](https://docs.nvidia.com/cuda/nvvm-ir-spec/)
- [Nvdia 员工介绍cuda编译中的文件](https://leimao.github.io/blog/CUDA-Compilation/)
- [官方介绍编译流程](https://docs.nvidia.com/cuda/cuda-c-programming-guide/#compilation-with-nvcc)
- [Memory format (cuDNN)](https://oneapi-src.github.io/oneDNN/dev_guide_understanding_memory_formats.html)
## 摘录 How-do-you-transfer-a-CPU-load-to-a-GPU
Transferring a CPU load to a GPU involves leveraging parallel processing capabilities of the GPU to perform computations that would typically be handled by the CPU. This process can be broken down into several key steps:

1. Identify Suitable Workloads
	- Determine which parts of your application can benefit from parallel processing. Tasks that involve large data sets and can be broken down into smaller, independent tasks are ideal candidates.

2. Choose a Programming Model
	- Select a framework or programming model that supports GPU programming. Common options include:
	- CUDA (for NVIDIA GPUs)
	- OpenCL (for cross-vendor support)
	- DirectCompute (for DirectX)
	- Vulkan (for graphics and compute)
	- TensorFlow or PyTorch (for machine learning tasks)
3. Setup Development Environment
	- Install necessary tools and libraries:
		- For CUDA, install the CUDA Toolkit and appropriate drivers.
		- For OpenCL, ensure you have the right SDK and drivers for your GPU.
4. Data Transfer
	- Transfer data from the CPU to the GPU memory. This often involves:
	- Allocating memory on the GPU.
	- Copying data from the host (CPU) to the device (GPU) using functions like `cudaMemcpy` in CUDA.
5. Kernel Development
	- Write GPU kernels, which are functions that run on the GPU. These should be designed to perform computations in parallel:
	- In CUDA, you define a kernel function and launch it with a specified grid and block size.
	- In OpenCL, you write a kernel in OpenCL C and compile it on the host.
6. Launch Kernels
	- Execute the GPU kernels. This involves specifying the number of threads and how they are organized into blocks (for CUDA) or work-groups (for OpenCL).
7. Synchronization
	- Wait for the GPU to finish processing before retrieving results. This can be done using synchronization functions like `cudaDeviceSynchronize()` in CUDA.
8. Retrieve Results
	- Copy the results back from GPU memory to CPU memory.
9. Optimize
	- Profile and optimize your GPU code. Look for bottlenecks and opportunities to reduce memory transfers, improve memory access patterns, and maximize parallel execution.

Example Code (CUDA)

Here’s a simple example of transferring a CPU computation to a GPU using CUDA:
```cpp
#include <stdio.h> 
__global__ void add(int *a, int *b, int *c, int N) { 

	int idx = threadIdx.x + blockIdx.x * blockDim.x; 
	if (idx < N) { 
		c[idx] = a[idx] + b[idx]; 
	} 
}

int main() {
	int N = 1024;
	int size = N * sizeof(int);
	// Allocate host memory
	int *h_a = (int *)malloc(size);
	int *h_b = (int *)malloc(size);
	int *h_c = (int *)malloc(size);
	// Initialize arrays
	for (int i = 0; i < N; i++) {
		h_a[i] = i;
		h_b[i] = i;
	}
	// Allocate device memory
	int *d_a, *d_b, *d_c;
	cudaMalloc(&d_a, size);
	cudaMalloc(&d_b, size);
	cudaMalloc(&d_c, size);
	// Copy data from host to device
	cudaMemcpy(d_a, h_a, size, cudaMemcpyHostToDevice);
	cudaMemcpy(d_b, h_b, size, cudaMemcpyHostToDevice);
	// Launch kernel
	int blockSize = 256;
	int numBlocks = (N + blockSize - 1) / blockSize;
	add<<<numBlocks, blockSize>>>(d_a, d_b, d_c, N);
	// Copy result back to host
	cudaMemcpy(h_c, d_c, size, cudaMemcpyDeviceToHost);
	// Free memory
	cudaFree(d_a);
	cudaFree(d_b);
	cudaFree(d_c);
	free(h_a);
	free(h_b);
	free(h_c);
	return 0;
}
```
Conclusion

By following these steps, you can effectively transfer computational loads from the CPU to the GPU, taking advantage of the GPU's parallel processing capabilities to improve performance for suitable workloads.

## 摘录 everything-you-need-to-know-about-gpu-architecture

[https://www.cherryservers.com/blog/everything-you-need-to-know-about-gpu-architecture](https://www.cherryservers.com/blog/everything-you-need-to-know-about-gpu-architecture)