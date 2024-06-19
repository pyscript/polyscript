# Polyscript

<small><strong><a href="https://github.com/pyscript/pyscript">PyScript</a> single core to rule them all</strong></small>

- - -

 * [Terminology](#terminology) - what we mean by "_term_" in this document
 * [Bootstrapping core](#bootstrapping-core) - how to enable Polyscript in your page
 * [How Scripts Work](#how-scripts-work) - how `<script type="...">` works
 * [Extra config Features](#extra-config-features) - how to load *JS* modules on either main or workers and how to untar or unzip archives into the Virtual File System
 * [The polyscript Module](#the-polyscript-module) - what is exported in *polyscript*
 * [How Events Work](#how-events-work) - how `<button py-click="...">` works
 * [XWorker](#xworker) - how `XWorker` class and its `xworker` reference work
 * [Custom Scripts](#custom-scripts) - how *custom types* can be defined and used to enrich any core feature
 * [Hooks](#hooks) - how *custom types* can hook around the life cycle of each script/tag
 * [Ready Event](#ready-event) - how to listen to the `type:ready` event
 * [Done Event](#done-event) - how to listen to the `type:done` event
 * [Examples](#examples) - some *polyscript* based live example
 * [Interpreter Features](#interpreter-features) - current state of supported interpreters


## Terminology

This section goal is to avoid confusion around topics discussed in this document, describing each *term* as exhaustively as possible.

<details>
  <summary><strong>Interpreter</strong></summary>
  <div markdown=1>

Also commonly referred as *runtime* or *engine*, we consider an **interpreter** any "_piece of software_" able to parse, understand, and ultimately execute, a *Programming Language* through this project.

We also explicitly use that "_piece of software_" as the interpreter name it refers to. We currently bundle references to the following interpreters:

 * [pyodide](https://pyodide.org/en/stable/index.html) is the name of the interpreter that runs likely the most complete version of latest *Python*, enabling dozen official modules at run time, also offering a great *JS* integration in its core
 * [micropython](https://micropython.org/) is the name of the interpreter that runs a small subset of the *Python* standard library and is optimized to run in constrained environments such as *Mobile* phones, or even *Desktop*, thanks to its tiny size and an extremely fast bootstrap
 * [ruby-wasm-wasi](https://github.com/ruby/ruby.wasm) is the name of the (currently *experimental*) interpreter that adds *Ruby* to the list of programming languages currently supported
 * [wasmoon](https://github.com/ceifa/wasmoon) is the name of the interpreter that runs *Lua* on the browser and that, among the previous two interpreters, is fully compatible with all core features
 * [webr](https://docs.r-wasm.org/webr/latest/) is the name of the (currently *experimental*) interpreter that adds *R* to the list of programming languages currently supported

`<script>` tags specify which *interpreter* to use via the `type` attribute. This is typically the full name of the interpreter:

```html
<script type="pyodide">
    import sys
    print(sys.version)
</script>

<script type="micropython">
    import sys
    print(sys.version)
</script>

<script type="ruby-wasm-wasi">
    print "ruby #{ RUBY_VERSION }"
</script>

<script type="wasmoon">
    print(_VERSION)
</script>

<script type="webr">
    print(R.version.string)
</script>
```

ℹ️ - Please note we decided on purpose to not use the generic programming language name instead of its interpreter project name to avoid being too exclusive for alternative projects that would like to target that very same Programming Language (i.e. note *pyodide* & *micropython* not using *python* indeed as interpreter name).

Custom values for the `type` attribute can also be created which alias (and potential build on top of) existing interpreter types. We include `<script type="py">` (and its `<py-script>` custom element counter-part)  which use the Pyodide interpreter while extending its behavior in specific ways familiar to existing PyScript users (*the `<py-config>` tag, `<py-repl>`, etc*).

  </div>
</details>

<details>
  <summary><strong>Target</strong></summary>
  <div markdown=1>

When it comes to *strings* or *attributes*, we consider the **target** any valid element's *id* on the page or, in most cases, any valid *CSS* selector.

```html
<!-- ℹ️ - requires py-script custom type -->
<script type="py">
    # target here is a string
    display('Hello PyScript', target='output')
</script>
<div id="output">
    <!-- will show "Hello PyScript" once the script executes -->
</div>
```

When it comes to the `property` or `field` attached to a `<script>` element though, that *id* or *selector* would already be resolved, so that such field would always point at the very same related element.

```html
<script type="micropython" target="output">
    from js import document
    document.currentScript.target.textContent = "Hello";
</script>
<div id="output">
    <!-- will show "Hello" once the script executes -->
</div>
```

ℹ️ - Please note that if no `target` attribute is specified, the *script* will automatically create a "_companion element_" when the `target` property/field is accessed for the very first time:

```html
<script type="micropython">
    from js import document

    # will create a <script-micropython> element appended
    # right after the currently executing script
    document.currentScript.target.textContent = "Hello";
</script>
<!--
    created during previous code execution

    <script-micropython>Hello</script-micropython>
-->
```

  </div>
</details>

<details>
  <summary><strong>Env</strong></summary>
  <div markdown=1>

ℹ️ - This is an **advanced feature** that is worth describing but usually it is not needed for most common use cases.

Mostly due its terseness that plays nicely as attribute's suffix, among its commonly understood meaning, we consider an *env* an identifier that guarantee the used *interpreter* would always be the same and no other interpreters, even if they point at very same project, could interfere with globals, behavior, or what's not.

In few words, every single *env* would spawn a new interpreter dedicated to such env, and global variables defined elsewhere will not affect this "_environment_" and vice-versa, an *env* cannot dictate what will happen to other interpreters.

```html
<!-- default env per each interpreter -->
<script type="micropython">
    shared = True
</script>
<script type="micropython">
    # prints True - shared is global
    print(shared)
</script>

<!-- dedicated interpreter -->
<script type="micropython" env="my-project-env">
    # throws an error - shared doesn't exist
    print(shared)
</script>
```

ℹ️ - Please note if the interpreter takes 1 second to bootstrap, multiple *environments* will take *that* second multiplied by the number of different environments, which is why this feature is considered for **advanced** use cases only and it should be discouraged as generic practice.

  </div>
</details>


## Bootstrapping core

In order to have anything working at all in our pages, we need to at least bootstrap *polyscript* functionalities, otherwise all examples and scripts mentioned in this document would just sit there ... sadly ignored by every browser:

```html
<!doctype html>
<html>
    <head>
        <!-- this is a way to automatically bootstrap polyscript -->
        <script type="module" src="https://cdn.jsdelivr.net/npm/polyscript"></script>
    </head>
    <body>
        <script type="micropython">
            from js import document
            document.body.textContent = 'polyscript'
        </script>
    </body>
</html>
```

As *core* exposes some utility/API, using the following method would also work:

```html
<script type="module">
    import {
        define,      // define a custom type="..."
        whenDefined, // wait for a custom type to be defined
        XWorker      // allows JS <-> Interpreter communication
    } from 'https://cdn.jsdelivr.net/npm/polyscript';
</script>
```

Please keep reading this document to understand how to use those utilities or how to have other *Pogramming Languages* enabled in your page via `<script>` elements.


## How Scripts Work

The [&lt;script&gt; element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) has at least these extremely important peculiarities compared to any other element defined by the [HTML Standard](https://html.spec.whatwg.org/multipage/):

 * its only purpose is to contain *data blocks*, meaning that browsers will never try to parse its content as generic *HTML* (and browsers will completely ignore either its content or its attributes, including the `src`, when its [type](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type) is not known)
 * its completely unobtrusive when it comes to both *aria* and *layout*, indeed it's one of the few nodes that can be declared almost anywhere without breaking its parent tree (other notable exception would be a comment node)
 * for our specific use case, it already offers attributes that are historically well understood and known, also simplifying somehow the creation of this document

The long story short is that any `<script type="non-standard-type">` has zero issues with any browser of choice, but it's true that using some specific *custom type* might lead to future issues in case that `type` could have some special meaning for the future of the Web.

We encourage everyone to be careful when using this *core* API as we definitively don't want to clash or conflict, by any mean, with what the Web might need or offer in the near to far future, but we're also confident so far our current *types* are more than safe.

### Script Attributes

| name      | example                                       | behavior |
| :-------- | :-------------------------------------------- | :--------|
| async     | `<script type="pyodide" async>`               | The code is evaluated via `runAsync` utility where, if the *interpreter* allows it, top level *await* would be possible, among other *PL* specific asynchronous features.  |
| config    | `<script type="pyodide" config="./cfg.toml">` | The interpreter will load and parse the *JSON* or *TOML* file to configure itself. Please see [currently supported config values](https://docs.pyscript.net/latest/reference/elements/py-config.html#supported-configuration-values) as this is currently based on `<py-config>` features. |
| env       | `<script type="pyodide" env="brand">`         | Create, if not known yet, a dedicated *environment* for the specified `type`. Please read the [Terminology](#terminology) **env** dedicated details to know more. |
| src       | `<script type="pyodide" src="./app.py">`      | Fetch code from the specified `src` file, overriding or ignoring the content of the `<script>` itself, if any. |
| target    | `<script type="pyodide" target="outcome">`    | Describe as *id* or *CSS* selector the default *target* to use as `document.currentScript.target` field. Please read the [Terminology](#terminology) **target** dedicated details to know more. |
| type      | `<script type="micropython">`                 | Define the *interpreter* to use with this script. Please read the [Terminology](#terminology) **interpreter** dedicated details to know more. |
| version   | `<script type="pyodide" version="0.23.2">`    | Allow the usage of a specific version where, if numeric, must be available through the project *CDN* used by *core* but if specified as fully qualified *URL*, allows usage of any interpreter's version: `<script type="pyodide" version="http://localhost:8080/pyodide.local.mjs">` |
| worker    | `<script type="pyodide" worker="./file.py">`  | Bootstraps an *interpreter* **only** within a *worker*, allowing `config` and `version` attributes too, also attaching an `xworker` property/field directly to the *script* tag on the main page. Please note the interpreter will not be available on the main thread when this attribute is used. |


### Script Features

These are all special, *script* related features, offered by *polyscript* out of the box.

<details>
  <summary><strong>document.currentScript</strong></summary>
  <div markdown=1>

No matter the interpreter of choice, if there is any way to reach the `document` from such interpreter, its `currentScript` will point at the exact/very-same script that is currently executing the code, even if its `async` attribute is used, mimicking what the standard [document.currentScript](https://developer.mozilla.org/en-US/docs/Web/API/Document/currentScript) offers already, and in an unobtrusive way for the rest of the page, as this property only exists for *synchronous* and blocking scripts that are running, hence never interfering with this *core* logic or vice-versa.

```html
<script type="micropython" id="my-target">
    from js import document

    # explicitly grab the current script as target
    my_target = document.getElementById('my-target')

    # verify it is the exact same node with same id
    print(document.currentScript.id == my_target.id)
</script>
```

Not only this is helpful to crawl the surrounding *DOM* or *HTML*, every script will also have a `target` property that will point either to the element reachable through the `target` attribute, or it lazily creates once a companion element that will be appended right after the currently executing *script*.

Please read the [Terminology](#terminology) **target** dedicated details to know more.

  </div>
</details>

<details>
  <summary><strong>XWorker</strong></summary>
  <div markdown=1>

With or without access to the `document`, every (*non experimental*) interpreter will have defined, either at the global level or after an import (i.e.`from polyscript import XWorker` in *Python* case), a reference to the `XWorker` "_class_" (it's just a *function*!), which goal is to enable off-loading heavy operations on a worker, without blocking the main / UI thread (the current page) and allowing such worker to even reach the `document` or anything else available on the very same main / UI thread.

```html
<script type="micropython">
    from polyscript import XWorker
    print(XWorker != None)
</script>
```

Please read the [XWorker](#xworker) dedicated section to know more.

  </div>
</details>


## Extra `config` features

It is possible to land in either the *main* world or the *worker* one native *JS* modules (aka: *ESM*).

In *polyscript*, this is possible by defining one or more `[js_modules.X]` fields in the config, where `X` is either *main* or *worker*:

  * `sync_main_only` which if `true` avoids throwing out of the box if the *SharedArrayBuffer* cannot be used and still allows invokes **from the main** to methods exposes **through the worker** (so that basically interactions can only be *async*).
  * `[js_modules.main]` is a list of *source* -> *module name* pairs, similarly to how `[files]` field work, where the *module* name will then be reachable via `polyscript.js_modules.actual_name` in both *main* and *worker* world. As the *main* module lands on the main thread, where there is also likely some UI, it is also possible to define one or more related *CSS* to that module, as long as they target the very same name (see the example to better understand).
  * `[js_modules.worker]` is a list of *source* -> *module name* pairs that actually land only in `<script type="x" worker>` cases. These modules are still reachable through the very same `polyscript.js_modules.actual_name` convention and this feature is meant to be used for modules that only works best, or work regardless, outside the *main* world. As example, if your *JS* module implies that `document` or `window` references, among other *DOM* related APIs, are globally available, it means that that module should be part of the `[js_modules.main]` list instead ... however, if the module works out of the box in a *Worker* environment, it is best for performance reasons to explicitly define such module under this field. Please note that *CSS* files are not accepted within this list because there's no way *CSS* can be useful or land in any meaningful way within a *Worker* environment.

All registeed modules can be then imported as such:

```python
# just import js_modules and reach names after
from polyscript import js_modules
js_modules.my_module.util()

# import directly and reach names after
from polyscript.js_modules import my_module
my_module.util()

# import deeply up to the module exports
from polyscript.js_modules.my_module import util
util()

# import default or other fields with aliases
from polyscript.js_modules.other import defalut as fn
fn()
```

### js_modules config example

**TOML**

```toml
[js_modules.main]
# this modules work best on main
"https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet-src.esm.js" = "leaflet"
"https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" = "leaflet" # CSS
# this works in both main and worker
"https://cdn.jsdelivr.net/npm/html-escaper" = "html_escaper"

[js_modules.worker]
# this works out of the box in a worker too
"https://cdn.jsdelivr.net/npm/html-escaper" = "html_escaper"
# this works only in a worker
"https://cdn.jsdelivr.net/npm/worker-only" = "worker_only"
```

**JSON**

```js
{
  "js_modules": {
    "main": {
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet-src.esm.js": "leaflet",
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css": "leaflet",
      "https://cdn.jsdelivr.net/npm/html-escaper": "html_escaper"
    },
    "worker": {
      "https://cdn.jsdelivr.net/npm/html-escaper": "html_escaper",
      "https://cdn.jsdelivr.net/npm/worker-only": "worker_only"
    }
  }
}
```

**Python**

```html
<!-- main case -->
<script type="pyodide" config="./that.toml">
  # these both works
  from polyscript.js_modules import leaflet as L
  from polyscript.js_modules import html_escaper

  # this fails as it's not reachable in main
  from polyscript.js_modules import worker_only
</script>

<!-- worker case -->
<script type="pyodide" config="./that.toml" worker>
  # these works by proxying the main module and landing
  # on main only when accessed, never before
  # the CSS file also lands automatically on demand
  from polyscript.js_modules import leaflet as L

  # this works out of the box in the worker
  from polyscript.js_modules import html_escaper

  # this works only in a worker 👍
  from polyscript.js_modules import worker_only
</script>
```


### .tar.gz and .zip files

If the `[files]` entry in the *config* contains a `xxxxx.tar.gz` or `xxxxx.zip` **source**, and it's destination / target is a folder with a star, such as `/*` for root or `./dest/*` for local folders, both *Pyodide* and *MicroPython* runtimes will be able to extract that compressed archive automatically into the Virtual File System and at exactly that location.

This feature is hence available on *PyScript* too.



## The `polyscript` Module

The module is registered within the interpreter as *JS* module and it offers various helpers or utilities accordingly if it's running on the **main** thread or the **worker** one.


### Main exports

| name            | example                                  | description |
| :-------------- | :--------------------------------------- | :---------- |
| XWorker         | `from polyscript import XWorker`         | described in the [XWorker](#xworker) part. |
| config          | `from polyscript import config`          | **custom only**: the used config as object literal
| currentScript   | `from polyscript import currentScript`   | it's an explicit, always correct, reference to the current node running the generic script code. |
| js_modules      | `from polyscript import js_modules`      | described in the [Extra config Features](#extra-config-features) part. |
| lazy_py_modules | `from polyscript import lazy_py_modules` | allows, only in *Python* related interpreters, and without needing static config entries, to import lazily any available module.
| storage         | `from polyscript import storage`         | a utility to instantiate a named [idb-map](https://github.com/WebReflection/idb-map/#readme) that can be consumed synchronously.
| JSON            | `from polyscript import JSON`            | a utility to stringify/parse more complex or recursive data via [@ungap/structured-clone/json](https://github.com/ungap/structured-clone/#readme).


#### lazy_py_modules

```html
<script type="pyodide" async>
  from polyscript import lazy_py_modules

  matplotlib, regex, = await lazy_py_modules("matplotlib", "regex")

  print(matplotlib, regex)
</script>
```

#### storage

```html
<script type="micropython" async>
  from polyscript import storage

  # await its loading
  map = await storage("my-user-persistent-storage")

  # just use it synchronously
  map.set("key", "value")
  print(map.get("key"))

  # after set, delete, or clear
  # it is possible to sync operations
  await map.sync()
</script>
```



### Worker exports

| name          | example                                | description |
| :------------ | :------------------------------------- | :---------- |
| xworker       | `from polyscript import xworker`       | described in the [XWorker](#xworker) part. |
| config        | `from polyscript import config`        | **custom only**: the used config as object literal
| currentScript | `from polyscript import currentScript` | it's an explicit, always correct, reference to the current node running the generic script code via a worker. |
| js_modules    | `from polyscript import js_modules`    | described in the [Extra config Features](#extra-config-features) part. |
| target        | `from polyscript import target`        | returns the element referenced by the `target` attribute, if any, or create a target node to display output when this has not been provided.



## How Events Work

The event should contain the *interpreter* or *custom type* prefix, followed by the *event* type it'd like to handle.

```html
<script type="micropython">
    def print_type(event):
        print(event.type)
</script>
<button micropython-click="print_type">
    print type
</button>
```

Differently from *Web* inline events, there's no code evaluation at all within the attribute: it's just a globally available name that will receive the current event and nothing else.

#### The type-env attribute

Just as the `env` attribute on a `<script>` tag specifies a specific instance of an interpreter to use to run code, it is possible to use the `[type]-env` attribute to specify which instance of an interpreter or custom type should be used to run event code:

```html
<script type="micropython">
    def log(event):
        print(1)
</script>
<!-- note the env value -->
<script type="micropython" env="two">
    # the button will log 2
    def log(event):
        print(2)
</script>
<!-- note the micropython-env value -->
<button
    micropython-env="two"
    micropython-click="log"
>
    log
</button>
```

As mentioned before, this will work with `py-env` too, or any custom type defined out there.


## XWorker

Whenever computing relatively expensive stuff, such as a *matplot* image, or literally anything else that would take more than let's say 100ms to answer, running your *interpreter* of choice within a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) is likely desirable, so that the main / UI thread won't block users' actions, listeners, or any other computation going on in these days highly dynamic pages.

`polyscript` adds a functionality called `XWorker` to all of the interpreters it offers, which works in each language the way `Worker` does in JavaScript.

In each Interpreter, `XWorker` is either global reference or an import (i.e.`from polyscript import XWorker` in *Python* case) module's utility, with a counter `xworker` (lower case) global reference, or an import (i.e.`from polyscript import xworker` in *Python* case) module's utility, within the worker code.

In short, the `XWorker` utility is to help, without much thinking, to run any desired interpreter out of a *Worker*, enabling extra features on the *worker*'s code side.


### Enabling XWorker

We use the latest Web technologies to allow fast, non-blocking, yet synchronous like, operations from any non-experimental interpreter's worker, and the standard requires some special header to enable such technologies and, most importantly, the [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).

There is an exhaustive [section](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements) around this topic but the *TL;DR* version is:

  * to protect your page from undesired attacks, the `Cross-Origin-Opener-Policy` header should be present with the `same-origin` value
  * to protect other sites from your pages' code, the `Cross-Origin-Embedder-Policy` header should be present with either the `credentialless` value (Chrome and Firefox browsers) or the `require-corp` one (Safari + other browsers)
  * when the `Cross-Origin-Embedder-Policy` header is set with the `require-corp` value, the `Cross-Origin-Resource-Policy` header should also be available with [one of these options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy): `same-site`, `same-origin` or `cross-origin`

There are **alternative ways** to enable these headers for your site or local host, and [this script](https://github.com/gzuidhof/coi-serviceworker#readme) is just one of these, one that works with most free-hosting websites too.


### XWorker options

Before showing any example, it's important to understand how the offered API differs from Web standard *workers*:

| name      | example                                                  | behavior |
| :-------- | :------------------------------------------------------- | :--------|
| async     | `XWorker('./file.py', async=True)`                       | The worker code is evaluated via `runAsync` utility where, if the *interpreter* allows it, top level *await* would be possible, among other *PL* specific asynchronous features.  |
| config    | `XWorker('./file.py', config='./cfg.toml')`              | The worker will either use the config object as it is or load and parse its referencing *JSON* or *TOML* file, or syntax, to configure itself. Please see [currently supported config values](https://docs.pyscript.net/latest/reference/elements/py-config.html#supported-configuration-values) as this is currently based on `<py-config>` features. |
| type      | `XWorker('./file.py', type='pyodide')`                   | Define the *interpreter* to use with this worker which is, by default, the same one used within the running code. Please read the [Terminology](#terminology) **interpreter** dedicated details to know more. |
| version   | `XWorker('./file.py', type='pyodide', version='0.23.2')` | Allow the usage of a specific version where, if numeric, must be available through the project *CDN* used by *core* but if specified as fully qualified *URL*, allows usage of any interpreter's version: `<script type="pyodide" version="http://localhost:8080/pyodide.local.mjs">` |

The returning *JS* reference to any `XWorker(...)` call is literally a `Worker` instance that, among its default API, have the extra following feature:


| name      | example                            | behavior |
| :-------- | :--------------------------------- | :--------|
| sync      | `sync = XWorker('./file.py').sync` | Allows exposure of callbacks that can be run synchronously from the worker file, even if the defined callback is *asynchronous*. This property is also available in the `xworker` reference. |

```python
from polyscript import XWorker

sync = XWorker('./file.py').sync

def from_main(some, value):
    # return something interesting from main
    # or do anything else
    print(some)
    print(value)

sync.from_main = from_main
```

In the `xworker` counter part:

```python
from polyscript import xworker

# will log 1 and "two" in default stdout console
xworker.sync.from_main(1, "two")
```

### The xworker reference

The content of the file used to initialize any `XWorker` on the main thread can always reach the `xworker` counter part as globally available or as import (i.e.`from polyscript import xworker` in *Python* case) module's utility.

Within a *Worker* execution context, the `xworker` exposes the following features:

| name          | example                                    | behavior |
| :------------ | :------------------------------------------| :--------|
| sync          | `xworker.sync.from_main(1, "two")`         | Executes the exposed `from_main` function in the main thread. Returns synchronously its result, if any. |
| window        | `xworker.window.document.title = 'Worker'` | Differently from *pyodide* or *micropython* `import js`, this field allows every single possible operation directly in the main thread. It does not refer to the local `js` environment the interpreter might have decided to expose, it is a proxy to handle otherwise impossible operations in the main thread, such as manipulating the *DOM*, reading `localStorage` otherwise not available in workers, change location or anything else usually possible to do in the main thread. |
| isWindowProxy | `xworker.isWindowProxy(ref)`               | **Advanced** - Allows introspection of *JS* references, helping differentiating between local worker references, and main thread global JS references. This is valid both for non primitive objects (array, dictionaries) as well as functions, as functions are also enabled via `xworker.window` in both ways: we can add a listener from the worker or invoke a function in the main. Please note that functions passed to the main thread will always be invoked asynchronously.

```python
from polyscript import xworker

print(xworker.window.document.title)

xworker.window.document.body.append("Hello Main Thread")

xworker.window.setTimeout(print, 100, "timers too")
```

ℹ️ - Please note that even if non blocking, if too many operations are orchestrated from a *worker*, instead of the *main* thread, the overall performance might still be slower due the communication channel and all the primitives involved in the synchronization process. Feel free to use the `window` feature as a great enabler for unthinkable or quick solutions but keep in mind it is still an indirection.

### Just the XWorker

If you only need the `XWorker` class from *JS*, or the internal `Hook` class to define custom worker (only) hooks remotely, you can `import { XWorker, Hook } from 'polyscript/xworker'` and see how far you can go with it.


#### The `sync` utility

This helper does not interfere with the global context but it still ensure a function can be exposed form *main* and be used from *thread* and/or vice-versa.

```python
# main
from polyscript import XWorker

def alert_user(message):
    import js
    js.alert(message)

w = XWorker('./file.py')
# expose the function to the thread
w.sync.alert_user = alert_user


# thread
from polyscript import xworker

if condition == None:
    xworker.sync.alert_user('something wrong!')
```


## Custom Scripts

With `polyscript` it is possible to extend any *interpreter*, allowing users or contributors to define their own (optional) `type` for the `<script>` they would like to augment with goodness or extra simplicity.

The *core* module itself exposes two methods to do so:

| name          | example                   | behavior |
| :------------ | :------------------------ | :--------|
| define        | `define('mpy', options)`  | Register once a `<script type="mpy">`, if it's a string, and a counter `<mpy-script>` selector that will bootstrap and handle all nodes in the page that match such selectors. If the `type` is either `null` or `undefined`, no type will exist but the interpreter will be bootstrapped anyway, hence available once `options.hooks.main.onReady(wrap)` is invoked (without any `element` reference). The available `options` are described after this table. |
| whenDefined        | `whenDefined('mpy')` | Return a promise that will be resolved once the custom `mpy` script will be available, returning an *interpreter* wrapper once it will be fully ready. |

```js
import { define, whenDefined } from 'polyscript';

define('mpy', {
    interpreter: 'micropython',
    hooks: {
      main: {
        onReady(wrap, element) {
          console.log('here we go main!');
        }
      },
      worker: {
        onReady(wrap, xworker) {
          console.log('here we go worker!');
        }
      }
    }
    // the rest of the custom type options
});

// an "mpy" dependent plugin for the "mpy" custom type
whenDefined("mpy").then(interpreterWrapper => {
    // define or perform any task via the wrapper
})
```

### Custom Scripts Options

**Advanced** - Even if we strive to provide the easiest way for anyone to use core interpreters and features, the life cycle of a custom script might require any hook we also use internally to make `<script type="py">` possible, which is why this list is quite long, but hopefully exhaustive, and it covers pretty much everything we do internally as well.

The list of options' fields is described as such and all of these are *optional* while defining a custom type:

| name                      | example                                       | behavior |
| :------------------------ | :-------------------------------------------- | :--------|
| interpreter               | `{interpreter: 'pyodide'}`                    | Specifies the interpreter to use, such as *pyodide*, *micropython*, *wasmoon* or others. |
| config                    | `{config: 'type.toml'}` `{config: {}}`        | Ensure such config is already parsed and available, if not already passed as object, for every custom `type` that execute code. |
| configURL                 | `{configURL: '/absolute/url/config.json'}`    | If the passed `config` is an already resolved object, this field is neded to help resolving files in *fetch* or *packages* or others. |
| version                   | `{version: '0.23.2'}`                         | Allow the usage of a specific version of an interpreter, same way `version` attribute works with `<script>` elements. |
| env                       | `{env: 'my-project'}`                         | Guarantee same environment for every custom `type`, avoiding conflicts with any other possible default or custom environment. |
| onerror                   | `(error, element) => { throw error; }`        | Allows custom types to intercept early errors possibly happened while bootstrapping elements. |
| hooks                     | `{hooks: {main: {}, worker: {}}}`             | Allows custom types to hook logic around every main thread or worker tag via defined hooks. |

## Hooks

Every special script or tag inevitably passes through some main or worker thread related tasks.

In both worlds, the exact sequence of steps around code execution is the following:

  * **ready** - the DOM recognized the special script or tag and the associated interpreter is ready to work. A *JS* callback might be useful to instrument the interpreter before anything else happens.
  * **before run** - there could be some *JS* code setup specific for the script on the main thread, or the worker. This is similar to a generic *setup* callback in tests.
  * **code before run** - there could be some *PL* code to prepend to the one being executed. In this case the code is a string because it will be part of the evaluation.
  * **actual code** - the code in the script or tag or the `src` file specified in the script. This is not a hook, just the exact time the code gets executed in general.
  * **code after run** - there could be some *PL* code to append to the one being executed. Same as *before*, the code is a string targeting the foreign *PL*.
  * **after run** - there could be some *JS* to execute right after the whole code has been evaluated. This is similar to a generic *teardown* callback in tests.

As most interpreters can run their code either *synchronously* or *asynchronously*, the very same sequence is guaranteed to run in order in both cases, and the difference is only around the naming convention.

### Main Hooks

When it comes to *main* hooks all callbacks will receive a *wrapper* of the interpreter with its utilities, see the further section to know more, plus the element on the page that is going to execute its related code, being this a custom script/type or a custom tag.

This is the list of all possible, yet **optional** hooks, a custom type can define for **main**:

| name                      | example                                       | behavior  |
| :------------------------ | :-------------------------------------------- | :-------- |
| onReady                   | `onReady(wrap:Wrap, el:Element) {}`           | If defined, it is invoked before any other hook to signal that the element is going to execute the code. For custom scripts, this hook is in charge of eventually running the content of the script, anyway it prefers to do so. |
| onBeforeRun               | `onBeforeRun(wrap:Wrap, el:Element) {}`       | If defined, it is invoked before any other hook to signal that the element is going to execute the code. |
| onBeforeRunAsync          | `onBeforeRunAsync(wrap:Wrap, el:Element) {}`  | Same as `onBeforeRun` except it's the one used whenever the script is `async`. |
| codeBeforeRun             | `codeBeforeRun: () => 'print("before")'`      | If defined, prepend some code to evaluate right before the rest of the code gets executed. |
| codeBeforeRunAsync        | `codeBeforeRunAsync: () => 'print("before")'` | Same as `codeBeforeRun` except it's the one used whenever the script is `async`. |
| codeAfterRun              | `codeAfterRun: () => 'print("after")'`        | If defined, append some code to evaluate right after the rest of the code already executed. |
| codeAfterRunAsync         | `codeAfterRunAsync: () => 'print("after")'`   | Same as `codeAfterRun` except it's the one used whenever the script is `async`. |
| onAfterRun                | `onAfterRun(wrap:Wrap, el:Element) {}`        | If defined, it is invoked after the foreign code has been executed already. |
| onAfterRunAsync           | `onAfterRunAsync(wrap:Wrap, el:Element) {}`   | Same as `onAfterRun` except it's the one used whenever the script is `async`. |
| onWorker                  | `onWorker(wrap = null, xworker) {}`           | If defined, whenever a script or tag with a `worker` attribute is processed it gets triggered on the main thread, to allow to expose possible `xworker` features before the code gets executed within the worker thread. The `wrap` reference is most of the time `null` unless an explicit `XWorker` call has been initialized manually and/or there is an interpreter on the main thread (*very advanced use case*). Please **note** this is the only hook that doesn't exist in the *worker* counter list of hooks. |

### Worker Hooks

When it comes to *worker* hooks, **all non code related callbacks must be serializable**, meaning that callbacks cannot use any outer scope reference, as these are forwarded as strings, hence evaluated after in the worker, to survive the main <-> worker `postMessage` dance.

Here an example of what works and what doesn't:

```js
// this works 👍
define('pl', {
  interpreter: 'programming-lang',
  hooks: {
    worker: {
      onReady() {
        // NOT suggested, just as example!
        if (!('i' in globalThis))
          globalThis.i = 0;
        console.log(++i);
      }
    }
  }
});

// this DOES NOT WORK ⚠️
let i = 0;
define('pl', {
  interpreter: 'programming-lang',
  hooks: {
    worker: {
      onReady() {
        // that outer-scope `i` is nowhere understood
        // whenever this code executes in the worker
        // as this function gets stringified and re-evaluated
        console.log(++i);
      }
    }
  }
});
```

At the same time, as the worker doesn't have any `element` strictly related, as workers can be created also procedurally, the second argument won't be an element but the related *xworker* that is driving the logic.

As summary, this is the list of all possible, yet **optional** hooks, a custom type can define for **worker**:

| name                      | example                                       | behavior |
| :------------------------ | :-------------------------------------------- | :--------|
| onReady                   | `onReady(wrap:Wrap, xw:XWorker) {}`           | If defined, it is invoked before any other hook to signal that the xworker is going to execute the code. Differently from **main**, the code here is already known so all other operations will be performed automatically. |
| onBeforeRun               | `onBeforeRun(wrap:Wrap, xw:XWorker) {}`       | If defined, it is invoked before any other hook to signal that the xworker is going to execute the code. |
| onBeforeRunAsync          | `onBeforeRunAsync(wrap:Wrap, xw:XWorker) {}`  | Same as `onBeforeRun` except it's the one used whenever the worker script is `async`. |
| codeBeforeRun             | `codeBeforeRun: () => 'print("before")'`      | If defined, prepend some code to evaluate right before the rest of the code gets executed. |
| codeBeforeRunAsync        | `codeBeforeRunAsync: () => 'print("before")'` | Same as `codeBeforeRun` except it's the one used whenever the worker script is `async`. |
| codeAfterRun              | `codeAfterRun: () => 'print("after")'`        | If defined, append some code to evaluate right after the rest of the code already executed. |
| codeAfterRunAsync         | `codeAfterRunAsync: () => 'print("after")'`   | Same as `codeAfterRun` except it's the one used whenever the worker script is `async`. |
| onAfterRun                | `onAfterRun(wrap:Wrap, xw:XWorker) {}`        | If defined, it is invoked after the foreign code has been executed already. |
| onAfterRunAsync           | `onAfterRunAsync(wrap:Wrap, xw:XWorker) {}`   | Same as `onAfterRun` except it's the one used whenever the worker script is `async`. |

### Custom Scripts Wrappers

Almost every interpreter has its own way of doing the same thing needed for most common use cases, and with this in mind we abstracted most operations to allow a terser *core* for anyone to consume, granting that its functionalities are the same, no matter which interpreter one prefers.

There are also cases that are not tackled directly in *core*, but necessary to anyone trying to extend *core* as it is, so that some helper felt necessary to enable users and contributors as much as they want.

In few words, while every *interpreter* is literally passed along to unlock its potentials 100%, the most common details or operations we need in core are:

| name                      | example                                       | behavior |
| :------------------------ | :-------------------------------------------- | :--------|
| type                      | `wrap.type`                                   | Return the current `type` (interpreter or custom type) used in the current code execution. |
| interpreter               | `wrap.interpreter`                            | Return the *interpreter* _AS-IS_ after being bootstrapped by the desired `config`. |
| XWorker                   | `wrap.XWorker`                                | Refer to the `XWorker` class available to the main thread code while executing. |
| io                        | `wrap.io`                                     | Allow to lazily define different `stdout` or `stderr` via the running *interpreter*. This `io` field can be lazily defined and restored back for any element currently running the code. |
| config                    | `wrap.config`                                 | It is the resolved *JSON* config and it is an own clone per each element running the code, usable also as "_state_" reference for the specific element, as changing it at run time will never affect any other element. |
| run                       | `wrap.run(code)`                              | It abstracts away the need to know the exact method name used to run code synchronously, whenever the *interpreter* allows such operation, facilitating future migrations from an interpreter to another. |
| runAsync                  | `wrap.runAsync(code)`                         | It abstracts away the need to know the exact method name used to run code asynchronously, whenever the *interpreter* allows such operation, facilitating future migrations from an interpreter to another. |
| runEvent                  | `wrap.runEvent(code, event)`                  | It abstracts away the need to know how an *interpreter* retrieves paths to execute an event handler. |

This is the `wrap` mentioned with most hooks and initializers previously described, and we're more than happy to learn if we are not passing along some extra helper.

### The io helper

```js
// change the default stdout while running code
wrap.io.stdout = (message) => {
  console.log("🌑", wrap.type, message);
};

// change the default stderr while running code
wrap.io.stderr = (message) => {
  console.error("🌑", wrap.type, message);
};
```

## Ready Event

Whenever a *non-custom* script is going to run some code, or whenever *any worker* is going to run its own code, a `type:ready` event is dispatched through the element that is currently executing the code.

The [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) dispatched in either cases contains a `target` which refers to the element that is running code and a `detail.worker` boolean value that is `true` if such event came from a worker instead of the main thread.

The `worker` detail is essential to know if an `xworker` property is attached so that it's also easy to pollute its `sync` proxy utility.

## Done Event

Whenever a *non-custom* script is going to run some code, or whenever *any worker* is going to run its own code, a `type:done` event is dispatched through the element *after* its code has fully executed.

### Custom Types on Main

The reason this event is not automatically dispatched on custom type elements or scripts is that these will have their own `options.hooks.main.onReady` hook to eventually do more before desiring, or needing, to notify the "*readiness*" of such custom element and, in case of wanting the event to happen, this is the tiny boilerplate needed to simulate otherwise non-custom type events:

```js
// note: type === 'py' or the defined type
element.dispatchEvent(
  new CustomEvent(`${type}:ready`, {
    bubbles: true,
    detail: { worker: false },
  })
);
```

In the worker case, because the orchestration is inevitably coupled with this module, the custom type will be dispatched out of the blue to help extensions on op of this module to work best.

### Explicit Worker: No Event

Please note that if a worker is created explicitly, there won't be any element, script, or generic tag/node associated to it, so that no event will be triggered as there is no target for it. However, it's always possible to attach `sync` utilities to such explicit worker, so this should never be a real-world concern or blocker.


## Examples

  * [multi-pompom](./examples/multi-pompom/) - draw 4 pompom via turtle out of 4 different workers
  * [non-blocking input](./examples/worker-input/) - ask a question from a worker and log results in a sync-like, yet non-blocking, style
  * [reactive UI](./examples/uhtml/) - a different approach to render safely HTML content and use [Preact Signals](https://preactjs.com/guide/v10/signals/) to react to changes without needing to orchestrate updates manually


## Interpreter Features

| name           | `run` | `runAsync` | `runEvent` | `registerJSModule` | `writeFile` | `transform` |
| :------------- | :---: | :--------: | :--------: | :----------------: | :---------: | :---------: |
| pyodide        | •     | •          | •          | •                  | •           | •           |
| micropython    | •     | •          | •          | •                  | •           | •           |
| ruby-wasm-wasi | •     | •          | •          | !                  |             |             |
| wasmoon        | •     | •          | •          | !                  | •           |             |
| webr           | r     | •          | re         |                    |             |             |

  * **run** allows code to run synchronously and optionally return value
  * **runAsync** allows code to run asynchronously and optionally return value
  * **runEvent** allows events to be invoked and receive the `event` object
  * **registerJSModule** allows `from polyscript import Xworker` or registration of arbitrary modules for *custom types*. It currently fallback to globally defined reference (the module name) whenever it's not possible to register a module (i.e. `polyscriptXWorker` in Lua or `$polyscript.XWorker` in Ruby).
  * **writeFile** it's used to save *fetch* config files into virtual FS (usually the one provided by Emscripten). It is then possible to import those files as module within the evaluated code.
  * **transform** allows `xworker.sync` related invokes to pass as argument internal objects without issues, simplifying as example the dance needed with *pyodide* and the `ffi.PyProxy` interface, automatically using `.toJs()` for better DX.

  * issue **r**: the runtime exposes the `run` utility but this is *not synchronous*
  * issue **re**: the event or its listener somehow run but it's not possible to `stopPropagation()` or do other regular *event* operations even on the main thread
