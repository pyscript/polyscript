import { interpreter } from './interpreters.js';
import { absoluteURL, resolve } from './utils.js';
import { parse } from './toml.js';
import { getJSON, getText } from './fetch-utils.js';

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
        if (config.endsWith('.json')) {
            options = fetch(config).then(getJSON);
            config = absoluteURL(config);
        } else if (config.endsWith('.toml')) {
            options = fetch(config).then(getText).then(parse);
            config = absoluteURL(config);
        } else if (!config.endsWith('.txt')) {
            try {
                options = JSON.parse(config);
            } catch (_) {
                options = parse(config);
            }
            // make the config a URL to be able to retrieve relative paths from it
            config = absoluteURL('./config.txt');
        }
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
