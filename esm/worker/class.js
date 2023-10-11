import * as JSON from '@ungap/structured-clone/json';
import coincident from 'coincident/window';
import xworker from './xworker.js';
import { getConfigURLAndType } from '../loader.js';
import { assign, create, defineProperties } from '../utils.js';
import { getText } from '../fetch-utils.js';
import { Hook } from './hooks.js';

/**
 * @typedef {Object} WorkerOptions custom configuration
 * @prop {string} type the interpreter type to use
 * @prop {string} [version] the optional interpreter version to use
 * @prop {string} [config] the optional config to use within such interpreter
 */

export default (...args) =>
    /**
     * A XWorker is a Worker facade able to bootstrap a channel with any desired interpreter.
     * @param {string} url the remote file to evaluate on bootstrap
     * @param {WorkerOptions} [options] optional arguments to define the interpreter to use
     * @returns {Worker}
     */
    function XWorker(url, options) {
        const worker = xworker();
        const { postMessage } = worker;
        const isHook = this instanceof Hook;

        if (args.length) {
            const [type, version] = args;
            options = assign({}, options || { type, version });
            if (!options.type) options.type = type;
        }

        // provide a base url to fetch or load config files from a Worker
        // because there's no location at all in the Worker as it's embedded.
        // fallback to a generic, ignored, config.txt file to still provide a URL.
        const [ config ] = getConfigURLAndType(options.config);

        const bootstrap = fetch(url)
            .then(getText)
            .then(code => {
                const hooks = isHook ? this.stringHooks : void 0;
                postMessage.call(worker, { options, config, code, hooks });
            });

        defineProperties(worker, {
            postMessage: {
                value: (data, ...rest) =>
                    bootstrap.then(() =>
                        postMessage.call(worker, data, ...rest),
                    ),
            },
            sync: {
                value: coincident(worker, JSON).proxy,
            },
            onerror: {
                writable: true,
                configurable: true,
                value: console.error
            }
        });

        if (isHook) this.onWorkerReady?.(this.interpreter, worker);

        worker.addEventListener('message', event => {
            const { data } = event;
            if (data instanceof Error) {
                event.stopImmediatePropagation();
                worker.onerror(create(event, {
                    type: { value: 'error' },
                    error: { value: data }
                }));
            }
        });

        return worker;
    };
