# A silly idea by Andrea Giammarchi
from string import Template as _Template

# The goal of this utility is to create a JS
# Template Literal Tag like function that accepts
# an immutable template as tuple and zero or more ordered
# interpolated values per each gap between chunks.
# If a cache dictionary is passed, it never parses the same
# template string more than once, improving performance
# for more complex scenarios / use cases.
def tag(fn, cache=None):
    return lambda tpl, **kw: _tag(tpl, cache)(fn, **kw)

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
    return lambda fn, **kw: fn(t, *[kw[k] for k in keys])

# given a template string, maps all non interpolated
# parts as tuple and orchestrate ordered values to send
def _tag(tpl, tags):
    if tags == None: return _create(tpl)
    if not tpl in tags: tags[tpl] = _create(tpl)
    return tags[tpl]
