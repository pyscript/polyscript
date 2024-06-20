// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export const workers = new Proxy(new Map, {
  get(map, name) {
    if (!map.has(name))
      map.set(name, Promise.withResolvers());
    return map.get(name);
  },
});

export const workersHandler = new Proxy(workers, {
  get: (_, name) => workers[name].promise.then(w => w.sync),
});
/* c8 ignore stop */
