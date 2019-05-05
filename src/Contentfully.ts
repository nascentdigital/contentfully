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
        const items = this._parseEntries(json.items, links, multiLocale);

        // return result
        return {
            items,
            skip: json.skip,
            limit: json.limit,
            total: json.total
        };
    }

    private _parseEntryByLocale(entry: any) {
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

                _.forEach(locales, async (entry, locale) => {
                    try {
                        if (entry.fields.file) {
                            media[locale] = await this._toMedia(sys, entry.fields, mediaTransform);
                        }
                    } catch (e) {
                        console.error('[_createLinks] error with creating media', e);
                    }
                });
            } else {
                media = await this._toMedia(sys, asset.fields, mediaTransform);
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

    private _parseEntries(entries: any, links: any, multiLocale: boolean) {

        // convert entries to models and return result
        return _.map(entries, entry => {
            // process entry if not processed
            const sys = entry.sys;
            const modelId = sys.id;
            const model = links[modelId];
            if (model._deferred) {

                // update entry with parsed value
                _.assign(model, (this._parseEntry(model._deferred, links, multiLocale)));

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

    private _parseEntry(entry: any, links: any, multiLocale: boolean) {
        const fields: any = {};
        // transform entry to model and return result
        _.forEach(entry.fields, (value, key) => {
            // parse array of values
            if (multiLocale) {
                const parsedLocale = this._parseValueByLocale(value, links);

                // handle null values otherwise pass back the values
                if(!_.isEmpty(parsedLocale)) {
                    fields[key] = parsedLocale;
                }
            } else if (_.isArray(value)) {
                fields[key] = _.compact(_.map(value, item => this._parseValue(item, links)));
            }
            // or parse value
            else {
                const parsed = this._parseValue(value, links);
                // handle null values otherwise pass back the values
                if(!_.isEmpty(parsed)) {
                    fields[key] = parsed;
                }
            }
        });

        return fields;
    }

    private _parseValueByLocale(value: any, links: any) {
        let values: any = {};
        const locales = _.keys(value);
        _.forEach(locales, locale => {
            if (_.isArray(value[locale])) {
                values[locale] =  _.compact(_.map(value[locale], item => this._parseValue(item, links, locale)));
            } else {
                const sys = value[locale].sys;
                if (sys === undefined || sys.type !== "Link") {
                    values[locale] = value[locale];
                } else if (sys.linkType === 'Asset') {
                    values = this._dereferenceLink(value, links, locale);
                } else {
                    values[locale] = this._dereferenceLink(value, links, locale);
                }
            }
        })

        return values;
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
        const sys = locale && reference[locale] ? reference[locale].sys : reference.sys;
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

            const deferred = link._deferred;

            // add link content type metadata
            const deferredSys = deferred.sys;
            link._type = deferredSys.contentType.sys.id;

            const parsed = this._parseEntry(deferred, links, !_.isUndefined(locale));
            // update entry with parsed value
            _.assign(link, parsed);

            // // prune deferral
            delete link._deferred;
        }

        // return link
        return link;
    }

}
