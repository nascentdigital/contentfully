// imports
import {Scribe} from '@nascentdigital/scribe'
import {EntryFields, RichTextContent} from 'contentful'
import {EntryProps, KeyValueMap, QueryOptions as EntryQueryOptions} from 'contentful-management/types'
import assign from 'lodash/assign'
import compact from 'lodash/compact'
import get from 'lodash/get'
import isArray from 'lodash/isArray'
import isEmpty from 'lodash/isEmpty'
import isString from 'lodash/isString'
import isUndefined from 'lodash/isUndefined'
import keys from 'lodash/keys'
import map from 'lodash/map'
import pick from 'lodash/pick'
import {IContentfulClient} from './contentful'
import {ContentModel, RichText} from './entities'
import {MediaTransform, QueryOptions} from './QueryOptions'
import {QueryResult} from './QueryResult'
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';

// constants
export const DEFAULT_OPTIONS: Readonly<ContentfullyOptions> = {
  experimental: false
}
export const DEFAULT_QUERY: Readonly<any> = {
  include: 10,
  limit: 1000
}
export const QUERY_SELECT_ID = 'sys.id'
export const QUERY_SELECT_TYPE = 'sys.contentType'
export const QUERY_SELECT_REVISION = 'sys.revision'
export const QUERY_SELECT_CREATED_AT = 'sys.createdAt'
export const QUERY_SELECT_UPDATED_AT = 'sys.updatedAt'
export const QUERY_SELECT_FIELDS = 'fields'
export const REQUIRED_QUERY_SELECT: ReadonlyArray<string> = [
  QUERY_SELECT_ID,
  QUERY_SELECT_TYPE,
  QUERY_SELECT_REVISION,
  QUERY_SELECT_CREATED_AT,
  QUERY_SELECT_UPDATED_AT
]
const log = Scribe.getLog('contentfully:Contentfully')


// types
export type ContentfullyOptions = {
  experimental: boolean;
};


interface Locale {
  name: string;
  code: string;
  default: boolean | undefined;
  fallbackCode: string | undefined | null;
}


export class Contentfully {

  public readonly contentfulClient: IContentfulClient
  public readonly options: Readonly<Partial<ContentfullyOptions>>
  public renderRichtext: boolean


  public constructor(client: IContentfulClient, options: Readonly<Partial<ContentfullyOptions>> = DEFAULT_OPTIONS) {

    // initialize instance variables
    this.contentfulClient = client
    this.options = options
    this.renderRichtext = false
  }

  public async getEntry<T extends KeyValueMap & ContentModel>(
    entryId: string,
    locale?: string
  ): Promise<EntryProps<T>> {

    // determine if the query is multi-locale
    const multiLocale = locale !== undefined && locale === '*'

    // fetch entry
    const entry = await this.contentfulClient.getEntry(entryId)

    // return parsed
    return this._parseEntry({}, entry, [], multiLocale)
  }

  public async getEntries<T extends KeyValueMap & ContentModel>(
    query: EntryQueryOptions = {},
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {

    // create query
    const entries = await this.contentfulClient.getEntries<T>(Contentfully.createQuery(query))

    log.debug('parsing Contentful data: ', entries)

    // assign multi-locale query
    const locale = get(query, 'locale')
    const multiLocale = locale && locale === '*'

    log.debug('parsing entry collection')

    // parse includes
    const links = await this._createLinks(entries, multiLocale, options.mediaTransform)

    if(options.renderRichtext) {
      this.renderRichtext = options.renderRichtext
    }
    // parse core entries
    let items = this._parseEntries(entries.items, links, multiLocale)

    // split locales to top level objects
    if (multiLocale && (options.flatten === undefined) || options.flatten === true) {
      const locales = await this.contentfulClient.getLocales()
      items = this._flattenLocales(locales, items)
    }

    // return result
    return {
      items: items as T[],
      skip: entries.skip,
      limit: entries.limit,
      total: entries.total
    }
  }

  private _parseAssetByLocale(entry: any) {

    // initialize locale map of entries
    const locales: any = {}
    for (const [key, field] of Object.entries<any>(entry.fields)) {

      // pull all locales from field
      const fieldLocales = keys(field)
      for (const locale of fieldLocales) {
        // initialize locale (if undefined) with sys and fields
        if (!locales[locale]) {
          locales[locale] = {
            sys: entry.sys,
            fields: {}
          }
        }

        // set field
        locales[locale].fields[key] = field[locale]
      }
    }

    return locales
  }

  private async _createLinks(json: any, multiLocale: boolean, mediaTransform?: MediaTransform) {

    // create new links
    const links: any = {}

    // link included assets
    const assets = get(json, 'includes.Asset') || []
    log.debug(`parsing ${assets.length} assets`)
    for (const asset of assets) {

      // TODO: handle non-image assets (e.g. video)
      let media: any = {}
      const sys = asset.sys

      // map asset to locale
      if (multiLocale) {
        const locales = this._parseAssetByLocale(asset)
        for (const [locale, entry] of Object.entries<any>(locales)) {
          try {
            if (entry.fields.file) {

              // transform asset to media
              const transformed = await this._toMedia(sys, entry.fields, mediaTransform)

              // prune id
              delete transformed._id

              // map locale data
              media[locale] = transformed
            }
          }
          catch (e) {
            console.error('[_createLinks] error with creating media', e)
          }
        }
      }
      else {
        media = await this._toMedia(sys, asset.fields, mediaTransform)
      }

      // map media
      links[sys.id] = media
    }

    // link included entries
    const linkedEntries = get(json, 'includes.Entry') || []
    log.debug(`parsing ${linkedEntries.length} linked entries`)
    for (const entry of linkedEntries) {
      links[entry.sys.id] = {
        _deferred: entry
      }
    }

    // link payload entries
    const mainEntries = get(json, 'items') || []
    log.debug(`parsing ${mainEntries.length} main entries`)
    for (const entry of mainEntries) {
      links[entry.sys.id] = {
        _deferred: entry
      }
    }

    // return links
    return links
  }

  private async _toMedia(sys: any, fields: any, mediaTransform?: MediaTransform) {
    // capture media file
    const file = fields.file
    const description = fields.description
    const title = fields.title
    let media = {
      _id: sys.id,
      url: file.url,
      title: title,
      description: description,
      contentType: file.contentType,
      dimensions: pick(file.details.image, ['width', 'height']),
      size: file.details.size,
      version: sys.revision
    }

    // apply any transform (if provided)
    if (mediaTransform) {
      media = await mediaTransform(media)
    }

    return media
  }

  private _parseEntries(entries: any, links: any, multiLocale: boolean) {

    // convert entries to models and return result
    return map(entries, entry => {

      // fetch model (avoids duplicate clones)
      const sys = entry.sys
      const model = links[sys.id]

      // process entry if not yet transformed
      if (model._deferred) {

        // return model if in progress
        if (model._model) {
          return model._model
        }

        // create in progress model
        model._model = {}

        // update entry with parsed value
        assign(model, this._parseEntry(model._model, model._deferred, links, multiLocale))

        // prune deferral
        delete model._model
        delete model._deferred
      }

      // return model
      return model
    })
  }

  private _parseEntry(model: any, entry: any, links: any, multiLocale: boolean) {

    // bind metadata to model
    this._bindMetadata(entry, model)

    log.debug('parsing entry: ', model._id)

    // transform entry fields to model
    for (const [key, value] of Object.entries<any>(entry.fields)) {

      // parse values if multi-locale query
      if (multiLocale) {

        // parse value (mapped by locale)
        const parsedLocale = this._parseValueByLocale(value, links)

        // FIXME: is just dropping this value ok?  what about a fallback?
        // bind if value is localized (otherwise drop field)
        if (!isUndefined(parsedLocale)) {
          model[key] = parsedLocale
        }
      }

      // parse array of values
      else if (isArray(value)) {
        model[key] = compact(map(value, item => this._parseValue(item, links)))
      }

      // or parse value
      else {

        // parse value
        const parsed = this._parseValue(value, links)

        // bind if value could be parsed, drop field otherwise
        if (!isUndefined(parsed)) {
          model[key] = parsed
        }
      }
    }

    // return parsed model
    return model
  }

  private _bindMetadata(entry: any, model: any) {

    // bind metadata to model
    const sys = entry.sys
    model._id = sys.id

    // use experimental metadata format
    if (this.options.experimental) {
      model._metadata = {
        type: sys.contentType.sys.id,
        revision: sys.revision,
        createdAt: sys.createdAt ? new Date(sys.createdAt).getTime() : 0,
        updatedAt: sys.updatedAt ? new Date(sys.updatedAt).getTime() : 0
      }
    }

    // or use legacy format
    else {
      model._type = sys.contentType.sys.id
      model._revision = sys.revision
      model._createdAt = sys.createdAt
      model._updatedAt = sys.updatedAt
    }
  }

  private _parseValueByLocale(value: any, links: any) {
    let values: any = {}
    // pull all locales
    const locales = keys(value)
    for (const locale of locales) {

      // parse array of value
      if (isArray(value[locale])) {
        values[locale] = compact(map(value[locale], item => this._parseValue(item, links, locale)))
      }

      // or parse value
      else {
        const sys = value[locale].sys
        if (sys === undefined || sys.type !== 'Link') {
          values[locale] = value[locale]
        }
        // assign asset to values (already mapped by locale)
        else if (sys.linkType === 'Asset') {
          values = this._dereferenceLink(value, links, locale)
        }
        else {
          values[locale] = this._dereferenceLink(value, links, locale)
        }
      }
    }

    return values
  }

  private _parseValue(value: any, links: any, locale?: string) {

    // resolve rich text identifier
    const {nodeType}: { nodeType?: string } = value

    // handle rich text value
    if (nodeType && nodeType === 'document') {
      return this._parseRichTextValue(value, links, locale)
    }

    // handle values without a link
    const sys = value.sys
    if (sys === undefined || sys.type !== 'Link') {
      return value
    }

    // dereference link
    return this._dereferenceLink(value, links, locale)
  }

  private _parseRichTextValue(value: any, links: any, locale?: string): RichText[] | undefined | string{

    // resolve content list
    const {content} = value

    // skip parsing if no content
    if (!content.length) {
      return undefined
    }

    if(this.renderRichtext) {
      return documentToHtmlString(value)
    }

    return this._parseRichTextContent(content, links, locale)
  }

  private _parseRichTextContent(items: RichTextContent[], links: any, locale?: string): RichText[] {

    // convert content items, recursively linking children
    return items.map(({
      nodeType,
      content,
      data,
      value,
      marks
    }) => {

      // create baseline rich text
      const richText: RichText = {
        nodeType
      }

      // bind value (if any)
      if (value !== undefined) {
        richText.value = value
      }

      // bind marks (if any)
      if (marks?.length) {
        richText.marks = marks.map(mark => mark.type)
      }

      // bind basic URL
      if (data?.uri) {
        richText.data = { uri: data.uri }
      }

      // bind entity/assets (if any)
      else if (data?.target?.sys.linkType) {
        richText.data = this._dereferenceLink(data.target, links, locale)
      }

      // recursively bind content (if any)
      if (content?.length) {
        richText.content = this._parseRichTextContent(content, links, locale)
      }

      // return rich text
      return richText
    })
  }

  private _dereferenceLink(reference: any, links: any, locale?: string) {

    // resolve entry sys and id
    const sys = locale && reference[locale]
      ? reference[locale].sys
      : reference.sys
    const modelId = sys.id

    // get link (or bail if it isn't mapped)
    let link = links[modelId]
    if (!link) {
      return
    }

    // resolve link if not processed
    if (link._deferred) {

      // return model if in progress
      if (link._model) {
        return link._model
      }

      // create in progress model
      link._model = {}

      // parse and update link
      assign(link, this._parseEntry(link._model, link._deferred, links, !isUndefined(locale)))

      // prune deferral
      delete link._model
      delete link._deferred
    }

    // return link
    return link
  }

  private _getLocaleValue(
    defaultLocale: Locale | undefined,
    localeCodes: { [code: string]: Locale },
    locale: Locale, value: any) {

    let currentLocale: Locale | undefined = locale
    while (currentLocale != undefined) {
      if (value[currentLocale.code] !== undefined) {
        return value[currentLocale.code]
      }
      if (currentLocale.fallbackCode === null) {
        return value
      }
      if (currentLocale == defaultLocale) {
        return value
      }
      if (currentLocale.fallbackCode === undefined) {
        currentLocale = defaultLocale
      }
      else {
        currentLocale = localeCodes[currentLocale.fallbackCode]
      }
    }
    return value
  }

  private _flattenLocales(localesResult: { items: Locale[] }, items: any) {

    // this does not handle circular references well
    // TODO handle fallback codes

    // define for a tree node looks like
    interface node {
      context: any,
      item: any,
      depth: number
    }


    // get needed values from locales result
    const locales = localesResult.items
    const localeCodes = locales.map((locale) => locale.code)
    const localeCodeMap = locales.reduce((acc: any, locale) => {
      acc[locale.code] = locale
      return acc
    }, {})
    const defaultLocaleObj = locales.find(locale => locale.default !== undefined && locale.default)

    // create the object that will hold all the items for each locale
    const localeItems = {} as any

    // iterate each locale
    for (let locale of localeCodes) {

      // the box that will hold the properties for this locale
      const localeContext = [] as Array<any>
      localeItems[locale] = localeContext

      // for each item itteratively walk the tree of its properties
      for (let rawItem of items) {
        const itemContext = {}
        localeContext.push(itemContext)
        const queue = [] as node[]
        queue.push({
          context: itemContext,
          item: rawItem,
          depth: 0
        })

        while (queue.length > 0) {
          // pull and destruct the current node and exit early is undefined
          const current = queue.shift()
          if (current == undefined) {
            break
          }
          const {context, item, depth} = current

          // iterate each key and value on the node item
          for (let [key, valueObj] of Object.entries(item)) {
            // find the locale value or fallback to default or use the value of the prop
            let value = valueObj as any
            if (isUndefined(value) || isEmpty(value)) {
              continue
            }
            value = this._getLocaleValue(defaultLocaleObj, localeCodeMap, localeCodeMap[locale], value)
            // handle primitives
            if (typeof value !== 'object') {
              context[key] = value
              continue
            }
            // handle Objects
            if (Array.isArray(value) === false) {
              if (isUndefined(value) || isEmpty(value['_id'])) {
                // this isn't a contentful object, it's likely some sort of nested raw json
                context[key] = value
                continue
              }
              const itemContext = {}
              context[key] = itemContext
              queue.push({
                context: itemContext,
                item: value,
                depth: depth + 1
              })
              continue
            }
            // handle Arrays
            const itemContext = [] as any[]
            context[key] = itemContext

            // iterate each item in the array and handle them
            for (let index in value as Array<any>) {
              // handle primitives
              if (typeof value[index] !== 'object') {
                itemContext[index] = value[index]
                continue
              }

              // explicitly handle nested arrays
              // they must have come from outsite of a content model
              // so leave them raw
              if (Array.isArray(value[index])) {
                itemContext[index] = value[index]
                continue
              }
              // handle objects
              itemContext[index] = {}
              queue.push({
                context: itemContext[index],
                item: value[index],
                depth: depth + 1
              })
            }
          }
        }
      }
    }
    return localeItems
  }

  private static createQuery(query: Readonly<any>): EntryQueryOptions {

    // create default select (if required)
    let select: string[]
    if (!query.select) {
      select = [...REQUIRED_QUERY_SELECT, QUERY_SELECT_FIELDS]
    }

    // or merge user select into required query
    else {

      // use user array if provided
      if (isArray(query.select)) {
        select = query.select as string[]
      }

      // or convert user string to array
      else if (isString(query.select)) {
        select = query.select.split(',')
      }

        // TODO: this should throw in the next major release
      // otherwise ignore + fallback
      else {
        console.warn('[Contentfully] invalid query.select value: ', query.select)
        select = [...REQUIRED_QUERY_SELECT, QUERY_SELECT_FIELDS]
      }

      // normalize + merge using a set
      select = Array.from(new Set([
        ...select.map(value => value.trim()),
        ...REQUIRED_QUERY_SELECT
      ]))
    }

    // create normalized clone of user query
    return assign({}, DEFAULT_QUERY, query, {select}) as QueryOptions
  }
}
