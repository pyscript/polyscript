const beforeRun = 'BeforeRun';
const afterRun = 'AfterRun';

export const code = [
    `code${beforeRun}`,
    `code${beforeRun}Async`,
    `code${afterRun}`,
    `code${afterRun}Async`,
];

export const js = [
    'onWorker',
    'onReady',
    `on${beforeRun}`,
    `on${beforeRun}Async`,
    `on${afterRun}`,
    `on${afterRun}Async`,
];

/* c8 ignore start */
/**
 * Created the wrapper to pass along hooked callbacks.
 * @param {object} module the details module
 * @param {object} ref the node or reference to pass as second argument
 * @param {boolean} isAsync if run should be async
 * @param {function?} before callback to run before
 * @param {function?} after callback to run after
 * @returns {object}
 */
export const polluteJS = (module, resolved, ref, isAsync, before, after) => {
    if (before || after) {
        const name = isAsync ? 'runAsync' : 'run';
        const method = module[name];
        module[name] = isAsync ?
            async function (interpreter, code, ...args) {
                if (before) await before.call(this, resolved, ref);
                const result = await method.call(
                    this,
                    interpreter,
                    code,
                    ...args
                );
                if (after) await after.call(this, resolved, ref);
                return result;
            } :
            function (interpreter, code, ...args) {
                if (before) before.call(this, resolved, ref);
                const result = method.call(this, interpreter, code, ...args);
                if (after) after.call(this, resolved, ref);
                return result;
            }
        ;
    }
};
/* c8 ignore stop */
