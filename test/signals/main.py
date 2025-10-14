from js import document
from signals import signal, effect

increment, value, decrement, = document.querySelectorAll("#increment, #value, #decrement")

# a signal that holds the value 0 at the beginning
counter = signal(0)

# an effect that automatically updates on `counter` changes
@effect
def track_counter():
    value.textContent = counter.value

# a function that adds the given value to the `counter`
def add(value):
    counter.value += value

# two listeners, not much DOM API involved in here
# just the explicit intent of the operation, everything else follows ✨
increment.onclick = lambda _: add(1)
decrement.onclick = lambda _: add(-1)

# demo: how to stop an effect?
# import js; js.track_counter = track_counter
