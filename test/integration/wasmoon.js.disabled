'use strict';

import { shared } from './_shared.js';

export default (playwright, baseURL) => {
    const { test } = playwright;

    test('Wasmoon bootstrap', shared.bootstrap(playwright, baseURL));

    test('Wasmoon to Wasmoon Worker', shared.worker(playwright, `${baseURL}/worker.html`));
};
