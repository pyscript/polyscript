/**
 * @param {string} text TOML text to parse
 * @returns {object} the resulting JS object
 */
export const parse = async (text) => (
  await import(/* webpackIgnore: true */'./3rd-party/toml.js')
).parse(text);
