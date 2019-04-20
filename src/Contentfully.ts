import _ from "lodash";
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
            select = _.chain(query.select)
                // remove white space
                .replace(/\s/g, '')
                // remove default sys.id
                .replace(DEFAULT_SELECT_ID, '')
                // remove content type
                .replace(DEFAULT_SELECT_CONTENT_TYPE, '')
                // remove updated at
                .replace(DEFAULT_SELECT_UPDATED_AT, '')
                .trim(',')
                .value()
        }

        // prepend default selects
        query.select = `${DEFAULT_SELECT_ID},${DEFAULT_SELECT_CONTENT_TYPE},${DEFAULT_SELECT_UPDATED_AT},${select}`
        // query.select = ``

        // create query
        const json = await this.contentful.query(path,
            _.assign({},
                {
                    include: 10,
                    limit: 1000
                },
                query
            )
        );

        const locale = _.get(query, 'locale');
        // TODO: ensure the wildcard is only way to query for multiple locales
        const multiLocale = locale && locale === '*';

        // parse includes
        const links = await this._createLinks(json, multiLocale, options.mediaTransform);

        // get transformed items (should be flattened)
        let items;
        if (multiLocale) {
            items = this._parseEntriesByLocale(json.items, links);
        } else {
            items = this._parseEntries(json.items, links);
        }
        // return result
        return {
            items,
            skip: json.skip,
            limit: json.limit,
            total: json.total
        };
    }

    /*
    items: {
        'en-CA': []
    }
    */
    private _parseEntriesByLocale(entries: any, links: any) {
        const locales: any = {};

        _.forEach(entries, (entry) => {

            const sys = entry.sys;
            const modelId = sys.id;
            const model = links[modelId];

            if (model._deferred) {

                // push to item list by locale
                _.forEach(model._deferred, (entry, locale) => {
                    // update entry with parsed value
                    const parsed = this._parseEntry(entry, links, locale);

                    // add model metadata
                    parsed._id = modelId;
                    parsed._type = sys.contentType.sys.id;

                    if (sys.updatedAt) {
                        parsed._updatedAt = sys.updatedAt;
                    }

                    if (!locales[locale]) {
                        locales[locale] = [];
                    }

                    locales[locale].push(parsed);
                });

                // prune deferral
                delete model._deferred;
            }


        });

        return locales;

        /*
        * if (model._deferred) {

                // update entry with parsed value
                _.assign(model, (this._parseEntry(model._deferred, links)));

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
            */
    }

    private _addModelMeta() {

    }
    private _parseEntryByLocale(entry: any, links: any = {}) {
        // initialize locale map of entries
        const locales: any = {};

        _.forEach(entry.fields, (field, key) => {
            // pull all locales from field
            const fieldLocales = _.keys(field);

            _.forEach(fieldLocales, locale => {
                // initialize locale (if undefined) with sys and fields
                if (!locales[locale]) {
                    locales[locale] = {
                        sys: entry.sys,
                        fields: {}
                    };
                }
                // set field
                locales[locale].fields[key] = field[locale];
            })
        });

        return locales;
    }

    private async _createLinks(json: any, multiLocale: boolean, mediaTransform?: MediaTransform) {

        // create new links
        const links: any = {};

        // link included assets
        for (const asset of _.get(json, "includes.Asset") || []) {

            // TODO: handle non-image assets (e.g. video)

            let media: any = {};
            const sys = asset.sys;

            if (multiLocale) {
                const locales = this._parseEntryByLocale(asset);

                _.forEach(locales, (entry, locale) => {
                    media[locale] = this._toMedia(sys, entry.fields, mediaTransform);
                });
            } else {
                media = this._toMedia(sys, asset.fields, mediaTransform);
            }

            // map media
            links[sys.id] = media;
        }

        // link included entries
        for (const entry of _.get(json, "includes.Entry") || []) {
            links[entry.sys.id] = {
                _deferred: multiLocale ? this._parseEntryByLocale(entry) : entry
            };
        }

        // link payload entries
        for (const entry of _.get(json, "items") || []) {
            links[entry.sys.id] = {
                _deferred: multiLocale ? this._parseEntryByLocale(entry) : entry
            };
        }

        // return links
        return links;
    }

    private async _toMedia(sys: any, fields: any, mediaTransform?: MediaTransform) {
        // capture media file
        const file = fields.file;
        const description = fields.description;
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

        return media;
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
                _.assign(model, (this._parseEntry(model._deferred, links)));

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

    private _parseEntry(entry: any, links: any, locale?: string) {

        // transform entry to model and return result
        _.forEach(entry.fields, (value, key) => {
            // parse array of values
            if (_.isArray(value)) {
                entry.fields[key] = _.compact(_.map(value, item => this._parseValue(item, links, locale)));
            }

            // or parse value
            else {
                const parsed = this._parseValue(value, links, locale);

                // handle null values otherwise pass back the values
                if(parsed === undefined) {
                    _.unset(entry.fields, key)
                } else {
                    entry.fields[key] = parsed;
                }
            }
        });

        return entry.fields;
    }

    private _parseValue(value: any, links: any, locale?: string) {

        // handle values without a link
        const sys = value.sys;
        if (sys === undefined || sys.type !== "Link") {
            return value;
        }

        // dereference link
        return this._dereferenceLink(value, links, locale);
    }

    private _dereferenceLink(reference: any, links: any, locale?: string) {

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
        if (!_.isEmpty(link._deferred)) {

            const deferred = locale ? link._deferred[locale] : link._deferred;

            // add link content type metadata
            const deferredSys = deferred.sys;
            link._type = deferredSys.contentType.sys.id;

            // update entry with parsed value
            _.assign(link, this._parseEntry(deferred, links, locale));

            // prune deferral
            if (locale) {
                delete link._deferred[locale];
            } else {
                delete link._deferred;
            }
        }

        // return link
        return link;
    }

}
