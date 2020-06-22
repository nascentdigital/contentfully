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
    ServerError
} from "../errors";


export class ContentfulClient {

    static readonly PREVIEW_URL = "https://preview.contentful.com";
    static readonly PRODUCTION_URL = "https://cdn.contentful.com";

    public readonly options: ContentfulClientOptions;
    private readonly _spaceUri: string;


    public constructor(options: ContentfulClientOptions) {

        // initialize instance variables
        this.options = options;

        let serverUrl: string;

        if (options.host) {
            serverUrl = options.host;
        } else {
            serverUrl = options.preview
                ? ContentfulClient.PREVIEW_URL
                : ContentfulClient.PRODUCTION_URL;
        }

        this._spaceUri = `${serverUrl}/spaces/${options.spaceId}/environments/${options.environmentId || "master"}`;
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

        // fetch data (throw if there is an error)
        const fetchClient = this.getFetchClient();
        const response = await fetchClient(url,
            {
                headers: this.options.headers
            });
        if (!response.ok) {

            // capture error
            const errorData = await response.text();

            // parse error (always throws)
            throw this.parseError(errorData);
        }

        // extract response
        return await response.json();
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

    private parseError(errorData: string): Error {

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
