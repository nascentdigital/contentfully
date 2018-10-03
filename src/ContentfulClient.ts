import _ from "lodash";
import nodeFetch from "node-fetch";
import {ContentfulClientOptions} from "./ContentfulClientOptions";


export class ContentfulClient {

    private static readonly PREVIEW_URL = "https://preview.contentful.com";
    private static readonly PRODUCTION_URL = "https://cdn.contentful.com";

    public readonly options: ContentfulClientOptions;
    private readonly _spaceUri: string;


    public constructor(options: ContentfulClientOptions) {

        // initialize instance variables
        this.options = options;

        const serverUrl = options.preview
            ? ContentfulClient.PREVIEW_URL
            : ContentfulClient.PRODUCTION_URL;
        this._spaceUri = `${serverUrl}/spaces/${options.spaceId}/environments/${options.environmentId || "master"}`;
    }

    public getContentModels(): Promise<any> {
        return this.query("/content_types");
    }

    public getEntries(): Promise<any> {
        return this.query("/entries");
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
        const query: any = _.assign({access_token: this.options.accessToken},
            parameters);
        _.keys(query).forEach((key, index) => {
            url += index > 0 ? "&" : "?";
            url += key + "=" + encodeURIComponent(query[key]);
        });

        // fetch data (throw if there is an error)
        const fetchClient: any = "fetch" in global ? fetch :  nodeFetch;
        const response = await fetchClient(url);
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        // extract response
        return await response.json();
    }
}