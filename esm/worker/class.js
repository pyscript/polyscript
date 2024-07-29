import fetch from '@webreflection/fetch';
import xworker from './xworker.js';
import { getConfigURLAndType } from '../loader.js';
import { assign, create, defineProperties, importCSS, importJS } from '../utils.js';
import Hook from './hook.js';

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
export default (...args) =>
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
        const worker = xworker({ serviceWorker });
        const { postMessage } = worker;
        const isHook = this instanceof Hook;

        const sync = assign(
            worker.proxy,
            { importJS, importCSS },
        );

        const resolver = Promise.withResolvers();

        let bootstrap = fetch(url)
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