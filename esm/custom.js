import withResolvers from '@webreflection/utils/with-resolvers';
import { $$ } from 'basic-devtools';

import IDBMap from '@webreflection/idb-map';
import IDBMapSync from '@webreflection/idb-map/sync';

import { JSModules, isSync, assign, create, createOverload, createResolved, dedent, defineProperty, nodeInfo, registerJSModules } from './utils.js';
import { getDetails } from './script-handler.js';
import { registry as defaultRegistry, prefixes, configs } from './interpreters.js';
import { getRuntimeID, resolveConfig } from './loader.js';
import { addAllListeners } from './listeners.js';
import { Hook, XWorker as XW } from './xworker.js';
import { workers, workersHandler } from './workers.js';
import { polluteJS, js as jsHooks, code as codeHooks } from './hooks.js';
import workerURL from './worker/url.js';

export const CUSTOM_SELECTORS = [];

export const customObserver = new Map();

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
export const handleCustomType = async (node) => {
    for (const selector of CUSTOM_SELECTORS) {
        if (node.matches(selector)) {
            const type = types.get(selector);
            const details = registry.get(type);
            const { resolve } = waitList.get(type);
            const { options, known } = details;

            if (known.has(node)) return;
            known.add(node);

            for (const [selector, callback] of customObserver) {
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

                    const xworker = XW.call(new Hook(null, hooks), worker, {
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

            const module = create(defaultRegistry.get(runtime));

            const hook = new Hook(interpreter, hooks);

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

                for (const key of codeHooks) {
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
                for (let i = 2; i < jsHooks.length; i++) {
                    const key = jsHooks[i];
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
export const define = (type, options) => {
    // allow no-type to be bootstrapped out of the box
    let dontBother = type == null;

    if (dontBother)
        type = `_ps${dontBotherCount++}`;
    else if (defaultRegistry.has(type) || registry.has(type))
        throw new Error(`<script type="${type}"> already registered`);

    if (!defaultRegistry.has(options?.interpreter))
        throw new Error('Unspecified interpreter');

    // allows reaching out the interpreter helpers on events
    defaultRegistry.set(type, defaultRegistry.get(options.interpreter));

    // allows selector -> registry by type
    const selectors = [`script[type="${type}"]`];

    // ensure a Promise can resolve once a custom type has been bootstrapped
    whenDefined(type);

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
                        defaultRegistry.delete(type);
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
export const whenDefined = (type) => {
    if (!waitList.has(type)) waitList.set(type, withResolvers());
    return waitList.get(type).promise;
};
/* c8 ignore stop */
