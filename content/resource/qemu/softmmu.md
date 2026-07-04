---
title: QEMU softmmu
date: 2026-06-29
tags:
  - qemu
---
QEMU system mode need to simulate one complete computer: CPU, memory and peripherals. Actual CPU use MMU (Memory Management Unit) and TLB (Translation Lookaside Buffer) to translate virtual address to physical address, and determine to access memory or any device register. QEMU softmmu is pure software to implement these step.

User mode do not need softmmu, it only simulate user mode instrument, guest process `mmap` memory to host memory directly,  host OS and hardware MMU are in charge of address translation.

## Address level
- GVA (Guest Virtual Address)
- GPA (Guest Physical Address)
- HVA (Host Virtual Address)
- HPA (Host Physical Address)
```plain
GVA (guest virtual address)
 │
 ├─[Guest page lookup(tlb_fill)]──→ GPA (guest physical address)
 │                               │
 │                               ├─[SoftMMU / FlatView]──→ HVA (host virtual address)
 │                               │                         │
 │                               │                         └─[Host hardware MMU]──→ HPA
 │                               │
 │                               └─[If MMIO]──→ call device w/r callback
```

So If we want to only use the QEMU vCPU model, and integrate with SystemC system model, we should change the `tlb` part, GPA access, we can connect with SystemC bus.

## SoftTLB
cache GVA -> HVA result

One fast path, one slow path.

### CPUTLBEntry
The fast path struct
```c
typedef union CPUTLBEntry {
	struct {
		uintptr_t addr_read;
		uintptr_t addr_write;
		uintptr_t addr_code;
		uintptr_t addend;
	};
	unitptr_t addr_idx[(1 << CPU_TLB_ENTRY_BITS) / sizeof(unitptr_t)]; 
};
```
When the cache hit, `addr + addend` is HVA.

### CPUTLBEntryFull
The slow path struct
```c
/* include/hw/core/cpu.h */
struct CPUTLBEntryFull {
    hwaddr xlat_offset;
    MemoryRegionSection *section;
    hwaddr phys_addr;
    MemTxAttrs attrs;
    uint8_t prot;
    uint8_t lg_page_size;
    uint8_t tlb_fill_flags;
    uint8_t slow_flags[MMU_ACCESS_COUNT];
    /* ... */
};
```
TLB miss, cpu lookup this struct.

## TLB
Every CPU maintain self TLB

## TCG how to connect with SoftMMU

When TCG frontend fetch the Guest load/store instn, call `tcg_gen_qemu_ld` or `tcg_gen_qemu_st` series function (tcg/tcg-op-ldst.c), generate IR like `INDEX_op_qemu_ld/INDEX_op_qemu_st`

TCG backend compile `INDEX_op_qemu_ld` to host instn, generate one **inline tlb check code**. Embed into TB, not a function call, the x86_64 backend `prepare_host_addr()`(tgc/x86_64/tcg-target.c.inc) example:
```c
index = (addr >> TARGET_PAGE_BITS) & fast->mask;
entry = &fast->table[index];
if (entry->addr_read == (addr & TARGET_PAGE_MASK)) {
    /* TLB 命中：host_addr = addr + entry->addend */
    goto fast_path;
} else {
    /* TLB 未命中：调用慢速路径 helper */
    goto slow_path;
}
```

## The complete flow
```text
          Guest load instrument                                                                 
                   |                                                                                                                                                    
                   v                                                                            
TCG frontend translate to INDEX_op_qemu_ld                                                      
                   |                                                                                                                                                  
                   v                                                                            
      TCG backend generate TLB check                                                            
                   |                                                                                                                                                     
                   +-------   [hit] addr + addend -> directly access the host memory           
                   |                                                                            
                   +-------   [miss] call helper_ld*_mmu()                                      
                                      |                                                                                                            
                                      v                                                         
                                 mmu_lookup1()                                                  
                                      |                                                                                                             
                                      +--- tlb_hit() // recheck master TLB                      
                                      |                                                                                                              
                                      +--- victim_tlb_hit() // lookup victim TLB                
                                      |                                                                                                             
                                      +--- tlb_fill_align()                                     
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
                                                  +-------  [RAM] directory access memory       
                                                  |                                                                                       
                                                  +-------- [MMIO] memory_region_dispatch_read()
```
### miss path
TCG goto call helper function, for example:
```c
/* accel/tcg/ldst_common.c.inc */
tcg_target_ulong helper_ldq_mmu(CPUArchState *env, uint64_t addr,
                                MemOpIdx oi, uintptr_t retaddr)
{
    return do_ld8_mmu(env_cpu(env), addr, oi, retaddr, MMU_DATA_LOAD);
}
```

### TLB loop core: mmu_lookup1
`do_ld8_mmu` internal call `mmu_lookup`, finally call `mmu_lookup1`, is the core softmmu lookup function:
```c
/**  
 * mmu_lookup1: translate one page 
* @cpu: generic cpu state 
* @data: lookup parameters 
* @memop: memory operation for the access, or 0 
* @mmu_idx: virtual address context 
* @access_type: load/store/code 
* @ra: return address into tcg generated code, or 0 
* 
* Resolve the translation for the one page at @data.addr, filling in 
* the rest of @data with the results.  If the translation fails, 
* tlb_fill_align will longjmp out.  Return true if the softmmu tlb for 
* @mmu_idx may have resized. 
*/
static bool mmu_lookup1(CPUState *cpu, MMULookupPageData *data, MemOp memop,  
                        int mmu_idx, MMUAccessType access_type, uintptr_t ra)  
{  
    vaddr addr = data->addr;  
    uintptr_t index = tlb_index(cpu, mmu_idx, addr);  
    CPUTLBEntry *entry = tlb_entry(cpu, mmu_idx, addr);  
    uint64_t tlb_addr = tlb_read_idx(entry, access_type);  
    bool maybe_resized = false;  
    CPUTLBEntryFull *full;  
    int flags;  
  
    /* If the TLB entry is for a different page, reload and try again.  */  
    if (!tlb_hit(tlb_addr, addr)) {  
        if (!victim_tlb_hit(cpu, mmu_idx, index, access_type,  
                            addr & TARGET_PAGE_MASK)) {  
            tlb_fill_align(cpu, addr, access_type, mmu_idx,  
                           memop, data->size, false, ra);  
            maybe_resized = true;  
            index = tlb_index(cpu, mmu_idx, addr);  
            entry = tlb_entry(cpu, mmu_idx, addr);  
        }  
        tlb_addr = tlb_read_idx(entry, access_type) & ~TLB_INVALID_MASK;  
    }  
  
    full = &cpu->neg.tlb.d[mmu_idx].fulltlb[index];  
    flags = tlb_addr & (TLB_FLAGS_MASK & ~TLB_FORCE_SLOW);  
    flags |= full->slow_flags[access_type];  
  
    if (likely(!maybe_resized)) {  
        /* Alignment has not been checked by tlb_fill_align. */  
        int a_bits = memop_tlb_alignment_bits(memop, flags & TLB_CHECK_ALIGNED);  
        if (unlikely(addr & ((1 << a_bits) - 1))) {  
            cpu_unaligned_access(cpu, addr, access_type, mmu_idx, ra);  
        }  
    }  
  
    data->full = full;  
    data->flags = flags;  
    /* Compute haddr speculatively; depending on flags it might be invalid. */  
    data->haddr = (void *)((uintptr_t)addr + entry->addend);  
  
    return maybe_resized;  
}
```

### tlb_fill: target dependent page traverse
`tlb_fill_align()` finally call the target arch register callback `tlb_fill`. Every target arch(RISC-V, ARM, x86).etc implement self `tlb_fill`

### tlb_set_page_full: fill the TLBEntry
`tlb_set_page_full` is the final logic:
1. translate GPA to specific `MemoryRegionSection`, determine it's RAM or MMIO
2. if RAM, compute `addend`, fast path use it directly
3. if MMIO, set `TLB_MMIO`, force to run slow path
4. if RAM need to  dirty page tracking, set `TLB_NOTDIRETY`
5. trash TLBEntry to victim TLB, write new TLBEntry
TLBEntry flag declare below path.

## FlatView and AddressSpaceDispatch
In `tlb_set_page_full`, it need to translate GPA to `memoryRegionSection` depends on QEMU memory model: `AddressSpace`, `MemoryRegion`, `FlatView`.

When translating GPA, `flatview_do_translate` through multi-level page table (AddressSpaceDispatch) locate `MemoryRegionSection` by FlatView:

```c
static MemoryRegionSection flatview_do_translate(FlatView *fv,  
                                                 hwaddr addr,  
                                                 hwaddr *xlat,  
                                                 hwaddr *plen_out,  
                                                 hwaddr *page_mask_out,  
                                                 bool is_write,  
                                                 bool is_mmio,  
                                                 AddressSpace **target_as,  
                                                 MemTxAttrs attrs)  
{  
    MemoryRegionSection *section;  
    IOMMUMemoryRegion *iommu_mr;  
    hwaddr plen = (hwaddr)(-1);  
  
    if (!plen_out) {  
        plen_out = &plen;  
    }  
  
    section = address_space_translate_internal(  
            flatview_to_dispatch(fv), addr, xlat,  
            plen_out, is_mmio);  
  
    iommu_mr = memory_region_get_iommu(section->mr);  
    if (unlikely(iommu_mr)) {  
        return address_space_translate_iommu(iommu_mr, xlat,  
                                             plen_out, page_mask_out,  
                                             is_write, is_mmio,  
                                             target_as, attrs);  
    }  
    if (page_mask_out) {  
        /* Not behind an IOMMU, use default page size. */  
        *page_mask_out = ~TARGET_PAGE_MASK;  
    }  
  
    return *section;  
}
```