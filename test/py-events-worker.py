from polyscript import xworker
from js import Object

# needed in MicroPython
options = Object()
options.once = True

xworker.window.document.addEventListener(
    'click',
    lambda event: print("worker", event.type),
    options
)
