import assign from "lodash/assign";
import compact from "lodash/compact";
import pick from "lodash/pick";
import get from "lodash/get";
import keys from "lodash/keys";
import forEach from "lodash/forEach";
import isArray from "lodash/isArray";
import isUndefined from "lodash/isUndefined";
import isEmpty from "lodash/isEmpty";
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

interface Locale {
    name: string
    code: string
    default: boolean | undefined
    fallbackCode: string | undefined | null
}

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

        // assign multilocale query
        const locale = get(query, 'locale');
        const multiLocale = locale && locale === '*';

        // parse includes
        const links = await this._createLinks(json, multiLocale, options.mediaTransform);

        // get transformed items
        let items = this._parseEntries(json.items, links, multiLocale);

        // split locales to top level objects
        if (multiLocale && (options.flatten === undefined) || options.flatten === true) {
            const locales = await this.contentful.getLocales()
            items = this._flattenLocales(locales, items)
        }

        // return result
        return {
            items,
            skip: json.skip,
            limit: json.limit,
            total: json.total
        };
    }

    private _parseAssetByLocale(entry: any) {
        // initialize locale map of entries
        const locales: any = {};

        forEach(entry.fields, (field, key) => {
            // pull all locales from field
            const fieldLocales = keys(field);

            forEach(fieldLocales, locale => {
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
        for (const asset of get(json, "includes.Asset") || []) {

            // TODO: handle non-image assets (e.g. video)
            let media: any = {};
            const sys = asset.sys;

            if (multiLocale) {
                // map asset to locale
                const locales = this._parseAssetByLocale(asset);
                forEach(locales, async (entry, locale) => {
                    try {
                        if (entry.fields.file) {
                            // transform asset to media
                            const transformed = await this._toMedia(sys, entry.fields, mediaTransform);

                            // prune id
                            delete transformed._id;

                            media[locale] = transformed;
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

    private async _toMedia(sys: any, fields: any, mediaTransform?: MediaTransform) {
        // capture media file
        const file = fields.file;
        const description = fields.description;
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

        return media;
    }

    private _parseEntries(entries: any, links: any, multiLocale: boolean) {

        // convert entries to models and return result
        return map(entries, entry => {
            // process entry if not processed
            const sys = entry.sys;
            const modelId = sys.id;
            const model = links[modelId];
            if (model._deferred) {

                // update entry with parsed value
                assign(model, (this._parseEntry(model._deferred, links, multiLocale)));

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
        forEach(entry.fields, (value, key) => {
            // parse values if multilocale query
            if (multiLocale) {
                // parse value (mapped by locale)
                const parsedLocale = this._parseValueByLocale(value, links);

                // handle null values otherwise pass back the values
                if(!isEmpty(parsedLocale)) {
                    fields[key] = parsedLocale;
                }
            // parse array of values
            } else if (isArray(value)) {
                fields[key] = compact(map(value, item => this._parseValue(item, links)));
            }
            // or parse value
            else {
                const parsed = this._parseValue(value, links);
                // handle null values otherwise pass back the values
                if(!isEmpty(parsed)) {
                    fields[key] = parsed;
                }
            }
        });

        return fields;
    }

    private _parseValueByLocale(value: any, links: any) {
        let values: any = {};
        // pull all locales
        const locales = keys(value);
        forEach(locales, locale => {
            // parse array of value
            if (isArray(value[locale])) {
                values[locale] =  compact(map(value[locale], item => this._parseValue(item, links, locale)));
            }
            // or parse value
            else {
                const sys = value[locale].sys;
                if (sys === undefined || sys.type !== "Link") {
                    values[locale] = value[locale];
                }
                // assign asset to values (already mapped by locale)
                else if (sys.linkType === 'Asset') {
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

            const parsed = this._parseEntry(deferred, links, !isUndefined(locale));
            // update entry with parsed value
            assign(link, parsed);

            // // prune deferral
            delete link._deferred;
        }

        // return link
        return link;
    }

    private _getLocaleValue(
        defaultLocale: Locale | undefined,  
        localeCodes: {[ code: string]: Locale}, 
        locale: Locale, value: any) {

        let currentLocale: Locale | undefined = locale;
        while (currentLocale != undefined) {
            if (value[currentLocale.code] !== undefined) {
                return value[currentLocale.code];
            }
            if (currentLocale.fallbackCode === null) {
                return value;
            }
            if (currentLocale == defaultLocale) {
                return value;
            }
            if (currentLocale.fallbackCode === undefined) {
                currentLocale = defaultLocale;
            } else {
                currentLocale = localeCodes[currentLocale.fallbackCode];
            }
        }
        return value;
    }

    private _flattenLocales(localesResult: { items: Locale[]}, items: any) {

        // this does not handle circular references well
        // TODO handle fallback codes

        // define for a tree node looks like
        interface node {
            context: any,
            item: any,
            depth: number
        }

        // get needed values from locales result
        const locales = localesResult.items;
        const localeCodes = locales.map((locale) => locale.code);
        const localeCodeMap = locales.reduce((acc: any, locale) => { acc[locale.code] = locale; return acc; }, {})
        const defaultLocaleObj = locales.find(locale => locale.default !== undefined && locale.default);

        // create the object that will hold all the items for each locale
        const localeItems = {} as any;

        // itterate each locale
        for (let locale of localeCodes) {

            // the box that will hold the properties for this locale
            const localeContext = [] as Array<any>;
            localeItems[locale] = localeContext;

            // for each item itteratively walk the tree of its properties
            for (let rawItem of items) {
                const itemContext = {};
                localeContext.push(itemContext);
                const queue = [] as node[];
                queue.push({
                    context: itemContext,
                    item: rawItem,
                    depth: 0
                });

                while (queue.length > 0) {
                    // pull and destruct the current node and exit early is undefined
                    const current = queue.shift();
                    if (current == undefined) { break; }
                    const { context, item, depth } = current;

                    // itterate each key and value on the node item
                    for (let [key, valueObj] of Object.entries(item)) {
                        // find the locale value or fallback to default or use the value of the prop
                        let value = valueObj as any;
                        if (isEmpty(value)) { 
                            continue;
                        }
                        value = this._getLocaleValue(defaultLocaleObj, localeCodeMap, localeCodeMap[locale], value)
                        // handle primitives
                        if (typeof value !== "object") {
                            context[key] = value;
                            continue;
                        }
                        // handle Objects
                        if (Array.isArray(value) === false) {
                            if(isEmpty(value["_id"])) {
                                // this isn't a contentful object, it's likely some sort of nested raw json
                                context[key] = value;
                                continue;
                            }
                            const itemContext = {};
                            context[key] = itemContext;
                            queue.push({
                                context: itemContext,
                                item: value,
                                depth: depth + 1
                            });
                            continue;
                        }
                        // handle Arrays
                        const itemContext = [] as any[];
                        context[key] = itemContext;

                        // iterate each item in the array and handle them
                        for (let index in value as Array<any>) {
                            // handle primitives
                            if (typeof value[index] !== "object") {
                                itemContext[index] = value[index];
                                continue;
                            }
                            
                            // explicitly handle nested arrays
                            // they must have come from outsite of a content model
                            // so leave them raw
                            if(Array.isArray(value[index])) {
                                itemContext[index] = value[index];
                                continue;
                            }
                            // handle objects
                            itemContext[index] = {};
                            queue.push({
                                context: itemContext[index],
                                item: value[index],
                                depth: depth + 1
                            });
                        }
                    }
                }
            }
        }
        return localeItems;
    }
}
