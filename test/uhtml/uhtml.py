from js import uhtml as _uhtml
from js_template import tag as _tag
from pyodide.ffi import to_js as _to_js

_tuples = []
_arrays = []
_cache = {}

# TODO: if values is a callback the to_js creates a proxy of it each time!
#       Find a smart way to re-map *once* callbacks at specific indexes
#       so that we can destroy previous references when needed.
#       Please keep in mind the list of same template but different
#       interpolations values per invoke so that we should also
#       not destroy other elements created via other passed values.

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

# export uhtml API as Python
html = _tag(_kind(_uhtml.html), cache=_cache)
svg = _tag(_kind(_uhtml.svg), cache=_cache)
render = _uhtml.render
