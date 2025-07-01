// ⚠️ This file is used to generate xworker.js
//    That means if any import is circular or brings in too much
//    that would be a higher payload for every worker.
//    Please check via `npm run size` that worker code is not much
//    bigger than it used to be before any changes is applied to this file.

import IDBMap from '@webreflection/idb-map';
import IDBMapSync from '@webreflection/idb-map/sync';

import coincident from 'coincident/window/worker';

import { assign, create, createFunction, createOverload, createResolved, dispatch, registerJSModules } from '../utils.js';
import createJSModules from './js_modules.js';
import { configs, registry } from '../interpreters.js';
import { getRuntime, getRuntimeID } from '../loader.js';
import { patch, polluteJS, js as jsHooks, code as codeHooks } from '../hooks.js';

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

const {
    proxy: sync,
    sync: polyfill,
    native,
    window,
    isWindowProxy,
    ffi,
} = await coincident({
    transfer: false,
    transform: value => transform ? transform(value) : value
});

const xworker = {
    // propagate the fact SharedArrayBuffer is polyfilled
    polyfill,
    // allows synchronous utilities between this worker and the main thread
    sync,
    // allow access to the main thread world whenever it's possible
    window: (native || polyfill) ? window : null,
    // allow introspection for foreign (main thread) refrences
    isWindowProxy,
    // standard worker related events / features
    onmessage: console.info,
    onerror: console.error,
    onmessageerror: console.warn,
    postMessage: postMessage.bind(self),
};

add('message', ({ data: { options, config: baseURL, configURL, code, hooks } }) => {
    interpreter = (async () => {
        try {
            const { id, tag, type, custom, version, config, async: isAsync } = options;

            const runtimeID = getRuntimeID(type, version);

            const interpreter = await getRuntime(runtimeID, baseURL, configURL, config);

            const { js_modules } = configs.get(runtimeID);

            const mainModules = js_modules?.main;

            const details = create(registry.get(type));

            const resolved = createResolved(
                details,
                custom || type,
                config || {},
                interpreter
            );

            let name = 'run';
            if (isAsync) name += 'Async';

            if (hooks) {
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

                if (before || after)
                    createOverload(details, name, before, after);

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

            // there's no way to query the DOM, use foreign CustomEvent and so on
            // in case there's no SharedArrayBuffer around.
            let CustomEvent, document, notify, currentScript = null, target = '';
            if (native || polyfill) {
                ({ CustomEvent, document } = window);
                currentScript = id && document.getElementById(id) || null;
                notify = kind => dispatch(currentScript, custom || type, kind, true, CustomEvent);
            }

            // TODO: even this is problematic without SharedArrayBuffer
            // but let's see if we can manage to make it work somehow.
            const JSModules = createJSModules(window, sync, mainModules, baseURL);

            registerJSModules(type, details, interpreter, JSModules);
            details.registerJSModule(interpreter, 'polyscript', {
                IDBMap,
                IDBMapSync,
                xworker,
                currentScript,
                config: resolved.config,
                js_modules: JSModules,
                ffi,
                get target() {
                    if (!target && currentScript) {
                        if (tag === 'SCRIPT') {
                            currentScript.after(assign(
                                window.document.createElement(`script-${custom || type}`),
                                { id: (target = `${id}-target`) }
                            ));
                        }
                        else {
                            target = id;
                            currentScript.replaceChildren();
                            currentScript.style.display = 'block';
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
            if (currentScript) notify('ready');

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

            if (['micropython', 'pyodide'].includes(details.type)) {
                // this dance is required due Pyodide issues with runtime sync exports
                // or MicroPython issue with `runPython` not returning values
                const polyscript = 'polyscript';
                const workers = `__${polyscript}_workers__`;
                const exports = '__export__';
                interpreter.runPython([
                    `import js as ${workers}`,
                    `${workers}.${workers} = "${exports}" in locals() and ${exports} or []`,
                    `del ${workers}`,
                ].join('\n'));
                const list = [...globalThis[workers]];
                delete globalThis[workers];
                if (list.length) {
                    interpreter.runPython([
                        `from ${polyscript} import xworker as ${workers}`,
                        ...list.map(util => `${workers}.sync.${util} = ${util}`),
                        `del ${workers}`,
                    ].join('\n'));
                }
            }

            // notify worker done executing
            if (currentScript) notify('done');
            postMessage('polyscript:done');
            return interpreter;
        } catch (error) {
            postMessage(error);
        }
    })();
    add('error');
    add('message');
    add('messageerror');
    if (native || polyfill) {
        addEventListener('py:progress', ({ type, detail }) => {
            window.dispatchEvent(new window.CustomEvent(type, { detail }));
        });
    }
});
