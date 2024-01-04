from js import document
from uhtml import local
# grab utilities passing current module name
render, html, svg = local(__name__)

# define handlers and whatnot
def h3_click(event):
  print(event.type)

def button_click(event):
  global count, value
  count = count + 1
  value = f"World {count}"
  show()

value = "World"
count = 0

# define the driver
def show():
    render(document.body, html(
        """
          <h3 onclick=${h3_click}>
              Hello ${value}
          </h3>
          <button onclick=${button_click}>
            Clicks ${count}
          </button>
        """
    ))

show()
