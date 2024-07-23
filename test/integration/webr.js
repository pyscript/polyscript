'use strict';

import { shared } from './_shared.js';

export default (playwright, baseURL) => {
    const { test } = playwright;

    test('WebR just click', shared.justClick(playwright, baseURL));
};
