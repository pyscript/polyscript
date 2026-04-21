'use strict';

import { shared } from './_shared.js';

export default (playwright, baseURL) => {
    const { test } = playwright;

    test('Ruby WASM WASI bootstrap', shared.bootstrap(playwright, baseURL));
};
