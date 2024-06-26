// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export const workers = new Proxy(new Map, {
  get(map, name) {
    if (!map.has(name))
      map.set(name, Promise.withResolvers());
    return map.get(name);
  },
});

// filter out forever pending Promises in Pyodide
// @issue https://github.com/pyscript/pyscript/issues/2106
const ignore = new Set(['__dict__', 'constructor', 'get', 'has', 'includes', 'next', 'set', 'then']);

export const workersHandler = new Proxy(Object.freeze({}), {
  // guard against forever pending Promises in Pyodide
  // @issue https://github.com/pyscript/pyscript/issues/2106
  get: (_, name) => (typeof name === 'string' && !ignore.has(name)) ?
    workers[name].promise.then(w => w.sync) :
    void 0,
});
/* c8 ignore stop */
