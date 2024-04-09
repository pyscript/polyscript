// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export const io = new WeakMap();
export const stdio = (init) => {
    const context = init || console;
    const localIO = {
        // allow plugins or other io manipulating logic to reuse
        // the buffered utility exposed in here (see py-editor)
        buffered,
        stderr: (context.stderr || console.error).bind(context),
        stdout: (context.stdout || console.log).bind(context),
    };
    return {
        stderr: (...args) => localIO.stderr(...args),
        stdout: (...args) => localIO.stdout(...args),
        async get(engine) {
            const interpreter = await engine;
            io.set(interpreter, localIO);
            return interpreter;
        },
    };
};

const decoder = new TextDecoder();
export const buffered = (callback, EOL = 10) => {
    const buffer = [];
    return (maybeUI8) => {
        if (maybeUI8 instanceof Uint8Array) {
            for (const c of maybeUI8) {
                if (c === EOL)
                    callback(decoder.decode(new Uint8Array(buffer.splice(0))));
                else
                    buffer.push(c);
            }
        }
        // if io.stderr(error) is passed instead
        // or any io.stdout("thing") this should
        // still work as expected
        else {
            callback(maybeUI8);
        }
    };
};
/* c8 ignore stop */
