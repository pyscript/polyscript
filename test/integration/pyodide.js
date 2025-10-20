'use strict';

import { shared, python } from './_shared.js';

export default (playwright, baseURL) => {
    const { expect, test } = playwright;

    test('Pyodide bootstrap', python.bootstrap(playwright, baseURL));

    test('Pyodide fetch', python.fetch(playwright, `${baseURL}/fetch.html`));

    test('Pyodide to Pyodide Worker', shared.worker(playwright, `${baseURL}/worker.html`));

    test('Pyodide config as JSON', python.configAsJSON(playwright, baseURL));

    test('Pyodide unknown package', async ({ page }) => {
        const errors = [];
        page.on('console', message => {
            if (message.type() === 'error') {
                errors.push(message.text());
            }
        });
        await page.goto(`${baseURL}/packages.html`);
        await page.waitForSelector('html.error');
        await expect(errors.length).toBe(1);
        await expect(errors[0]).toBe('These packages are not supported in Pyodide 0.29.0: unknown_package_name');
    });

    test('Pyodide config with passthrough', async ({ page }) => {
        // Test that a config passed as object works out of the box.
        const logs = [];
        page.on('console', msg => logs.push(msg.text()));
        await page.goto(`${baseURL}/config-passthrough.html`);
        await page.waitForSelector('html.cleared');
        await page.waitForSelector('html.ready');
        await expect(logs.at(-1)).toBe('hello from A');
    });

    test('Pyodide sync (time)', async ({ page }) => {
        const logs = [];
        page.on('console', msg => logs.push({text: msg.text(), time: new Date}));
        await page.goto(`${baseURL}/sync.html`);
        await page.waitForSelector('html.worker.ready');
        await expect(logs.length).toBe(2);
        const [
            {text: text1, time: time1},
            {text: text2, time: time2}
        ] = logs;
        await expect(text1).toBe('before');
        await expect(text2).toBe('after');
        await expect((time2 - time1) >= 1000).toBe(true);
    });

    test('Pyodide Worker error', python.error(playwright, baseURL));

    test('Pyodide transform', python.error(playwright, baseURL));

    test('Pyodide events ready', python.disabledUntilReady(playwright, baseURL));

    test('Pyodide index_urls', async ({ page }) => {
        await page.goto(`${baseURL}/index_urls.html`);
        await page.waitForSelector('html.test_foo');
    });
};
