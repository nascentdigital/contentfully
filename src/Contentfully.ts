import _ from "lodash";
import {ContentfulClient} from "./ContentfulClient";


export class Contentfully {

    public readonly contentful: ContentfulClient;


    public constructor(contentful: ContentfulClient) {

        // initialize instance variables
        this.contentful = contentful;
    }

    public async getModels(query: any) {

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

        // return transformed items (should be flattened)
        return this._parseEntries(json.items, links);
    }

    private _createLinks(json: any) {

        // create new links
        const links = {};

        // link assets and entries
        this._linkAssets(_.get(json, "includes.Asset"), links);
        this._linkEntries(_.get(json, "includes.Entry"), links);

        // return links
        return links;
    }

    private _linkAssets(assets: any, links: any) {
        _.forEach(assets, asset => {

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
    }

    private _linkEntries(entries: any, links: any) {
        _.forEach(entries, entry => {
            links[entry.sys.id] = {
                _deferred: entry
            };
        });
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
        return _.map(entries, entry => this._parseEntry(entry, links));
    }

    private _parseEntry(entry: any, links: any) {

        // transform entry to model and return result
        return _.mapValues(entry.fields, value => {

            // handle null values
            if (value === null || value === undefined) {
                return value;
            }

            // handle array
            if (_.isArray(value)) {
                return _.map(value, item => this._dereferenceLink(item, links));
            }

            // handle values without a link
            const sys = value.sys;
            if (sys === undefined
                || sys.type !== "Link") {
                return value;
            }

            // dereference link
            return this._dereferenceLink(value, links);
        });
    }
}