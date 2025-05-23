export default () => {
  const { apply, construct, defineProperty } = Reflect;

  const notRegistered = value => value?.shared?.gcRegistered === false;

  const descriptor = {
    configurable: true,
    set(value) {
      defineProperty(this, pyproxy, { value });
      if (notRegistered(value)) {
        const copy = this.copy();
        queueMicrotask(() => {
          defineProperty(this, pyproxy, { value: copy[pyproxy] });
        });
      }
    },
  };

  const intercept = (handler, name) => {
    const method = handler[name];
    defineProperty(handler, name, {
      value(target, key) {
        if (known) {
          if (key === pyproxy) {
            if (
              typeof target === 'function' &&
              notRegistered(target[pyproxy])
            ) return target.toJs()[key];
          }
          else if (
            pyproxy in target &&
            name in target &&
            !(key in target) &&
            notRegistered(target[pyproxy]) &&
            typeof target === 'object'
          ) return target[name](key);
        }
        return apply(method, this, arguments);
      }
    });
  };

  const pyodidePatch = Symbol.for('pyodide-patch');
  const patched = new WeakSet;

  let pyproxy, known = false;
  
  if (pyodidePatch in globalThis) return;
  globalThis[pyodidePatch] = true;

  // minimalistic Symbol override that
  // won't affect performance or break expectations
  defineProperty(globalThis, 'Symbol', {
    value: new Proxy(Symbol, {
      apply(target, self, args) {
        const symbol = apply(target, self, args);
        if (!known && symbol.description === 'pyproxy.attrs') {
          known = true;
          pyproxy = symbol;
        }
        return symbol;
      },
    })
  });

  // minimalistic Proxy override that
  // won't affect performance or break expectations
  defineProperty(globalThis, 'Proxy', {
    value: new Proxy(Proxy, {
      construct(target, args, New) {
        if (known) {
          if (typeof args[0] === 'function')
            defineProperty(args[0], pyproxy, descriptor);
          const handler = args[1];
          if (handler?.get && !patched.has(handler)) {
            patched.add(handler);
            intercept(handler, 'get');
            // this is actually not used out there
            // override(handler, 'has');
          }
        }
        return construct(target, args, New);
      },
    })
  });
};
