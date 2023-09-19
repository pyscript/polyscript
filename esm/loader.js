import { interpreter } from './interpreters.js';
import { absoluteURL, resolve } from './utils.js';
import { parse } from './toml.js';
import { getJSON, getText } from './fetch-utils.js';

export const getConfigURLAndType = config => {
    // REQUIRES INTEGRATION TEST
    /* c8 ignore start */
    let type = typeof config;
    if (type === 'string' && /\.(json|toml|txt)$/.test(config))
        type = RegExp.$1;
    else
        config = './config.txt';
    return [absoluteURL(config), type];
    /* c8 ignore stop */
};

/**
 * Parse a generic config if it came from an attribute either as URL
 * or as a serialized string. In XWorker case, accepts a pre-defined
 * options to use as it is to avoid needing at all a fetch operation.
 * In latter case, config will be suffixed as `config.txt`.
 * @param {string} id the interpreter name @ version identifier
 * @param {string} [config] optional config file to parse
 * @param {object} [options] optional options used to bootstrap XWorker
 * @returns
 */
export const getRuntime = (id, config, options = {}) => {
    if (config) {
        // REQUIRES INTEGRATION TEST
        /* c8 ignore start */
        const [absolute, type] = getConfigURLAndType(config);
        if (type === 'json') {
            options = fetch(absolute).then(getJSON);
        } else if (type === 'toml') {
            options = fetch(absolute).then(getText).then(parse);
        } else if (type === 'string') {
            try {
                options = JSON.parse(config);
            } catch (_) {
                options = parse(config);
            }
        } else if (type === 'object' && config) {
            options = config;
        }
        config = absolute;
        /* c8 ignore stop */
    }
    return resolve(options).then(options => interpreter[id](options, config));
};

/**
 * @param {string} type the interpreter type
 * @param {string} [version] the optional interpreter version
 * @returns
 */
export const getRuntimeID = (type, version = '') =>
    `${type}@${version}`.replace(/@$/, '');
