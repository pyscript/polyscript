export default () => {
  const { prototype } = Function;
  const { apply, construct, defineProperty } = Reflect;

  const notRegistered = value => value?.shared?.gcRegistered === false;

  const patch = args => {
    if (known) {
      for (let i = 0; i < args.length; i++)
        args[i] = toJS(args[i]);
    }
  };

  const toJS = current => {
    if (known) {
      switch (typeof current) {
        case 'object':
          if (current === null) break;
          // falls through
        case 'function':
          if (notRegistered(current[pyproxy])) {
            return current.toJs(options);
          }
      }
    }
    return current;
  };

  const options = { dict_converter: Object.fromEntries };

  const descriptor = {
    configurable: true,
    set(value) {
      delete this[pyproxy];
      this[pyproxy] = value;
      if (notRegistered(value)) {
        const copy = this.copy();
        queueMicrotask(() => {
          this[pyproxy] = copy[pyproxy];
        });
      }
    },
  };

  let pyproxy, known = false;

  defineProperty(prototype, 'apply', {
    value(context, args) {
      patch(args);
      return apply(this, toJS(context), args);
    }
  });

  defineProperty(prototype, 'call', {
    value(context, ...args) {
      patch(args);
      return apply(this, toJS(context), args);
    }
  });

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
        const proxy = construct(target, args, New);
        if (known && typeof args[0] === 'function') {
          defineProperty(args[0], pyproxy, descriptor);
        }
        return proxy;
      },
    })
  });
};
