import $dedent from 'codedent';
import { unescape as $unescape } from 'html-escaper';
import { io } from './interpreter/_utils.js';

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

export const createOverload = (module, name) => ($, pre) => {
    const method = module[name].bind(module);
    module[name] = (interpreter, code, ...args) =>
        method(interpreter, `${pre ? $ : code}\n${pre ? code : $}`, ...args);
};
/* c8 ignore stop */

export {
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
