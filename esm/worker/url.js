import { dedent } from '../utils.js';

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
      if (value) throw new SyntaxError('Invalid worker attribute');
      value = src?.value;
      if (!value) {
          // throw on empty src attributes
          if (src) throw new SyntaxError('Invalid src attribute');
          if (!element.childElementCount)
              value = element.textContent;
          else {
              const { innerHTML, localName, type } = element;
              const name = type || localName.replace(/-script$/, '');
              console.warn(
                  `Deprecated: use <script type="${name}"> for an always safe content parsing:\n`,
                  innerHTML,
              );
              value = innerHTML;
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
    throw new SyntaxError('Invalid content');
};
/* c8 ignore stop */
