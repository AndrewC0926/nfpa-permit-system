const { sleep } = require('./helpers');

class RetryError extends Error {
    constructor(message, lastError) {
        super(message);
        this.name = 'RetryError';
        this.lastError = lastError;
    }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts
 * @param {number} options.initialDelay - Initial delay in milliseconds
 * @param {number} options.maxDelay - Maximum delay in milliseconds
 * @param {number} options.factor - Exponential backoff factor
 * @param {Function} options.shouldRetry - Function to determine if retry should occur
 * @returns {Promise<any>} - Result of the function
 */
async function retry(fn, options = {}) {
    const {
        maxAttempts = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        factor = 2,
        shouldRetry = (error) => true
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts || !shouldRetry(error)) {
                throw new RetryError(
                    `Failed after ${attempt} attempts. Last error: ${error.message}`,
                    lastError
                );
            }

            // Calculate next delay with exponential backoff
            delay = Math.min(delay * factor, maxDelay);
            
            // Add jitter to prevent thundering herd
            const jitter = Math.random() * 0.1 * delay;
            await sleep(delay + jitter);
        }
    }
}

/**
 * Specific retry configuration for Fabric peer operations
 */
const fabricRetryConfig = {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    factor: 2,
    shouldRetry: (error) => {
        // Retry on specific Fabric errors
        const retryableErrors = [
            'ENOENT',
            'ECONNREFUSED',
            'ECONNRESET',
            'ETIMEDOUT',
            'PEER_DISCONNECTED',
            'CHANNEL_NOT_FOUND'
        ];
        
        return retryableErrors.some(err => 
            error.message.includes(err) || 
            error.code === err
        );
    }
};

/**
 * Retry a Fabric peer operation
 * @param {Function} operation - Fabric operation to retry
 * @returns {Promise<any>} - Result of the operation
 */
async function retryFabricOperation(operation) {
    return retry(operation, fabricRetryConfig);
}

module.exports = {
    retry,
    retryFabricOperation,
    RetryError
}; 