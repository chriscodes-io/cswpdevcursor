// Tiny dev-only logger. In production builds (NODE_ENV=production) all calls
// become no-ops so we don't leak debugging info or impact performance.
// Critical errors that must always surface (e.g. root-mount failures) should
// keep using console.error directly with an eslint-disable annotation.

const isDev = process.env.NODE_ENV === 'development';

export const logError = (...args) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};

export const logWarn = (...args) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
};
