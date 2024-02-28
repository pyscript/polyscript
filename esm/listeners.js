import { $x } from 'basic-devtools';

import { interpreters } from './script-handler.js';
import { all, create } from './utils.js';
import { registry, prefixes } from './interpreters.js';

/* c8 ignore start */
export const env = new Proxy(create(null), {
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

export const listener = async (event) => {
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
        const handler = registry.get(name);
        handler.runEvent(interpreter, value, event);
    }
};

/**
 * Look for known prefixes and add related listeners.
 * @param {Document | Element} root
 */
export const addAllListeners = (root) => {
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
                env[name.slice(0, i)].then(() => {
                    el.disabled = false;
                });
            }
        }
    }
};
/* c8 ignore stop */
