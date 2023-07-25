
import js
from polyscript import xworker
import panel as pn
from panel.io.pyodide import init_doc, write_doc

js.document = document = xworker.window.document

init_doc()

print("Hello from panel.py")

slider = pn.widgets.FloatSlider(start=0, end=10, name='Amplitude')

def callback(new):
    return f'Amplitude is: {new}'

pn.Row(slider, pn.bind(callback, slider)).servable(target='simple_app')

# ------ END OF PANEL CODE ------

docs_json_str, render_items_str, root_ids_str = await write_doc()

print("-------> Passing the ball back to the main thread")
xworker.sync.render_full(docs_json_str, render_items_str, root_ids_str)
