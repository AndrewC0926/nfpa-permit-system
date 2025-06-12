/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string
 * @returns {string}
 */
const generateRandomString = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Format a date to ISO string with timezone
 * @param {Date} date - Date to format
 * @returns {string}
 */
const formatDate = (date) => {
    return date.toISOString();
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean}
 */
const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
        );
    }
};

/**
 * Sanitize an object by removing specified fields
 * @param {Object} obj - Object to sanitize
 * @param {string[]} fields - Fields to remove
 * @returns {Object}
 */
const sanitizeObject = (obj, fields) => {
    const result = deepClone(obj);
    fields.forEach(field => {
        delete result[field];
    });
    return result;
};

/**
 * Validate an email address
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Truncate a string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add if truncated
 * @returns {string}
 */
const truncateString = (str, length = 100, suffix = '...') => {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
};

module.exports = {
    sleep,
    generateRandomString,
    formatDate,
    isEmpty,
    deepClone,
    sanitizeObject,
    isValidEmail,
    truncateString
}; 