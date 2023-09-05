// ⚠️ This file is used to generate xworker.js
//    That means if any import is circular or brings in too much
//    that would be a higher payload for every worker.
//    Please check via `npm run size` that worker code is not much
//    bigger than it used to be before any changes is applied to this file.

import * as JSON from '@ungap/structured-clone/json';
import coincident from 'coincident/window';

import { assign, create } from '../utils.js';
import { registry } from '../interpreters.js';
import { getRuntime, getRuntimeID } from '../loader.js';

// bails out out of the box with a native/meaningful error
// in case the SharedArrayBuffer is not available
try {
    new SharedArrayBuffer(4);
} catch (_) {
    throw new Error(
        [
            'Unable to use SharedArrayBuffer due insecure environment.',
            'Please read requirements in MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements',
        ].join('\n'),
    );
}

let interpreter, runEvent, transform;
const add = (type, fn) => {
    addEventListener(
        type,
        fn ||
            (async (event) => {
                try {
                    await interpreter;
                    runEvent(`xworker.on${type}`, event);
                } catch (error) {
                    postMessage(error);
                }
            }),
        !!fn && { once: true },
    );
};

const { parse, stringify } = JSON;

const { proxy: sync, window, isWindowProxy } = coincident(self, {
    parse,
    stringify,
    transform: value => transform ? transform(value) : value
});

const xworker = {
    // allows synchronous utilities between this worker and the main thread
    sync,
    // allow access to the main thread world
    window,
    // allow introspection for foreign (main thread) refrences
    isWindowProxy,
    // standard worker related events / features
    onmessage: console.info,
    onerror: console.error,
    onmessageerror: console.warn,
    postMessage: postMessage.bind(self),
};

add('message', ({ data: { options, config: baseURL, code, hooks } }) => {
    interpreter = (async () => {
        try {
            const { id, tag, type, version, config, async: isAsync } = options;
            const interpreter = await getRuntime(
                getRuntimeID(type, version),
                baseURL,
                config
            );
            const details = create(registry.get(type));
            const name = `run${isAsync ? 'Async' : ''}`;

            if (hooks) {
                // patch code if needed
                const { beforeRun, beforeRunAsync, afterRun, afterRunAsync } =
                    hooks;

                const after = afterRun || afterRunAsync;
                const before = beforeRun || beforeRunAsync;

                // append code that should be executed *after* first
                if (after) {
                    const method = details[name].bind(details);
                    details[name] = (interpreter, code, ...args) =>
                        method(interpreter, `${code}\n${after}`, ...args);
                }

                // prepend code that should be executed *before* (so that after is post-patched)
                if (before) {
                    const method = details[name].bind(details);
                    details[name] = (interpreter, code, ...args) =>
                        method(interpreter, `${before}\n${code}`, ...args);
                }
            }

            let target = '';

            // set the `xworker` global reference once
            details.registerJSModule(interpreter, 'polyscript', {
                xworker,
                get target() {
                    if (!target) {
                        const { document } = xworker.window;
                        const element = document.getElementById(id);
                        if (tag === 'SCRIPT') {
                            element.after(assign(
                                document.createElement(`script-${type}`),
                                { id: (target = `${id}-target`) }
                            ));
                        }
                        else {
                            element.replaceChildren();
                            element.style.display = 'block';
                        }
                    }
                    return target;
                }
            });

            // simplify runEvent calls
            runEvent = details.runEvent.bind(details, interpreter);

            // allows transforming arguments with sync
            transform = details.transform.bind(details, interpreter);

            // run either sync or async code in the worker
            await details[name](interpreter, code);
            return interpreter;
        } catch (error) {
            postMessage(error);
        }
    })();
    add('error');
    add('message');
    add('messageerror');
});
