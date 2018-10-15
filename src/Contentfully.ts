import _ from "lodash";
import {ContentfulClient} from "./contentful";
import {
    MediaTransform,
    QueryOptions
} from "./QueryOptions";
import {QueryResult} from "./QueryResult";


export class Contentfully {

    public readonly contentful: ContentfulClient;


    public constructor(contentful: ContentfulClient) {

        // initialize instance variables
        this.contentful = contentful;
    }

    public getModel(id: string): Promise<any> {
        return this._query(`/entries/${id}`);
    }

    public getModels(query: any = {}, options: QueryOptions = {}): Promise<QueryResult> {
        return this._query("/entries", query, options);
    }

    private async _query(path: string, query: any = {},
                         options: QueryOptions = {}): Promise<QueryResult> {

        // create query
        const json = await this.contentful.query("/entries",
            _.assign({},
        {
                    include: 10,
                    limit: 1000
                },
                query,
        {
                    select: "fields,sys.id,sys.contentType"
                }));

        // parse includes
        const links = await this._createLinks(json, options.mediaTransform);

        // get transformed items (should be flattened)
        const items = this._parseEntries(json.items, links);

        // return result
        return {
            items,
            skip: json.skip,
            limit: json.limit,
            total: json.total
        };
    }

    private async _createLinks(json: any, mediaTransform?: MediaTransform) {

        // create new links
        const links: any = {};

        // link included assets
        for(const asset of _.get(json, "includes.Asset") || []) {

            // TODO: handle non-image assets (e.g. video)

            // capture media file
            const sys = asset.sys;
            const file = asset.fields.file;
            const description = asset.fields.description;
            let media = {
                _id: sys.id,
                url: file.url,
                description: description,
                contentType: file.contentType,
                dimensions: _.pick(file.details.image, ["width", "height"]),
                size: file.details.size,
                version: sys.revision
            };

            // apply any transform (if provided)
            if (mediaTransform) {
                media = await mediaTransform(media);
            }

            // map media
            links[sys.id] = media;
        }

        // link included entries
        for (const entry of _.get(json, "includes.Entry") || []) {
            links[entry.sys.id] = {
                _deferred: entry
            };
        }

        // link payload entries
        for (const entry of _.get(json, "items") || []) {
            links[entry.sys.id] = {
                _deferred: entry
            };
        }

        // return links
        return links;
    }

    private _dereferenceLink(reference: any, links: any) {

        // get link (resolve if deferred)
        let link = links[reference.sys.id];
        if (link._deferred) {

            // update entry with parsed value
            _.assign(link, this._parseEntry(link._deferred, links));

            // prune deferral
            delete link._deferred;
        }

        // return link
        return link;
    }

    private _parseEntries(entries: any, links: any) {

        // convert entries to models and return result
        return _.map(entries, entry => {

            // process entry if not processed
            const sys = entry.sys;
            const modelId = sys.id;
            const model = links[modelId];
            if (model._deferred) {

                // update entry with parsed value
                _.assign(model, this._parseEntry(model._deferred, links));

                // prune deferral
                delete model._deferred;
            }

            // add model metadata
            model._id = modelId;
            model._type = sys.contentType.sys.id;

            // return model
            return model;
        });
    }

    private _parseEntry(entry: any, links: any) {

        // transform entry to model and return result
        return _.mapValues(entry.fields, value => {

            // handle null values
            if (value === null || value === undefined) {
                return value;
            }

            // parse array of values
            if (_.isArray(value)) {
                return _.map(value, item => this._parseValue(item, links));
            }

            // or parse value
            else {
                return this._parseValue(value, links);
            }
        });
    }

    private _parseValue(value: any, links: any) {

        // handle values without a link
        const sys = value.sys;
        if (sys === undefined
            || sys.type !== "Link") {
            return value;
        }

        // dereference link
        return this._dereferenceLink(value, links);
    }
}
