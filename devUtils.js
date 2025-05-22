const isProd = process.env.NODE_ENV === "production";

/**
 * Logs messages to console only in development environments
 * @param {...any} args - Arguments to pass to console.log
 */
const devLog = (...args) => {
  if (!isProd) {
    console.log(...args);
  }
};

/**
 * Logs error messages to console only in development environments
 * @param {...any} args - Arguments to pass to console.error
 */
const devError = (...args) => {
  if (!isProd) {
    console.error(...args);
  }
};

export { isProd, devLog, devError };
