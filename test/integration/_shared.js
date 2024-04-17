'use strict';

exports.shared = {
    bootstrap: ({ expect }, baseURL) => async ({ page }) => {
        await page.goto(`${baseURL}/bootstrap.html`);
        await page.waitForSelector('html.ready');
        await page.getByRole('button').click();
        const result = await page.evaluate(() => document.body.innerText);
        await expect(result.trim()).toBe('OK');
    },

    justClick: ({ expect }, baseURL) => async ({ page }) => {
        // Test that a config passed as object works out of the box.
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${baseURL}/just-click.html`);
        await page.waitForSelector('html.ready');
        await page.getByRole('button').click();
        // this is ugly ... reaction time really slow on listeners (100 is safe)
        await new Promise($ => setTimeout($, 100));
        await expect(/\bOK\b/.test(logs.at(-1))).toBe(true);
    },

    worker: ({ expect }, url) => async ({ page }) => {
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(url);
        await page.waitForSelector('html.worker.ready');
        await expect(logs.filter(log => log !== 'polyscript:done').join(',')).toBe('main,thread');
    },

    workerWindow: ({ expect }, baseURL) => async ({ page }) => {
        await page.goto(`${baseURL}/worker-window.html`);
        await page.waitForSelector('html.worker.ready');
        const result = await page.evaluate(() => document.body.innerText);
        await expect(result.trim()).toBe('OK');
    },
};

exports.python = {
    bootstrap: ({ expect }, baseURL) => async ({ page }) => {
        await page.goto(`${baseURL}/bootstrap.html`);
        await page.waitForSelector('html.ready');
        const result = await page.evaluate(() => document.body.innerText);
        await expect(result.trim()).toBe('OK');
    },

    configAsObject: ({ expect }, baseURL) => async ({ page }) => {
        // Test that a config passed as object works out of the box.
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${baseURL}/config-object.html`);
        await page.waitForSelector('html.worker');
        await expect(logs.length).toBe(1);
        await expect(logs[0]).toBe('hello from A');
    },

    configAsJSON: ({ expect }, baseURL) => async ({ page }) => {
        // Test that a config passed as object works out of the box.
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${baseURL}/config-json.html`);
        await page.waitForSelector('html.ready');
        await expect(logs.at(-1)).toBe('hello from A');
    },

    customHooks: ({ expect }, baseURL) => async ({ page }) => {
        // Test that a config passed as object works out of the box.
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${baseURL}/custom-hooks.html`);
        await page.waitForSelector('html.done');
        await expect(logs.join(',')).toBe([
            'onMainReady',
            'onBeforeRun',
            'codeBeforeRunMain',
            'script',
            'codeAfterRunMain',
            'onAfterRun',

            'onMainReady',
            'onBeforeRunAsync',
            'codeBeforeRunAsyncMain',
            'script-async',
            'codeAfterRunAsyncMain',
            'onAfterRunAsync',

            'onWorkerMain',
            'onWorkerReady',
            'onBeforeRunWorker',
            'codeBeforeRun',
            'script-worker',
            'codeAfterRun',
            'onAfterRunWorker',

            'onWorkerMain',
            'onWorkerReady',
            'onBeforeRunAsyncWorker',
            'codeBeforeRunAsync',
            'script-async-worker',
            'codeAfterRunAsync',
            'onAfterRunAsyncWorker',

            'onMainReady',
            'onBeforeRun',
            'codeBeforeRunMain',
            'mpy',
            'codeAfterRunMain',
            'onAfterRun',

            'onMainReady',
            'onBeforeRunAsync',
            'codeBeforeRunAsyncMain',
            'mpy-async',
            'codeAfterRunAsyncMain',
            'onAfterRunAsync',

            'onWorkerMain',
            'onWorkerReady',
            'onBeforeRunWorker',
            'codeBeforeRun',
            'mpy-worker',
            'codeAfterRun',
            'onAfterRunWorker',

            'onWorkerMain',
            'onWorkerReady',
            'onBeforeRunAsyncWorker',
            'codeBeforeRunAsync',
            'mpy-async-worker',
            'codeAfterRunAsync',
            'onAfterRunAsyncWorker',
        ].join(','));
    },

    disabledUntilReady: ({ expect }, baseURL) => async ({ page }) => {
        await page.goto(`${baseURL}/button.html`);
        await page.waitForSelector('button[disabled]');
        await page.waitForSelector('button:not([disabled])');
        const button = await page.getByRole('button');
        await button.click();
        const result = await page.evaluate(() => document.querySelector('button').textContent);
        await expect(result).toContain('clicked');
    },

    waitForReadyDone: ({ expect }, url) => async ({ page }) => {
        await page.goto(url);
        await page.waitForSelector('html.done');
        const [ready, done] = await page.evaluate(() => [ready, done]);
        await expect(ready.length).toBe(4);
        await expect(done.length).toBe(4);
        await expect(ready.join(',')).toBe('micropython:ready,micropython:ready,micropython:ready,micropython:ready');
        await expect(done.join(',')).toBe('micropython:done,micropython:done,micropython:done,micropython:done');
    },

    waitForDone: ({ expect }, url) => async ({ page }) => {
        await page.goto(url);
        await page.waitForSelector('html.done');
    },

    error: ({ expect }, baseURL) => async ({ page }) => {
        // Test that when the worker throws an error, the page does not crash and the
        // error is reported to the console.
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));

        // GIVEN a page that loads a worker that throws a known error (NameError)
        await page.goto(`${baseURL}/worker-error.html`);
        await page.waitForSelector('html.worker.ready');
        const result = await page.evaluate(() => document.body.innerText);

        // EXPECT the script that runs on the page main thread without errors
        // to have run successfully
        await expect(result.trim()).toBe('OK');

        // EXPECT the worker to have thrown a NameError on the console
        const logText = logs.join(',')

        await expect(logText).toContain('Traceback (most recent call last)');
        // NOTE: the error message is different in different Python interpreters
        // so we just check for the presence of the error name
        await expect(logText).toContain("NameError: name 'something_weird'");
    },

    fetch: ({ expect }, url) => async ({ page }) => {
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(url);
        await page.waitForSelector('html.ready');
        await expect(logs.length).toBe(1);
        await expect(logs[0]).toBe('hello from A');
        const body = await page.evaluate(() => document.body.innerText);
        await expect(body.trim()).toBe('hello from A, hello from B');
    },

    transform: ({ expect }, baseURL) => async ({ page }) => {
        // Test that a sync callback can handle Python objects out of the box.
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));

        await page.goto(`${baseURL}/worker-transform.html`);
        await page.waitForSelector('html.worker.ready');

        const logText = logs.join(',')

        await expect(logText).toContain('OK');
    },

    workerAttribute: ({ expect }, url) => async ({ page }) => {
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(url);
        await page.waitForSelector('html.worker');
        await expect(logs.join(',')).toBe('worker attribute');
    },

    workerTagAttribute: ({ expect }, url) => async ({ page }) => {
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(url);
        await page.waitForSelector('html.worker');
        await expect(logs.length).toBe(2);
        await expect(logs.pop()).toBe('worker attribute');
        await expect(logs.pop().slice(0, 11)).toBe('Deprecated:');
    },

    workerTagBadAttribute: ({ expect }, url) => async ({ page }) => {
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(url);
        await page.waitForSelector('html.error');
        await expect(logs.pop()).toBe('Invalid worker attribute');
    },

    localInterpreter: ({ expect }, baseURL) => async ({ page }) => {
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${baseURL}/interpreter-local.html`);
        await page.waitForSelector('html.ready');
        await expect(logs.length).toBe(1);
        await expect(logs[0]).toBe('OK');
        const body = await page.evaluate(() => document.body.innerText);
        await expect(body.trim()).toBe('3.4.0; MicroPython v1.20.0-297-g5fbb84a77 on 2023-07-13');
    },
};
