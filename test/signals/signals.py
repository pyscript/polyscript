import js
signal = js.signals.signal
js_effect = js.signals.effect

def effect(fn):
    return js_effect(fn)

__all__ = ["signal", "effect"]
