from polyscript import xworker

document = xworker.window.document

import a

# be sure the page knows the worker has done parsing to avoid
# unnecessary random timeouts all over the tests
document.documentElement.className += " worker"
