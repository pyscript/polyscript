from polyscript import xworker

f = xworker.window.aFunc

print(f([1,2]))


def listener(event):
    print(event.type)

xworker.window.document.addEventListener("click", listener)
