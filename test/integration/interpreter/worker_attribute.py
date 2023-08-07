from polyscript import xworker

document = xworker.window.document

print("worker attribute")

document.documentElement.classList.add("worker")
