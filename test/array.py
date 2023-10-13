import polyscript
import pyodide

f = polyscript.xworker.window.aFunc

print("here")
f([1,2])
