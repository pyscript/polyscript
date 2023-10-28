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
const original = new WeakMap;
function patch(resolved, interpreter) {
    const { run, runAsync } = original.get(this);
    return {
        ...resolved,
        run: run.bind(this, interpreter),
        runAsync: runAsync.bind(this, interpreter)
    };
}

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
        if (!original.has(module)) {
            const { run, runAsync } = module;
            original.set(module, { run, runAsync });
        }
        const patched = patch.bind(module, resolved);
        const name = isAsync ? 'runAsync' : 'run';
        const method = module[name];
        module[name] = isAsync ?
            async function (interpreter, code, ...args) {
                if (before) await before.call(this, patched(interpreter), ref);
                const result = await method.call(
                    this,
                    interpreter,
                    code,
                    ...args
                );
                if (after) await after.call(this, patched(interpreter), ref);
                return result;
            } :
            function (interpreter, code, ...args) {
                if (before) before.call(this, patched(interpreter), ref);
                const result = method.call(this, interpreter, code, ...args);
                if (after) after.call(this, patched(interpreter), ref);
                return result;
            }
        ;
    }
};
/* c8 ignore stop */
