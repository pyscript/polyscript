from polyscript import xworker

print("worker", xworker.sync.data(memoryview(b"hello")))
