from uhtml import local
from js import document

# grab utilities passing current module name
ui = local(__name__)

# define handlers and whatnot
def h3_click(event):
  print(event.type)

def button_click(event):
  count.value = count.value + 1

# define signals and/or computed
count = ui.signal(0)
who = ui.computed(lambda: f"World {count.value}!")

# render via a callback that can react to changes
ui.render(document.body, lambda: ui.html(
    """
      <h3 onclick=${h3_click}>
          Hello ${who}
      </h3>
      <button onclick=${button_click}>
        Clicks ${count}
      </button>
    """
))
