import assign from "lodash/assign";
import compact from "lodash/compact";
import pick from "lodash/pick";
import get from "lodash/get";
import forEach from "lodash/forEach";
import isArray from "lodash/isArray";
import unset from "lodash/unset";
import map from "lodash/map";
import { ContentfulClient } from "./contentful";
import {
    MediaTransform,
    QueryOptions
} from "./QueryOptions";
import { QueryResult } from "./QueryResult";

// constants
const DEFAULT_SELECT_ID = 'sys.id'
const DEFAULT_SELECT_CONTENT_TYPE = 'sys.contentType'
const DEFAULT_SELECT_UPDATED_AT = 'sys.updatedAt'

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

        // set default select values
        let select: string = 'fields'

        // if select query is passed
        if (query.select) {
            // clean select query
            select = compact(map(query.select.split(','), queryString => {
                // remove white space
                return queryString.replace(/\s/g, '')
                // remove default sys.id
                .replace(DEFAULT_SELECT_ID, '')
                // remove content type
                .replace(DEFAULT_SELECT_CONTENT_TYPE, '')
                // remove updated at
                .replace(DEFAULT_SELECT_UPDATED_AT, '')
                .trim(',');
            })).join(',');
        }

        // prepend default selects
        query.select = `${DEFAULT_SELECT_ID},${DEFAULT_SELECT_CONTENT_TYPE},${DEFAULT_SELECT_UPDATED_AT},${select}`
        // query.select = ``

        // create query
        const json = await this.contentful.query(path,
            assign({},
                {
                    include: 10,
                    limit: 1000
                },
                query
            )
        );

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
        for (const asset of get(json, "includes.Asset") || []) {

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
                dimensions: pick(file.details.image, ["width", "height"]),
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
        for (const entry of get(json, "includes.Entry") || []) {
            links[entry.sys.id] = {
                _deferred: entry
            };
        }

        // link payload entries
        for (const entry of get(json, "items") || []) {
            links[entry.sys.id] = {
                _deferred: entry
            };
        }

        // return links
        return links;
    }

    private _dereferenceLink(reference: any, links: any) {

        const sys = reference.sys;
        const modelId = sys.id;
        // get link (resolve if deferred)
        let link = links[modelId];

        // bail if no link
        if (!link) {
            return
        }

        // add link id metadata
        link._id = modelId;
        if (link._deferred) {

            // add link content type metadata
            const deferredSys = link._deferred.sys;
            link._type = deferredSys.contentType.sys.id;

            // update entry with parsed value
            assign(link, this._parseEntry(link._deferred, links));

            // prune deferral
            delete link._deferred;
        }

        // return link
        return link;
    }

    private _parseEntries(entries: any, links: any) {

        // convert entries to models and return result
        return map(entries, entry => {
            // process entry if not processed
            const sys = entry.sys;
            const modelId = sys.id;
            const model = links[modelId];
            if (model._deferred) {

                // update entry with parsed value
                assign(model, (this._parseEntry(model._deferred, links)));

                // prune deferral
                delete model._deferred;
            }

            // add model metadata
            model._id = modelId;
            model._type = sys.contentType.sys.id;

            if (sys.updatedAt) {
                model._updatedAt = sys.updatedAt;
            }

            // return model
            return model;
        });
    }

    private _parseEntry(entry: any, links: any) {

        // transform entry to model and return result
        forEach(entry.fields, (value, key) => {
            // parse array of values
            if (isArray(value)) {
                entry.fields[key] = compact(map(value, item => this._parseValue(item, links)));
            }

            // or parse value
            else {
                // handle null values otherwise pass back the values
                if(this._parseValue(value, links) === undefined) {
                    unset(entry.fields, key)
                } else {
                    entry.fields[key] = this._parseValue(value, links);
                }
            }
        });

        return entry.fields;
    }

    private _parseValue(value: any, links: any) {

        // handle values without a link
        const sys = value.sys;
        if (sys === undefined || sys.type !== "Link") {
            return value;
        }

        // dereference link
        return this._dereferenceLink(value, links);
    }
}
