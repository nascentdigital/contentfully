import {RateLimitHandler} from './ContentfulClientOptions'


// constants
const DEFAULT_MIN_TIMEOUT = 1000
const DEFAULT_MAX_TIMEOUT = 3000
const DEFAULT_BACKOFF_MULTIPLIER = 100
const DEFAULT_MAX_ATTEMPTS = 10


/**
 * A helper class that creates a {@link RateLimitHandler} which implements an
 * [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff) algorithm to help implement retries in a
 * manner that should reduce collisions.
 */
export class ExponentialBackoffHandler {

  /**
   * Convenience method for immediately creating a {@link RateLimitHandler} without using the builder methods.
   *
   * @param {Object} options
   * @param [options.minTimeout] - see {@link minTimeout}
   * @param [options.maxTimeout] - see {@link maxTimeout}
   * @param [options.backoffMultiplier] - see {@link backoffMultiplier}
   * @param [options.maxAttempts] - see {@link maxAttempts}
   */
  public static create({
                         minTimeout = DEFAULT_MIN_TIMEOUT,
                         maxTimeout = DEFAULT_MAX_TIMEOUT,
                         backoffMultiplier = DEFAULT_BACKOFF_MULTIPLIER,
                         maxAttempts = DEFAULT_MAX_ATTEMPTS
                       } = {}): RateLimitHandler {
    return new ExponentialBackoffHandler()
      .withTimeout(minTimeout, maxTimeout)
      .withMultiplier(backoffMultiplier)
      .failAfter(maxAttempts)
      .create()
  }

  /**
   * The minimum number of milliseconds to wait between retries (should be a positive number).
   *
   * @default 1000
   */
  public minTimeout: number = DEFAULT_MIN_TIMEOUT

  /**
   * The maximum number of milliseconds to wait between retries (should be greater than {@link minTimeout}).
   *
   * @default 3000
   */
  public maxTimeout: number = DEFAULT_MAX_TIMEOUT

  /**
   * A positive number which will be multiplied against `Math.pow(2, attempt)` and then added to {@link minTimeout}.
   *
   * @default 100
   */
  public backoffMultiplier: number = 100

  /**
   * The maximum number of retry attempts (**inclusive of the first attempt before any retries**) before aborting the
   * retries (must be a positive integer - probably should at least be 2).
   *
   * @default 10
   */
  public maxAttempts: number = 10

  /**
   * Specified the timeout range for backoff.
   *
   * @param min - sets {@link minTimeout}
   * @param max - sets {@link maxTimeout}
   * @return {ExponentialBackoffHandler} for chaining
   * @throws {Error} if the arguments are invalid.
   * @see minTimeout
   * @see maxTimeout
   */
  public withTimeout(min: number, max: number): ExponentialBackoffHandler {

    // throw if the min / max are out of bounds
    if (min < 0) {
      throw new Error('Minimum timeout must be a positive number.')
    }
    else if (min > max) {
      throw new Error('Maximum timeout cannot be less than minimum.')
    }

    // update values
    this.minTimeout = min
    this.maxTimeout = max

    // keep chaining
    return this
  }

  /**
   * Specifies the backoff multiplier.
   * @param multiplier - sets {@link backoffMultiplier}
   * @return {ExponentialBackoffHandler} for chaining
   * @throws {Error} if the argument is invalid.
   * @see backoffMultiplier
   */
  public withMultiplier(multiplier: number): ExponentialBackoffHandler {

    // throw if the multiplier out of bounds
    if (multiplier < 0) {
      throw new Error('Multiplier must be a positive number.')
    }

    // update value
    this.backoffMultiplier = multiplier

    // keep chaining
    return this
  }

  /**
   * Sets the maximum number of retries before giving up.
   *
   * @param attempts - sets {@link maxAttempts}
   * @return {ExponentialBackoffHandler} for chaining
   * @throws {Error} if the argument is invalid.
   * @see maxAttempts
   */
  public failAfter(attempts: number): ExponentialBackoffHandler {

    // throw if the multiplier out of bounds
    if (!Number.isInteger(attempts) || attempts < 0) {
      throw new Error('Attempts must be a positive integer.')
    }

    // update value
    this.maxAttempts = attempts

    // keep chaining
    return this
  }

  /**
   * Creates a new {@link RateLimitHandler} function that implements the configured exponential backoff algorithm.
   */
  public create(): RateLimitHandler {
    return (attempt: number) => {

      // stop retries if the maximum has been exceeded
      if (attempt > this.maxAttempts) {
        return false
      }

      // start with the minimum timeout
      let timeout = this.minTimeout

      // add the base for the current iteration (initial iteration doesn't have any base increment
      if (attempt > 1) {
        timeout += Math.pow(2, attempt - 2) * this.backoffMultiplier
      }

      // always add some jitter
      timeout += Math.random() * this.backoffMultiplier

      // clamp the result within the maximum range
      timeout = Math.min(timeout, this.maxTimeout)

      // return timeout
      return timeout
    }
  }
}
