import toJSONCallback from 'to-json-callback';

import { dedent } from '../utils.js';
import { js as jsHooks, code as codeHooks } from '../hooks.js';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default class Hook {
    constructor(interpreter, hooks = {}) {
        const { main, worker } = hooks;
        this.interpreter = interpreter;
        this.onWorker = main?.onWorker;
        // ignore onWorker as that's main only
        for (const key of jsHooks.slice(1))
            this[key] = worker?.[key];
        for (const key of codeHooks)
            this[key] = worker?.[key];
    }
    toJSON() {
        const hooks = {};
        // ignore onWorker as that's main only
        for (const key of jsHooks.slice(1)) {
            if (this[key]) hooks[key] = toJSONCallback(this[key]);
        }
        // code related: exclude `onReady` callback
        for (const key of codeHooks) {
            if (this[key]) hooks[key] = dedent(this[key]());
        }
        return hooks;
    }
}
/* c8 ignore stop */
