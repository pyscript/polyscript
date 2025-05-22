import { symbol } from 'https://esm.run/@ungap/serialization-registry@0.2.1';


const { construct } = Reflect;
const { defineProperty, fromEntries } = Object;

const name = '#Py2JS:Proxy';
const patch = Symbol.for(name);
const patched = patch in globalThis;

// pyodide
const toJsOptions = { dict_converter: fromEntries };

export const converter = patched ? globalThis[patch] : [
  // pyodide
  target => {
    if ('toJs' in target)
      return target.toJs(toJsOptions);
  },

  // micropython
  target => {
    const { constructor } = target;
    if (constructor && 'toJs' in constructor)
      return constructor.toJs(target);
  },
];

if (!patched) {
  defineProperty(globalThis, patch, { value: converter });
  defineProperty(globalThis, 'Proxy', {
    value: new Proxy(Proxy, {
      construct(target, args, newTarget) {
        const original = args[1]?.get;
        if (original && !original.name !== name) {
          args[1].get = defineProperty(
            function (target, prop, receiver) {
              if (prop === symbol) {
                for (let value, i = 0; i < converter.length; i++) {
                  value = converter[i](target);
                  if (value) return value;
                }
              }
              return original.call(this, target, prop, receiver);
            },
            'name',
            { value: name }
          );
        }
        return construct(target, args, newTarget);
      }
    })
  });
}
