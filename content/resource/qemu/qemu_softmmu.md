---
title: QEMU softmmu
date: 2026-06-29
tags:
  - qemu
---
```text
          Guest load instrument                                                                 
                   |                                                                            
                   |                                                                            
                   |                                                                            
                   v                                                                            
TCG frontend translate to INDEX_op_qemu_ld                                                      
                   |                                                                            
                   |                                                                            
                   v                                                                            
      TCG backend generate TLB check                                                            
                   |                                                                            
                   |                                                                            
                   +-------   [hit] addr + addend -> directory access the host memory           
                   |                                                                            
                   +-------   [miss] call helper_ld*_mmu()                                      
                                      |                                                         
                                      |                                                         
                                      v                                                         
                                 mmu_lookup1()                                                  
                                      |                                                         
                                      |                                                         
                                      +--- tlb_hit() // recheck master TLB                      
                                      |                                                         
                                      |                                                         
                                      +--- victim_tlb_hit() // lookup victim TLB                
                                      |                                                         
                                      |                                                         
                                      +--- tlb_fill_align()                                     
                                                  |                                             
                                                  |                                             
                                                  v                                             
                                           arch's callback of tlb_fill                          
                                                  |                                             
                                                  v                                             
                                           tlb_set_page_full()                                  
                                                  |                                             
                                                  v                                             
                                             check tlb flags                                    
                                                  |                                             
                                                  |                                             
                                                  |                                             
                                                  +-------  [RAM] directory access memory       
                                                  |                                             
                                                  |                                             
                                                  +-------- [MMIO] memory_region_dispatch_read()
```