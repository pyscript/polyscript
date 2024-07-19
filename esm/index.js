/** @typedef {(type: string, options: import("./custom.js").CustomOptions) => void} CustomOptions */

import stickyModule from 'sticky-module';
import { $$ } from 'basic-devtools';

import { handle } from './script-handler.js';
import { assign } from './utils.js';
import { selectors, prefixes } from './interpreters.js';
import { listener, addAllListeners } from './listeners.js';

import {
    CUSTOM_SELECTORS,
    handleCustomType,
    customObserver as $customObserver,
    define as $define,
    whenDefined as $whenDefined
} from './custom.js';

import { env as $env } from './listeners.js';
import { Hook as $Hook, XWorker as $XWorker } from './xworker.js';

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
        customObserver: $customObserver,
        define: $define,
        whenDefined: $whenDefined,
        env: $env,
        Hook: $Hook,
        XWorker: $XWorker
    }
);

export {
    customObserver,
    define,
    whenDefined,
    env,
    Hook,
    XWorker
};

export * from './errors.js';


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
