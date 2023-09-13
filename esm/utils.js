import dedent from 'codedent';

const { isArray } = Array;

const { assign, create, defineProperties, defineProperty, entries } = Object;

const { all, resolve } = new Proxy(Promise, {
    get: ($, name) => $[name].bind($),
});

const absoluteURL = (path, base = location.href) => new URL(path, base).href;

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
 * @param {boolean} worker `true` if dispatched form a worker, `false` if in main
 * @param {globalThis.CustomEvent} CustomEvent the right global to use
 */
const dispatch = (target, type, worker, CustomEvent) => {
    target.dispatchEvent(
        new CustomEvent(`${type}:ready`, {
            bubbles: true,
            detail: { worker },
        })
    );
};
/* c8 ignore stop */

export {
    dedent,
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
