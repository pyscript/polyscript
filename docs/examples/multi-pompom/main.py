from polyscript import XWorker

# generates 4 pompom via 4 different micropython workers
for i in range(4):
    sync = XWorker("pompom.py", config="./turtle.toml")
