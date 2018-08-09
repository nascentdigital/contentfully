const _ = require("lodash");
const fetch = require("node-fetch");


// constants
const PREVIEW_URL = "https://preview.contentful.com";
const PRODUCTION_URL = "https://cdn.contentful.com";


// class definition
class ContentfulClient {

    constructor({accessToken, spaceId, environmentId = "master", preview = false}) {

        // initialize instance variables
        this._accessToken = accessToken;
        this._spaceId = spaceId;
        this._environmentId = environmentId;
        this._preview = preview;

        // initialize query components
        this._serverUrl = preview
            ? PREVIEW_URL
            : PRODUCTION_URL;
        this._baseUrl = `${this._serverUrl}/spaces/${spaceId}/environments/${environmentId}`;
    }

    get spaceId() {
        return this._spaceId;
    }

    get environmentId() {
        return this._environmentId;
    }

    get preview() {
        return this._preview;
    }

    async getContentModels() {
        return await this._query("/content_types");
    }

    async getContent() {
        return await this._query("/entries");
    }

    async getModels(query) {

        // create query
        const json = await this._query("/entries", Object.assign({}, query, {
            select: "fields,sys.id,sys.contentType",
            include: 10,
            limit: 1000
        }));

        // parse includes
        const links = this._createLinks(json);

        // return transformed items (should be flattened)
        const models = this._parseEntries(json.items, links);
        return models;
    }

    async _query(path, parameters = {}) {

        // create request url
        let url = this._baseUrl;
        if (path) {
            if (path[0] !== "/") {
                url += "/";
            }
            url += path;
        }

        // add query string
        const query = Object.assign({access_token: this._accessToken},
            parameters);
        _.keys(query).forEach((key, index) => {
            url += index > 0 ? "&" : "?";
            url += key + "=" + encodeURIComponent(query[key]);
        });

        // fetch data (throw if there is an error)
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        // extract response
        return await response.json();
    }

    _createLinks(json) {

        // create new links
        const links = {};

        // link assets and entries
        this._linkAssets(_.get(json, "includes.Asset"), links);
        this._linkEntries(_.get(json, "includes.Entry"), links);

        // return links
        return links;
    }

    _linkAssets(assets, links) {
        _.forEach(assets, asset => {

            // TODO: handle video too
            // extract image
            const file = asset.fields.file;
            const image = {
                url: file.url,
                type: file.contentType,
                dimensions: _.pick(file.details.image, ["width", "height"]),
                size: file.details.size
            };

            // map media
            links[asset.sys.id] = image;
        });
    }

    _linkEntries(entries, links) {
        _.forEach(entries, entry => {
            const model = {
                _deferred: entry
            };
            links[entry.sys.id] = model;
        });
    }

    _dereferenceLink(reference, links) {

        // get link
        let link = links[reference.sys.id];

        // resolve link if deferred
        if (link._deferred) {

            // update entry with parsed value
            Object.assign(link, this._parseEntry(link._deferred, links));

            // prune deferral
            delete link._deferred;
        }

        // return link
        return link;
    }

    _parseEntries(entries, links) {

        // convert entries to models
        const models = _.map(entries, entry => this._parseEntry(entry, links));

        // return transformed models
        return models;
    }

    _parseEntry(entry, links) {

        // transform entry to model
        const model = _.mapValues(entry.fields, value => {

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

        // return model
        return model;
    }
}

module.exports = ContentfulClient;