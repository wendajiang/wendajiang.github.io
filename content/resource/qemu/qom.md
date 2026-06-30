---
title: QEMU Object Model(QOM)
date: 2026-06-30
---
QEMU use c language, and implement a class mechanism.

review OO:
- inheritance
- static field
- constructor and destructor
- polymorphic
	- override (dynamic)
	- overload (static)
- abstract class (interface)
- dynamic cast

# Base
## TypeInfo define one class in QOM
like:
```c
static const TypeInfo x86_base_cpu_type_info = {
	.name = X*^_CPU_TYPE_NAME("base"),
	.parent = TYPE_X86_CPU,
	.class_init = x86_cpu_base_class_init,
};
```
## struct first field implement inheritance
example:
```c
static const TypeInfo x86_cpu_type_info = {
    .name = TYPE_X86_CPU,
    .parent = TYPE_CPU,
		// ...
    .instance_size = sizeof(X86CPU),
};

static const TypeInfo cpu_type_info = {
    .name = TYPE_CPU,
    .parent = TYPE_DEVICE,
		// ...
    .instance_size = sizeof(CPUState),
};
```
In `X86CPU` contain one `CPUState` member:
```c
struct X86CPU {
	// private
	CPUState parent_obj;
	// public
	
	CPUNegativeOffsetState neg;
};
```
## static member/method is shared by all object, and non-static member/method that is different in every object
```c
static const TypeInfo x86_cpu_type_info = {
     // ...
    .instance_size = sizeof(X86CPU),
     // ...
    .class_size = sizeof(X86CPUClass),
};
```
`X86CPU` is non-static member, and `X86CPUClass` is static member.
## QEMU all objects parent is `Object` and `ObjectClass`
`Object` store the `non-static` part, `ObjectClass` store the `static` part
## TypeInfo `instance_init` and `class_init` is the ctor of class and object
```c
static const TypeInfo x86_cpu_type_info = {
    .instance_init = x86_cpu_initfn,
    .class_init = x86_cpu_common_class_init,
};
```

## function pointer in derived class init impl the `override`
`x86_cpu_common_class_init` and `cpu_class_init` are `x86_cpu_type_info` and `cpu_type_info` registered ctor ，the parse_features function, 
`x86_cpu_common_class_init` register to another function `x86_cpu_parser_featurestr`.

```c
static void x86_cpu_common_class_init(ObjectClass *oc, void *data)
{
    X86CPUClass *xcc = X86_CPU_CLASS(oc);
    CPUClass *cc = CPU_CLASS(oc);
    DeviceClass *dc = DEVICE_CLASS(oc);

    cc->parse_features = x86_cpu_parse_featurestr;
    // ...
}
    
static void cpu_class_init(ObjectClass *klass, void *data)
{
    DeviceClass *dc = DEVICE_CLASS(klass);
    CPUClass *k = CPU_CLASS(klass);

    k->parse_features = cpu_common_parse_features;
    // ...
}
```
## QEMU do not support multi-inheritance

# Init
- type_init: register one TypeInfo (define one class)
- TypeInfo::class_init: init the static member
- TypeInfo::instance_init: init the non-static member

[[resource/qemu/qdev|qdev]] have `qdev_realize` to initialize the device.

## type_init
```c
static void x86_cpu_register_types(void)
{
		// ...
    type_register_static(&x86_cpu_type_info);
}

type_init(x86_cpu_register_types)

// type_init is macro and macro expansion is below
static void __attribute__((constructor))
do_qemu_init_x86_cpu_register_types(void) {
  register_module_init(x86_cpu_register_types, MODULE_INIT_QOM);
}
// __attribute__((constructor)) is compiler supported attr, and exec before main function

// register_module_init add the new type on one static list: init_type_list[MODULE_INIT_QOM]
```

> Use `TypeInfo` init the `TypeImpl`, `TypeInfo` store the static data, `TypeImpl` store the runtime data

So, the call chain is 
```text
main
	qemu_init
		qemu_init_subsystem
			module_call_init: MODULE_INIT_QOM ctor hook
				type_register_static
					type_register
						type_register_internal
							type_new: use TypeInfo init TypeImpl
							g_hash_table_inisert(type_table_get(), (void*)ti->name, ti): created TypeImpl add type_table
```

## init static part
static members are shared by all objects, so should be inited before all objects created, and the initial only happen once, `instance_init` called by every object at creating.
```txt
- main
  - qemu_init
    - select_machine
      - object_class_get_list
        - object_class_foreach
          - g_hash_table_foreach
            - object_class_foreach_tramp
              - type_initialize
                - type_initialize
                  - x86_cpu_common_class_init
```

In select_machine, get all `TYPE_MACHINE` class, by the way call `type_initialize` all `TypeImpl`
```plain
- object_class_get_list
  - object_class_foreach --> object_class_get_list_tramp (将元素添加到后面) <------------
    - g_hash_table_foreach (对于 type_table 循环) ---> object_class_foreach_tramp       |
                                                          - type_initialize             |
                                                          - object_class_dynamic_cast   |
                                                            - 执行 callback 函数 --------
```

> `type_initialize`
> 	- allocate class memory
> 	- call parent class_init recursively

## init non-static part

Call `object_new` to initial:
- object_initialize_with_type:
	- init one empty `Object::properties`
	- object_init_with_type
		- if object has parent, call parent's object_init_with_type
		- call TypeImpl::instance_init

# Interface

@todo

# Cast