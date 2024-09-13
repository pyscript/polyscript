import IDBMapSync from '@webreflection/idb-map/sync';
import $dedent from 'codedent';
import { unescape as $unescape } from 'html-escaper';
import { io } from './interpreter/_io.js';

/** @type {(tpl: string | TemplateStringsArray, ...values:any[]) => string} */
const dedent = $dedent;

/** @type {(value:string) => string} */
const unescape = $unescape;

const { isArray } = Array;

const { assign, create, defineProperties, defineProperty, entries } = Object;

const { all, resolve } = new Proxy(Promise, {
    get: ($, name) => $[name].bind($),
});

const absoluteURL = (path, base = location.href) =>
    new URL(path, base.replace(/^blob:/, '')).href;

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

export const createFunction = value => Function(`'use strict';return (${value})`)();

export const createResolved = (module, type, config, interpreter) => ({
    type,
    config,
    interpreter,
    io: io.get(interpreter),
    run: (code, ...args) => module.run(interpreter, code, ...args),
    runAsync: (code, ...args) => module.runAsync(interpreter, code, ...args),
    runEvent: (...args) => module.runEvent(interpreter, ...args),
});

const dropLine0 = code => code.replace(/^(?:\n|\r\n)/, '');

export const createOverload = (module, name, before, after) => {
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

export const js_modules = Symbol.for('polyscript.js_modules');

const jsModules = new Map;
defineProperty(globalThis, js_modules, { value: jsModules });

export const JSModules = new Proxy(jsModules, {
    get: (map, name) => map.get(name),
    has: (map, name) => map.has(name),
    ownKeys: map => [...map.keys()],
});

const has = (_, field) => !field.startsWith('_');

const proxy = (modules, name) => new Proxy(
    modules,
    { has, get: (modules, field) => modules[name][field] }
);

export const registerJSModules = (type, module, interpreter, modules) => {
    // Pyodide resolves JS modules magically
    if (type === 'pyodide') return;

    // other runtimes need this pretty ugly dance (it works though)
    const jsModules = 'polyscript.js_modules';
    for (const name of Reflect.ownKeys(modules))
        module.registerJSModule(interpreter, `${jsModules}.${name}`, proxy(modules, name));
    module.registerJSModule(interpreter, jsModules, modules);
};

export const importJS = (source, name) => import(source).then(esm => {
    jsModules.set(name, { ...esm });
});

export const importCSS = href => new Promise((onload, onerror) => {
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

export const isCSS = source => /\.css$/i.test(new URL(source).pathname);

export const isSync = element =>
    /^(?:false|0|no)$/i.test(element.getAttribute('async'));

/* c8 ignore stop */

export {
    IDBMapSync,
    dedent, unescape,
    dispatch,
    isArray,
    assign,
    create,
    defineProperties,
    defineProperty,
    entries,
    all,
    resolve,
    absoluteURL,
    nodeInfo,
};
