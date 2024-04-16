'use strict';

const { shared } = require('./_shared.js');

module.exports = (playwright, baseURL) => {
    const { test } = playwright;

    test('WebR just click', shared.justClick(playwright, baseURL));
};
