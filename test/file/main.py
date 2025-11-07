try:
    from polyscript import xworker
    document = xworker.window.document
except:
    import js
    document = js.document

try:
    from pyodide.ffi import create_proxy
except:
    create_proxy = lambda x: x

file = document.querySelector('#file')
file.disabled = False

async def on_file_change(event):
    file = event.target.files[0]
    print('name:', file.name)
    print('size:', file.size)
    print('text:', await file.text())

file.addEventListener('change', create_proxy(on_file_change))
