---
title: QDev(qtree)
date: 2026-07-01
tags:
  - qemu
---
# Device Init
![[pics/qemu-qdev-class.drawio.png]]
It show the class relationship.
```c
/* hw/core/qdev.c: 652 */ 
static void device_initfn(Object *obj) { 
	DeviceState *dev = DEVICE(obj);  // translate Object to DeviceState (cast)
	if (phase_check(PHASE_MACHINE_READY)) {  // check machine init state
		dev->hotplugged = 1; 
		qdev_hot_added = true; 
	} 
	dev->instance_id_alias = -1;  // init device property
	dev->realized = false; // realized is false indicate device is not inited
	dev->allow_unplug_during_migration = false; 
	
	QLIST_INIT(&dev->gpios);  // init gpio and clocks
	QLIST_INIT(&dev->clocks); 
}
```

## realized property set
![[pics/qemu-qdev-realize.drawio.png]]
In `qdev_realize` function, the `realized` property is set to true, the device complete the initial.