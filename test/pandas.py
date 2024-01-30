from polyscript import currentScript

try:
    from polyscript.xworker.window import document
except:
    from js import document

import pandas
print(f"In {currentScript.getAttribute('env')} the type of getElementById is: {type(document.getElementById)}")

try:
    el = document.getElementById("py-script-output")
    el.innerHTML = "test"
except Exception as e:
    print(e)
