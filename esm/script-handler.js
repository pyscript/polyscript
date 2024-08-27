import fetch from '@webreflection/fetch';
import { $ } from 'basic-devtools';

import { workers, workersHandler } from './workers.js';
import $xworker from './worker/class.js';
import workerURL from './worker/url.js';
import { getRuntime, getRuntimeID } from './loader.js';
import { registry } from './interpreters.js';
import { JSModules, isSync, all, dispatch, resolve, defineProperty, nodeInfo, registerJSModules } from './utils.js';

const getRoot = (script) => {
    let parent = script;
    while (parent.parentNode) parent = parent.parentNode;
    return parent;
};

export const queryTarget = (script, idOrSelector) => {
    const root = getRoot(script);
    return root.getElementById(idOrSelector) || $(idOrSelector, root);
};

const targets = new WeakMap();
const targetDescriptor = {
    get() {
        let target = targets.get(this);
        if (!target) {
            target = document.createElement(`${this.type}-script`);
            targets.set(this, target);
            handle(this);
        }
        return target;
    },
    set(target) {
        if (typeof target === 'string')
            targets.set(this, queryTarget(this, target));
        else {
            targets.set(this, target);
            handle(this);
        }
    },
};

const handled = new WeakMap();

export const interpreters = new Map();

const execute = async (currentScript, source, XWorker, isAsync) => {
    const { type } = currentScript;
    const module = registry.get(type);
    /* c8 ignore start */
    if (module.experimental)
        console.warn(`The ${type} interpreter is experimental`);
    const [interpreter, content] = await all([
        handled.get(currentScript).interpreter,
        source,
    ]);
    try {
        registerJSModules(type, module, interpreter, JSModules);
        module.registerJSModule(interpreter, 'polyscript', {
            XWorker,
            currentScript,
            js_modules: JSModules,
            workers: workersHandler,
        });
        dispatch(currentScript, type, 'ready');
        // temporarily override inherited document.currentScript in a non writable way
        // but it deletes it right after to preserve native behavior (as it's sync: no trouble)
        defineProperty(document, 'currentScript', {
            configurable: true,
            get: () => currentScript,
        });
        const done = dispatch.bind(null, currentScript, type, 'done');
        let result = module[isAsync ? 'runAsync' : 'run'](interpreter, content);
        if (isAsync) result = await result;
        done();
        return result;
    } finally {
        delete document.currentScript;
    }
    /* c8 ignore stop */
};

const getValue = (ref, prefix) => {
    const value = ref?.value;
    return value ? prefix + value : '';
};

export const getDetails = (type, id, name, version, config, configURL, runtime = type) => {
    if (!interpreters.has(id)) {
        const details = {
            interpreter: getRuntime(name, config, configURL),
            queue: resolve(),
            XWorker: $xworker(type, version),
        };
        interpreters.set(id, details);
        // enable sane defaults when single interpreter *of kind* is used in the page
        // this allows `xxx-*` attributes to refer to such interpreter without `env` around
        /* c8 ignore start *//* this is tested very well in PyScript */
        if (!interpreters.has(type)) interpreters.set(type, details);
        if (!interpreters.has(runtime)) interpreters.set(runtime, details);
        /* c8 ignore stopt */
    }
    return interpreters.get(id);
};

/**
 * @param {HTMLScriptElement} script a special type of <script>
 */
export const handle = async (script) => {
    // known node, move its companion target after
    // vDOM or other use cases where the script is a tracked element
    if (handled.has(script)) {
        const { target } = script;
        if (target) {
            // if the script is in the head just append target to the body
            if (script.closest('head')) document.body.append(target);
            // in any other case preserve the script position
            else script.after(target);
        }
    }
    // new script to handle ... allow newly created scripts to work
    // just exactly like any other script would
    else {
        // allow a shared config among scripts, beside interpreter,
        // and/or source code with different config or interpreter
        const {
            attributes: {
                config,
                env,
                name: wn,
                target,
                version,
                ['service-worker']: sw,
            },
            src,
            type,
        } = script;

        /* c8 ignore start */
        const isAsync = !isSync(script);

        const versionValue = version?.value;
        const name = getRuntimeID(type, versionValue);
        let configValue = getValue(config, '|');
        const id = getValue(env, '') || `${name}${configValue}`;
        configValue = configValue.slice(1);

        const url = workerURL(script);
        if (url) {
            const XWorker = $xworker(type, versionValue);
            const xworker = new XWorker(url, {
                ...nodeInfo(script, type),
                version: versionValue,
                async: isAsync,
                config: configValue,
                serviceWorker: sw?.value,
            });
            handled.set(
                defineProperty(script, 'xworker', { value: xworker }),
                { xworker },
            );
            const workerName = wn?.value;
            if (workerName) workers[workerName].resolve(xworker.ready);
            return;
        }
        /* c8 ignore stop */

        const targetValue = getValue(target, '');
        const details = getDetails(type, id, name, versionValue, configValue);

        handled.set(
            defineProperty(script, 'target', targetDescriptor),
            details,
        );

        if (targetValue) targets.set(script, queryTarget(script, targetValue));

        // start fetching external resources ASAP
        const source = src ? fetch(src).text() : script.textContent;
        details.queue = details.queue.then(() =>
            execute(script, source, details.XWorker, isAsync),
        );
    }
};
