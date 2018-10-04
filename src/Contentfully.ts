import _ from "lodash";
import {ContentfulClient} from "./ContentfulClient";


export class Contentfully {

    public readonly contentful: ContentfulClient;


    public constructor(contentful: ContentfulClient) {

        // initialize instance variables
        this.contentful = contentful;
    }

    public async getModels(query: any): Promise<QueryResult> {

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
        const links = this._createLinks(json);

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

    private _createLinks(json: any) {

        // create new links
        const links: any = {};

        // link included assets
        _.forEach(_.get(json, "includes.Asset"), asset => {

            // TODO: handle video too

            // extract media as asset
            const file = asset.fields.file;
            links[asset.sys.id] = {
                url: file.url,
                type: file.contentType,
                dimensions: _.pick(file.details.image, ["width", "height"]),
                size: file.details.size
            };
        });

        // link included entries
        _.forEach(_.get(json, "includes.Entry"), entry => {
            links[entry.sys.id] = {
                _deferred: entry
            };
        });

        // link payload entries
        _.forEach(_.get(json, "items"), entry => {

            // link if not already included
            if (!links[entry.sys.id]) {
                links[entry.sys.id] = {
                    _deferred: entry
                };
            }
        });

        // return links
        return links;
    }

    private _dereferenceLink(reference: any, links: any) {

        // get link
        let link = links[reference.sys.id];

        // resolve link if deferred
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
            const link = links[entry.sys.id];
            if (link._deferred) {

                // update entry with parsed value
                _.assign(link, this._parseEntry(link._deferred, links));
            }

            // return processed link
            return link;
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