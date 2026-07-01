const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS.INFO;

const prefix = '[AlkoRater]';

/* eslint-disable no-console */
export const logger = {
    debug: (...args) => CURRENT_LEVEL <= LOG_LEVELS.DEBUG && console.debug(prefix, ...args),
    info: (...args) => CURRENT_LEVEL <= LOG_LEVELS.INFO && console.info(prefix, ...args),
    warn: (...args) => CURRENT_LEVEL <= LOG_LEVELS.WARN && console.warn(prefix, ...args),
    error: (...args) => CURRENT_LEVEL <= LOG_LEVELS.ERROR && console.error(prefix, ...args),
};
