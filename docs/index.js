/**
 * Allow leaking a module globally to help avoid conflicting exports
 * if the module might have been re-bundled in other projects.
 * @template T
 * @param {string} name the module name to save or retrieve
 * @param {T} value the module as value to save if not known
 * @param {globalThis} [global=globalThis] the reference where modules are saved where `globalThis` is the default
 * @returns {[T, boolean]} the passed `value` or the previous one as first entry, a boolean indicating if it was known or not
 */
const stickyModule = (name, value, global = globalThis) => {
  const symbol = Symbol.for(name);
  const known = symbol in global;
  return [
    known ?
      global[symbol] :
      Object.defineProperty(global, symbol, { value })[symbol],
    known
  ];
};

/**
 * Given a CSS selector, returns the first matching node, if any.
 * @param {string} css the CSS selector to query
 * @param {Document | DocumentFragment | Element} [root] the optional parent node to query
 * @returns {Element?} the found element, if any
 */
const $$1 = (css, root = document) => root.querySelector(css);

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

// a bit terser code than I usually write but it's 10 LOC within 80 cols
// if you are struggling to follow the code you can replace 1-char
// references around with the following one, hoping that helps :-)

// d => descriptors
// k => key
// p => promise
// r => response

const d = Object.getOwnPropertyDescriptors(Response.prototype);

const isFunction = value => typeof value === 'function';

const bypass = (p, k, { get, value }) => get || !isFunction(value) ?
                p.then(r => r[k]) :
                (...args) => p.then(r => r[k](...args));

const direct = (p, value) => isFunction(value) ? value.bind(p) : value;

const handler = {
    get: (p, k) => d.hasOwnProperty(k) ? bypass(p, k, d[k]) : direct(p, p[k])
};

/**
 * @param {RequestInfo | URL} input
 * @param  {...RequestInit} init
 * @returns {Promise<Response> & Response}
 */
var fetch$1 = (input, ...init) => new Proxy(
    fetch(input, ...init).then(
        r => r.ok ? r : Promise.reject(
            new Error(`[${r.status}] Unable to fetch ${input}`)
        )
    ),
    handler
);

const { assign: assign$3 } = Object;

const STORAGE = 'entries';
const READONLY = 'readonly';
const READWRITE = 'readwrite';

/**
 * @typedef {Object} IDBMapOptions
 * @prop {'strict' | 'relaxed' | 'default'} [durability]
 * @prop {string} [prefix]
 */

/** @typedef {[IDBValidKey, unknown]} IDBMapEntry */

/** @type {IDBMapOptions} */
const defaultOptions = { durability: 'default', prefix: 'IDBMap' };

/**
 * @template T
 * @param {{ target: IDBRequest<T> }} event
 * @returns {T}
 */
const result$1 = ({ target: { result } }) => result;

class IDBMap extends EventTarget {
  // Privates
  /** @type {Promise<IDBDatabase>} */ #db;
  /** @type {IDBMapOptions} */ #options;
  /** @type {string} */ #prefix;

  /**
   * @template T
   * @param {(store: IDBObjectStore) => IDBRequest<T>} what
   * @param {'readonly' | 'readwrite'} how
   * @returns {Promise<T>}
   */
  async #transaction(what, how) {
    const db = await this.#db;
    const t = db.transaction(STORAGE, how, this.#options);
    return new Promise((onsuccess, onerror) => assign$3(
      what(t.objectStore(STORAGE)),
      {
        onsuccess,
        onerror,
      }
    ));
  }

  /**
   * @param {string} name
   * @param {IDBMapOptions} options
   */
  constructor(
    name,
    {
      durability = defaultOptions.durability,
      prefix = defaultOptions.prefix,
    } = defaultOptions
  ) {
    super();
    this.#prefix = prefix;
    this.#options = { durability };
    this.#db = new Promise((resolve, reject) => {
      assign$3(
        indexedDB.open(`${this.#prefix}/${name}`),
        {
          onupgradeneeded({ target: { result, transaction } }) {
            if (!result.objectStoreNames.length)
              result.createObjectStore(STORAGE);
            transaction.oncomplete = () => resolve(result);
          },
          onsuccess(event) {
            resolve(result$1(event));
          },
          onerror(event) {
            reject(event);
            this.dispatchEvent(event);
          },
        },
      );
    }).then(result => {
      const boundDispatch = this.dispatchEvent.bind(this);
      for (const key in result) {
        if (key.startsWith('on'))
          result[key] = boundDispatch;
      }
      return result;
    });
  }

  // EventTarget Forwards
  /**
   * @param {Event} event
   * @returns 
   */
  dispatchEvent(event) {
    const { type, message, isTrusted } = event;
    return super.dispatchEvent(
      // avoid re-dispatching of the same event
      isTrusted ?
        assign$3(new Event(type), { message }) :
        event
    );
  }

  // IDBDatabase Forwards
  async close() {
    (await this.#db).close();
  }

  // Map async API
  get size() {
    return this.#transaction(
      store => store.count(),
      READONLY,
    ).then(result$1);
  }

  async clear() {
    await this.#transaction(
      store => store.clear(),
      READWRITE,
    );
  }

  /**
   * @param {IDBValidKey} key
   */
  async delete(key) {
    await this.#transaction(
      store => store.delete(key),
      READWRITE,
    );
  }

  /**
   * @returns {Promise<IDBMapEntry[]>}
   */
  async entries() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key).then(value => [key, value])));
  }

  /**
   * @param {(unknown, IDBValidKey, IDBMap) => void} callback
   * @param {unknown} [context]
   */
  async forEach(callback, context = this) {
    for (const [key, value] of await this.entries())
      await callback.call(context, value, key, this);
  }

  /**
   * @param {IDBValidKey} key
   * @returns {Promise<unknown | undefined>}
   */
  async get(key) {
    const value = await this.#transaction(
      store => store.get(key),
      READONLY,
    ).then(result$1);
    return value;
  }

  /**
   * @param {IDBValidKey} key
   */
  async has(key) {
    const k = await this.#transaction(
      store => store.getKey(key),
      READONLY,
    ).then(result$1);
    return k !== void 0;
  }

  async keys() {
    const keys = await this.#transaction(
      store => store.getAllKeys(),
      READONLY,
    ).then(result$1);
    return keys;
  }

  /**
   * @param {IDBValidKey} key
   * @param {unknown} value
   */
  async set(key, value) {
    await this.#transaction(
      store => store.put(value, key),
      READWRITE,
    );
    return this;
  }

  async values() {
    const keys = await this.keys();
    return Promise.all(keys.map(key => this.get(key)));
  }

  get [Symbol.toStringTag]() {
    return this.#prefix;
  }
}

class IDBMapSync extends Map {
  #map;
  #queue;
  constructor(...args) {
    super();
    this.#map = new IDBMap(...args);
    this.#queue = this.#map.entries().then(entries => {
      for (const [key, value] of entries)
        super.set(key, value);
    });
  }
  async close() {
    await this.#queue;
    await this.#map.close();
  }
  async sync() {
    await this.#queue;
  }
  clear() {
    this.#queue = this.#queue.then(() => this.#map.clear());
    return super.clear();
  }
  delete(key) {
    this.#queue = this.#queue.then(() => this.#map.delete(key));
    return super.delete(key);
  }
  set(key, value) {
    this.#queue = this.#queue.then(() => this.#map.set(key, value));
    return super.set(key, value);
  }
}

//@ts-check

/**
 * @template T
 * @typedef {{promise: Promise<T>, resolve: (value: T) => void, reject: (reason?: any) => void}} Resolvers
 */

//@ts-ignore
const withResolvers = Promise.withResolvers;

/**
 * @template T
 * @type {() => Resolvers<T>}
 */
var withResolvers$1 = withResolvers.bind(Promise);

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const workers = new Proxy(new Map, {
  get(map, name) {
    if (!map.has(name))
      map.set(name, withResolvers$1());
    return map.get(name);
  },
});

// filter out forever pending Promises in Pyodide
// @issue https://github.com/pyscript/pyscript/issues/2106
const ignore = new Set(['__dict__', 'constructor', 'get', 'has', 'includes', 'next', 'set', 'then']);

const workersHandler = new Proxy(Object.freeze({}), {
  // guard against forever pending Promises in Pyodide
  // @issue https://github.com/pyscript/pyscript/issues/2106
  get: (_, name) => (typeof name === 'string' && !ignore.has(name)) ?
    workers[name].promise.then(w => w.sync) :
    void 0,
});
/* c8 ignore stop */

let i$2 = 0;

// extras
const UNREF = i$2++;
const ASSIGN = i$2++;
const EVALUATE = i$2++;
const GATHER = i$2++;
const QUERY = i$2++;

// traps
const APPLY = i$2++;
const CONSTRUCT = i$2++;
const DEFINE_PROPERTY = i$2++;
const DELETE_PROPERTY = i$2++;
const GET = i$2++;
const GET_OWN_PROPERTY_DESCRIPTOR = i$2++;
const GET_PROTOTYPE_OF = i$2++;
const HAS = i$2++;
const IS_EXTENSIBLE = i$2++;
const OWN_KEYS = i$2++;
i$2++;
const SET$1 = i$2++;
const SET_PROTOTYPE_OF = i$2++;

const DIRECT           = 0;
const REMOTE           = 1 << 0;
const OBJECT$1           = 1 << 1;
const ARRAY$1            = 1 << 2;
const FUNCTION         = 1 << 3;
const SYMBOL$1           = 1 << 4;
const BIGINT$1           = 1 << 5;
const BUFFER$1           = 1 << 6;

const VIEW$1             = BUFFER$1 | ARRAY$1;
const REMOTE_OBJECT    = REMOTE | OBJECT$1;
const REMOTE_ARRAY     = REMOTE | ARRAY$1;
const REMOTE_FUNCTION  = REMOTE | FUNCTION;

class Never {}

const ImageData = globalThis.ImageData || /** @type {typeof ImageData} */(Never);

/** @type {Map<symbol, string>} */
const symbols = new Map(
  Reflect.ownKeys(Symbol).map(
    key => [Symbol[key], `@${String(key)}`]
  )
);

/**
 * @param {symbol} value
 * @param {string} description
 * @returns {string}
 */
const asSymbol = (value, description) => (
  description === void 0 ? '?' :
  (Symbol.keyFor(value) === void 0 ? `!${description}` : `#${description}`)
);

/**
 * Extract the value from a pair of type and value.
 * @param {string} name
 * @returns {symbol}
 */
const fromSymbol = name => {
  switch (name[0]) {
    case '@': return Symbol[name.slice(1)];
    case '#': return Symbol.for(name.slice(1));
    case '!': return Symbol(name.slice(1));
    default: return Symbol();
  }
};

/**
 * Create the name of a symbol.
 * @param {symbol} value
 * @returns {string}
 */
const toSymbol = value => symbols.get(value) || asSymbol(value, value.description);

const defineProperty$3 = Object.defineProperty;

const assign$2 = Object.assign;

const fromArray = Array.from;

const isArray$1 = Array.isArray;

const isView = ArrayBuffer.isView;

/**
 * A type/value pair.
 * @typedef {[number, any]} TypeValue
 */

/**
 * Create a type/value pair.
 * @param {number} type
 * @param {any} value
 * @returns {TypeValue}
 */
const tv = (type, value) => [type, value];

const identity = value => value;
const object = {};
/* c8 ignore stop */

/**
 * Create a function that loops through an array and applies a function to each value.
 * @param {(value:any, cache?:Map<any, any>) => any} asValue
 * @returns
 */
const loopValues = asValue => (
  /**
   * Loop through an array and apply a function to each value.
   * @param {any[]} arr
   * @param {Map} [cache]
   * @returns
   */
  (arr, cache = new Map) => {
    for (let i = 0, length = arr.length; i < length; i++)
      arr[i] = asValue(arr[i], cache);
    return arr;
  }
);

/**
 * Extract the value from a pair of type and value.
 * @param {TypeValue} pair
 * @returns {string|symbol}
 */
const fromKey = ([type, value]) => type === DIRECT ? value : fromSymbol(value);

/**
 * Associate a key with an optionally transformed value.
 * @param {string|symbol} value
 * @returns {TypeValue}
 */
const toKey = value => typeof value === 'string' ?
  tv(DIRECT, value) : tv(SYMBOL$1, toSymbol(value))
;

const MAX_ARGS = 0x7FFF;

/**
 * @param {number[]} output
 * @param {Uint8Array} value 
 */
const push = (output, value) => {
  for (let $ = output.push, i = 0, length = value.length; i < length; i += MAX_ARGS)
    $.apply(output, value.subarray(i, i + MAX_ARGS));
};

const { getPrototypeOf: getPrototypeOf$1 } = Object;
const { construct: construct$1 } = Reflect;
const { toStringTag } = Symbol;
const { toString } = object;

const toTag = (ref, name = ref[toStringTag]) =>
  name in globalThis ? name : toTag(construct$1(getPrototypeOf$1(ref.constructor),[0]));

/**
 * @param {ArrayBufferLike} value
 * @param {boolean} direct
 * @returns {BufferDetails}
 */
const toBuffer = (value, direct) => [
  direct ? value : fromArray(new Uint8Array(value)),
  //@ts-ignore
  value.resizable ? value.maxByteLength : 0
];

/**
 * @param {ArrayBufferView} value
 * @param {boolean} direct
 * @returns {ViewDetails}
 */
const toView = (value, direct) => {
  //@ts-ignore
  const { BYTES_PER_ELEMENT, byteOffset, buffer, length } = value;
  return [
    toTag(value),
    toBuffer(buffer, direct),
    byteOffset,
    length !== ((buffer.byteLength - byteOffset) / BYTES_PER_ELEMENT) ? length : 0,
  ];
};

const brackets = /\[('|")?(.+?)\1\]/g;

const keys = (target, key) => target?.[key];

/**
 * Parses the given path and returns the value at the given target.
 * @param {any} target
 * @param {string} path
 * @returns {any}
 */
var query = (target, path) => path.replace(brackets, '.$2').split('.').reduce(keys, target);

/**
 * Parses each given path and returns each value at the given target.
 * @param {any} target
 * @param  {...(string|symbol)[]} keys
 * @returns {any[]}
 */
var gather = (target, ...keys) => keys.map(asResult, target);

function asResult(key) {
  return typeof key === 'string' ? query(this, key) : this[key];
}

/**
 * @template T
 * @typedef {Object} Heap
 * @property {() => void} clear
 * @property {(ref:T) => number} id
 * @property {(id:number) => T} ref
 * @property {(id:number) => boolean} unref
 */

/**
 * Create a heap-like utility to hold references in memory.
 * @param {number} [id=0] The initial `id` which is `0` by default.
 * @param {Map<number, any>} [ids=new Map] The used map of ids to references.
 * @param {Map<any, number>} [refs=new Map] The used map of references to ids.
 * @returns {Heap<any>}
 */
var heap = (id = 0, ids = new Map, refs = new Map) => ({
  clear: () => {
    ids.clear();
    refs.clear();
  },
  id: ref => {
    let uid = refs.get(ref);
    if (uid === void 0) {
      /* c8 ignore next */
      while (ids.has(uid = id++));
      ids.set(uid, ref);
      refs.set(ref, uid);
    }
    return uid;
  },
  ref: id => ids.get(id),
  unref: id => {
    refs.delete(ids.get(id));
    return ids.delete(id);
  },
});

// import DEBUG from './utils/debug.js';


const Node = globalThis.Node || class Node {};

const {
  apply: apply$1,
  construct,
  defineProperty: defineProperty$2,
  deleteProperty,
  get: get$1,
  getOwnPropertyDescriptor,
  getPrototypeOf,
  has: has$1,
  isExtensible,
  ownKeys: ownKeys$1,
  set: set$3,
  setPrototypeOf,
} = Reflect;

/**
 * @typedef {Object} LocalOptions Optional utilities used to orchestrate local <-> remote communication.
 * @property {Function} [reflect=identity] The function used to reflect operations via the remote receiver. Currently only `apply` and `unref` are supported.
 * @property {Function} [transform=identity] The function used to transform local values into simpler references that the remote side can understand.
 * @property {Function} [remote=identity] The function used to intercept remote invokes *before* these happen. Usable to sync `events` or do other tasks.
 * @property {Function} [module] The function used to import modules when remote asks to `import(...)` something.
 * @property {boolean} [buffer=false] Optionally allows direct buffer serialization breaking JSON compatibility.
 * @property {number} [timeout=-1] Optionally allows remote values to be cached when possible for a `timeout` milliseconds value. `-1` means no timeout.
 */

/**
 * @param {LocalOptions} options
 * @returns
 */
var local = ({
  reflect = identity,
  transform = identity,
  remote = identity,
  module = name => import(name),
  buffer = false,
  timeout = -1,
} = object) => {
  // received values arrive via postMessage so are compatible
  // with the structured clone algorithm
  const fromValue = (value, cache = new Map) => {
    if (!isArray$1(value)) return value;
    const [t, v] = value;
    switch (t) {
      case OBJECT$1: {
        if (v === null) return globalThis;
        let cached = cache.get(value);
        if (!cached) {
          cached = v;
          cache.set(value, v);
          for (const k in v) v[k] = fromValue(v[k], cache);
        }
        return cached;
      }
      case ARRAY$1: {
        return cache.get(value) || (
          cache.set(value, v),
          fromValues(v, cache)
        );
      }
      case FUNCTION: {
        let wr = weakRefs.get(v), fn = wr?.deref();
        if (!fn) {
          /* c8 ignore start */
          if (wr) fr.unregister(wr);
          /* c8 ignore stop */
          fn = function (...args) {
            remote.apply(this, args);

            // values reflected asynchronously are not passed stringified
            // because it makes no sense to use Atomics and SharedArrayBuffer
            // to transfer these ... yet these must reflect the current state
            // on this local side of affairs.
            for (let i = 0, length = args.length; i < length; i++)
              args[i] = toValue(args[i]);

            const result = reflect(APPLY, v, toValue(this), args);
            return result.then(fromValue);
          };
          wr = new WeakRef(fn);
          weakRefs.set(v, wr);
          fr.register(fn, v, wr);
        }
        return fn;
      }
      case SYMBOL$1: return fromSymbol(v);
      default: return (t & REMOTE) ? ref(v) : v;
    }
  };

  // OBJECT, DIRECT, VIEW, BUFFER, REMOTE_ARRAY, REMOTE_OBJECT, REMOTE_FUNCTION, SYMBOL, BIGINT
  /**
   * Converts values into TypeValue pairs when these
   * are not JSON compatible (symbol, bigint) or
   * local (functions, arrays, objects, globalThis).
   * @param {any} value the current value
   * @returns {any} the value as is or its TypeValue counterpart
   */
  const toValue = value => {
    switch (typeof value) {
      case 'object': {
        if (value === null) break;
        if (value === globalThis) return globalTarget;
        const $ = transform(value);
        return ((hasDirect && direct.has($)) || $ instanceof ImageData) ?
          tv(DIRECT, $) : (
          isView($) ?
            tv(VIEW$1, toView($, buffer)) : (
              $ instanceof ArrayBuffer ?
                tv(BUFFER$1, toBuffer($, buffer)) :
                tv(isArray$1($) ? REMOTE_ARRAY : REMOTE_OBJECT, id($))
            )
        );
      }
      case 'function': return tv(REMOTE_FUNCTION, id(transform(value)));
      case 'symbol': return tv(SYMBOL$1, toSymbol(value));
      case 'bigint': return tv(BIGINT$1, value.toString());
    }
    return value;
  };

  const fromValues = loopValues(fromValue);
  const fromKeys = loopValues(fromKey);
  const toKeys = loopValues(toKey);

  const { clear, id, ref, unref } = heap();

  const arrayKey = /^(?:[0-9]+|length)$/;
  const memoize = -1 < timeout;
  const weakRefs = new Map;
  const globalTarget = tv(OBJECT$1, null);
  const fr = new FinalizationRegistry(v => {
    weakRefs.delete(v);
    reflect(UNREF, v);
  });

  let hasDirect = false, direct;

  return {
    assign: assign$2,
    gather,
    query,

    /**
     * Alows local references to be passed directly to the remote receiver,
     * either as copy or serliazied values (it depends on the implementation).
     * @template {WeakKey} T
     * @param {T} value
     * @returns {T}
     */
    direct(value) {
      if (!hasDirect) {
        // if (DEBUG) console.debug('DIRECT');
        hasDirect = true;
        direct = new WeakSet;
      }
      direct.add(value);
      return value;
    },

    /**
     * Provide a portable API that just invokes the given callback with the given arguments.
     * @param {Function} callback
     * @param  {...any} args
     * @returns {any}
     */
    evaluate: (callback, ...args) => apply$1(callback, null, args),

    /**
     * This callback reflects locally every remote call.
     * It accepts TypeValue pairs but it always returns a string
     * to make it possible to use Atomics and SharedArrayBuffer.
     * @param {number} method
     * @param {number?} uid
     * @param  {...any} args
     * @returns
     */
    reflect(method, uid, ...args) {
      // if (DEBUG) console.debug(method === UNREF ? 'GC' : 'ROUNDTRIP');
      const isGlobal = uid === null;
      const target = isGlobal ? globalThis : ref(uid);
      // the order is by most common use cases
      switch (method) {
        case GET: {
          const key = fromKey(args[0]);
          const asModule = isGlobal && key === 'import';
          const value = asModule ? module : get$1(target, key);
          const result = toValue(value);
          if (!memoize) return result;
          let cache = asModule, t = target, d;
          if (!asModule && !(
            // avoid caching DOM related stuff (all accessors)
            (t instanceof Node) ||
            // avoid also caching Array length or index accessors
            (isArray$1(t) && typeof key === 'string' && arrayKey.test(key))
          )) {
            // cache unknown properties but ...
            if (key in target) {
              // ... avoid caching accessors!
              while (!(d = getOwnPropertyDescriptor(t, key))) {
                t = getPrototypeOf(t);
                /* c8 ignore start */
                // this is an emergency case for "unknown" values
                if (!t) break;
                /* c8 ignore stop */
              }
              cache = !!d && 'value' in d;
            }
            // accessing non existent properties could be repeated
            // for no reason whatsoever and it gets removed once
            // the property is eventually set so ...
            else cache = true;
          }
          return [cache, result];
        }
        case APPLY: {
          const map = new Map;
          return toValue(apply$1(target, fromValue(args[0], map), fromValues(args[1], map)));
        }
        case SET$1: return set$3(target, fromKey(args[0]), fromValue(args[1]));
        case HAS: return has$1(target, fromKey(args[0]));
        case OWN_KEYS: return toKeys(ownKeys$1(target), weakRefs);
        case CONSTRUCT: return toValue(construct(target, fromValues(args[0])));
        case GET_OWN_PROPERTY_DESCRIPTOR: {
          const descriptor = getOwnPropertyDescriptor(target, fromKey(args[0]));
          if (descriptor) {
            for (const k in descriptor)
              descriptor[k] = toValue(descriptor[k]);
          }
          return descriptor;
        }
        case DEFINE_PROPERTY: return defineProperty$2(target, fromKey(args[0]), fromValue(args[1]));
        case DELETE_PROPERTY: return deleteProperty(target, fromKey(args[0]));
        case GET_PROTOTYPE_OF: return toValue(getPrototypeOf(target));
        case SET_PROTOTYPE_OF: return setPrototypeOf(target, fromValue(args[0]));
        case ASSIGN: {
          assign$2(target, fromValue(args[0]));
          return;
        }
        case EVALUATE: {
          const body = fromValue(args[0]);
          const fn = Function(`return(${body}).apply(null,arguments)`);
          return toValue(apply$1(fn, null, fromValues(args[1])));
        }
        case GATHER: {
          args = fromKeys(args[0], weakRefs);
          for (let k, i = 0, length = args.length; i < length; i++) {
            k = args[i];
            args[i] = toValue(typeof k === 'string' ? query(target, k) : target[k]);
          }
          return args;
        }
        case QUERY: return toValue(query(target, args[0]));
        case UNREF: return unref(uid);
        case IS_EXTENSIBLE: return isExtensible(target);
      }
    },

    /**
     * Terminates the local side of the communication,
     * erasing and unregistering all the cached references.
     */
    terminate() {
      for (const wr of weakRefs.values()) fr.unregister(wr);
      weakRefs.clear();
      clear();
    },
  };
};

// This is an optional utility that needs to patch `addEventListener`.
// Its `default` return value can be used as `remote` field when
// the `local({ remote: ... })` is invoked.

const { addEventListener } = EventTarget.prototype;
const eventsHandler = new WeakMap;
Reflect.defineProperty(EventTarget.prototype, 'addEventListener', {
  /**
   * Intercepts `options` with an `invoke` field that could contain
   * `preventDefault`, `stopPropagation` or `stopImmediatePropagation`
   * strings so that when the event will be triggered locally,
   * the remote side can still enforce one of those operations, even if
   * invoked asynchronously (those calls will happen on the local thread).
   * 
   * @param {string} type
   * @param {EventListenerOrEventListenerObject?} callback
   * @param  {AddEventListenerOptions & { invoke?: string|string[]} | boolean} options
   * @returns {void}
   */
  value(type, callback, options) {
    //@ts-ignore
    const invoke = options?.invoke;
    if (invoke) {
      let map = eventsHandler.get(this);
      if (!map) eventsHandler.set(this, (map = new Map));
      map.set(type, [].concat(invoke));
      //@ts-ignore
      delete options.invoke;
    }
    return addEventListener.apply(this, arguments);
  },
});

/**
 * This utility is used to perform `preventDefault` or `stopPropagation`
 * on events that are triggered via functions defined on the remote side.
 * It is meant to be passed as `remote`, or as part of `remote` field when
 * the `local({ remote: ... })` is invoked, meaning it happens right before
 * the *remote* event handler is requested to be called.
 * @param {Event} event
 */
var patchEvent = event => {
  const { currentTarget, target, type } = event;
  const methods = eventsHandler.get(currentTarget || target)?.get(type);
  if (methods) for (const method of methods) event[method]();
};

let i$1 = 0;

const FALSE = i$1++;
const TRUE = i$1++;

const UNDEFINED = i$1++;
const NULL = i$1++;

const NUMBER = i$1++;
const UI8 = i$1++;
const NAN = i$1++;
const INFINITY = i$1++;
const N_INFINITY = i$1++;
const ZERO = i$1++;
const N_ZERO = i$1++;

const BIGINT = i$1++;
const BIGUINT = i$1++;

const STRING = i$1++;

const SYMBOL = i$1++;

const ARRAY = i$1++;
const BUFFER = i$1++;
const DATE = i$1++;
const ERROR = i$1++;
const MAP = i$1++;
const OBJECT = i$1++;
const REGEXP = i$1++;
const SET = i$1++;
const VIEW = i$1++;

const IMAGE_DATA = i$1++;

const RECURSION = i$1++;

// This is an Array facade for the encoder.

class Stack {
  /**
   * @param {Stack} self
   * @param {Uint8Array} value
   */
  static push(self, value) {
    self.sync(false);
    self._(value, value.length);
  }

  /**
   * @param {ArrayBufferLike} buffer
   * @param {number} offset
   */
  constructor(buffer, offset) {
    /** @type {number[]} */
    const output = [];

    /** @private length */
    this.l = 0;

    /** @private output */
    this.o = output;

    /** @private view */
    this.v = new Uint8Array(buffer, offset);

    /** @type {typeof Array.prototype.push} */
    this.push = output.push.bind(output);
  }

  /**
   * @readonly
   * @type {number}
   */
  get length() {
    return this.l + this.o.length;
  }

  /**
   * Sync all entries in the output to the buffer.
   * @param {boolean} last `true` if it's the last sync.
   */
  sync(last) {
    const output = this.o;
    const length = output.length;
    if (length) this._(last ? output : output.splice(0), length);
  }

  /**
   * Set a value to the buffer
   * @private
   * @param {Uint8Array|number[]} value
   * @param {number} byteLength
   */
  _(value, byteLength) {
    const { buffer, byteOffset } = this.v;
    const offset = this.l;
    this.l += byteLength;
    byteLength += byteOffset + offset;
    if (buffer.byteLength < byteLength)
      /** @type {SharedArrayBuffer} */(buffer).grow(byteLength);
    this.v.set(value, offset);
  }
}

const decoder$1 = new TextDecoder;

const encoder$1 = new TextEncoder;

const buffer = new ArrayBuffer(8);
const dv = new DataView(buffer);
const u8a8 = new Uint8Array(buffer);

//@ts-check


/** @typedef {Map<number, number[]>} Cache */

const { isNaN, isFinite, isInteger } = Number;
const { ownKeys } = Reflect;
const { is } = Object;

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 * @returns {boolean}
 */
const process = (input, output, cache) => {
  const value = cache.get(input);
  const unknown = !value;
  if (unknown) {
    dv.setUint32(0, output.length, true);
    cache.set(input, [u8a8[0], u8a8[1], u8a8[2], u8a8[3]]);
  }
  else
    output.push(RECURSION, value[0], value[1], value[2], value[3]);
  return unknown;
};

/**
 * @param {number[]|Stack} output
 * @param {number} type
 * @param {number} length
 */
const set$2 = (output, type, length) => {
  dv.setUint32(0, length, true);
  output.push(type, u8a8[0], u8a8[1], u8a8[2], u8a8[3]);
};

/**
 * @param {any} input
 * @param {number[]|Stack} output
 * @param {Cache} cache
 */
const inflate = (input, output, cache) => {
  switch (typeof input) {
    case 'number': {
      if (input && isFinite(input)) {
        if (isInteger(input) && input < 256 && -1 < input)
          output.push(UI8, input);
        else {
          dv.setFloat64(0, input, true);
          output.push(NUMBER, u8a8[0], u8a8[1], u8a8[2], u8a8[3], u8a8[4], u8a8[5], u8a8[6], u8a8[7]);
        }
      }
      else if (isNaN(input)) output.push(NAN);
      else if (!input) output.push(is(input, 0) ? ZERO : N_ZERO);
      else output.push(input < 0 ? N_INFINITY : INFINITY);
      break;
    }
    case 'object': {
      switch (true) {
        case input === null:
          output.push(NULL);
          break;
        case !process(input, output, cache): break;
        case isArray$1(input): {
          const length = input.length;
          set$2(output, ARRAY, length);
          for (let i = 0; i < length; i++)
            inflate(input[i], output, cache);
          break;
        }
        case isView(input): {
          output.push(VIEW);
          inflate(toTag(input), output, cache);
          input = input.buffer;
          if (!process(input, output, cache)) break;
          // fallthrough
        }
        case input instanceof ArrayBuffer: {
          const ui8a = new Uint8Array(input);
          set$2(output, BUFFER, ui8a.length);
          //@ts-ignore
          pushView(output, ui8a);
          break;
        }
        case input instanceof Date:
          output.push(DATE);
          inflate(input.getTime(), output, cache);
          break;
        case input instanceof Map: {
          set$2(output, MAP, input.size);
          for (const [key, value] of input) {
            inflate(key, output, cache);
            inflate(value, output, cache);
          }
          break;
        }
        case input instanceof Set: {
          set$2(output, SET, input.size);
          for (const value of input)
            inflate(value, output, cache);
          break;
        }
        case input instanceof Error:
          output.push(ERROR);
          inflate(input.name, output, cache);
          inflate(input.message, output, cache);
          inflate(input.stack, output, cache);
          break;
        /* c8 ignore start */
        case input instanceof ImageData:
          output.push(IMAGE_DATA);
          inflate(input.data, output, cache);
          inflate(input.width, output, cache);
          inflate(input.height, output, cache);
          inflate(input.colorSpace, output, cache);
          //@ts-ignore
          inflate(input.pixelFormat, output, cache);
          break;
        /* c8 ignore stop */
        case input instanceof RegExp:
          output.push(REGEXP);
          inflate(input.source, output, cache);
          inflate(input.flags, output, cache);
          break;
        default: {
          if ('toJSON' in input) {
            const json = input.toJSON();
            inflate(json === input ? null : json, output, cache);
          }
          else {
            const keys = ownKeys(input);
            const length = keys.length;
            set$2(output, OBJECT, length);
            for (let i = 0; i < length; i++) {
              const key = keys[i];
              inflate(key, output, cache);
              inflate(input[key], output, cache);
            }
          }
          break;
        }
      }
      break;
    }
    case 'string': {
      if (process(input, output, cache)) {
        const encoded = encoder$1.encode(input);
        set$2(output, STRING, encoded.length);
        //@ts-ignore
        pushView(output, encoded);
      }
      break;
    }
    case 'boolean': {
      output.push(input ? TRUE : FALSE);
      break;
    }
    case 'symbol': {
      output.push(SYMBOL);
      inflate(toSymbol(input), output, cache);
      break;
    }
    case 'bigint': {
      let type = BIGINT;
      if (9223372036854775807n < input) {
        dv.setBigUint64(0, input, true);
        type = BIGUINT;
      }
      else dv.setBigInt64(0, input, true);
      output.push(type, u8a8[0], u8a8[1], u8a8[2], u8a8[3], u8a8[4], u8a8[5], u8a8[6], u8a8[7]);
      break;
    }
    // this covers functions too
    default: {
      output.push(UNDEFINED);
      break;
    }
  }
};

/** @type {typeof push|typeof Stack.push} */
let pushView = push;

/**
 * @param {any} value
 * @returns {number[]}
 */
const encode = value => {
  const output = [];
  pushView = push;
  inflate(value, output, new Map);
  return output;
};

/**
 * @param {{ byteOffset?: number, Array?: typeof Stack }} [options]
 * @returns {(value: any, buffer: ArrayBufferLike) => number}
 */
const encoder = ({ byteOffset = 0, Array = Stack } = {}) => (value, buffer) => {
  const output = new Array(buffer, byteOffset);
  pushView = Array.push;
  inflate(value, output, new Map);
  const length = output.length;
  output.sync(true);
  return length;
};

// ⚠️ AUTOMATICALLY GENERATED - DO NOT CHANGE
const CHANNEL = 'dbf1617e';
const MAIN = '=' + CHANNEL;
const WORKER = '-' + CHANNEL;

//@ts-check


/**
 * @template V
 * @callback Resolve
 * @param {V?} [value]
 * @returns {void}
 */

/**
 * @callback Reject
 * @param {any?} [error]
 * @returns {void}
 */

/**
 * @template V
 * @typedef {object} Resolvers
 * @prop {Promise<V>} promise
 * @prop {Resolve<V>} resolve
 * @prop {Reject} reject
 */

/**
 * @template K,V
 * @typedef {() => [K, Promise<V>]} Next
 */

/**
 * @template K,V
 * @callback Resolver
 * @param {K} uid
 * @param {V?} [value]
 * @param {any?} [error]
 */

/**
 * @template K,V
 * @typedef {[Next<K,V>, Resolver<K,V>]} NextResolver
 */

/**
 * @template K,V
 * @param {(id: number) => K} [as]
 * @returns
 */
var nextResolver = (as = (id => /** @type {K} */(id))) => {
  /** @type {Map<K,Resolvers<V>>} */
  const map = new Map;
  let id = 0;
  return /** @type {NextResolver<K,V>} */([
    /** @type {Next<K,V>} */
    () => {
      let uid;
      do { uid = as(id++); }
      while (map.has(uid));
      const wr = /** @type {Resolvers<V>} */(/** @type {unknown} */(withResolvers$1()));
      map.set(uid, wr);
      return [uid, wr.promise];
    },
    /** @type {Resolver<K,V>} */
    (uid, value, error) => {
      const wr = map.get(uid);
      map.delete(uid);
      if (error) wr?.reject(error);
      else wr?.resolve(value);
    },
  ]);
};

//@ts-check

/** @type {ArrayBuffer[]} */
const nothing = [];

/** @type {WeakSet<ArrayBuffer[]>} */
const buffers = new WeakSet;

/**
 * @param {boolean} check
 * @param {any[]} args
 * @returns
 */
const get = (check, args) => {
  let transfer = nothing;
  if (check && buffers.has(args.at(-1) || nothing)) {
    transfer = args.pop();
    buffers.delete(transfer);
  }
  return transfer;
};

/**
 * @param  {...ArrayBuffer} args
 * @returns
 */
const set$1 = (...args) => {
  buffers.add(args);
  return args;
};

// ⚠️ AUTOMATED ⚠️
var BROADCAST_CHANNEL_UID = 'dc78209b-186c-4f83-80e9-406becb7d9f3';

//@ts-check

let { SharedArrayBuffer: SAB } = globalThis, native = true;

try {
  //@ts-ignore due valid options not recognized
  new SAB(4, { maxByteLength: 8 });
}
catch (_) {
  native = false;
  SAB = /** @type {SharedArrayBufferConstructor} */(
    /** @type {unknown} */(
      class SharedArrayBuffer extends ArrayBuffer {
        get growable() {
          //@ts-ignore due valid property not recognized
          return super.resizable;
        }
        /** @param {number} newLength */
        grow(newLength) {
          //@ts-ignore due valid method not recognized
          super.resize(newLength);
        }
      }
    )
  );
}

const {
  assign: assign$1,
  create: create$1,
} = Object;

/* c8 ignore start */
const ID = `coincident-${native ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
/* c8 ignore end */

const byteOffset = 2 * Int32Array.BYTES_PER_ELEMENT;

const defaults = {
  // ⚠️ mandatory: first int32 to notify, second one to store the written length
  byteOffset,
};

const result = async (data, proxied, transform) => {
  try {
    const result = await proxied[data[1]].apply(null, data[2]);
    data[1] = transform ? transform(result) : result;
    data[2] = null;
  }
  catch (error) { data[2] = error; }
};

const set = (proxied, name, callback) => {
  const ok = name !== 'then';
  if (ok) proxied[name] = callback;
  return ok;
};

/** @param {Event} event */
const stop = event => {
  event.stopImmediatePropagation();
  event.preventDefault();
};

const ffi_timeout = (options, fallback = -1) => (
  options?.reflected_ffi_timeout ?? fallback
);

const { defineProperty: defineProperty$1 } = Object;

const [next, resolve$2] = nextResolver();
let [bootstrap, promise] = next();

/**
 * @callback sabayon
 * @param {string|URL} [serviceWorkerURL] - The URL of the service worker to register on the main thread.
 * @returns {Promise<void>} - A promise that resolves when the polyfill is ready.
 */

let register$1 = /** @type {sabayon} */(() => promise);

let {
  Atomics: Atomics$1,
  MessageChannel: MessageChannel$1,
  Worker: Worker$1} = globalThis;

if (native) resolve$2(bootstrap);
else {

  const views = new Map;

  const addListener = (target, ...args) => {
    target.addEventListener(...args);
  };

  // Web Worker
  if ('importScripts' in globalThis) {

    addListener(
      globalThis,
      'message',
      event => {
        stop(event);
        resolve$2(bootstrap, event.data);
      },
      { once: true }
    );

    // <Atomics Patch>
    const { wait } = Atomics$1;
    const { parse } = JSON;

    const Request = view => {
      const xhr = new XMLHttpRequest;
      try {
        xhr.timeout = 3e3;
        xhr.open('POST', `${SW}?sabayon`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(`["${UID}",${views.get(view)}]`);
        if (xhr.status === 200) return xhr;
        throw xhr;
      }
      catch {
        xhr.abort();
        return Request(view);
      }
    };

    const Response = (view, xhr) => {
      view.set(parse(xhr.responseText));
      return 'ok';
    };

    Atomics$1 = {
      wait: (view, ..._) => views.has(view) ?
        Response(view, Request(view)) :
        wait(view, ..._)
      ,
    };

    let UID, SW;

    promise = promise.then(data => {
      [UID, SW] = data;
    });
  }
  // Main
  else {
    const UID = [ID, Math.random()].join('-').replace(/\W/g, '-');

    const bc = new BroadcastChannel(BROADCAST_CHANNEL_UID);
    bc.onmessage = async event => {
      const [swid, wid, vid] = event.data;
      if (wid === UID) {
        for (const [view, [id, wr]] of views) {
          if (id === vid) {
            await wr.promise;
            let length = view.length;
            while (length-- && !view[length]);
            bc.postMessage([swid, view.slice(0, length + 1)]);
            break;
          }
        }
      }
    };

    const intercept = event => {
      const [id, view, value] = event.data;
      views.set(view, [id, withResolvers$1()]);
      defineProperty$1(event, 'data', { value });
    };

    MessageChannel$1 = class extends MessageChannel$1 {
      constructor() {
        super();
        addListener(this.port1, 'message', intercept);
      }
    };

    Worker$1 = class extends Worker$1 {
      /**
       * @param {string | URL} scriptURL 
       * @param {WorkerOptions} options 
       */
      constructor(scriptURL, options) {
        super(scriptURL, options);
        super.postMessage([UID, SW]);
      }
    };

    const { notify } = Atomics$1;
    Atomics$1 = {
      notify(view, ..._) {
        const details = views.get(view);
        if (details) {
          details[1].resolve();
          return 0;
        }
        // this will throw with a proper error
        return notify(view, ..._);
      },
    };

    let SW = '';
    let serviceWorker = null;

    /**
     * @param {ServiceWorkerContainer} swc
     * @param {RegistrationOptions} [options]
     */
    const activate = (swc, options) => {
      let w, c = true;
      swc.getRegistration(SW)
        .then(r => (r ?? swc.register(SW, options)))
        .then(function ready(r) {
          const { controller } = swc;
          c = c && !!controller;
          w = (r.installing || r.waiting || r.active);
          if (w.state === 'activated') {
            if (c) {
              // allow ServiceWorker swap on different URL
              if (controller.scriptURL === SW)
                return resolve$2(bootstrap);
              r.unregister();
            }
            location.reload();
          }
          else {
            addListener(w, 'statechange', () => ready(r), { once: true });
          }
        });
    };

    register$1 = /** @type {sabayon} */((serviceWorkerURL, options) => {
      if (!serviceWorker) {
        // resolve the fully qualified URL for Blob based workers
        const sw = new URL(serviceWorkerURL, location.href);
        SW = `${sw.protocol}//${sw.host}${sw.pathname}`;
        activate(navigator.serviceWorker, options);
        serviceWorker = promise;
      }
      return serviceWorker;
    });
  }
}

// @bug https://bugzilla.mozilla.org/show_bug.cgi?id=1956778
// Note: InstallTrigger is deprecated so once it's gone I do hope
//       this workaround would be gone too!
const UID = 'InstallTrigger' in globalThis ? ID : '';

const Number$1 = value => value;

const info = name => {
  if (name === MAIN) return 'main';
  if (name === WORKER) return 'worker';
  return name;
};

// @bug https://bugzilla.mozilla.org/show_bug.cgi?id=1956778
class MessageEvent extends Event {
  #data;
  constructor(data) {
    super('message');
    this.#data = data;
  }
  get data() {
    return this.#data;
  }
}

var coincident$1 = options => {
  const transform = options?.transform;
  const timeout = ffi_timeout(options);
  const encode = (options?.encoder || encoder)(defaults);
  const checkTransferred = options?.transfer !== false;

  /** @type {Worker & { proxy: Record<string, function> }} */
  class Worker extends Worker$1 {
    constructor(url, options) {
      const serviceWorker = native ? '' : (options?.serviceWorker || '');
      const { notify } = (serviceWorker ? Atomics$1 : Atomics);
      const { port1: channel, port2 } = new (
        serviceWorker ? MessageChannel$1 : MessageChannel
      );
      const [ next, resolve ] = nextResolver(Number$1);
      const callbacks = new Map;
      const proxied = create$1(null);

      if (serviceWorker) register$1(serviceWorker);

      let resolving = '';

      const deadlock = (promise, name) => {
        if (resolving) {
          const t = setTimeout(
            console.warn,
            3e3,
            `💀🔒 - is proxy.${info(resolving)}() awaiting proxy.${info(name)}() ?`
          );
          promise = promise.then(
            result => {
              clearTimeout(t);
              return result;
            },
            error => {
              clearTimeout(t);
              return Promise.reject(error);
            },
          );
        }
        return promise;
      };

      super(url, assign$1({ type: 'module' }, options));

      this.proxy = new Proxy(proxied, {
        get: (_, name) => {
          // the curse of potentially awaiting proxies in the wild
          // requires this ugly guard around `then`
          if (name === 'then') return;
          let cb = callbacks.get(name);
          if (!cb) {
            callbacks.set(name, cb = (...args) => {
              const transfer = get(checkTransferred, args);
              const [uid, promise] = next();
              channel.postMessage(
                [uid, name, transform ? args.map(transform) : args],
                transfer
              );
              return deadlock(promise, name);
            });
          }
          return cb;
        },
        set
      });

      // @bug https://bugzilla.mozilla.org/show_bug.cgi?id=1956778
      if (UID && (native || serviceWorker)) {
        super.addEventListener('message', event => {
          const { data } = event;
          if (data?.ID === UID) {
            stop(event);
            channel.dispatchEvent(new MessageEvent(data.data));
          }
        });
      }

      super.postMessage([UID, serviceWorker, ffi_timeout(options, timeout)], [port2]);

      channel.addEventListener('message', async ({ data }) => {
        const i32 = data[0];
        const type = typeof i32;
        if (type === 'number')
          resolve.apply(null, data);
        else {
          resolving = data[1];
          await result(data, proxied, transform);
          resolving = '';
          if (type === 'string')
            channel.postMessage(data);
          else {
            const result = data[2] || data[1];
            // at index 1 we store the written length or 0, if undefined
            i32[1] = result === void 0 ? 0 : encode(result, i32.buffer);
            // at index 0 we set the SharedArrayBuffer as ready
            i32[0] = 1;
            notify(i32, 0);
          }
        }
      });

      channel.start();
    }
  }

  return {
    Worker,
    native,
    transfer: set$1,
  };
};

var coincident = options => {
  const esm = options?.import;
  const timeout = ffi_timeout(options);
  const exports = coincident$1({
    ...options,
    encoder: options?.encoder || encoder,
  });

  /** @type {Worker & { proxy: Record<string, function> }} */
  class Worker extends exports.Worker {
    #terminate;

    constructor(url, options) {
      const { proxy } = super(url, options);
      const ffi = local({
        ...options,
        buffer: true,
        reflect: proxy[WORKER],
        timeout: ffi_timeout(options, timeout),
        remote(event) { if (event instanceof Event) patchEvent(event); },
        module: options?.import || esm || (name => import(new URL(name, location).href)),
      });

      this.#terminate = ffi.terminate;

      this.ffi = {  
        assign: ffi.assign,
        direct: ffi.direct,
        evaluate: ffi.evaluate,
        gather: ffi.gather,
        query: ffi.query,
      };

      proxy[MAIN] = ffi.reflect;
    }

    terminate() {
      this.#terminate();
      super.terminate();
    }
  }

  return { ...exports, Worker };
};

/* c8 ignore start */
const js_modules$1 = Symbol.for('polyscript.js_modules');
let transform$1;
const { Worker } = coincident({ transfer: false, transform: value => (transform$1 || (transform$1 = globalThis[js_modules$1]?.get("-T-")))?.(value) ?? value });
var xworker$1 = (...args) => new Worker('/dist/_template.js', ...args);
/* c8 ignore stop */

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const io = new WeakMap();
const stdio = (init) => {
    const context = init || console;
    const localIO = {
        // allow plugins or other io manipulating logic to reuse
        // the buffered utility exposed in here (see py-editor)
        buffered,
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

const decoder = new TextDecoder();
const buffered = (callback, EOL = 10) => {
    const buffer = [];
    return (maybeUI8) => {
        if (maybeUI8 instanceof Uint8Array) {
            for (const c of maybeUI8) {
                if (c === EOL)
                    callback(decoder.decode(new Uint8Array(buffer.splice(0))));
                else
                    buffer.push(c);
            }
        }
        // if io.stderr(error) is passed instead
        // or any io.stdout("thing") this should
        // still work as expected
        else {
            callback(maybeUI8);
        }
    };
};
/* c8 ignore stop */

const registry$2 = new Map;

const type$5 = 'dummy';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const require = name => registry$2.get(name);

const run$2 = (interpreter, code) => {
    try {
        return Function('require', code)(require);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

var dummy = {
    type: type$5,
    module: () => 'data:text/javascript,',
    engine: module => stdio().get(module),
    registerJSModule(_, name, value) {
        registry$2.set(name, value);
    },
    run: run$2,
    runAsync: run$2,
    runEvent: async (interpreter, code, event) => {
        try {
            await Function('require', 'e', `return ${code}(e)`)(require, event);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    transform: (_, value) => value,
    writeFile() {},
};

function content (t) {
  for (var s = t[0], i = 1, l = arguments.length; i < l; i++)
    s += arguments[i] + t[i];
  return s;
}

const dedent$1 = {
  object(...args) {
    return this.string(content(...args));
  },
  string(content) {
    for (const line of content.split(/[\r\n]+/)) {
      // skip initial empty lines
      if (line.trim().length) {
        // trap indentation at the very first line of code
        if (/^(\s+)/.test(line))
          content = content.replace(new RegExp('^' + RegExp.$1, 'gm'), '');
        // no indentation? all good: get out of here!
        break;
      }
    }
    return content;
  }
};

/**
 * Usable both as template literal tag or just as callback for strings, removes all spaces found
 * at the very first line of code encountered while sanitizing, keeping everything else around.
 * @param {string | TemplateStringsArray} tpl either code as string or as template, when used as tag
 * @param  {...any} values the template interpolations, when used as tag
 * @returns {string} code without undesired indentation
 */
const codedent = (tpl, ...values) => dedent$1[typeof tpl](tpl, ...values);

/**
 * Copyright (C) 2017-present by Andrea Giammarchi - @WebReflection
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const {replace} = '';

// escape
const es = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34);/g;


// unescape
const unes = {
  '&amp;': '&',
  '&#38;': '&',
  '&lt;': '<',
  '&#60;': '<',
  '&gt;': '>',
  '&#62;': '>',
  '&apos;': "'",
  '&#39;': "'",
  '&quot;': '"',
  '&#34;': '"'
};
const cape = m => unes[m];

/**
 * Safely unescape previously escaped entities such as `&`, `<`, `>`, `"`,
 * and `'`.
 * @param {string} un a previously escaped string
 * @returns {string} the unescaped input, and it **throws** an error if
 *  the input type is unexpected, except for boolean and numbers,
 *  converted as string.
 */
const unescape$1 = un => replace.call(un, es, cape);

/** @type {(tpl: string | TemplateStringsArray, ...values:any[]) => string} */
const dedent = codedent;

/** @type {(value:string) => string} */
const unescape = unescape$1;

const { isArray } = Array;

const { assign, create, defineProperties, defineProperty, entries } = Object;

const { all, resolve: resolve$1 } = new Proxy(Promise, {
    get: ($, name) => $[name].bind($),
});

const absoluteURL = (path, base = location.href) =>
    new URL(path, base.replace(/^blob:/, '')).href;

function fixedRelative(path) {
    return path.startsWith('.') ? absoluteURL(path, this) : path;
}

/* c8 ignore start */
let id = 0;
const nodeInfo = (node, type) => ({
    id: node.id || (node.id = `${type}-w${id++}`),
    tag: node.tagName
});

/**
 * Notify the main thread about element "readiness".
 * @param {HTMLScriptElement | HTMLElement} target the script or custom-type element
 * @param {string} type the custom/type as event prefix
 * @param {string} what the kind of event to dispatch, i.e. `ready` or `done`
 * @param {boolean} [worker = false] `true` if dispatched form a worker, `false` by default if in main
 * @param {globalThis.CustomEvent} [CustomEvent = globalThis.CustomEvent] the `CustomEvent` to use
 */
const dispatch = (target, type, what, worker = false, CE = CustomEvent) => {
    target.dispatchEvent(
        new CE(`${type}:${what}`, {
            bubbles: true,
            detail: { worker },
        })
    );
};

const createResolved = (module, type, config, interpreter) => ({
    type,
    config,
    interpreter,
    io: io.get(interpreter),
    run: (code, ...args) => module.run(interpreter, code, ...args),
    runAsync: (code, ...args) => module.runAsync(interpreter, code, ...args),
    runEvent: (...args) => module.runEvent(interpreter, ...args),
});

const dropLine0 = code => code.replace(/^(?:\n|\r\n)/, '');

const createOverload = (module, name, before, after) => {
    const method = module[name].bind(module);
    module[name] = name === 'run' ?
        // patch the sync method
        (interpreter, code, ...args) => {
            if (before) method(interpreter, before, ...args);
            const result = method(interpreter, dropLine0(code), ...args);
            if (after) method(interpreter, after, ...args);
            return result;
        } :
        // patch the async one
        async (interpreter, code, ...args) => {
            if (before) await method(interpreter, before, ...args);
            const result = await method(interpreter, dropLine0(code), ...args);
            if (after) await method(interpreter, after, ...args);
            return result;
        };
};

const js_modules = Symbol.for('polyscript.js_modules');

const jsModules = new Map;
defineProperty(globalThis, js_modules, { value: jsModules });

const JSModules = new Proxy(jsModules, {
    get: (map, name) => map.get(name),
    has: (map, name) => map.has(name),
    ownKeys: map => [...map.keys()],
});

const has = (_, field) => !field.startsWith('_');

const proxy = (modules, name) => new Proxy(
    modules,
    { has, get: (modules, field) => modules[name][field] }
);

const registerJSModules = (type, module, interpreter, modules) => {
    // Pyodide resolves JS modules magically
    if (type === 'pyodide') return;

    // other runtimes need this pretty ugly dance (it works though)
    const jsModules = 'polyscript.js_modules';
    for (const name of Reflect.ownKeys(modules))
        module.registerJSModule(interpreter, `${jsModules}.${name}`, proxy(modules, name));
    module.registerJSModule(interpreter, jsModules, modules);
};

const importJS = (source, name) => import(source).then(esm => {
    jsModules.set(name, { ...esm });
});

const importCSS = href => new Promise((onload, onerror) => {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
        onload();
    }
    else {
        document.head.append(
            assign(
                document.createElement('link'),
                { rel: 'stylesheet', href, onload, onerror },
            )
        );
    }
});

const isCSS = source => /\.css$/i.test(new URL(source).pathname);

const isSync = element =>
    /^(?:false|0|no)$/i.test(element.getAttribute('async'));

const RUNNING_IN_WORKER = !globalThis.window;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */

// This should be the only helper needed for all Emscripten based FS exports
const writeFile = ({ FS, PATH, PATH_FS }, path, buffer) => {
    const absPath = PATH_FS.resolve(path);
    const dirPath = PATH.dirname(absPath);
    if (FS.mkdirTree) FS.mkdirTree(dirPath);
    else mkdirTree(FS, dirPath);
    return FS.writeFile(absPath, new Uint8Array(buffer), {
        canOwn: true,
    });
};

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
        if (branch === '.' || branch === '..') continue;
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

const fetchBuffer = (url, baseURL) =>
    fetch$1(absoluteURL(url, baseURL)).arrayBuffer();

const fetchPaths = (module, interpreter, config_fetch, baseURL) =>
    all(
        calculateFetchPaths(config_fetch).map(({ url, path }) =>
            fetchBuffer(url, baseURL)
                .then((buffer) => module.writeFile(interpreter, path, buffer)),
        ),
    );

    const fillName = (source, dest) => dest.endsWith('/') ?
                        `${dest}${source.split('/').pop()}` : dest;

const parseTemplate = (src, map) => src.replace(
  /\{.+?\}/g,
  k => {
    if (!map.has(k))
      throw new SyntaxError(`Invalid template: ${k}`);
    return map.get(k);
  }
);

const calculateFilesPaths = files => {
  const map = new Map;
  const targets = new Set;
  const sourceDest = [];
  for (const [source, dest] of entries(files)) {
    if (/^\{.+\}$/.test(source)) {
      if (map.has(source))
        throw new SyntaxError(`Duplicated template: ${source}`);
      map.set(source, parseTemplate(dest, map));
    }
    else {
      const url = parseTemplate(source, map);
      const path = fillName(url, parseTemplate(dest || './', map));
      if (targets.has(path) && !path.endsWith('/*'))
        throw new SyntaxError(`Duplicated destination: ${path}`);
      targets.add(path);
      sourceDest.push({ url, path });
    }
  }
  return sourceDest;
};

const fetchFiles = (module, interpreter, config_files, baseURL) =>
    all(
        calculateFilesPaths(config_files).map(({ url, path }) =>
            fetchBuffer(url, baseURL)
                .then((buffer) => module.writeFile(
                    interpreter,
                    path,
                    buffer,
                    url,
                )),
        ),
    );

const fetchJSModules = ({ main, worker }, baseURL) => {
    const promises = [];
    if (worker && RUNNING_IN_WORKER) {
        for (let [source, name] of entries(worker)) {
            source = absoluteURL(source, baseURL);
            promises.push(importJS(source, name));
        }
    }
    if (main && !RUNNING_IN_WORKER) {
        for (let [source, name] of entries(main)) {
            source = absoluteURL(source, baseURL);
            if (isCSS(source)) importCSS(source);
            else promises.push(importJS(source, name));
        }
    }
    return all(promises);
};

const createProgress = prefix => detail => {
    dispatchEvent(new CustomEvent(`${prefix}:progress`, { detail }));
};
/* c8 ignore stop */

//@ts-check


/** @typedef {Map<number, any>} Cache */

/**
 * @param {Cache} cache
 * @param {number} index
 * @param {any} value
 * @returns {any}
 */
const $ = (cache, index, value) => {
  cache.set(index, value);
  return value;
};

/**
 * @param {Uint8Array} input
 */
const number = input => {
  u8a8[0] = input[i++];
  u8a8[1] = input[i++];
  u8a8[2] = input[i++];
  u8a8[3] = input[i++];
  u8a8[4] = input[i++];
  u8a8[5] = input[i++];
  u8a8[6] = input[i++];
  u8a8[7] = input[i++];
};

/**
 * @param {Uint8Array} input
 * @returns {number}
 */
const size = input => {
  u8a8[0] = input[i++];
  u8a8[1] = input[i++];
  u8a8[2] = input[i++];
  u8a8[3] = input[i++];
  return dv.getUint32(0, true);
};

/**
 * @param {Uint8Array} input
 * @param {Cache} cache
 * @returns {any}
 */
const deflate = (input, cache) => {
  switch (input[i++]) {
    case NUMBER: {
      number(input);
      return dv.getFloat64(0, true);
    }
    case UI8: return input[i++];
    case OBJECT: {
      const object = $(cache, i - 1, {});
      for (let j = 0, length = size(input); j < length; j++)
        object[deflate(input, cache)] = deflate(input, cache);
      return object;
    }
    case ARRAY: {
      const array = $(cache, i - 1, []);
      for (let j = 0, length = size(input); j < length; j++)
        array.push(deflate(input, cache));
      return array;
    }
    case VIEW: {
      const index = i - 1;
      const name = deflate(input, cache);
      return $(cache, index, new globalThis[name](deflate(input, cache)));
    }
    case BUFFER: {
      const index = i - 1;
      const length = size(input);
      return $(cache, index, input.slice(i, i += length).buffer);
    }
    case STRING: {
      const index = i - 1;
      const length = size(input);
      // this could be a subarray but it's not supported on the Web and
      // it wouldn't work with arrays instead of typed arrays.
      return $(cache, index, decoder$1.decode(input.slice(i, i += length)));
    }
    case DATE: {
      return $(cache, i - 1, new Date(deflate(input, cache)));
    }
    case MAP: {
      const map = $(cache, i - 1, new Map);
      for (let j = 0, length = size(input); j < length; j++)
        map.set(deflate(input, cache), deflate(input, cache));
      return map;
    }
    case SET: {
      const set = $(cache, i - 1, new Set);
      for (let j = 0, length = size(input); j < length; j++)
        set.add(deflate(input, cache));
      return set;
    }
    case ERROR: {
      const name = deflate(input, cache);
      const message = deflate(input, cache);
      const stack = deflate(input, cache);
      const Class = globalThis[name] || Error;
      const error = new Class(message);
      return $(cache, i - 1, defineProperty$3(error, 'stack', { value: stack }));
    }
    /* c8 ignore start */
    case IMAGE_DATA: {
      const data = deflate(input, cache);
      const width = deflate(input, cache);
      const height = deflate(input, cache);
      const colorSpace = deflate(input, cache);
      const pixelFormat = deflate(input, cache);
      const settings = { colorSpace, pixelFormat };
      return $(cache, i - 1, new ImageData(data, width, height, settings));
    }
    /* c8 ignore stop */
    case REGEXP: {
      const source = deflate(input, cache);
      const flags = deflate(input, cache);
      return $(cache, i - 1, new RegExp(source, flags));
    }
    case FALSE: return false;
    case TRUE: return true;
    case NAN: return NaN;
    case INFINITY: return Infinity;
    case N_INFINITY: return -Infinity;
    case ZERO: return 0;
    case N_ZERO: return -0;
    case NULL: return null;
    case BIGINT: return (number(input), dv.getBigInt64(0, true));
    case BIGUINT: return (number(input), dv.getBigUint64(0, true));
    case SYMBOL: return fromSymbol(deflate(input, cache));
    case RECURSION: return cache.get(size(input));
    // this covers functions too
    default: return undefined;
  }
};

let i = 0;

/**
 * @param {Uint8Array} value
 * @returns {any}
 */
const decode = value => {
  i = 0;
  return deflate(value, new Map);
};

const JSON$1 = { parse: decode, stringify: encode };

const loader = new WeakMap();

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const loadProgress = async (self, progress, interpreter, config, baseURL) => {
    if (config.files) {
        progress('Loading files');
        await fetchFiles(self, interpreter, config.files, baseURL);
        progress('Loaded files');
    }
    if (config.fetch) {
        progress('Loading fetch');
        await fetchPaths(self, interpreter, config.fetch, baseURL);
        progress('Loaded fetch');
    }
    if (config.js_modules) {
        progress('Loading JS modules');
        await fetchJSModules(config.js_modules, baseURL);
        progress('Loaded JS modules');
    }
};

const registerJSModule = (interpreter, name, value) => {
    if (name === 'polyscript') {
        value.lazy_py_modules = async (...packages) => {
            await loader.get(interpreter)(packages);
            return packages.map(name => interpreter.pyimport(name));
        };
        value.storage = async (name) => {
            const storage = new IDBMapSync(name);
            await storage.sync();
            return storage;
        };
        value.JSON = JSON$1;
    }
    interpreter.registerJsModule(name, value);
};

const getFormat = (path, url) => {
    if (path.endsWith('/*')) {
        if (/\.(zip|whl|tgz|tar(?:\.gz)?)$/.test(url))
            return RegExp.$1;
        throw new Error(`Unsupported archive ${url}`);
    }
    return '';
};

const run$1 = (interpreter, code, ...args) => {
    try {
        return interpreter.runPython(dedent(code), ...args);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

const runAsync = async (interpreter, code, ...args) => {
    try {
        return await interpreter.runPythonAsync(dedent(code), ...args);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

const runEvent = async (interpreter, code, event) => {
    // allows method(event) as well as namespace.method(event)
    // it does not allow fancy brackets names for now
    const [name, ...keys] = code.split('.');
    let target = interpreter.globals.get(name);
    let context;
    for (const key of keys) [context, target] = [target, target[key]];
    try {
        await target.call(context, event);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};
/* c8 ignore stop */

// ⚠️ DO NOT MODIFY - SOURCE FILE: "../../python/mip.py"
var mip = new TextEncoder().encode("_F='github:'\n_E='user-agent'\n_D=True\n_C=False\n_B='/'\n_A=None\nfrom uio import StringIO\nimport sys\nclass Response:\n\tdef __init__(A,f):A.raw=f;A.encoding='utf-8';A._cached=_A\n\tdef close(A):\n\t\tif A.raw:A.raw.close();A.raw=_A\n\t\tA._cached=_A\n\t@property\n\tdef content(self):\n\t\tA=self\n\t\tif A._cached is _A:\n\t\t\ttry:A._cached=A.raw.read()\n\t\t\tfinally:A.raw.close();A.raw=_A\n\t\treturn A._cached\n\t@property\n\tdef text(self):return str(self.content,self.encoding)\n\tdef json(A):import ujson;return ujson.loads(A.content)\nHEADERS_TO_IGNORE=_E,\ntry:import js\nexcept Exception as err:raise OSError('This version of urequests can only be used in the browser')\nHEADERS_TO_IGNORE=_E,\ndef request(method,url,data=_A,json=_A,headers={},stream=_A,auth=_A,timeout=_A,parse_headers=_D):\n\tE=timeout;D=method;C=data;from js import XMLHttpRequest as G;A=G.new();A.withCredentials=_C\n\tif auth is not _A:import ubinascii;H,I=auth;A.open(D,url,_C,H,I)\n\telse:A.open(D,url,_C)\n\tfor(F,J)in headers.items():\n\t\tif F.lower()not in HEADERS_TO_IGNORE:A.setRequestHeader(F,J)\n\tif E:A.timeout=int(E*1000)\n\tif json is not _A:assert C is _A;import ujson;C=ujson.dumps(json);A.setRequestHeader('Content-Type','application/json')\n\tA.send(C);B=Response(StringIO(A.responseText));B.status_code=A.status;B.reason=A.statusText;B.headers=A.getAllResponseHeaders();return B\ndef get(url,**A):return request('GET',url,**A)\n_PACKAGE_INDEX=const('https://micropython.org/pi/v2')\n_CHUNK_SIZE=128\ndef _ensure_path_exists(path):\n\timport os;A=path.split(_B)\n\tif not A[0]:A.pop(0);A[0]=_B+A[0]\n\tB=''\n\tfor C in range(len(A)-1):\n\t\tB+=A[C]\n\t\ttry:os.stat(B)\n\t\texcept:os.mkdir(B)\n\t\tB+=_B\ndef _chunk(src,dest):\n\tA=memoryview(bytearray(_CHUNK_SIZE))\n\twhile _D:\n\t\tB=src.readinto(A)\n\t\tif B==0:break\n\t\tdest(A if B==_CHUNK_SIZE else A[:B])\ndef _check_exists(path,short_hash):\n\tA=short_hash;import os\n\ttry:\n\t\timport binascii as C,hashlib as D\n\t\twith open(path,'rb')as E:B=D.sha256();_chunk(E,B.update);F=str(C.hexlify(B.digest())[:len(A)],'utf-8');return F==A\n\texcept:return _C\ndef _rewrite_url(url,branch=_A):\n\tB=branch;A=url\n\tif not B:B='HEAD'\n\tif A.startswith(_F):A=A[7:].split(_B);A='https://raw.githubusercontent.com/'+A[0]+_B+A[1]+_B+B+_B+_B.join(A[2:])\n\treturn A\ndef _download_file(url,dest):\n\tB=dest;A=get(url)\n\ttry:\n\t\tif A.status_code!=200:print('Error',A.status_code,'requesting',url);return _C\n\t\tprint('Copying:',B);_ensure_path_exists(B)\n\t\twith open(B,'wb')as C:_chunk(A.raw,C.write)\n\t\treturn _D\n\tfinally:A.close()\ndef _install_json(package_json_url,index,target,version,mpy):\n\tK='File not found: {} {}';I=version;H=index;G=package_json_url;D=target;E=get(_rewrite_url(G,I))\n\ttry:\n\t\tif E.status_code!=200:print('Package not found:',G);return _C\n\t\tF=E.json()\n\tfinally:E.close()\n\tfor(A,C)in F.get('hashes',()):\n\t\tB=D+_B+A\n\t\tif _check_exists(B,C):print('Exists:',B)\n\t\telse:\n\t\t\tL='{}/file/{}/{}'.format(H,C[:2],C)\n\t\t\tif not _download_file(L,B):print(K.format(A,C));return _C\n\tfor(A,J)in F.get('urls',()):\n\t\tB=D+_B+A\n\t\tif not _download_file(_rewrite_url(J,I),B):print(K.format(A,J));return _C\n\tfor(M,N)in F.get('deps',()):\n\t\tif not _install_package(M,H,D,N,mpy):return _C\n\treturn _D\ndef _install_package(package,index,target,version,mpy):\n\tD=index;C=target;B=version;A=package\n\tif A.startswith('http://')or A.startswith('https://')or A.startswith(_F):\n\t\tif A.endswith('.py')or A.endswith('.mpy'):print('Downloading {} to {}'.format(A,C));return _download_file(_rewrite_url(A,B),C+_B+A.rsplit(_B)[-1])\n\t\telse:\n\t\t\tif not A.endswith('.json'):\n\t\t\t\tif not A.endswith(_B):A+=_B\n\t\t\t\tA+='package.json'\n\t\t\tprint('Installing {} to {}'.format(A,C))\n\telse:\n\t\tif not B:B='latest'\n\t\tprint('Installing {} ({}) from {} to {}'.format(A,B,D,C));E=sys.implementation._mpy&255 if mpy and hasattr(sys.implementation,'_mpy')else'py';A='{}/package/{}/{}/{}.json'.format(D,'py',A,B)\n\treturn _install_json(A,D,C,B,mpy)\ndef install(package,index=_A,target=_A,version=_A,mpy=_D):\n\tB=target;A=index\n\tif not B:\n\t\tfor C in sys.path:\n\t\t\tif C.endswith('/lib'):B=C;break\n\t\telse:print('Unable to find lib dir in sys.path');return\n\tif not A:A=_PACKAGE_INDEX\n\tif _install_package(package,A.rstrip(_B),B,version,mpy):print('Done')\n\telse:print('Package may be partially installed')");

/* c8 ignore start */

// toml
const toml = async (text) => (
  await import(/* webpackIgnore: true */'./toml-CkEFU7ly.js')
).parse(text);

// zip
const zip = () => import(/* webpackIgnore: true */'./zip-Borv86S2.js');

/* c8 ignore stop */

async function syncfs(FS, direction) {
    return new Promise((resolve, reject) => {
        FS.syncfs(direction, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// (C) Pyodide  https://github.com/pyodide/pyodide - Mozilla Public License Version 2.0
// JS port of https://github.com/pyodide/pyodide/blob/34fcd02172895d75db369994011409324f9e3cce/src/js/nativefs.ts
function initializeNativeFS(module) {
    const FS = module.FS;
    const MEMFS = module.FS.filesystems.MEMFS;
    const PATH = module.PATH;

    const nativeFSAsync = {
        // DIR_MODE: {{{ cDefine('S_IFDIR') }}} | 511 /* 0777 */,
        // FILE_MODE: {{{ cDefine('S_IFREG') }}} | 511 /* 0777 */,
        DIR_MODE: 16384 | 511,
        FILE_MODE: 32768 | 511,
        mount: function (mount) {
            if (!mount.opts.fileSystemHandle) {
                throw new Error('opts.fileSystemHandle is required');
            }

            // reuse all of the core MEMFS functionality
            return MEMFS.mount.apply(null, arguments);
        },
        syncfs: async (mount, populate, callback) => {
            try {
                const local = nativeFSAsync.getLocalSet(mount);
                const remote = await nativeFSAsync.getRemoteSet(mount);
                const src = populate ? remote : local;
                const dst = populate ? local : remote;
                await nativeFSAsync.reconcile(mount, src, dst);
                callback(null);
            } catch (e) {
                callback(e);
            }
        },
        // Returns file set of emscripten's filesystem at the mountpoint.
        getLocalSet: (mount) => {
            let entries = Object.create(null);

            function isRealDir(p) {
                return p !== '.' && p !== '..';
            }

            function toAbsolute(root) {
                return (p) => {
                    return PATH.join2(root, p);
                };
            }

            let check = FS.readdir(mount.mountpoint)
                .filter(isRealDir)
                .map(toAbsolute(mount.mountpoint));

            while (check.length) {
                let path = check.pop();
                let stat = FS.stat(path);

                if (FS.isDir(stat.mode)) {
                    check.push.apply(
                        check,
                        FS.readdir(path).filter(isRealDir).map(toAbsolute(path)),
                    );
                }

                entries[path] = { timestamp: stat.mtime, mode: stat.mode };
            }

            return { type: 'local', entries: entries };
        },
        // Returns file set of the real, on-disk filesystem at the mountpoint.
        getRemoteSet: async (mount) => {
            // TODO: this should be a map.
            const entries = Object.create(null);

            const handles = await getFsHandles(mount.opts.fileSystemHandle);
            for (const [path, handle] of handles) {
                if (path === '.') continue;

                entries[PATH.join2(mount.mountpoint, path)] = {
                    timestamp:
                        handle.kind === 'file'
                            ? (await handle.getFile()).lastModifiedDate
                            : new Date(),
                    mode:
                        handle.kind === 'file'
                            ? nativeFSAsync.FILE_MODE
                            : nativeFSAsync.DIR_MODE,
                };
            }

            return { type: 'remote', entries, handles };
        },
        loadLocalEntry: (path) => {
            const lookup = FS.lookupPath(path);
            const node = lookup.node;
            const stat = FS.stat(path);

            if (FS.isDir(stat.mode)) {
                return { timestamp: stat.mtime, mode: stat.mode };
            } else if (FS.isFile(stat.mode)) {
                node.contents = MEMFS.getFileDataAsTypedArray(node);
                return {
                    timestamp: stat.mtime,
                    mode: stat.mode,
                    contents: node.contents,
                };
            } else {
                throw new Error('node type not supported');
            }
        },
        storeLocalEntry: (path, entry) => {
            if (FS.isDir(entry['mode'])) {
                FS.mkdirTree(path, entry['mode']);
            } else if (FS.isFile(entry['mode'])) {
                FS.writeFile(path, entry['contents'], { canOwn: true });
            } else {
                throw new Error('node type not supported');
            }

            FS.chmod(path, entry['mode']);
            FS.utime(path, entry['timestamp'], entry['timestamp']);
        },
        removeLocalEntry: (path) => {
            var stat = FS.stat(path);

            if (FS.isDir(stat.mode)) {
                FS.rmdir(path);
            } else if (FS.isFile(stat.mode)) {
                FS.unlink(path);
            }
        },
        loadRemoteEntry: async (handle) => {
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                return {
                    contents: new Uint8Array(await file.arrayBuffer()),
                    mode: nativeFSAsync.FILE_MODE,
                    timestamp: file.lastModifiedDate,
                };
            } else if (handle.kind === 'directory') {
                return {
                    mode: nativeFSAsync.DIR_MODE,
                    timestamp: new Date(),
                };
            } else {
                throw new Error('unknown kind: ' + handle.kind);
            }
        },
        storeRemoteEntry: async (handles, path, entry) => {
            const parentDirHandle = handles.get(PATH.dirname(path));
            const handle = FS.isFile(entry.mode)
                ? await parentDirHandle.getFileHandle(PATH.basename(path), {
                    create: true,
                })
                : await parentDirHandle.getDirectoryHandle(PATH.basename(path), {
                    create: true,
                });
            if (handle.kind === 'file') {
                const writable = await handle.createWritable();
                await writable.write(entry.contents);
                await writable.close();
            }
            handles.set(path, handle);
        },
        removeRemoteEntry: async (handles, path) => {
            const parentDirHandle = handles.get(PATH.dirname(path));
            await parentDirHandle.removeEntry(PATH.basename(path));
            handles.delete(path);
        },
        reconcile: async (mount, src, dst) => {
            let total = 0;

            const create = [];
            Object.keys(src.entries).forEach(function (key) {
                const e = src.entries[key];
                const e2 = dst.entries[key];
                if (
                    !e2 ||
                    (FS.isFile(e.mode) &&
                        e['timestamp'].getTime() > e2['timestamp'].getTime())
                ) {
                    create.push(key);
                    total++;
                }
            });
            // sort paths in ascending order so directory entries are created
            // before the files inside them
            create.sort();

            const remove = [];
            Object.keys(dst.entries).forEach(function (key) {
                if (!src.entries[key]) {
                    remove.push(key);
                    total++;
                }
            });
            // sort paths in descending order so files are deleted before their
            // parent directories
            remove.sort().reverse();

            if (!total) {
                return;
            }

            const handles = src.type === 'remote' ? src.handles : dst.handles;

            for (const path of create) {
                const relPath = PATH.normalize(
                    path.replace(mount.mountpoint, '/'),
                ).substring(1);
                if (dst.type === 'local') {
                    const handle = handles.get(relPath);
                    const entry = await nativeFSAsync.loadRemoteEntry(handle);
                    nativeFSAsync.storeLocalEntry(path, entry);
                } else {
                    const entry = nativeFSAsync.loadLocalEntry(path);
                    await nativeFSAsync.storeRemoteEntry(handles, relPath, entry);
                }
            }

            for (const path of remove) {
                if (dst.type === 'local') {
                    nativeFSAsync.removeLocalEntry(path);
                } else {
                    const relPath = PATH.normalize(
                        path.replace(mount.mountpoint, '/'),
                    ).substring(1);
                    await nativeFSAsync.removeRemoteEntry(handles, relPath);
                }
            }
        },
    };

    module.FS.filesystems.NATIVEFS_ASYNC = nativeFSAsync;

    function ensureMountPathExists(path) {
        if (FS.mkdirTree) FS.mkdirTree(path);
        else mkdirTree(FS, path);

        const { node } = FS.lookupPath(path, {
            follow_mount: false,
        });

        if (FS.isMountpoint(node)) {
            throw new Error(`path '${path}' is already a file system mount point`);
        }
        if (!FS.isDir(node.mode)) {
            throw new Error(`path '${path}' points to a file not a directory`);
        }
        // eslint-disable-next-line
        for (const _ in node.contents) {
            throw new Error(`directory '${path}' is not empty`);
        }
    }

    return async function mountNativeFS(path, fileSystemHandle) {
        if (fileSystemHandle.constructor.name !== 'FileSystemDirectoryHandle') {
            throw new TypeError(
              'Expected argument \'fileSystemHandle\' to be a FileSystemDirectoryHandle',
            );
        }
        ensureMountPathExists(path);
      
        FS.mount(
            FS.filesystems.NATIVEFS_ASYNC,
            { fileSystemHandle },
            path,
        );

        // sync native ==> browser
        await syncfs(FS, true);

        return {
            // sync browser ==> native
            syncfs: async () => await syncfs(FS, false),
        };
    };
}

const getFsHandles = async (dirHandle) => {
    const handles = [];

    async function collect(curDirHandle) {
        for await (const entry of curDirHandle.values()) {
            handles.push(entry);
            if (entry.kind === 'directory') {
                await collect(entry);
            }
        }
    }

    await collect(dirHandle);

    const result = new Map();
    result.set('.', dirHandle);
    for (const handle of handles) {
        const relativePath = (await dirHandle.resolve(handle)).join('/');
        result.set(relativePath, handle);
    }
    return result;
};

const { parse: parse$1 } = JSON;

const href = (key, pkg) => new URL(key, pkg).href;

const addPath = (target, key, value) => {
  if (key in target)
    throw new Error(`Duplicated path: ${key}`);
  target[key] = value;
};

const addPaths = (target, source, pkg) => {
  for (const key in source)
    addPath(target, href(key, pkg), source[key]);
};

const pollute = (t_js_modules, s_js_modules, name, pkg) => {
  const source = s_js_modules[name];
  if (source) {
    t_js_modules[name] ??= {};
    addPaths(t_js_modules[name], source, pkg);
  }
};

const remote = async (
  config,
  packages = config.packages,
  set = new Set(),
) => {
  const repackaged = [];
  for (const pkg of packages) {
    // avoid re-processing already processed packages
    if (set.has(pkg)) continue;
    set.add(pkg);
    const isTOML = pkg.endsWith('.toml');
    if (isTOML || pkg.endsWith('.json')) {
      const text = await fetch$1(pkg).text();
      const {
        name,
        files,
        js_modules,
        packages,
      } = isTOML ? await toml(text) : parse$1(text);

      if (set.has(name))
        throw new Error(`Unable to process ${name} @ ${pkg}`);

      set.add(name);

      if (packages) {
        // process nested packages from the remote config
        repackaged.push(...(await remote(config, packages, set)));
      }

      if (js_modules) {
        config.js_modules ??= {};
        pollute(config.js_modules, js_modules, 'main', pkg);
        pollute(config.js_modules, js_modules, 'worker', pkg);
      }

      if (files) {
        config.files ??= {};
        addPaths(config.files, files, pkg);
      }
    }
    else repackaged.push(pkg);
  }
  return repackaged;
};

const type$4 = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const mkdir = (FS, path) => {
    try {
        FS.mkdir(path);
    }
    // eslint-disable-next-line no-unused-vars
    catch (_) {
        // ignore as there's no path.exists here
    }
};

const progress$1 = createProgress('mpy');

var micropython = {
    type: type$4,
    module: (version = '1.27.0-preview-283') =>
        `https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${version}/micropython.mjs`,
    async engine({ loadMicroPython }, config, url, baseURL) {
        const { stderr, stdout, get } = stdio({
            stderr: buffered(console.error),
            stdout: buffered(console.log),
        });
        url = url.replace(/\.m?js$/, '.wasm');
        progress$1('Loading MicroPython');
        const interpreter = await get(loadMicroPython({ linebuffer: false, stderr, stdout, url }));
        globalThis[js_modules].set('-T-', this.transform.bind(this, interpreter));
        const py_imports = importPackages$1.bind(this, interpreter, baseURL);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress$1, interpreter, config, baseURL);
        // Install Micropython Package
        this.writeFile(interpreter, './mip.py', mip);
        if (config.packages) {
            if (config.experimental_remote_packages) {
                progress$1('Loading remote packages');
                config.packages = await remote(config);
                progress$1('Loaded remote packages');
            }
            progress$1('Loading packages');
            await py_imports(config.packages.map(fixedRelative, baseURL));
            progress$1('Loaded packages');
        }
        progress$1('Loaded MicroPython');
        if (!interpreter.mountNativeFS)
            interpreter.mountNativeFS = initializeNativeFS(interpreter._module);
        return interpreter;
    },
    registerJSModule,
    run: run$1,
    runAsync,
    runEvent,
    transform: (interpreter, value) => interpreter.PyProxy.toJs(value),
    writeFile: (interpreter, path, buffer, url) => {
        const { FS, _module: { PATH, PATH_FS } } = interpreter;
        const fs = { FS, PATH, PATH_FS };
        const format = getFormat(path, url);
        if (format) {
            const extractDir = path.slice(0, -1);
            if (extractDir !== './') FS.mkdir(extractDir);
            switch (format) {
                case 'whl':
                case 'zip': {
                    const blob = new Blob([buffer], { type: 'application/zip' });
                    return zip().then(async ({ BlobReader, Uint8ArrayWriter, ZipReader }) => {
                        const zipFileReader = new BlobReader(blob);
                        const zipReader = new ZipReader(zipFileReader);
                        for (const entry of await zipReader.getEntries()) {
                            const { directory, filename } = entry;
                            const name = extractDir + filename;
                            if (directory) mkdir(FS, name);
                            else {
                                mkdir(FS, PATH.dirname(name));
                                const buffer = await entry.getData(new Uint8ArrayWriter);
                                FS.writeFile(name, buffer, {
                                    canOwn: true,
                                });
                            }
                        }
                        zipReader.close();
                    });
                }
                case 'tgz':
                case 'tar.gz': {
                    const TMP = './_.tar.gz';
                    writeFile(fs, TMP, buffer);
                    interpreter.runPython(`
                        import os, gzip, tarfile
                        tar = tarfile.TarFile(fileobj=gzip.GzipFile(fileobj=open("${TMP}", "rb")))
                        for f in tar:
                            name = f"${extractDir}{f.name}"
                            if f.type == tarfile.DIRTYPE:
                                if f.name != "./":
                                    os.mkdir(name.strip("/"))
                            else:
                                dir = os.path.dirname(name)
                                if not os.path.exists(dir):
                                    os.mkdir(dir)
                                source = tar.extractfile(f)
                                with open(name, "wb") as dest:
                                    dest.write(source.read())
                                    dest.close()
                        tar.close()
                        os.remove("${TMP}")
                    `);
                    return;
                }
            }
        }
        return writeFile(fs, path, buffer);
    },
};

async function importPackages$1(interpreter, baseURL, packages) {
    let mip;
    for (const mpyPackage of packages) {
        if (mpyPackage.endsWith('.whl')) {
            const url = absoluteURL(mpyPackage, baseURL);
            const buffer = await fetch$1(url).arrayBuffer();
            await this.writeFile(interpreter, './*', buffer, url);
        }
        else {
            if (!mip) mip = interpreter.pyimport('mip');
            mip.install(mpyPackage);
        }
    }
}
/* c8 ignore stop */

const type$3 = 'pyodide';
const toJsOptions = { dict_converter: Object.fromEntries };

const { stringify } = JSON;

const { apply } = Reflect;
const FunctionPrototype = Function.prototype;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const overrideMethod = method => function (...args) {
    return apply(method, this, args);
};

let pyproxy, to_js;
const override = intercept => {

    const proxies = new WeakMap;

    const patch = args => {
        for (let arg, i = 0; i < args.length; i++) {
            switch (typeof(arg = args[i])) {
                case 'object':
                    if (arg === null) break;
                    // falls through
                case 'function': {
                    if (pyproxy in arg && !arg[pyproxy].shared?.gcRegistered) {
                        intercept = false;
                        let proxy = proxies.get(arg)?.deref();
                        if (!proxy) {
                            proxy = to_js(arg);
                            const wr = new WeakRef(proxy);
                            proxies.set(arg, wr);
                            proxies.set(proxy, wr);
                        }
                        args[i] = proxy;
                        intercept = true;
                    }
                    break;
                }
            }
        }
    };

    // the patch
    Object.defineProperties(FunctionPrototype, {
        apply: {
            value(context, args) {
                if (intercept) patch(args);
                return apply(this, context, args);
            }
        },
        call: {
            value(context, ...args) {
                if (intercept) patch(args);
                return apply(this, context, args);
            }
        }
    });
};

const progress = createProgress('py');
const indexURLs = new WeakMap();

var pyodide = {
    type: type$3,
    module: (version = '0.28.3') =>
        `https://cdn.jsdelivr.net/pyodide/v${version}/full/pyodide.mjs`,
    async engine({ loadPyodide, version }, config, url, baseURL) {
        progress('Loading Pyodide');
        let { packages, index_urls } = config;
        if (packages) packages = packages.map(fixedRelative, baseURL);
        progress('Loading Storage');
        const indexURL = url.slice(0, url.lastIndexOf('/'));
        // each pyodide version shares its own cache
        const storage = new IDBMapSync(`${indexURL}@${version}`);
        const options = { indexURL };
        // 0.28.0 has a bug where lockFileURL cannot be used directly
        // https://github.com/pyodide/pyodide/issues/5736
        const save = config.packages_cache !== 'never' && version !== '0.28.0';
        await storage.sync();
        progress('Loaded Storage');
        // packages_cache = 'never' means: erase the whole DB
        if (!save) storage.clear();
        // otherwise check if cache is known
        if (packages) {
            if (config.experimental_remote_packages) {
                progress('Loading remote packages');
                config.packages = (packages = await remote(config, packages));
                progress('Loaded remote packages');
            }
            if (save) {
                // packages_cache = 'passthrough' means: do not use micropip.install
                if (config.packages_cache === 'passthrough') {
                    options.packages = packages;
                    packages = null;
                    storage.clear();
                }
                else {
                    packages = packages.sort();
                    // packages are uniquely stored as JSON key
                    const key = stringify(packages);
                    if (storage.has(key)) {
                        const value = storage.get(key);

                        // versions are not currently understood by pyodide when
                        // a lockFileURL is used instead of micropip.install(packages)
                        // https://github.com/pyodide/pyodide/issues/5135#issuecomment-2441038644
                        // https://github.com/pyscript/pyscript/issues/2245
                        options.packages = packages.map(name => name.split(/[>=<]=/)[0]);

                        if (version.startsWith('0.27')) {
                            const blob = new Blob([value], { type: 'application/json' });
                            options.lockFileURL = URL.createObjectURL(blob);
                        }
                        else {
                        options.lockFileContents = value;
                        }

                        packages = null;
                    }
                }
            }
        }
        const { stderr, stdout, get } = stdio();
        progress('Loading interpreter');
        const interpreter = await get(
            loadPyodide({ stderr, stdout, ...options }),
        );
        progress('Loaded interpreter');
        globalThis[js_modules].set('-T-', this.transform.bind(this, interpreter));
        if (config.debug) interpreter.setDebug(true);
        const py_imports = importPackages.bind(interpreter);
        if (index_urls) indexURLs.set(interpreter, index_urls);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress, interpreter, config, baseURL);
        // if cache wasn't know, import and freeze it for the next time
        if (packages) await py_imports(packages, storage, save);
        await storage.close();
        if (options.lockFileURL) URL.revokeObjectURL(options.lockFileURL);
        progress('Loaded Pyodide');
        if (config.experimental_create_proxy === 'auto') {
            interpreter.runPython([
                'import js',
                'from pyodide.ffi import to_js',
                'o=js.Object.fromEntries',
                'js.experimental_create_proxy=lambda r:to_js(r,dict_converter=o)'
            ].join(';'), { globals: interpreter.toPy({}) });
            to_js = globalThis.experimental_create_proxy;
            delete globalThis.experimental_create_proxy;
            [pyproxy] = Reflect.ownKeys(to_js).filter(
                k => (
                    typeof k === 'symbol' &&
                    String(k) === 'Symbol(pyproxy.attrs)'
                )
            );
            override(true);
        }
        return interpreter;
    },
    registerJSModule,
    run: overrideMethod(run$1),
    runAsync: overrideMethod(runAsync),
    runEvent: overrideMethod(runEvent),
    transform: (interpreter, value) => apply(transform, interpreter, [value]),
    writeFile: (interpreter, path, buffer, url) => {
        const format = getFormat(path, url);
        if (format) {
            return interpreter.unpackArchive(buffer, format, {
                extractDir: path.slice(0, -1)
            });
        }
        const { FS, PATH, _module: { PATH_FS } } = interpreter;
        return writeFile({ FS, PATH, PATH_FS }, path, buffer);
    },
};

function transform(value) {
    const { ffi: { PyProxy } } = this;
    if (value && typeof value === 'object') {
        if (value instanceof PyProxy) return value.toJs(toJsOptions);
        // I believe this case is for LiteralMap which is not a PyProxy
        // and yet it needs to be re-converted to something useful.
        if (value instanceof Map) return new Map([...value.entries()]);
        if (isArray(value)) return value.map(transform, this);
    }
    return value;
}

// exposed utility to import packages via polyscript.lazy_py_modules
async function importPackages(packages, storage, save = false) {
    // temporary patch/fix console.log which is used
    // not only by Pyodide but by micropip too and there's
    // no way to intercept those calls otherwise
    const { log } = console;
    const _log = (detail, ...rest) => {
        log(detail, ...rest);
        console.log = log;
        progress(detail);
        console.log = _log;
    };
    console.log = _log;
    await this.loadPackage('micropip');
    const micropip = this.pyimport('micropip');
    if (indexURLs.has(this)) micropip.set_index_urls(indexURLs.get(this));
    await micropip.install(packages, { keep_going: true });
    console.log = log;
    if (save && (storage instanceof IDBMapSync)) {
        const frozen = micropip.freeze();
        storage.set(stringify(packages), frozen);
    }
    micropip.destroy();
}
/* c8 ignore stop */

const type$2 = 'ruby-wasm-wasi';
const jsType = type$2.replace(/\W+/g, '_');

// MISSING:
//  * there is no VFS apparently or I couldn't reach any
//  * I've no idea how to override the stderr and stdout
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var ruby_wasm_wasi = {
    type: type$2,
    experimental: true,
    module: (version = '2.7.2') =>
        `https://cdn.jsdelivr.net/npm/@ruby/3.2-wasm-wasi@${version}/dist/browser/+esm`,
    async engine({ DefaultRubyVM }, config, url, baseURL) {
        url = url.replace(/\/browser\/\+esm$/, '/ruby.wasm');
        const buffer = await fetch$1(url).arrayBuffer();
        const module = await WebAssembly.compile(buffer);
        const { vm: interpreter } = await DefaultRubyVM(module);
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. $xworker)
    registerJSModule(interpreter, name, value) {
        name = name.replace(/\W+/g, '__');
        const id = `__module_${jsType}_${name}`;
        globalThis[id] = value;
        this.run(interpreter, `require "js";$${name}=JS.global[:${id}]`);
        delete globalThis[id];
    },
    run: (interpreter, code, ...args) => interpreter.eval(dedent(code), ...args),
    runAsync: (interpreter, code, ...args) => interpreter.evalAsync(dedent(code), ...args),
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
    transform: (_, value) => value,
    writeFile: () => {
        throw new Error(`writeFile is not supported in ${type$2}`);
    },
};
/* c8 ignore stop */

const type$1 = 'wasmoon';

// MISSING:
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var wasmoon = {
    type: type$1,
    module: (version = '1.16.0') =>
        `https://cdn.jsdelivr.net/npm/wasmoon@${version}/+esm`,
    async engine({ LuaFactory, LuaLibraries }, config, _, baseURL) {
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(new LuaFactory().createEngine());
        interpreter.global.getTable(LuaLibraries.Base, (index) => {
            interpreter.global.setField(index, 'print', stdout);
            interpreter.global.setField(index, 'printErr', stderr);
        });
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields
    registerJSModule: (interpreter, name, value) => {
        interpreter.global.set(name, value);
    },
    run: (interpreter, code, ...args) => {
        try {
            return interpreter.doStringSync(dedent(code), ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runAsync: async (interpreter, code, ...args) => {
        try {
            return await interpreter.doString(dedent(code), ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runEvent: async (interpreter, code, event) => {
        // allows method(event) as well as namespace.method(event)
        // it does not allow fancy brackets names for now
        const [name, ...keys] = code.split('.');
        let target = interpreter.global.get(name);
        let context;
        for (const key of keys) [context, target] = [target, target[key]];
        try {
            await target.call(context, event);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    transform: (_, value) => value,
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

const type = 'webr';
const r = new WeakMap();
const fr = new FinalizationRegistry(fn => fn());

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const run = async (interpreter, code) => {
  const { shelter, destroy, io } = r.get(interpreter);
  const { output, result } = await shelter.captureR(dedent(code));
  for (const { type, data } of output) io[type](data);
  fr.register(result, destroy);
  return result;
};

var webr = {
    type,
    experimental: true,
    module: (version = '0.5.6') =>
        `https://cdn.jsdelivr.net/npm/webr@${version}/dist/webr.mjs`,
    async engine(module, config, _, baseURL) {
        const { get } = stdio();
        const interpreter = new module.WebR();
        await get(interpreter.init().then(() => interpreter));
        const shelter = await new interpreter.Shelter();
        r.set(interpreter, {
          module,
          shelter,
          destroy: shelter.destroy.bind(shelter),
          io: io.get(interpreter),
        });
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. $xworker)
    registerJSModule(_, name) {
        console.warn(`Experimental interpreter: module ${name} is not supported (yet)`);
        // TODO: as complex JS objects / modules are not allowed
        // it's not clear how we can bind anything or import a module
        // in a context that doesn't understand methods from JS
        // https://docs.r-wasm.org/webr/latest/convert-js-to-r.html#constructing-r-objects-from-javascript-objects
    },
    run,
    runAsync: run,
    async runEvent(interpreter, code, event) {
        // TODO: WebR cannot convert exoteric objects or any literal
        // to an easy to reason about data/frame ... that conversion
        // is reserved for the future:
        // https://docs.r-wasm.org/webr/latest/convert-js-to-r.html#constructing-r-objects-from-javascript-objects
        await interpreter.evalRVoid(`${code}(event)`, {
          env: { event: { type: [ event.type ] } }
        });
    },
    transform: (_, value) => value,
    writeFile: () => {
        // MAYBE ???
    },
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

/* c8 ignore start */
const interpreter = new Proxy(new Map(), {
    get(map, id) {
        if (!map.has(id)) {
            const [type, ...rest] = id.split('@');
            const interpreter = registry$1.get(type);
            const url = /^(?:\.?\.?\/|[a-z0-9-]+:\/\/)/i.test(rest)
                ? rest.join('@')
                : interpreter.module(...rest);
            map.set(id, {
                url,
                module: import(/* webpackIgnore: true */url),
                engine: interpreter.engine.bind(interpreter),
            });
        }
        const { url, module, engine } = map.get(id);
        return (config, baseURL) =>
            module.then((module) => {
                configs.set(id, config);
                return engine(module, config, url, baseURL);
            });
    },
});
/* c8 ignore stop */

const register = (interpreter) => {
    for (const type of [].concat(interpreter.type)) {
        registry$1.set(type, interpreter);
        selectors.push(`script[type="${type}"]`);
        prefixes.push(`${type}-`);
    }
};
for (const interpreter of [dummy, micropython, pyodide, ruby_wasm_wasi, wasmoon, webr])
    register(interpreter);

const { parse } = JSON;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const getConfigURLAndType = (config, configURL = './config.txt') => {
    let type = typeof config;
    if (type === 'string' && /\.(json|toml|txt)$/.test(config))
        type = RegExp.$1;
    else
        config = configURL;
    return [absoluteURL(config), type];
};

const resolveConfig = (config, configURL, options = {}) => {
    const [absolute, type] = getConfigURLAndType(config, configURL);
    if (type === 'json') {
        options = fetch$1(absolute).json();
    } else if (type === 'toml') {
        options = fetch$1(absolute).text().then(toml);
    } else if (type === 'string') {
        options = parseString(config);
    } else if (type === 'object' && config) {
        options = config;
    } else if (type === 'txt' && typeof options === 'string') {
        options = parseString(options);
    }
    config = absolute;
    return [options, config];
};

const parseString = config => {
    try {
        return parse(config);
    }
    // eslint-disable-next-line no-unused-vars
    catch (_) {
        return toml(config);
    }
};
/* c8 ignore stop */

/**
 * Parse a generic config if it came from an attribute either as URL
 * or as a serialized string. In XWorker case, accepts a pre-defined
 * options to use as it is to avoid needing at all a fetch operation.
 * In latter case, config will be suffixed as `config.txt`.
 * @param {string} id the interpreter name @ version identifier
 * @param {string | object} config optional config file to parse
 * @param {string} [configURL] optional config URL if config is not string
 * @param {object} [options] optional options used to bootstrap XWorker
 * @returns
 */
const getRuntime = (id, config, configURL, options = {}) => {
    if (config) {
        // REQUIRES INTEGRATION TEST
        /* c8 ignore start */
        [options, config] = resolveConfig(config, configURL, options);
        /* c8 ignore stop */
    }
    return resolve$1(options).then(options => interpreter[id](options, config));
};

/**
 * @param {string} type the interpreter type
 * @param {string} [version] the optional interpreter version
 * @returns
 */
const getRuntimeID = (type, version = '') =>
    `${type}@${version}`.replace(/@$/, '');

// (c) https://github.com/WebReflection/to-json-callback
// brought in here to avoid a dependency for quick testing

/**
 * @param {Function} [callback=this]
 * @returns {string}
 */
function toJSONCallback (callback = this) {
  return String(callback).replace(
    /^(async\s*)?(\bfunction\b)?(.*?)\(/,
    (_, isAsync, fn, name) => (
      name && !fn ?
        `${isAsync || ""}function ${name}(` :
        _
    ),
  );
}

const beforeRun = 'BeforeRun';
const afterRun = 'AfterRun';

const code = [
    `code${beforeRun}`,
    `code${beforeRun}Async`,
    `code${afterRun}`,
    `code${afterRun}Async`,
];

const js = [
    'onWorker',
    'onReady',
    `on${beforeRun}`,
    `on${beforeRun}Async`,
    `on${afterRun}`,
    `on${afterRun}Async`,
];

/* c8 ignore start */
// create a copy of the resolved wrapper with the original
// run and runAsync so that, if used within onBeforeRun/Async
// or onAfterRun/Async polluted entries won't matter and just
// the native utilities will be available without seppuku.
// The same applies if called within `onReady` worker hook.
function patch(resolved, interpreter) {
    const { run, runAsync } = registry$1.get(this.type);
    return {
        ...resolved,
        run: run.bind(this, interpreter),
        runAsync: runAsync.bind(this, interpreter)
    };
}

/**
 * Created the wrapper to pass along hooked callbacks.
 * @param {object} module the details module
 * @param {object} ref the node or reference to pass as second argument
 * @param {boolean} isAsync if run should be async
 * @param {function?} before callback to run before
 * @param {function?} after callback to run after
 * @returns {object}
 */
const polluteJS = (module, resolved, ref, isAsync, before, after) => {
    if (before || after) {
        const patched = patch.bind(module, resolved);
        const name = isAsync ? 'runAsync' : 'run';
        const method = module[name];
        module[name] = isAsync ?
            async function (interpreter, code, ...args) {
                if (before) await before.call(this, patched(interpreter), ref);
                const result = await method.call(
                    this,
                    interpreter,
                    code,
                    ...args
                );
                if (after) await after.call(this, patched(interpreter), ref);
                return result;
            } :
            function (interpreter, code, ...args) {
                if (before) before.call(this, patched(interpreter), ref);
                const result = method.call(this, interpreter, code, ...args);
                if (after) after.call(this, patched(interpreter), ref);
                return result;
            }
        ;
    }
};
/* c8 ignore stop */

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
let Hook$1 = class Hook {
    constructor(interpreter, hooks = {}) {
        const { main, worker } = hooks;
        this.interpreter = interpreter;
        this.onWorker = main?.onWorker;
        // ignore onWorker as that's main only
        for (const key of js.slice(1))
            this[key] = worker?.[key];
        for (const key of code)
            this[key] = worker?.[key];
    }
    toJSON() {
        const hooks = {};
        // ignore onWorker as that's main only
        for (const key of js.slice(1)) {
            if (this[key]) hooks[key] = toJSONCallback(this[key]);
        }
        // code related: exclude `onReady` callback
        for (const key of code) {
            if (this[key]) hooks[key] = dedent(this[key]());
        }
        return hooks;
    }
};
/* c8 ignore stop */

/**
 * @typedef {Object} WorkerOptions custom configuration
 * @prop {string} type the interpreter type to use
 * @prop {string} [version] the optional interpreter version to use
 * @prop {string | object} [config] the optional config to use within such interpreter
 * @prop {string} [configURL] the optional configURL used to resolve config entries
 * @prop {string} [serviceWorker] the optional Service Worker for SharedArrayBuffer fallback
 * @prop {string} [service_worker] alias for `serviceWorker`
 */

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
var xworker = (...args) =>
    /**
     * A XWorker is a Worker facade able to bootstrap a channel with any desired interpreter.
     * @param {string} url the remote file to evaluate on bootstrap
     * @param {WorkerOptions} [options] optional arguments to define the interpreter to use
     * @returns {Worker}
     */
    function XWorker(url, options) {
        if (args.length) {
            const [type, version] = args;
            options = assign({}, options || { type, version });
            if (!options.type) options.type = type;
        }

        // provide a base url to fetch or load config files from a Worker
        // because there's no location at all in the Worker as it's embedded.
        // fallback to a generic, ignored, config.txt file to still provide a URL.
        const [ config ] = getConfigURLAndType(options.config, options.configURL);

        const serviceWorker = options?.serviceWorker || options?.service_worker;
        const worker = xworker$1({
            serviceWorker,
            reflected_ffi_timeout: globalThis.reflected_ffi_timeout ?? -1,
        });
        const { postMessage } = worker;
        const isHook = this instanceof Hook$1;

        const sync = assign(
            worker.proxy,
            { importJS, importCSS },
        );

        const resolver = withResolvers$1();

        let bootstrap = fetch$1(url)
            .text()
            .then(code => {
                const hooks = isHook ? this.toJSON() : void 0;
                postMessage.call(worker, { options, config, code, hooks });
            })
            .then(() => {
                // boost postMessage performance
                bootstrap = { then: fn => fn() };
            });

        defineProperties(worker, {
            sync: { value: sync },
            ready: { value: resolver.promise },
            postMessage: {
                value: (data, ...rest) => bootstrap.then(
                    () => postMessage.call(worker, data, ...rest),
                ),
            },
            onerror: {
                writable: true,
                configurable: true,
                value: console.error
            }
        });

        worker.addEventListener('message', event => {
            const { data } = event;
            const isError = data instanceof Error;
            if (isError || data === 'polyscript:done') {
                event.stopImmediatePropagation();
                if (isError) {
                    resolver.reject(data);
                    worker.onerror(create(event, {
                        type: { value: 'error' },
                        error: { value: data }
                    }));
                }
                else resolver.resolve(worker);
            }
        });

        if (isHook) this.onWorker?.(this.interpreter, worker);

        return worker;
    };

/* c8 ignore stop */

const INVALID_CONTENT = 'Invalid content';
const INVALID_SRC_ATTR = 'Invalid worker attribute';
const INVALID_WORKER_ATTR = 'Invalid worker attribute';

const hasCommentsOnly = text => !text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*(?:\/\/|#).*/gm, '')
    .trim()
;

/* c8 ignore start */ // tested via integration
var workerURL = element => {
  const { src, worker } = element.attributes;
  if (worker) {
      let { value } = worker;
      // throw on worker values as ambiguous
      // @see https://github.com/pyscript/polyscript/issues/43
      if (value) throw new SyntaxError(INVALID_WORKER_ATTR);
      value = src?.value;
      if (!value) {
          // throw on empty src attributes
          if (src) throw new SyntaxError(INVALID_SRC_ATTR);
          if (!element.childElementCount)
              value = element.textContent;
          else {
              const { innerHTML, localName, type } = element;
              const name = type || localName.replace(/-script$/, '');
              value = unescape(innerHTML);
              console.warn(
                  `Deprecated: use <script type="${name}"> for an always safe content parsing:\n`,
                  value,
              );
          }

          const url = URL.createObjectURL(new Blob([dedent(value)], { type: 'text/plain' }));
          // TODO: should we really clean up this? debugging non-existent resources
          //       at distance might be very problematic if the url is revoked.
          // setTimeout(URL.revokeObjectURL, 5000, url);
          return url;
      }
      return value;
  }
  // validate ambiguous cases with src and not empty/commented content
  if (src && !hasCommentsOnly(element.textContent))
    throw new SyntaxError(INVALID_CONTENT);
};
/* c8 ignore stop */

const getRoot = (script) => {
    let parent = script;
    while (parent.parentNode) parent = parent.parentNode;
    return parent;
};

const queryTarget = (script, idOrSelector) => {
    const root = getRoot(script);
    return root.getElementById(idOrSelector) || $$1(idOrSelector, root);
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

const execute = async (currentScript, source, XWorker, isAsync) => {
    const { type } = currentScript;
    const module = registry$1.get(type);
    /* c8 ignore start */
    if (module.experimental)
        console.warn(`The ${type} interpreter is experimental`);
    const [interpreter, content] = await all([
        handled.get(currentScript).interpreter,
        source,
    ]);
    try {
        registerJSModules(type, module, interpreter, JSModules);
        module.registerJSModule(interpreter, 'polyscript', {
            IDBMap,
            IDBMapSync,
            XWorker,
            currentScript,
            js_modules: JSModules,
            workers: workersHandler,
        });
        dispatch(currentScript, type, 'ready');
        // temporarily override inherited document.currentScript in a non writable way
        // but it deletes it right after to preserve native behavior (as it's sync: no trouble)
        defineProperty(document, 'currentScript', {
            configurable: true,
            get: () => currentScript,
        });
        const done = dispatch.bind(null, currentScript, type, 'done');
        let result = module[isAsync ? 'runAsync' : 'run'](interpreter, content);
        if (isAsync) result = await result;
        done();
        return result;
    } finally {
        delete document.currentScript;
    }
    /* c8 ignore stop */
};

const getValue = (ref, prefix) => {
    const value = ref?.value;
    return value ? prefix + value : '';
};

const getDetails = (type, id, name, version, config, configURL, runtime = type) => {
    if (!interpreters.has(id)) {
        const details = {
            interpreter: getRuntime(name, config, configURL),
            queue: resolve$1(),
            XWorker: xworker(type, version),
        };
        interpreters.set(id, details);
        // enable sane defaults when single interpreter *of kind* is used in the page
        // this allows `xxx-*` attributes to refer to such interpreter without `env` around
        /* c8 ignore start *//* this is tested very well in PyScript */
        if (!interpreters.has(type)) interpreters.set(type, details);
        if (!interpreters.has(runtime)) interpreters.set(runtime, details);
        /* c8 ignore stopt */
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
            attributes: {
                config,
                env,
                name: wn,
                target,
                version,
                ['service-worker']: sw,
            },
            src,
            type,
        } = script;

        /* c8 ignore start */
        const isAsync = !isSync(script);

        const versionValue = version?.value;
        const name = getRuntimeID(type, versionValue);
        let configValue = getValue(config, '|');
        const id = getValue(env, '') || `${name}${configValue}`;
        configValue = configValue.slice(1);

        const url = workerURL(script);
        if (url) {
            const XWorker = xworker(type, versionValue);
            const xworker$1 = new XWorker(url, {
                ...nodeInfo(script, type),
                version: versionValue,
                async: isAsync,
                config: configValue,
                serviceWorker: sw?.value,
            });
            handled.set(
                defineProperty(script, 'xworker', { value: xworker$1 }),
                { xworker: xworker$1 },
            );
            const workerName = wn?.value;
            if (workerName) workers[workerName].resolve(xworker$1.ready);
            return;
        }
        /* c8 ignore stop */

        const targetValue = getValue(target, '');
        const details = getDetails(type, id, name, versionValue, configValue);

        handled.set(
            defineProperty(script, 'target', targetDescriptor),
            details,
        );

        if (targetValue) targets.set(script, queryTarget(script, targetValue));

        // start fetching external resources ASAP
        const source = src ? fetch$1(src).text() : script.textContent;
        details.queue = details.queue.then(() =>
            execute(script, source, details.XWorker, isAsync),
        );
    }
};

/* c8 ignore start */
const env$1 = new Proxy(create(null), {
    get: (_, name) => new Promise(queueMicrotask).then(
        () => awaitInterpreter(name)
    ),
});

// attributes are tested via integration / e2e
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
    if (!prefixes.length) return;
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
    if (!prefixes.length) return;
    for (let { name, ownerElement: el } of $x(
        `.//@*[${prefixes
            .map((p) => `starts-with(name(),"${p}")`)
            .join(' or ')}]`,
        root,
    )) {
        const i = name.lastIndexOf('-');
        const type = name.slice(i + 1);
        if (type !== 'env') {
            el.addEventListener(type, listener);
            // automatically disable form controls that are not disabled already
            if ('disabled' in el && !el.disabled) {
                el.disabled = true;
                // set these to enable once the interpreter is known (registered + loaded)
                env$1[name.slice(0, i)].then(() => {
                    el.disabled = false;
                });
            }
        }
    }
};
/* c8 ignore stop */

const XWorker$1 = xworker();

const CUSTOM_SELECTORS = [];

const customObserver$1 = new Map();

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
const handleCustomType = async (node) => {
    for (const selector of CUSTOM_SELECTORS) {
        if (node.matches(selector)) {
            const type = types.get(selector);
            const details = registry.get(type);
            const { resolve } = waitList.get(type);
            const { options, known } = details;

            if (known.has(node)) return;
            known.add(node);

            for (const [selector, callback] of customObserver$1) {
                if (node.matches(selector)) await callback(node);
            }

            const {
                interpreter: runtime,
                configURL,
                config,
                version,
                env,
                onerror,
                hooks,
            } = options;

            let error;
            try {
                const worker = workerURL(node);
                if (worker) {
                    let v = version;
                    let url = configURL;
                    let cfg = node.getAttribute('config') || config || {};
                    if (!v || !cfg) {
                        const [o, u] = resolveConfig(cfg, configURL);
                        cfg = await o;
                        url = u;
                        v = cfg.version || cfg.interpreter;
                        if (v && /\.m?js$/.test(v))
                            v = new URL(v, url).href;
                    }

                    if (Number.isSafeInteger(cfg?.experimental_ffi_timeout))
                        globalThis.reflected_ffi_timeout = cfg.experimental_ffi_timeout;

                    const xworker = XWorker$1.call(new Hook$1(null, hooks), worker, {
                        ...nodeInfo(node, type),
                        configURL: url,
                        version: v,
                        type: runtime,
                        custom: type,
                        config: cfg,
                        async: !isSync(node),
                        serviceWorker: node.getAttribute('service-worker'),
                    });
                    defineProperty(node, 'xworker', { value: xworker });
                    resolve({ type, xworker });
                    const workerName = node.getAttribute('name');
                    if (workerName) workers[workerName].resolve(xworker.ready);
                    return;
                }
            }
            // let the custom type handle errors via its `io`
            catch (workerError) {
                error = workerError;
            }

            const name = getRuntimeID(runtime, version);
            const id = env || `${name}${config ? `|${config}` : ''}`;
            const { interpreter: engine, XWorker: Worker } = getDetails(
                type,
                id,
                name,
                version,
                config,
                configURL,
                runtime
            );

            const interpreter = await engine;

            const module = create(registry$1.get(runtime));

            const hook = new Hook$1(interpreter, hooks);

            const XWorker = function XWorker(...args) {
                return Worker.apply(hook, args);
            };

            const resolved = {
                ...createResolved(
                    module,
                    type,
                    structuredClone(configs.get(name)),
                    interpreter,
                ),
                XWorker,
            };

            registerJSModules(runtime, module, interpreter, JSModules);
            module.registerJSModule(interpreter, 'polyscript', {
                IDBMap,
                IDBMapSync,
                XWorker,
                config: resolved.config,
                currentScript: type.startsWith('_') ? null : node,
                js_modules: JSModules,
                workers: workersHandler,
            });

            // patch methods accordingly to hooks (and only if needed)
            for (const suffix of ['Run', 'RunAsync']) {
                let before = '';
                let after = '';

                for (const key of code) {
                    const value = hooks?.main?.[key];
                    if (value && key.endsWith(suffix)) {
                        if (key.startsWith('codeBefore'))
                            before = dedent(value());
                        else
                            after = dedent(value());
                    }
                }

                if (before || after) {
                    createOverload(
                        module,
                        `r${suffix.slice(1)}`,
                        before,
                        after,
                    );
                }

                let beforeCB, afterCB;
                // ignore onReady and onWorker
                for (let i = 2; i < js.length; i++) {
                    const key = js[i];
                    const value = hooks?.main?.[key];
                    if (value && key.endsWith(suffix)) {
                        if (key.startsWith('onBefore'))
                            beforeCB = value;
                        else
                            afterCB = value;
                    }
                }
                polluteJS(module, resolved, node, suffix.endsWith('Async'), beforeCB, afterCB);
            }

            details.queue = details.queue.then(() => {
                resolve(resolved);
                if (error) onerror?.(error, node);
                return hooks?.main?.onReady?.(resolved, node);
            });
        }
    }
};

/**
 * @type {Map<string, {options:object, known:WeakSet<Element>}>}
 */
const registry = new Map();

/**
 * @typedef {Object} CustomOptions custom configuration
 * @prop {'pyodide' | 'micropython' | 'ruby-wasm-wasi' | 'wasmoon'} interpreter the interpreter to use
 * @prop {string} [version] the optional interpreter version to use
 * @prop {string} [config] the optional config to use within such interpreter
 */

let dontBotherCount = 0;

/**
 * Allows custom types and components on the page to receive interpreters to execute any code
 * @param {string} type the unique `<script type="...">` identifier
 * @param {CustomOptions} options the custom type configuration
 */
const define$1 = (type, options) => {
    // allow no-type to be bootstrapped out of the box
    let dontBother = type == null;

    if (dontBother)
        type = `_ps${dontBotherCount++}`;
    else if (registry$1.has(type) || registry.has(type))
        throw new Error(`<script type="${type}"> already registered`);

    if (!registry$1.has(options?.interpreter))
        throw new Error('Unspecified interpreter');

    // allows reaching out the interpreter helpers on events
    registry$1.set(type, registry$1.get(options.interpreter));

    // allows selector -> registry by type
    const selectors = [`script[type="${type}"]`];

    // ensure a Promise can resolve once a custom type has been bootstrapped
    whenDefined$1(type);

    if (dontBother) {
        // add a script then cleanup everything once that's ready
        const { hooks } = options;
        const onReady = hooks?.main?.onReady;
        options = {
            ...options,
            hooks: {
                ...hooks,
                main: {
                    ...hooks?.main,
                    onReady(resolved, node) {
                        CUSTOM_SELECTORS.splice(CUSTOM_SELECTORS.indexOf(type), 1);
                        registry$1.delete(type);
                        registry.delete(type);
                        waitList.delete(type);
                        node.remove();
                        onReady?.(resolved);
                    }
                }
            },
        };
        document.head.append(
            assign(document.createElement('script'), { type })
        );
    }
    else {
        selectors.push(`${type}-script`);
        prefixes.push(`${type}-`);
    }

    for (const selector of selectors) types.set(selector, type);
    CUSTOM_SELECTORS.push(...selectors);

    // ensure always same env for this custom type
    registry.set(type, {
        options: assign({ env: type }, options),
        known: new WeakSet(),
        queue: Promise.resolve(),
    });

    if (!dontBother) addAllListeners(document);
    $$(selectors.join(',')).forEach(handleCustomType);
};

/**
 * Resolves whenever a defined custom type is bootstrapped on the page
 * @param {string} type the unique `<script type="...">` identifier
 * @returns {Promise<object>}
 */
const whenDefined$1 = (type) => {
    if (!waitList.has(type)) waitList.set(type, withResolvers$1());
    return waitList.get(type).promise;
};
/* c8 ignore stop */

/** @typedef {(type: string, options: import("./custom.js").CustomOptions) => void} CustomOptions */


// avoid multiple initialization of the same library
const [
    {
        customObserver,
        define,
        whenDefined,
        env,
        Hook,
        XWorker
    },
    alreadyLive
] = stickyModule(
    'polyscript',
    {
        customObserver: customObserver$1,
        define: define$1,
        whenDefined: whenDefined$1,
        env: env$1,
        Hook: Hook$1,
        XWorker: XWorker$1
    }
);


if (!alreadyLive) {
    const mo = new MutationObserver((records) => {
        const selector = selectors.join(',');
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
                    if (selector && node.matches(selector)) handle(node);
                    else bootstrap(selector, node, true);
                }
            }
            /* c8 ignore stop */
        }
    });

    /* c8 ignore start */
    const bootstrap = (selector, node, shouldHandle) => {
        if (selector) $$(selector, node).forEach(handle);
        selector = CUSTOM_SELECTORS.join(',');
        if (selector) {
            if (shouldHandle) handleCustomType(node);
            $$(selector, node).forEach(handleCustomType);
        }
    };
    /* c8 ignore stop */

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

    // give 3rd party a chance to apply changes before this happens
    queueMicrotask(() => {
        addAllListeners(observe(document));
        bootstrap(selectors.join(','), document, false);
    });

}

export { Hook, INVALID_CONTENT, INVALID_SRC_ATTR, INVALID_WORKER_ATTR, XWorker, customObserver, define, env, whenDefined };
//# sourceMappingURL=index.js.map
