/**
 * Given a CSS selector, returns the first matching node, if any.
 * @param {string} css the CSS selector to query
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Element?} the found element, if any
 */
const $ = (css, root = document) => root.querySelector(css);

/**
 * Given a CSS selector, returns a list of all matching nodes.
 * @param {string} css the CSS selector to query
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Element[]} a list of found nodes
 */
const $$ = (css, root = document) => [...root.querySelectorAll(css)];

/**
 * Given a XPath selector, returns a list of all matching nodes.
 * @param {string} path the XPath selector to evaluate
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Node[]} a list of found nodes (elements, attributes, text, comments)
 */
const $x = (path, root = document) => {
  const expression = (new XPathEvaluator).createExpression(path);
  const xpath = expression.evaluate(root, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  const result = [];
  for (let i = 0, {snapshotLength} = xpath; i < snapshotLength; i++)
    result.push(xpath.snapshotItem(i));
  return result;
};

const VOID       = -1;
const PRIMITIVE  = 0;
const ARRAY      = 1;
const OBJECT$1     = 2;
const DATE       = 3;
const REGEXP     = 4;
const MAP        = 5;
const SET$1        = 6;
const ERROR      = 7;
const BIGINT$1     = 8;
// export const SYMBOL = 9;

const env$1 = typeof self === 'object' ? self : globalThis;

const deserializer = ($, _) => {
  const as = (out, index) => {
    $.set(index, out);
    return out;
  };

  const unpair = index => {
    if ($.has(index))
      return $.get(index);

    const [type, value] = _[index];
    switch (type) {
      case PRIMITIVE:
      case VOID:
        return as(value, index);
      case ARRAY: {
        const arr = as([], index);
        for (const index of value)
          arr.push(unpair(index));
        return arr;
      }
      case OBJECT$1: {
        const object = as({}, index);
        for (const [key, index] of value)
          object[unpair(key)] = unpair(index);
        return object;
      }
      case DATE:
        return as(new Date(value), index);
      case REGEXP: {
        const {source, flags} = value;
        return as(new RegExp(source, flags), index);
      }
      case MAP: {
        const map = as(new Map, index);
        for (const [key, index] of value)
          map.set(unpair(key), unpair(index));
        return map;
      }
      case SET$1: {
        const set = as(new Set, index);
        for (const index of value)
          set.add(unpair(index));
        return set;
      }
      case ERROR: {
        const {name, message} = value;
        return as(new env$1[name](message), index);
      }
      case BIGINT$1:
        return as(BigInt(value), index);
      case 'BigInt':
        return as(Object(BigInt(value)), index);
    }
    return as(new env$1[type](value), index);
  };

  return unpair;
};

/**
 * @typedef {Array<string,any>} Record a type representation
 */

/**
 * Returns a deserialized value from a serialized array of Records.
 * @param {Record[]} serialized a previously serialized value.
 * @returns {any}
 */
const deserialize = serialized => deserializer(new Map, serialized)(0);

const EMPTY = '';

const {toString} = {};
const {keys} = Object;

const typeOf = value => {
  const type = typeof value;
  if (type !== 'object' || !value)
    return [PRIMITIVE, type];

  const asString = toString.call(value).slice(8, -1);
  switch (asString) {
    case 'Array':
      return [ARRAY, EMPTY];
    case 'Object':
      return [OBJECT$1, EMPTY];
    case 'Date':
      return [DATE, EMPTY];
    case 'RegExp':
      return [REGEXP, EMPTY];
    case 'Map':
      return [MAP, EMPTY];
    case 'Set':
      return [SET$1, EMPTY];
  }

  if (asString.includes('Array'))
    return [ARRAY, asString];

  if (asString.includes('Error'))
    return [ERROR, asString];

  return [OBJECT$1, asString];
};

const shouldSkip = ([TYPE, type]) => (
  TYPE === PRIMITIVE &&
  (type === 'function' || type === 'symbol')
);

const serializer = (strict, json, $, _) => {

  const as = (out, value) => {
    const index = _.push(out) - 1;
    $.set(value, index);
    return index;
  };

  const pair = value => {
    if ($.has(value))
      return $.get(value);

    let [TYPE, type] = typeOf(value);
    switch (TYPE) {
      case PRIMITIVE: {
        let entry = value;
        switch (type) {
          case 'bigint':
            TYPE = BIGINT$1;
            entry = value.toString();
            break;
          case 'function':
          case 'symbol':
            if (strict)
              throw new TypeError('unable to serialize ' + type);
            entry = null;
            break;
          case 'undefined':
            return as([VOID], value);
        }
        return as([TYPE, entry], value);
      }
      case ARRAY: {
        if (type)
          return as([type, [...value]], value);
  
        const arr = [];
        const index = as([TYPE, arr], value);
        for (const entry of value)
          arr.push(pair(entry));
        return index;
      }
      case OBJECT$1: {
        if (type) {
          switch (type) {
            case 'BigInt':
              return as([type, value.toString()], value);
            case 'Boolean':
            case 'Number':
            case 'String':
              return as([type, value.valueOf()], value);
          }
        }

        if (json && ('toJSON' in value))
          return pair(value.toJSON());

        const entries = [];
        const index = as([TYPE, entries], value);
        for (const key of keys(value)) {
          if (strict || !shouldSkip(typeOf(value[key])))
            entries.push([pair(key), pair(value[key])]);
        }
        return index;
      }
      case DATE:
        return as([TYPE, value.toISOString()], value);
      case REGEXP: {
        const {source, flags} = value;
        return as([TYPE, {source, flags}], value);
      }
      case MAP: {
        const entries = [];
        const index = as([TYPE, entries], value);
        for (const [key, entry] of value) {
          if (strict || !(shouldSkip(typeOf(key)) || shouldSkip(typeOf(entry))))
            entries.push([pair(key), pair(entry)]);
        }
        return index;
      }
      case SET$1: {
        const entries = [];
        const index = as([TYPE, entries], value);
        for (const entry of value) {
          if (strict || !shouldSkip(typeOf(entry)))
            entries.push(pair(entry));
        }
        return index;
      }
    }

    const {message} = value;
    return as([TYPE, {name: type, message}], value);
  };

  return pair;
};

/**
 * @typedef {Array<string,any>} Record a type representation
 */

/**
 * Returns an array of serialized Records.
 * @param {any} value a serializable value.
 * @param {{json?: boolean, lossy?: boolean}?} options an object with a `lossy` or `json` property that,
 *  if `true`, will not throw errors on incompatible types, and behave more
 *  like JSON stringify would behave. Symbol and Function will be discarded.
 * @returns {Record[]}
 */
 const serialize = (value, {json, lossy} = {}) => {
  const _ = [];
  return serializer(!(json || lossy), !!json, new Map, _)(value), _;
};

/*! (c) Andrea Giammarchi - ISC */


const {parse: $parse, stringify: $stringify} = JSON;
const options = {json: true, lossy: true};

/**
 * Revive a previously stringified structured clone.
 * @param {string} str previously stringified data as string.
 * @returns {any} whatever was previously stringified as clone.
 */
const parse$1 = str => deserialize($parse(str));

/**
 * Represent a structured clone value as string.
 * @param {any} any some clone-able value to stringify.
 * @returns {string} the value stringified.
 */
const stringify = any => $stringify(serialize(any, options));

var JSON$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  parse: parse$1,
  stringify: stringify
});

// ⚠️ AUTOMATICALLY GENERATED - DO NOT CHANGE
const CHANNEL = 'b49fd9a4-6378-4df6-b8da-53c08cb2aa9d';

const MAIN = 'M' + CHANNEL;
const THREAD = 'T' + CHANNEL;

// encodeURIComponent('onmessage=({data:b})=>(Atomics.wait(b,0),postMessage(0))')

var waitAsyncFallback = buffer => ({
  value: new Promise(onmessage => {
    let w = new Worker('data:application/javascript,onmessage%3D(%7Bdata%3Ab%7D)%3D%3E(Atomics.wait(b%2C0)%2CpostMessage(0))');
    w.onmessage = onmessage;
    w.postMessage(buffer);
  })
});

/*! (c) Andrea Giammarchi - ISC */


// just minifier friendly for Blob Workers' cases
const {Int32Array, Map: Map$1, SharedArrayBuffer, Uint16Array} = globalThis;

// common constants / utilities for repeated operations
const {BYTES_PER_ELEMENT: I32_BYTES} = Int32Array;
const {BYTES_PER_ELEMENT: UI16_BYTES} = Uint16Array;

const {isArray: isArray$2} = Array;
const {notify, wait, waitAsync} = Atomics;
const {fromCharCode} = String;

// automatically uses sync wait (worker -> main)
// or fallback to async wait (main -> worker)
const waitFor = (isAsync, sb) => isAsync ?
                  (waitAsync || waitAsyncFallback)(sb, 0) :
                  (wait(sb, 0), {value: {then: fn => fn()}});

// retain buffers to transfer
const buffers = new WeakSet;

// retain either main threads or workers global context
const context = new WeakMap;

// used to generate a unique `id` per each worker `postMessage` "transaction"
let uid = 0;

/**
 * Create once a `Proxy` able to orchestrate synchronous `postMessage` out of the box.
 * @param {globalThis | Worker} self the context in which code should run
 * @param {{parse: (serialized: string) => any, stringify: (serializable: any) => string}} [JSON] an optional `JSON` like interface to `parse` or `stringify` content
 * @returns {ProxyHandler<globalThis> | ProxyHandler<Worker>}
 */
const coincident$1 = (self, {parse, stringify} = JSON) => {
  // create a Proxy once for the given context (globalThis or Worker instance)
  if (!context.has(self)) {
    // ensure the CHANNEL and data are posted correctly
    const post = (transfer, ...args) => self.postMessage({[CHANNEL]: args}, {transfer});

    context.set(self, new Proxy(new Map$1, {
      // there is very little point in checking prop in proxy for this very specific case
      // and I don't want to orchestrate a whole roundtrip neither, as stuff would fail
      // regardless if from Worker we access non existent Main callback, and vice-versa.
      // This is here mostly to guarantee that if such check is performed, at least the
      // get trap goes through and then it's up to developers guarantee they are accessing
      // stuff that actually exists elsewhere.
      has: (_, action) => typeof action === 'string' && !action.startsWith('_'),

      // worker related: get any utility that should be available on the main thread
      get: (_, action) => action === 'then' ? null : ((...args) => {
        // transaction id
        const id = uid++;

        // first contact: just ask for how big the buffer should be
        let sb = new Int32Array(new SharedArrayBuffer(I32_BYTES));

        // if a transfer list has been passed, drop it from args
        let transfer = [];
        if (buffers.has(args.at(-1) || transfer))
          buffers.delete(transfer = args.pop());

        // ask for invoke with arguments and wait for it
        post(transfer, id, sb, action, args);

        // helps deciding how to wait for results
        const isAsync = self instanceof Worker;
        return waitFor(isAsync, sb).value.then(() => {
          // commit transaction using the returned / needed buffer length
          const length = sb[0];

          // filter undefined results
          if (!length) return;

          // calculate the needed ui16 bytes length to store the result string
          const bytes = UI16_BYTES * length;

          // round up to the next amount of bytes divided by 4 to allow i32 operations
          sb = new Int32Array(new SharedArrayBuffer(bytes + (bytes % I32_BYTES)));

          // ask for results and wait for it
          post([], id, sb);
          return waitFor(isAsync, sb).value.then(
            // transform the shared buffer into a string and return it parsed
            () => parse(fromCharCode(...new Uint16Array(sb.buffer).slice(0, length)))
          );
        });
      }),

      // main thread related: react to any utility a worker is asking for
      set(actions, action, callback) {
        // lazy event listener and logic handling, triggered once by setters actions
        if (!actions.size) {
          // maps results by `id` as they are asked for
          const results = new Map$1;
          // add the event listener once (first defined setter, all others work the same)
          self.addEventListener('message', async (event) => {
            // grub the very same library CHANNEL; ignore otherwise
            const details = event.data?.[CHANNEL];
            if (isArray$2(details)) {
              // if early enough, avoid leaking data to other listeners
              event.stopImmediatePropagation();
              const [id, sb, ...rest] = details;
              // action available: it must be defined/known on the main thread
              if (rest.length) {
                const [action, args] = rest;
                if (actions.has(action)) {
                  // await for result either sync or async and serialize it
                  const result = stringify(await actions.get(action)(...args));
                  if (result) {
                    // store the result for "the very next" event listener call
                    results.set(id, result);
                    // communicate the required SharedArrayBuffer length out of the
                    // resulting serialized string
                    sb[0] = result.length;
                  }
                }
                // unknown action should be notified as missing on the main thread
                else {
                  throw new Error(`Unsupported action: ${action}`);
                }
              }
              // no action means: get results out of the well known `id`
              else {
                const result = results.get(id);
                results.delete(id);
                // populate the SharedArrayBuffer with utf-16 chars code
                for (let ui16a = new Uint16Array(sb.buffer), i = 0; i < result.length; i++)
                  ui16a[i] = result.charCodeAt(i);
              }
              // release te worker waiting either the length or the result
              notify(sb, 0);
            }
          });
        }
        // store this action callback allowing the setter in the process
        return !!actions.set(action, callback);
      }
    }));
  }
  return context.get(self);
};

coincident$1.transfer = (...args) => (buffers.add(args), args);

const OBJECT    = 'object';
const FUNCTION  = 'function';
const BOOLEAN   = 'boolean';
const NUMBER    = 'number';
const STRING    = 'string';
const UNDEFINED = 'undefined';
const BIGINT    = 'bigint';
const SYMBOL    = 'symbol';
const NULL      = 'null';

const {
  defineProperty: defineProperty$1,
  getOwnPropertyDescriptor,
  getPrototypeOf,
  isExtensible,
  ownKeys,
  preventExtensions,
  set,
  setPrototypeOf
} = Reflect;

const {assign: assign$1, create: create$1} = Object;

const TypedArray = getPrototypeOf(Int8Array);

const isArray$1 = 'isArray';

const augment = (descriptor, how) => {
  const {get, set, value} = descriptor;
  if (get) descriptor.get = how(get);
  if (set) descriptor.set = how(set);
  if (value) descriptor.value = how(value);
  return descriptor;
};

const entry = (type, value) => [type, value];

const asEntry = transform => value => {
  const type = typeof value;
  switch (type) {
    case OBJECT:
    if (value == null)
      return entry(NULL, value);
    if (value === globalThis)
      return entry(OBJECT, null);
    case FUNCTION:
      return transform(type, value);
    case BOOLEAN:
    case NUMBER:
    case STRING:
    case UNDEFINED:
    case BIGINT:
      return entry(type, value);
    case SYMBOL: {
      if (symbols.has(value))
        return entry(type, symbols.get(value));
    }
  }
  throw new Error(`Unable to handle this ${type} type`);
};

const symbols = new Map(
  ownKeys(Symbol)
    .filter(s => typeof Symbol[s] === SYMBOL)
    .map(s => [Symbol[s], s])
);
  
const symbol = value => {
  for (const [symbol, name] of symbols) {
    if (name === value)
      return symbol;
  }
};

function Bound() {
  return this;
}

const APPLY                        = 'apply';
const CONSTRUCT                    = 'construct';
const DEFINE_PROPERTY              = 'defineProperty';
const DELETE_PROPERTY              = 'deleteProperty';
const GET                          = 'get';
const GET_OWN_PROPERTY_DESCRIPTOR  = 'getOwnPropertyDescriptor';
const GET_PROTOTYPE_OF             = 'getPrototypeOf';
const HAS                          = 'has';
const IS_EXTENSIBLE                = 'isExtensible';
const OWN_KEYS                     = 'ownKeys';
const PREVENT_EXTENSION            = 'preventExtensions';
const SET                          = 'set';
const SET_PROTOTYPE_OF             = 'setPrototypeOf';
const DELETE                       = 'delete';

var main$1 = (name, patch) => {
  const eventsHandler = patch && new WeakMap;

  // patch once main UI tread
  if (patch) {
    const {addEventListener} = EventTarget.prototype;
    // this should never be on the way as it's extremely light and fast
    // but it's necessary to allow "preventDefault" or other event invokes at distance
    defineProperty$1(EventTarget.prototype, 'addEventListener', {
      value(type, listener, ...options) {
        if (options.at(0)?.invoke) {
          if (!eventsHandler.has(this))
            eventsHandler.set(this, new Map);
          eventsHandler.get(this).set(type, [].concat(options[0].invoke));
          delete options[0].invoke;
        }
        return addEventListener.call(this, type, listener, ...options);
      }
    });
  }

  const handleEvent = patch && (event => {
    const {currentTarget, target, type} = event;
    for (const method of eventsHandler.get(currentTarget || target)?.get(type) || [])
      event[method]();
  });

  return (thread, MAIN, THREAD, ...args) => {
    let id = 0;
    const ids = new Map;
    const values = new Map;

    const {[THREAD]: __thread__} = thread;

    const global = args.length ? assign$1(create$1(globalThis), ...args) : globalThis;

    const result = asEntry((type, value) => {
      if (!ids.has(value)) {
        let sid;
        // a bit apocalyptic scenario but if this main runs forever
        // and the id does a whole int32 roundtrip we might have still
        // some reference danglign around
        while (values.has(sid = id++));
        ids.set(value, sid);
        values.set(sid, value);
      }
      return entry(type, ids.get(value));
    });

    const registry = new FinalizationRegistry(id => {
      __thread__(DELETE, entry(STRING, id));
    });

    const target = ([type, value]) => {
      switch (type) {
        case OBJECT:
          if (value == null)
            return global;
          if (typeof value === NUMBER)
            return values.get(value);
          if (!(value instanceof TypedArray)) {
            for (const key in value)
              value[key] = target(value[key]);
          }
          return value;
        case FUNCTION:
          if (typeof value === STRING) {
            if (!values.has(value)) {
              const cb = function (...args) {
                if (patch && args.at(0) instanceof Event) handleEvent(...args);
                return __thread__(
                  APPLY,
                  entry(FUNCTION, value),
                  result(this),
                  args.map(result)
                );
              };
              const ref = new WeakRef(cb);
              values.set(value, ref);
              registry.register(cb, value, ref);
            }
            return values.get(value).deref();
          }
          return values.get(value);
        case SYMBOL:
          return symbol(value);
      }
      return value;
    };

    const trapsHandler = {
      [APPLY]: (target, thisArg, args) => result(target.apply(thisArg, args)),
      [CONSTRUCT]: (target, args) => result(new target(...args)),
      [DEFINE_PROPERTY]: (target, name, descriptor) => result(defineProperty$1(target, name, descriptor)),
      [DELETE_PROPERTY]: (target, name) => result(delete target[name]),
      [GET_PROTOTYPE_OF]: target => result(getPrototypeOf(target)),
      [GET]: (target, name) => result(target[name]),
      [GET_OWN_PROPERTY_DESCRIPTOR]: (target, name) => {
        const descriptor = getOwnPropertyDescriptor(target, name);
        return descriptor ? entry(OBJECT, augment(descriptor, result)) : entry(UNDEFINED, descriptor);
      },
      [HAS]: (target, name) => result(name in target),
      [IS_EXTENSIBLE]: target => result(isExtensible(target)),
      [OWN_KEYS]: target => entry(OBJECT, ownKeys(target).map(result)),
      [PREVENT_EXTENSION]: target => result(preventExtensions(target)),
      [SET]: (target, name, value) => result(set(target, name, value)),
      [SET_PROTOTYPE_OF]: (target, proto) => result(setPrototypeOf(target, proto)),
      [DELETE](id) {
        ids.delete(values.get(id));
        values.delete(id);
      }
    };

    thread[MAIN] = (trap, entry, ...args) => {
      switch (trap) {
        case APPLY:
          args[0] = target(args[0]);
          args[1] = args[1].map(target);
          break;
        case CONSTRUCT:
          args[0] = args[0].map(target);
          break;
        case DEFINE_PROPERTY: {
          const [name, descriptor] = args;
          args[0] = target(name);
          const {get, set, value} = descriptor;
          if (get) descriptor.get = target(get);
          if (set) descriptor.set = target(set);
          if (value) descriptor.value = target(value);
          break;
        }
        default:
          args = args.map(target);
          break;
      }
      return trapsHandler[trap](target(entry), ...args);
    };

    return {
      proxy: thread,
      [name.toLowerCase()]: global,
      [`is${name}Proxy`]: () => false
    };
  };
};

var main = main$1('Window', true);

var thread$1 = name => {
  let id = 0;
  const ids = new Map;
  const values = new Map;

  const __proxied__ = Symbol();

  const bound = target => typeof target === FUNCTION ? target() : target;

  const isProxy = value => typeof value === OBJECT && !!value && __proxied__ in value;

  const localArray = Array[isArray$1];

  const argument = asEntry(
    (type, value) => {
      if (__proxied__ in value)
        return bound(value[__proxied__]);
      if (type === FUNCTION) {
        if (!values.has(value)) {
          let sid;
          // a bit apocalyptic scenario but if this thread runs forever
          // and the id does a whole int32 roundtrip we might have still
          // some reference dangling around
          while (values.has(sid = String(id++)));
          ids.set(value, sid);
          values.set(sid, value);
        }
        return entry(type, ids.get(value));
      }
      if (!(value instanceof TypedArray)) {
        for(const key in value)
          value[key] = argument(value[key]);
      }
      return entry(type, value);
    }
  );

  return (main, MAIN, THREAD) => {
    const { [MAIN]: __main__ } = main;

    const proxies = new Map;

    const registry = new FinalizationRegistry(id => {
      proxies.delete(id);
      __main__(DELETE, argument(id));
    });

    const register = (entry) => {
      const [type, value] = entry;
      if (!proxies.has(value)) {
        const target = type === FUNCTION ? Bound.bind(entry) : entry;
        const proxy = new Proxy(target, proxyHandler);
        const ref = new WeakRef(proxy);
        proxies.set(value, ref);
        registry.register(proxy, value, ref);
      }
      return proxies.get(value).deref();
    };

    const fromEntry = entry => {
      const [type, value] = entry;
      switch (type) {
        case OBJECT:
          return value === null ? globalThis : (
            typeof value === NUMBER ? register(entry) : value
          );
        case FUNCTION:
          return typeof value === STRING ? values.get(value) : register(entry);
        case SYMBOL:
          return symbol(value);
      }
      return value;
    };

    const result = (TRAP, target, ...args) => fromEntry(__main__(TRAP, bound(target), ...args));

    const proxyHandler = {
      [APPLY]: (target, thisArg, args) => result(APPLY, target, argument(thisArg), args.map(argument)),
      [CONSTRUCT]: (target, args) => result(CONSTRUCT, target, args.map(argument)),
      [DEFINE_PROPERTY]: (target, name, descriptor) => {
        const { get, set, value } = descriptor;
        if (typeof get === FUNCTION) descriptor.get = argument(get);
        if (typeof set === FUNCTION) descriptor.set = argument(set);
        if (typeof value === FUNCTION) descriptor.value = argument(value);
        return result(DEFINE_PROPERTY, target, argument(name), descriptor);
      },
      [DELETE_PROPERTY]: (target, name) => result(DELETE_PROPERTY, target, argument(name)),
      [GET_PROTOTYPE_OF]: target => result(GET_PROTOTYPE_OF, target),
      [GET]: (target, name) => name === __proxied__ ? target : result(GET, target, argument(name)),
      [GET_OWN_PROPERTY_DESCRIPTOR]: (target, name) => {
        const descriptor = result(GET_OWN_PROPERTY_DESCRIPTOR, target, argument(name));
        return descriptor && augment(descriptor, fromEntry);
      },
      [HAS]: (target, name) => name === __proxied__ || result(HAS, target, argument(name)),
      [IS_EXTENSIBLE]: target => result(IS_EXTENSIBLE, target),
      [OWN_KEYS]: target => result(OWN_KEYS, target).map(fromEntry),
      [PREVENT_EXTENSION]: target => result(PREVENT_EXTENSION, target),
      [SET]: (target, name, value) => result(SET, target, argument(name), argument(value)),
      [SET_PROTOTYPE_OF]: (target, proto) => result(SET_PROTOTYPE_OF, target, argument(proto)),
    };

    main[THREAD] = (trap, entry, ctx, args) => {
      switch (trap) {
        case APPLY:
          return fromEntry(entry).apply(fromEntry(ctx), args.map(fromEntry));
        case DELETE: {
          const id = fromEntry(entry);
          ids.delete(values.get(id));
          values.delete(id);
        }
      }
    };

    const global = new Proxy([OBJECT, null], proxyHandler);

    // this is needed to avoid confusion when new Proxy([type, value])
    // passes through `isArray` check, as that would return always true
    // by specs and there's no Proxy trap to avoid it.
    const remoteArray = global.Array[isArray$1];
    defineProperty$1(Array, isArray$1, {
      value: ref => isProxy(ref) ? remoteArray(ref) : localArray(ref)
    });

    return {
      [name.toLowerCase()]: global,
      [`is${name}Proxy`]: isProxy,
      proxy: main
    };
  };
};

var thread = thread$1('Window');

const proxies = new WeakMap;

/**
 * @typedef {object} Coincident
 * @property {ProxyHandler<globalThis>} proxy
 * @property {ProxyHandler<Window>} window
 * @property {(value: any) => boolean} isWindowProxy
 */

/**
 * Create once a `Proxy` able to orchestrate synchronous `postMessage` out of the box.
 * In workers, returns a `{proxy, window, isWindowProxy}` namespace to reach main globals synchronously.
 * @param {Worker | globalThis} self the context in which code should run
 * @returns {ProxyHandler<Worker> | Coincident}
 */
const coincident = (self, ...args) => {
  const proxy = coincident$1(self, ...args);
  if (!proxies.has(proxy)) {
    const util = self instanceof Worker ? main : thread;
    proxies.set(proxy, util(proxy, MAIN, THREAD));
  }
  return proxies.get(proxy);
};

coincident.transfer = coincident$1.transfer;

/* c8 ignore next */
var xworker$1 = () => new Worker('/esm/worker/__template.js',{type:'module'});

const { isArray } = Array;

const { assign, create, defineProperties, defineProperty, entries } = Object;

const { all, resolve: resolve$1 } = new Proxy(Promise, {
    get: ($, name) => $[name].bind($),
});

const absoluteURL = (path, base = location.href) => new URL(path, base).href;

/** @param {Response} response */
const getBuffer = (response) => response.arrayBuffer();

/** @param {Response} response */
const getJSON = (response) => response.json();

/** @param {Response} response */
const getText = (response) => response.text();

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const workerHooks = [
    ['beforeRun', 'codeBeforeRunWorker'],
    ['beforeRunAsync', 'codeBeforeRunWorkerAsync'],
    ['afterRun', 'codeAfterRunWorker'],
    ['afterRunAsync', 'codeAfterRunWorkerAsync'],
];

class Hook {
    constructor(interpreter, options) {
        this.interpreter = interpreter;
        this.onWorkerReady = options.onWorkerReady;
        for (const [key, value] of workerHooks) this[key] = options[value]?.();
    }
    get stringHooks() {
        const hooks = {};
        for (const [key] of workerHooks) {
            if (this[key]) hooks[key] = this[key];
        }
        return hooks;
    }
}
/* c8 ignore stop */

/**
 * @typedef {Object} WorkerOptions custom configuration
 * @prop {string} type the interpreter type to use
 * @prop {string} [version] the optional interpreter version to use
 * @prop {string} [config] the optional config to use within such interpreter
 */

var xworker = (...args) =>
    /**
     * A XWorker is a Worker facade able to bootstrap a channel with any desired interpreter.
     * @param {string} url the remote file to evaluate on bootstrap
     * @param {WorkerOptions} [options] optional arguments to define the interpreter to use
     * @returns {Worker}
     */
    function XWorker(url, options) {
        const worker = xworker$1();
        const { postMessage } = worker;
        const isHook = this instanceof Hook;

        if (args.length) {
            const [type, version] = args;
            options = assign({}, options || { type, version });
            if (!options.type) options.type = type;
        }

        if (options?.config) options.config = absoluteURL(options.config);

        const bootstrap = fetch(url)
            .then(getText)
            .then((code) => {
                const hooks = isHook ? this.stringHooks : void 0;
                postMessage.call(worker, { options, code, hooks });
            });

        defineProperties(worker, {
            postMessage: {
                value: (data, ...rest) =>
                    bootstrap.then(() =>
                        postMessage.call(worker, data, ...rest),
                    ),
            },
            sync: {
                value: coincident(worker, JSON$1).proxy,
            },
            onerror: {
                value: (event) =>
                    console.error(event.data.message, event.data.stack)
            }
        });

        if (isHook) this.onWorkerReady?.(this.interpreter, worker);

        worker.addEventListener('message', (event) => {
            if (event.data instanceof Error) {
                event.stopImmediatePropagation();
                worker.onerror(event);
            }
        });

        return worker;
    };

Promise.withResolvers || (Promise.withResolvers = function withResolvers() {
  var a, b, c = new this(function (resolve, reject) {
    a = resolve;
    b = reject;
  });
  return {resolve: a, reject: b, promise: c};
});

/**
 * Trim code only if it's a single line that prettier or other tools might have modified.
 * @param {string} code code that might be a single line
 * @returns {string}
 */
const clean = (code) =>
    code.replace(/^[^\r\n]+$/, (line) => line.trim());

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const io = new WeakMap();
const stdio = (init) => {
    const context = init || console;
    const localIO = {
        stderr: (context.stderr || console.error).bind(context),
        stdout: (context.stdout || console.log).bind(context),
    };
    return {
        stderr: (...args) => localIO.stderr(...args),
        stdout: (...args) => localIO.stdout(...args),
        async get(engine) {
            const interpreter = await engine;
            io.set(interpreter, localIO);
            return interpreter;
        },
    };
};

// This should be the only helper needed for all Emscripten based FS exports
const writeFile = ({ FS, PATH, PATH_FS }, path, buffer) => {
    const absPath = PATH_FS.resolve(path);
    FS.mkdirTree(PATH.dirname(absPath));
    return FS.writeFile(absPath, new Uint8Array(buffer), {
        canOwn: true,
    });
};
/* c8 ignore stop */

// This is instead a fallback for Lua or others
const writeFileShim = (FS, path, buffer) => {
    mkdirTree(FS, dirname(path));
    path = resolve(FS, path);
    return FS.writeFile(path, new Uint8Array(buffer), { canOwn: true });
};

const dirname = (path) => {
    const tree = path.split('/');
    tree.pop();
    return tree.join('/');
};

const mkdirTree = (FS, path) => {
    const current = [];
    for (const branch of path.split('/')) {
        if (branch === '.') continue;
        current.push(branch);
        if (branch) FS.mkdir(current.join('/'));
    }
};

const resolve = (FS, path) => {
    const tree = [];
    for (const branch of path.split('/')) {
        switch (branch) {
            case '':
                break;
            case '.':
                break;
            case '..':
                tree.pop();
                break;
            default:
                tree.push(branch);
        }
    }
    return [FS.cwd()].concat(tree).join('/').replace(/^\/+/, '/');
};

const calculateFetchPaths = (config_fetch) => {
    // REQUIRES INTEGRATION TEST
    /* c8 ignore start */
    for (const { files, to_file, from = '' } of config_fetch) {
        if (files !== undefined && to_file !== undefined)
            throw new Error(
                'Cannot use \'to_file\' and \'files\' parameters together!',
            );
        if (files === undefined && to_file === undefined && from.endsWith('/'))
            throw new Error(
                `Couldn't determine the filename from the path ${from}, please supply 'to_file' parameter.`,
            );
    }
    /* c8 ignore stop */
    return config_fetch.flatMap(
        ({ from = '', to_folder = '.', to_file, files }) => {
            if (isArray(files))
                return files.map((file) => ({
                    url: joinPaths([from, file]),
                    path: joinPaths([to_folder, file]),
                }));
            const filename = to_file || from.slice(1 + from.lastIndexOf('/'));
            return [{ url: from, path: joinPaths([to_folder, filename]) }];
        },
    );
};

const joinPaths = (parts) => {
    const res = parts
        .map((part) => part.trim().replace(/(^[/]*|[/]*$)/g, ''))
        .filter((p) => p !== '' && p !== '.')
        .join('/');

    return parts[0].startsWith('/') ? `/${res}` : res;
};

const fetchResolved = (config_fetch, url) =>
    fetch(absoluteURL(url, base.get(config_fetch)));

const base = new WeakMap();

const fetchPaths = (module, interpreter, config_fetch) =>
    all(
        calculateFetchPaths(config_fetch).map(({ url, path }) =>
            fetchResolved(config_fetch, url)
                .then(getBuffer)
                .then((buffer) => module.writeFile(interpreter, path, buffer)),
        ),
    );
/* c8 ignore stop */

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const registerJSModule = (interpreter, name, value) => {
    interpreter.registerJsModule(name, value);
};

const run = (interpreter, code) => interpreter.runPython(clean(code));

const runAsync = (interpreter, code) =>
    interpreter.runPythonAsync(clean(code));

const runEvent = async (interpreter, code, event) => {
    // allows method(event) as well as namespace.method(event)
    // it does not allow fancy brackets names for now
    const [name, ...keys] = code.split('.');
    let target = interpreter.globals.get(name);
    let context;
    for (const key of keys) [context, target] = [target, target[key]];
    await target.call(context, event);
};
/* c8 ignore stop */

const type$3 = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var micropython = {
    type: type$3,
    module: (version = '1.20.0-297') =>
        `https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${version}/micropython.mjs`,
    async engine({ loadMicroPython }, config, url) {
        const { stderr, stdout, get } = stdio();
        url = url.replace(/\.m?js$/, '.wasm');
        const interpreter = await get(loadMicroPython({ stderr, stdout, url }));
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        return interpreter;
    },
    registerJSModule,
    run,
    runAsync,
    runEvent,
    writeFile: ({ FS, _module: { PATH, PATH_FS } }, path, buffer) =>
        writeFile({ FS, PATH, PATH_FS }, path, buffer),
};
/* c8 ignore stop */

const type$2 = 'pyodide';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var pyodide = {
    type: type$2,
    module: (version = '0.23.2') =>
        `https://cdn.jsdelivr.net/pyodide/v${version}/full/pyodide.mjs`,
    async engine({ loadPyodide }, config, url) {
        const { stderr, stdout, get } = stdio();
        const indexURL = url.slice(0, url.lastIndexOf('/'));
        const interpreter = await get(
            loadPyodide({ stderr, stdout, indexURL }),
        );
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        if (config.packages) {
            await interpreter.loadPackage('micropip');
            const micropip = await interpreter.pyimport('micropip');
            await micropip.install(config.packages);
            micropip.destroy();
        }
        return interpreter;
    },
    registerJSModule,
    run,
    runAsync,
    runEvent,
    writeFile: ({ FS, PATH, _module: { PATH_FS } }, path, buffer) =>
        writeFile({ FS, PATH, PATH_FS }, path, buffer),
};
/* c8 ignore stop */

const type$1 = 'ruby-wasm-wasi';
const jsType = type$1.replace(/\W+/g, '_');

// MISSING:
//  * there is no VFS apparently or I couldn't reach any
//  * I've no idea how to override the stderr and stdout
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var ruby_wasm_wasi = {
    type: type$1,
    experimental: true,
    module: (version = '2.0.0') =>
        `https://cdn.jsdelivr.net/npm/ruby-3_2-wasm-wasi@${version}/dist/browser.esm.js`,
    async engine({ DefaultRubyVM }, config, url) {
        const response = await fetch(
            `${url.slice(0, url.lastIndexOf('/'))}/ruby.wasm`,
        );
        const module = await WebAssembly.compile(await response.arrayBuffer());
        const { vm: interpreter } = await DefaultRubyVM(module);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. $xworker)
    registerJSModule(interpreter, _, value) {
        const code = ['require "js"'];
        for (const [k, v] of entries(value)) {
            const id = `__module_${jsType}_${k}`;
            globalThis[id] = v;
            code.push(`$${k}=JS.global[:${id}]`);
        }
        this.run(interpreter, code.join(';'));
    },
    run: (interpreter, code) => interpreter.eval(clean(code)),
    runAsync: (interpreter, code) => interpreter.evalAsync(clean(code)),
    async runEvent(interpreter, code, event) {
        // patch common xworker.onmessage/onerror cases
        if (/^xworker\.(on\w+)$/.test(code)) {
            const { $1: name } = RegExp;
            const id = `__module_${jsType}_event`;
            globalThis[id] = event;
            this.run(
                interpreter,
                `require "js";$xworker.call("${name}",JS.global[:${id}])`,
            );
            delete globalThis[id];
        } else {
            // Experimental: allows only events by fully qualified method name
            const method = this.run(interpreter, `method(:${code})`);
            await method.call(code, interpreter.wrap(event));
        }
    },
    writeFile: () => {
        throw new Error(`writeFile is not supported in ${type$1}`);
    },
};
/* c8 ignore stop */

const type = 'wasmoon';

// MISSING:
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var wasmoon = {
    type,
    module: (version = '1.15.0') =>
        `https://cdn.jsdelivr.net/npm/wasmoon@${version}/+esm`,
    async engine({ LuaFactory, LuaLibraries }, config) {
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(new LuaFactory().createEngine());
        interpreter.global.getTable(LuaLibraries.Base, (index) => {
            interpreter.global.setField(index, 'print', stdout);
            interpreter.global.setField(index, 'printErr', stderr);
        });
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        return interpreter;
    },
    // Fallback to globally defined module fields
    registerJSModule: (interpreter, _, value) => {
        for (const [k, v] of entries(value)) interpreter.global.set(k, v);
    },
    run: (interpreter, code) => interpreter.doStringSync(clean(code)),
    runAsync: (interpreter, code) => interpreter.doString(clean(code)),
    runEvent: async (interpreter, code, event) => {
        // allows method(event) as well as namespace.method(event)
        // it does not allow fancy brackets names for now
        const [name, ...keys] = code.split('.');
        let target = interpreter.global.get(name);
        let context;
        for (const key of keys) [context, target] = [target, target[key]];
        await target.call(context, event);
    },
    writeFile: (
        {
            cmodule: {
                module: { FS },
            },
        },
        path,
        buffer,
    ) => writeFileShim(FS, path, buffer),
};
/* c8 ignore stop */

// ⚠️ Part of this file is automatically generated
//    The :RUNTIMES comment is a delimiter and no code should be written/changed after
//    See rollup/build_interpreters.cjs to know more


/** @type {Map<string, object>} */
const registry$1 = new Map();

/** @type {Map<string, object>} */
const configs = new Map();

/** @type {string[]} */
const selectors = [];

/** @type {string[]} */
const prefixes = [];

const interpreter = new Proxy(new Map(), {
    get(map, id) {
        if (!map.has(id)) {
            const [type, ...rest] = id.split('@');
            const interpreter = registry$1.get(type);
            const url = /^https?:\/\//i.test(rest)
                ? rest.join('@')
                : interpreter.module(...rest);
            map.set(id, {
                url,
                module: import(url),
                engine: interpreter.engine.bind(interpreter),
            });
        }
        const { url, module, engine } = map.get(id);
        return (config, baseURL) =>
            module.then((module) => {
                configs.set(id, config);
                const fetch = config?.fetch;
                if (fetch) base.set(fetch, baseURL);
                return engine(module, config, url);
            });
    },
});

const register = (interpreter) => {
    for (const type of [].concat(interpreter.type)) {
        registry$1.set(type, interpreter);
        selectors.push(`script[type="${type}"]`);
        prefixes.push(`${type}-`);
    }
};
for (const interpreter of [micropython, pyodide, ruby_wasm_wasi, wasmoon])
    register(interpreter);

// lazy TOML parser (fast-toml might be a better alternative)
const TOML_LIB = 'https://cdn.jsdelivr.net/npm/basic-toml@0.3.1/es.js';

/**
 * @param {string} text TOML text to parse
 * @returns {object} the resulting JS object
 */
const parse = async (text) => (await import(TOML_LIB)).parse(text);

/**
 * @param {string} id the interpreter name @ version identifier
 * @param {string} [config] optional config file to parse
 * @returns
 */
const getRuntime = (id, config) => {
    let options = {};
    if (config) {
        // REQUIRES INTEGRATION TEST
        /* c8 ignore start */
        if (config.endsWith('.json')) {
            options = fetch(config).then(getJSON);
        } else if (config.endsWith('.toml')) {
            options = fetch(config).then(getText).then(parse);
        } else {
            try {
                options = JSON.parse(config);
            } catch (_) {
                options = parse(config);
            }
            // make the config a URL to be able to retrieve relative paths from it
            config = './config.txt';
        }
        config = absoluteURL(config);
        /* c8 ignore stop */
    }
    return resolve$1(options).then((options) => interpreter[id](options, config));
};

/**
 * @param {string} type the interpreter type
 * @param {string} [version] the optional interpreter version
 * @returns
 */
const getRuntimeID = (type, version = '') =>
    `${type}@${version}`.replace(/@$/, '');

const getRoot = (script) => {
    let parent = script;
    while (parent.parentNode) parent = parent.parentNode;
    return parent;
};

const queryTarget = (script, idOrSelector) => {
    const root = getRoot(script);
    return root.getElementById(idOrSelector) || $(idOrSelector, root);
};

const targets = new WeakMap();
const targetDescriptor = {
    get() {
        let target = targets.get(this);
        if (!target) {
            target = document.createElement(`${this.type}-script`);
            targets.set(this, target);
            handle(this);
        }
        return target;
    },
    set(target) {
        if (typeof target === 'string')
            targets.set(this, queryTarget(this, target));
        else {
            targets.set(this, target);
            handle(this);
        }
    },
};

const handled = new WeakMap();

const interpreters = new Map();

const execute = async (script, source, XWorker, isAsync) => {
    const module = registry$1.get(script.type);
    /* c8 ignore start */
    if (module.experimental)
        console.warn(`The ${script.type} interpreter is experimental`);
    const [interpreter, content] = await all([
        handled.get(script).interpreter,
        source,
    ]);
    try {
        // temporarily override inherited document.currentScript in a non writable way
        // but it deletes it right after to preserve native behavior (as it's sync: no trouble)
        defineProperty(document, 'currentScript', {
            configurable: true,
            get: () => script,
        });
        module.registerJSModule(interpreter, 'polyscript', { XWorker });
        return module[isAsync ? 'runAsync' : 'run'](interpreter, content);
    } finally {
        delete document.currentScript;
    }
    /* c8 ignore stop */
};

const getValue = (ref, prefix) => {
    const value = ref?.value;
    return value ? prefix + value : '';
};

const getDetails = (type, id, name, version, config) => {
    if (!interpreters.has(id)) {
        const details = {
            interpreter: getRuntime(name, config),
            queue: resolve$1(),
            XWorker: xworker(type, version),
        };
        interpreters.set(id, details);
        // enable sane defaults when single interpreter *of kind* is used in the page
        // this allows `xxx-*` attributes to refer to such interpreter without `env` around
        if (!interpreters.has(type)) interpreters.set(type, details);
    }
    return interpreters.get(id);
};

/**
 * @param {HTMLScriptElement} script a special type of <script>
 */
const handle = async (script) => {
    // known node, move its companion target after
    // vDOM or other use cases where the script is a tracked element
    if (handled.has(script)) {
        const { target } = script;
        if (target) {
            // if the script is in the head just append target to the body
            if (script.closest('head')) document.body.append(target);
            // in any other case preserve the script position
            else script.after(target);
        }
    }
    // new script to handle ... allow newly created scripts to work
    // just exactly like any other script would
    else {
        // allow a shared config among scripts, beside interpreter,
        // and/or source code with different config or interpreter
        const {
            attributes: { async: isAsync, config, env, target, version },
            src,
            type,
        } = script;
        const versionValue = version?.value;
        const name = getRuntimeID(type, versionValue);
        const targetValue = getValue(target, '');
        let configValue = getValue(config, '|');
        const id = getValue(env, '') || `${name}${configValue}`;
        configValue = configValue.slice(1);
        if (configValue) configValue = absoluteURL(configValue);
        const details = getDetails(type, id, name, versionValue, configValue);

        handled.set(
            defineProperty(script, 'target', targetDescriptor),
            details,
        );

        if (targetValue) targets.set(script, queryTarget(script, targetValue));

        // start fetching external resources ASAP
        const source = src ? fetch(src).then(getText) : script.textContent;
        details.queue = details.queue.then(() =>
            execute(script, source, details.XWorker, !!isAsync),
        );
    }
};

const env = new Proxy(create(null), {
    get: (_, name) => awaitInterpreter(name),
});

/* c8 ignore start */ // attributes are tested via integration / e2e
// ensure both interpreter and its queue are awaited then returns the interpreter
const awaitInterpreter = async (key) => {
    if (interpreters.has(key)) {
        const { interpreter, queue } = interpreters.get(key);
        return (await all([interpreter, queue]))[0];
    }

    const available = interpreters.size
        ? `Available interpreters are: ${[...interpreters.keys()]
              .map((r) => `"${r}"`)
              .join(', ')}.`
        : 'There are no interpreters in this page.';

    throw new Error(`The interpreter "${key}" was not found. ${available}`);
};

const listener = async (event) => {
    const { type, currentTarget } = event;
    for (let { name, value, ownerElement: el } of $x(
        `./@*[${prefixes.map((p) => `name()="${p}${type}"`).join(' or ')}]`,
        currentTarget,
    )) {
        name = name.slice(0, -(type.length + 1));
        const interpreter = await awaitInterpreter(
            el.getAttribute(`${name}-env`) || name,
        );
        const handler = registry$1.get(name);
        handler.runEvent(interpreter, value, event);
    }
};

/**
 * Look for known prefixes and add related listeners.
 * @param {Document | Element} root
 */
const addAllListeners = (root) => {
    for (let { name, ownerElement: el } of $x(
        `.//@*[${prefixes
            .map((p) => `starts-with(name(),"${p}")`)
            .join(' or ')}]`,
        root,
    )) {
        name = name.slice(name.lastIndexOf('-') + 1);
        if (name !== 'env') el.addEventListener(name, listener);
    }
};
/* c8 ignore stop */

const CUSTOM_SELECTORS = [];

/**
 * @typedef {Object} Runtime custom configuration
 * @prop {object} interpreter the bootstrapped interpreter
 * @prop {(url:string, options?: object) => Worker} XWorker an XWorker constructor that defaults to same interpreter on the Worker.
 * @prop {object} config a cloned config used to bootstrap the interpreter
 * @prop {(code:string) => any} run an utility to run code within the interpreter
 * @prop {(code:string) => Promise<any>} runAsync an utility to run code asynchronously within the interpreter
 * @prop {(path:string, data:ArrayBuffer) => void} writeFile an utility to write a file in the virtual FS, if available
 */

const types = new Map();
const waitList = new Map();

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
/**
 * @param {Element} node any DOM element registered via define.
 */
const handleCustomType = (node) => {
    for (const selector of CUSTOM_SELECTORS) {
        if (node.matches(selector)) {
            const type = types.get(selector);
            const { resolve } = waitList.get(type);
            const { options, known } = registry.get(type);
            if (!known.has(node)) {
                known.add(node);
                const {
                    interpreter: runtime,
                    version,
                    config,
                    env,
                    onInterpreterReady,
                } = options;
                const name = getRuntimeID(runtime, version);
                const id = env || `${name}${config ? `|${config}` : ''}`;
                const { interpreter: engine, XWorker: Worker } = getDetails(
                    runtime,
                    id,
                    name,
                    version,
                    config,
                );
                engine.then((interpreter) => {
                    const module = create(registry$1.get(runtime));

                    const {
                        onBeforeRun,
                        onBeforeRunAsync,
                        onAfterRun,
                        onAfterRunAsync,
                    } = options;

                    const hooks = new Hook(interpreter, options);

                    const XWorker = function XWorker(...args) {
                        return Worker.apply(hooks, args);
                    };

                    // These two loops mimic a `new Map(arrayContent)` without needing
                    // the new Map overhead so that [name, [before, after]] can be easily destructured
                    // and new sync or async patches become easy to add (when the logic is the same).

                    // patch sync
                    for (const [name, [before, after]] of [
                        ['run', [onBeforeRun, onAfterRun]],
                    ]) {
                        const method = module[name];
                        module[name] = function (interpreter, code) {
                            if (before) before.call(this, resolved, node);
                            const result = method.call(this, interpreter, code);
                            if (after) after.call(this, resolved, node);
                            return result;
                        };
                    }

                    // patch async
                    for (const [name, [before, after]] of [
                        ['runAsync', [onBeforeRunAsync, onAfterRunAsync]],
                    ]) {
                        const method = module[name];
                        module[name] = async function (interpreter, code) {
                            if (before) await before.call(this, resolved, node);
                            const result = await method.call(
                                this,
                                interpreter,
                                code,
                            );
                            if (after) await after.call(this, resolved, node);
                            return result;
                        };
                    }

                    module.registerJSModule(interpreter, 'polyscript', { XWorker });

                    const resolved = {
                        type,
                        interpreter,
                        XWorker,
                        io: io.get(interpreter),
                        config: structuredClone(configs.get(name)),
                        run: module.run.bind(module, interpreter),
                        runAsync: module.runAsync.bind(module, interpreter),
                        runEvent: module.runEvent.bind(module, interpreter),
                    };

                    resolve(resolved);

                    onInterpreterReady?.(resolved, node);
                });
            }
        }
    }
};

/**
 * @type {Map<string, {options:object, known:WeakSet<Element>}>}
 */
const registry = new Map();

/**
 * @typedef {Object} CustomOptions custom configuration
 * @prop {'pyodide' | 'micropython' | 'wasmoon' | 'ruby-wasm-wasi'} interpreter the interpreter to use
 * @prop {string} [version] the optional interpreter version to use
 * @prop {string} [config] the optional config to use within such interpreter
 * @prop {(environment: object, node: Element) => void} [onInterpreterReady] the callback that will be invoked once
 */

/**
 * Allows custom types and components on the page to receive interpreters to execute any code
 * @param {string} type the unique `<script type="...">` identifier
 * @param {CustomOptions} options the custom type configuration
 */
const define = (type, options) => {
    if (registry$1.has(type) || registry.has(type))
        throw new Error(`<script type="${type}"> already registered`);

    if (!registry$1.has(options?.interpreter))
        throw new Error('Unspecified interpreter');

    // allows reaching out the interpreter helpers on events
    registry$1.set(type, registry$1.get(options?.interpreter));

    // ensure a Promise can resolve once a custom type has been bootstrapped
    whenDefined(type);

    // allows selector -> registry by type
    const selectors = [`script[type="${type}"]`, `${type}-script`];
    for (const selector of selectors) types.set(selector, type);

    CUSTOM_SELECTORS.push(...selectors);
    prefixes.push(`${type}-`);

    // ensure always same env for this custom type
    registry.set(type, {
        options: assign({ env: type }, options),
        known: new WeakSet(),
    });

    addAllListeners(document);
    $$(selectors.join(',')).forEach(handleCustomType);
};

/**
 * Resolves whenever a defined custom type is bootstrapped on the page
 * @param {string} type the unique `<script type="...">` identifier
 * @returns {Promise<object>}
 */
const whenDefined = (type) => {
    if (!waitList.has(type)) waitList.set(type, Promise.withResolvers());
    return waitList.get(type).promise;
};
/* c8 ignore stop */

const XWorker = xworker();

const INTERPRETER_SELECTORS = selectors.join(',');

const mo = new MutationObserver((records) => {
    for (const { type, target, attributeName, addedNodes } of records) {
        // attributes are tested via integration / e2e
        /* c8 ignore start */
        if (type === 'attributes') {
            const i = attributeName.lastIndexOf('-') + 1;
            if (i) {
                const prefix = attributeName.slice(0, i);
                for (const p of prefixes) {
                    if (prefix === p) {
                        const type = attributeName.slice(i);
                        if (type !== 'env') {
                            const method = target.hasAttribute(attributeName)
                                ? 'add'
                                : 'remove';
                            target[`${method}EventListener`](type, listener);
                        }
                        break;
                    }
                }
            }
            continue;
        }
        for (const node of addedNodes) {
            if (node.nodeType === 1) {
                addAllListeners(node);
                if (node.matches(INTERPRETER_SELECTORS)) handle(node);
                else {
                    $$(INTERPRETER_SELECTORS, node).forEach(handle);
                    if (!CUSTOM_SELECTORS.length) continue;
                    handleCustomType(node);
                    $$(CUSTOM_SELECTORS.join(','), node).forEach(
                        handleCustomType,
                    );
                }
            }
        }
        /* c8 ignore stop */
    }
});

const observe = (root) => {
    mo.observe(root, { childList: true, subtree: true, attributes: true });
    return root;
};

const { attachShadow } = Element.prototype;
assign(Element.prototype, {
    attachShadow(init) {
        return observe(attachShadow.call(this, init));
    },
});

addAllListeners(observe(document));
$$(INTERPRETER_SELECTORS, document).forEach(handle);

export { XWorker, define, env, whenDefined };
