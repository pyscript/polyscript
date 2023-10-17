from js import document
from uhtml import render, html

def update(count):
    render(document.body, html(
        """
          <h3 onclick=${h3_click}>
              Hello ${value}
          </h3>
          <button onclick=${button_click}>
            Clicks ${count}
          </button>
        """,
        h3_click=lambda event: print(event.type),
        value="World",
        button_click=lambda _: update(count + 1),
        count=count
    ))

update(0)
