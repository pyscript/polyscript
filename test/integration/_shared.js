'use strict';

exports.shared = {
    bootstrap: ({ expect }, baseURL) => async ({ page }) => {
        await page.goto(`${baseURL}/bootstrap.html`);
        await page.waitForSelector('html.ready');
        await page.getByRole('button').click();
        const result = await page.evaluate(() => document.body.innerText);
        await expect(result.trim()).toBe('OK');
    },

    worker: ({ expect }, url) => async ({ page }) => {
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(url);
        await page.waitForSelector('html.worker.ready');
        await expect(logs.join(',')).toBe('main,thread');
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
};
