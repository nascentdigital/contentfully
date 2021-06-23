// imports
import {Scribe} from "@nascentdigital/scribe";
import assign from "lodash/assign";
import get from "lodash/get";
import keys from "lodash/keys";
import nodeFetch from "node-fetch";
import {ContentfulClientOptions} from "./ContentfulClientOptions";
import {
    AuthenticationError,
    AuthorizationError,
    InvalidLocaleError,
    InvalidRequestError,
    NotFoundError,
    RateLimitError,
    ServerError
} from "../errors";


// constants
const log = Scribe.getLog("contentfully:ContentfulClient");


// class definition
export class ContentfulClient {

    private static readonly PREVIEW_URL = "https://preview.contentful.com";
    private static readonly PRODUCTION_URL = "https://cdn.contentful.com";

    public readonly options: ContentfulClientOptions;
    private readonly _spaceUri: string;


    public constructor(options: ContentfulClientOptions) {

        log.trace("constructing client with options: ", options);

        // initialize instance variables
        this.options = options;

        const serverUrl = options.preview
            ? ContentfulClient.PREVIEW_URL
            : ContentfulClient.PRODUCTION_URL;
        this._spaceUri = `${serverUrl}/spaces/${options.spaceId}/environments/${options.environmentId || "master"}`;

        log.debug("setting Contentful endpoint to: ", this._spaceUri);
    }

    public getContentModels(): Promise<any> {
        return this.query("/content_types");
    }

    public getEntries(): Promise<any> {
        return this.query("/entries");
    }

    public getLocales(): Promise<any> {
        return this.query("/locales");
    }

    public async query(path: string, parameters = {}) {

        log.trace("executing query: ", path, parameters);

        // create request url
        let url = this._spaceUri;
        if (path) {
            if (path[0] !== "/") {
                url += "/";
            }
            url += path;
        }

        // add query string
        const query: any = assign({access_token: this.options.accessToken},
            parameters);
        keys(query).forEach((key, index) => {
            url += index > 0 ? "&" : "?";
            url += key + "=" + encodeURIComponent(query[key]);
        });

        log.debug("fetching content with query: ", query);

        // fetch data (throw if there is an error)
        const fetchClient = this.getFetchClient();

        // process request
        let attempt = 0;
        do {

            // track the attempt
            ++attempt;

            // try to make request
            try {

                // send request and wait for response
                const response = await fetchClient(url);

                // handle any bad responses
                if (!response.ok) {

                    // capture error
                    const errorData = await response.text();

                    // parse error (always throws)
                    throw this.parseError(errorData, response.headers);
                }

                // extract response
                return await response.json();
            }

            // handle rate-limit error
            catch (e) {

                // try to recover if possible
                if (e instanceof RateLimitError && this.options.onRateLimitError) {

                    // invoke callback
                    const reaction = await this.options.onRateLimitError(attempt, e.waitTime);

                    // retry immediately if required
                    if (reaction === true) {
                        continue;
                    }

                    // or retry after a delay
                    else if (typeof(reaction) === "number" && reaction > 0) {

                        // wait for timeout before retrying
                        await new Promise((resolve) => {
                            setTimeout(() => resolve(true), reaction)
                        });

                        // retry
                        continue;
                    }
                }

                // rethrow if we haven't continued already
                throw e;
            }

        } while (true);
    }

    private getFetchClient(): any {

        // return supplied fetch client
        if (this.options.fetch) {
            return this.options.fetch;
        }

        // or browser
        else if ("fetch" in global) {
            return fetch;
        }

        // or node-fetch
        else {
            return nodeFetch;
        }
    }

    private parseError(errorData: string, headers: Record<string, any>): Error {

        // parse error
        try {

            // throw if entity type isn't an error
            const errorObject = JSON.parse(errorData);
            if (get(errorObject, "sys.type", "") !== "Error") {
                return new ServerError("Unexpected server error.");
            }

            // transform error
            switch (errorObject.sys.id) {

                case "AccessTokenInvalid":
                    return new AuthenticationError(errorObject.message);

                case "AccessDenied":
                    return new AuthorizationError(errorObject.message);

                case "BadRequest":
                case "InvalidEntry":
                case "InvalidQuery":
                case "UnknownField":
                    return errorObject.message.indexOf("Unknown locale") < 0
                        ? new InvalidRequestError(errorObject.message)
                        : new InvalidLocaleError(errorObject.message);

                case "NotFound":
                    return new NotFoundError(errorObject.message);

                case "RateLimitExceeded": {
                    const waitTime = parseInt(headers.get("X-Contentful-RateLimit-Reset") || 1, 10) * 1000;
                    return new RateLimitError(errorObject.message, waitTime);
                }

                default:
                    return new ServerError(errorObject.message);
            }
        }

        // or suppress parsing error
        catch (e) {
        }

        // fallback to throwing generic string
        throw new ServerError(errorData);
    }
}
