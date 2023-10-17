from js_template import tag

# known = []

def _flatten(tpl, *values):
    # if not tpl in known:
    #     known.append(tpl)
    #     print("new template:", "".join(tpl))
    c = []
    for i in range(len(tpl)):
        if i: c.append(str(values[i - 1]))
        c.append(tpl[i])
    return "".join(c)

# A really not interesting use case such as
# a generic tag that simply flattens the string
plain = tag(_flatten, cache={})

print(plain("this is ${a} ${b} ${a}!", a="one", b="o"))
print(plain("this is ${a} ${b} ${a}!", a="two", b="o"))
print(plain("this is ${a} ${b} ${a}!", a="three", b="o"))


print(
    plain(
        "${a}${b}${c}${d}${e}${f}${g}${h}${i}${j}${k}${a}${b}",
        a="a",
        b="b",
        c="c",
        d="d",
        e="e",
        f="f",
        g="g",
        h="h",
        i="i",
        j="j",
        k="k"
    )
)
