from polyscript.js_modules import uhtml as _uhtml
from sys import modules as _modules
import js

try:
    from string import Template as _Template
    from pyodide.ffi import create_proxy as _create_proxy, to_js as _to_js
except:
    from template import Template as _Template
    from jsffi import create_proxy as _create_proxy, to_js as _to_js

### template literal related

# The goal of this utility is to create a JS
# Template Literal Tag like function that accepts
# an immutable template as tuple and zero or more ordered
# interpolated values per each gap between chunks.
# If a cache dictionary is passed, it never parses the same
# template string more than once, improving performance
# for more complex scenarios / use cases.
def _tag(name, fn, cache=None):
    return lambda tpl: _transform(tpl, cache)(fn, _modules[name])

def _create(tpl):
    i = 0
    d = {}
    u = chr(0)
    template = _Template(tpl)
    identifiers = template.get_identifiers()

    # map all identifiers as chunks that
    # can be split without losing details
    for k in identifiers:
        d[k] = f"{u}{i}."
        i += 1
    s = template.substitute(d)
    a = s.split(u)
    i = 1
    keys = []
    # create a template after removing chunks
    # leftovers, placing back ordered expected fields
    for k in a[1:]:
        d = k.index(".")
        x = k[0:d]
        keys.append(identifiers[int(x)])
        a[i] = k[(d+1):]
        i += 1
    # make the template immutable
    t = tuple(a)
    return lambda fn, kw: fn(t, *[_unwrap(kw.__dict__[k]) for k in keys])

# given a template string, maps all non interpolated
# parts as tuple and orchestrate ordered values to send
def _transform(tpl, tags):
    if tags == None: return _create(tpl)
    if not tpl in tags: tags[tpl] = _create(tpl)
    return tags[tpl]

def _unwrap(entry):
    if (_uhtml.Signal.prototype.isPrototypeOf(entry)):
        return entry.value
    return entry


### uhtml related

_tuples = []
_arrays = []
_cache = {}

def _kind(uhtml):
    # hole convention from uhtml, don't @ me :D
    def hole(tpl, *values):
        # this ensures that the passed "template" is
        # always the same reference in the JS side
        if not tpl in _tuples:
            _tuples.append(tpl)
            _arrays.append(_to_js(tpl))
        i = _tuples.index(tpl)
        # I've no idea why this lambda is needed but it works without
        # needing to create_proxy or other things I don't fully understand
        return lambda: uhtml(_arrays[i], *[_to_js(v) for v in values])
    return hole

class _UI:
    signal = _uhtml.signal
    batch = _uhtml.batch
    def __init__(self, name):
        self.html = _tag(name, _kind(_uhtml.html), cache=_cache)
        self.svg = _tag(name, _kind(_uhtml.svg), cache=_cache)
    def computed(self, fn):
        return _uhtml.computed(_create_proxy(fn))
    def render(self, where, what):
        _uhtml.effect(_create_proxy(lambda *args: _uhtml.render(where, what())))
        return where

def local(name):
    return _UI(name)
