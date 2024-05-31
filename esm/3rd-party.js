/* c8 ignore start */

// toml
export const toml = async (text) => (
  await import(/* webpackIgnore: true */'./3rd-party/toml.js')
).parse(text);

// zip
export const zip = () => import(/* webpackIgnore: true */'./3rd-party/zip.js');

/* c8 ignore stop */
