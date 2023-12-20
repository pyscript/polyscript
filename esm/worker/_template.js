// ⚠️ This file is used to generate xworker.js
//    That means if any import is circular or brings in too much
//    that would be a higher payload for every worker.
//    Please check via `npm run size` that worker code is not much
//    bigger than it used to be before any changes is applied to this file.

import * as JSON from '@ungap/structured-clone/json';
import coincident from 'coincident/window';

import { assign, create, createFunction, createOverload, createResolved, dispatch, registerJSModules } from '../utils.js';
import createJSModules from './js_modules.js';
import { configs, registry } from '../interpreters.js';
import { getRuntime, getRuntimeID } from '../loader.js';
import { patch, polluteJS, js as jsHooks, code as codeHooks } from '../hooks.js';

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
            const { id, tag, type, custom, version, config, async: isAsync } = options;
            const runtimeID = getRuntimeID(type, version);

            const interpreter = await getRuntime(runtimeID, baseURL, config);

            const mainModules = configs.get(runtimeID).js_modules?.main;

            const details = create(registry.get(type));

            const resolved = createResolved(
                details,
                custom || type,
                config,
                interpreter
            );

            let name = 'run';
            if (isAsync) name += 'Async';

            if (hooks) {
                const overload = createOverload(details, name);

                let before = '';
                let after = '';

                for (const key of codeHooks) {
                    const value = hooks[key];
                    if (value) {
                        const asyncCode = key.endsWith('Async');
                        // either async hook and this worker is async
                        // or sync hook and this worker is sync
                        // other shared options possible cases are ignored
                        if ((asyncCode && isAsync) || (!asyncCode && !isAsync)) {
                            if (key.startsWith('codeBefore'))
                                before = value;
                            else
                                after = value;
                        }
                    }
                }

                // append code that should be executed *after* first
                if (after) overload(after, false);

                // prepend code that should be executed *before* (so that after is post-patched)
                if (before) overload(before, true);

                let beforeCB, afterCB;
                // exclude onWorker and onReady
                for (const key of jsHooks.slice(2)) {
                    const value = hooks[key];
                    if (value) {
                        const asyncCode = key.endsWith('Async');
                        if ((asyncCode && isAsync) || (!asyncCode && !isAsync)) {
                            const cb = createFunction(value);
                            if (key.startsWith('onBefore'))
                                beforeCB = cb;
                            else
                                afterCB = cb;
                        }
                    }
                }
                polluteJS(details, resolved, xworker, isAsync, beforeCB, afterCB);
            }

            const { CustomEvent, document } = window;
            const element = id && document.getElementById(id) || null;
            const notify = kind => dispatch(element, custom || type, kind, true, CustomEvent);
            const JSModules = createJSModules(window, sync, mainModules);

            let target = '';

            registerJSModules(type, details, interpreter, JSModules);
            details.registerJSModule(interpreter, 'polyscript', {
                xworker,
                js_modules: JSModules,
                get target() {
                    if (!target && element) {
                        if (tag === 'SCRIPT') {
                            element.after(assign(
                                document.createElement(`script-${custom || type}`),
                                { id: (target = `${id}-target`) }
                            ));
                        }
                        else {
                            target = id;
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

            // notify worker ready to execute
            if (element) notify('ready');

            // evaluate the optional `onReady` callback
            if (hooks?.onReady) {
                createFunction(hooks?.onReady).call(
                    details,
                    patch.call(details, resolved, interpreter),
                    xworker,
                );
            }

            // run either sync or async code in the worker
            await details[name](interpreter, code);

            // notify worker done executing
            if (element) notify('done');
            return interpreter;
        } catch (error) {
            postMessage(error);
        }
    })();
    add('error');
    add('message');
    add('messageerror');
});
