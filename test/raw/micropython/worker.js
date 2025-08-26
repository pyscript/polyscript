const { promise, resolve } = Promise.withResolvers();

addEventListener('message', async ({ data }) => {
  await promise;
  await interpreter.runPythonAsync(data);
});

// Instant MicroPython
const base = 'https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@latest';
const { loadMicroPython } = await import(`${base}/micropython.mjs`);
const interpreter = await loadMicroPython({ url: `${base}/micropython.wasm` });

// Lazy Pyodide
let pyodide;
interpreter.registerJsModule('pyodide', new Proxy(new Map, {
  async get(locals, prop) {
    const [ module ] = prop.split(/[@<>=]/);
    if (!locals.has(module)) {
      if (!pyodide) {
        const { loadPyodide } = await import(`https://cdn.jsdelivr.net/pyodide/v0.28.1/full/pyodide.mjs`);
        pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.1/full' });
      }
      try {
        pyodide.runPython(`import ${module}`, { locals });
      }
      catch {
        let micropip = locals.get('micropip');
        if (!micropip) {
          await pyodide.loadPackage('micropip');
          micropip = pyodide.pyimport('micropip');
          locals.set('micropip', micropip);
        }
        await micropip.install([prop], { keep_going: true });
        pyodide.runPython(`import ${module}`, { locals });
      }
    }
    return locals.get(module);
  }
}));

resolve();
