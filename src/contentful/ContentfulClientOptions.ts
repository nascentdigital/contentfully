/**
 * Indicates how a Contentful rate-limit error should be handled.  This value can be interpreted as follows:
 *   - `boolean`: Will immediately retry if `true` or will cause a {@link RateLimitError} to be throw if `false`.
 *   - `number`:  A positive number that indicates the number of milliseconds that Contentfully should wait before
 *                retrying.
 */
export type RateLimitReaction = boolean | number;

/**
 * A callback that is set via the {@link ContentfulClientOptions#onRateLimitError} option to control how Contentfully
 * handles any rate-limit errors that occur.  The default implementation returns `false`, indicating that no retry will
 * occur.
 *
 * This callback will be invoked any time a Contentful request receives the `HTTP 429` response code, indicating that
 * the rate-limit for the API has been exceeded.  The client should typically retry after a the rate-limit is reset,
 * which is typically the next second.
 *
 * The callback receives both the number previously failed request `attempt`s (starting at 1) as well as the suggested
 * wait time that Contentful has suggested (should always be 1000 milliseconds).  The callback should then return a
 * {@link RateLimitReaction} or a `Promise` to one.
 */
export type RateLimitHandler = (attempt: number, waitTime: number) => RateLimitReaction | Promise<RateLimitReaction>;


/**
 * Provides options related to accessing the Contentful API.
 */
export interface ContentfulClientOptions {

    /**
     * The Delivery API access token for a specific contentful space.
     */
    readonly accessToken: string;

    /**
     * The Contentful space identifier.
     */
    readonly spaceId: string;

    /**
     * The specific Contentful environment to access.
     *
     * @default "master"
     */
    readonly environmentId?: string;

    /**
     * Points to the Preview API instead of the Delivery API when `true`.
     *
     * @default false
     */
    readonly preview?: boolean;

    /**
     * Specifies which [fetch](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch)
     * implementation to use for HTTP requests.  This function can be duck-typed via a custom mixin as long as the basic
     * `fetch()` interface is provided.
     *
     * @default global.fetch
     */
    readonly fetch?: any;

    /**
     * A rate-limit error handler that can be used to retry requests that fail due to rate-limits being exceeded for
     * a specific request.
     *
     * @default () => false
     * @see RateLimitHandler
     */
    readonly onRateLimitError?: RateLimitHandler;
}
