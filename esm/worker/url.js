import { INVALID_CONTENT, INVALID_SRC_ATTR, INVALID_WORKER_ATTR } from '../errors.js';

import { dedent, unescape } from '../utils.js';

const hasCommentsOnly = text => !text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*(?:\/\/|#).*/gm, '')
    .trim()
;

/* c8 ignore start */ // tested via integration
export default element => {
  const { src, worker } = element.attributes;
  if (worker) {
      let { value } = worker;
      // throw on worker values as ambiguous
      // @see https://github.com/pyscript/polyscript/issues/43
      if (value) throw new SyntaxError(INVALID_WORKER_ATTR);
      value = src?.value;
      if (!value) {
          // throw on empty src attributes
          if (src) throw new SyntaxError(INVALID_SRC_ATTR);
          if (!element.childElementCount)
              value = element.textContent;
          else {
              const { innerHTML, localName, type } = element;
              const name = type || localName.replace(/-script$/, '');
              value = unescape(innerHTML);
              console.warn(
                  `Deprecated: use <script type="${name}"> for an always safe content parsing:\n`,
                  value,
              );
          }

          const url = URL.createObjectURL(new Blob([dedent(value)], { type: 'text/plain' }));
          // TODO: should we really clean up this? debugging non-existent resources
          //       at distance might be very problematic if the url is revoked.
          // setTimeout(URL.revokeObjectURL, 5000, url);
          return url;
      }
      return value;
  }
  // validate ambiguous cases with src and not empty/commented content
  if (src && !hasCommentsOnly(element.textContent))
    throw new SyntaxError(INVALID_CONTENT);
};
/* c8 ignore stop */
