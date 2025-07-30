import { interpreter } from './interpreters.js';
import { absoluteURL, resolve } from './utils.js';
import { toml } from './3rd-party.js';

const { parse } = JSON;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export const getConfigURLAndType = (config, configURL = './config.txt') => {
    let type = typeof config;
    if (type === 'string' && /\.(json|toml|txt)$/.test(config))
        type = RegExp.$1;
    else
        config = configURL;
    return [absoluteURL(config), type];
};

const onFetchError = absolute => () => {
    throw new Error(`Unable to fetch cofig ${absolute}`);
};

export const resolveConfig = (config, configURL, options = {}) => {
    const [absolute, type] = getConfigURLAndType(config, configURL);
    const onError = onFetchError(absolute);
    if (type === 'json') {
        options = fetch(absolute).then(
            r => r.ok ? r.json() : onError(),
            onError
        );
    } else if (type === 'toml') {
        options = fetch(absolute).then(
            r => r.ok ? r.text().then(toml) : onError(),
            onError
        );
    } else if (type === 'string') {
        options = parseString(config);
    } else if (type === 'object' && config) {
        options = config;
    } else if (type === 'txt' && typeof options === 'string') {
        options = parseString(options);
    }
    config = absolute;
    return [options, config];
};

const parseString = config => {
    try {
        return parse(config);
    }
    catch {
        return toml(config);
    }
};
/* c8 ignore stop */

/**
 * Parse a generic config if it came from an attribute either as URL
 * or as a serialized string. In XWorker case, accepts a pre-defined
 * options to use as it is to avoid needing at all a fetch operation.
 * In latter case, config will be suffixed as `config.txt`.
 * @param {string} id the interpreter name @ version identifier
 * @param {string | object} config optional config file to parse
 * @param {string} [configURL] optional config URL if config is not string
 * @param {object} [options] optional options used to bootstrap XWorker
 * @returns
 */
export const getRuntime = (id, config, configURL, options = {}) => {
    if (config) {
        // REQUIRES INTEGRATION TEST
        /* c8 ignore start */
        [options, config] = resolveConfig(config, configURL, options);
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
