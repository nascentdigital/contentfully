// imports
import {type EntryFields, type ContentfulClientApi, type EntrySkeletonType, type EntriesQueries, type CreateClientParams, createClient} from 'contentful'
import {KeyValueMap, QueryOptions as EntryQueryOptions} from 'contentful-management/types'
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
import {ContentModel, RichText} from './entities'
import {GetEntryQueryOptions, MediaTransform, QueryOptions} from './QueryOptions'
import {QueryResult} from './QueryResult'
import {type Block, type Inline, type Text, helpers} from '@contentful/rich-text-types'
import {InvalidRequestError} from './errors'


// constants
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


// types
interface Locale {
  name: string;
  code: string;
  default: boolean | undefined;
  fallbackCode: string | undefined | null;
}


export class Contentfully {

  public readonly contentfulClient: ContentfulClientApi<'WITHOUT_LINK_RESOLUTION'>

  public constructor(params: CreateClientParams) {
    // initialize instance variables
    this.contentfulClient = createClient(params).withoutLinkResolution
  }

  public async getEntry<T extends KeyValueMap & ContentModel>(
    entryId: string,
    options?: string | GetEntryQueryOptions
  ): Promise<T> {

    let multiLocale = false
    let locale: string | undefined
    let mediaTransform: MediaTransform | undefined
    let flattenLocales = true

    // check if options is the old locale string
    if (typeof options === 'string') {
      console.warn("[Contentfully] locale string will not be supported in future versions, please use `{allLocales: true}` or `{locale: 'en-US'}`")
      multiLocale = options === '*'

      // if not multi locale then options is a specific locale
      if (!multiLocale) {
        locale = options
      }
    }

    // otherwise check if options is new object
    else if (typeof options === 'object') {
      multiLocale = options.allLocales === true
      mediaTransform = options.mediaTransform
      flattenLocales = options.flatten ?? true // defaults to true

      // warn about `allLocales` overriding `locale` if both specified
      if (options.allLocales && options.locale !== undefined) {
        console.info("[Contentfully] `allLocales` overrides `locale`")
      }

      // ignore locale option if all locales are selected already
      if (!multiLocale) {
        if (options.locale === '*') {
          throw new InvalidRequestError("locale='*' not supported, please use `{allLocales: true}`")
        }
        locale = options.locale
      }
    }

    // build client based on query.locale
    const client = multiLocale
      ? this.contentfulClient.withAllLocales
      : this.contentfulClient

    // fetch entry
    const entry = await client.getEntry(entryId, {locale})

    // parse includes
    const links = await this._createLinks([entry], multiLocale, mediaTransform)

    // split locales to top level objects
    if (multiLocale && flattenLocales) {
      const locales = await this.contentfulClient.getLocales()
      return this._flattenLocales(locales, [entry])
    }
    else {
      return this._parseEntry({}, entry, links, multiLocale)
    }
  }

  public async getEntries<T extends KeyValueMap & ContentModel>(
    query: EntryQueryOptions = {},
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {

    // determine if using multiple locales
    let multiLocale = options.allLocales === true
    // warn about `allLocales` overriding `locale` if both specified
    if (options.allLocales && query.locale !== undefined) {
      console.info("[Contentfully] `options.allLocales` overrides `query.locales`")
    }
    // check if the old way of setting all locales is specified
    if (!multiLocale && query.locale === '*') {
      multiLocale = true
      console.warn("[Contentfully] locale='*' will not be supported in future versions, please pass `{allLocales: true}` into options")
    }

    // build client based on query.locale
    const client = multiLocale
      ? this.contentfulClient.withAllLocales
      : this.contentfulClient

    // remove locale from query if multiple locales is specified,
    // Contentful client throws error if locale='*' query option is passed in
    const cleanedQuery = {...query}
    if (multiLocale) {
      delete cleanedQuery.locale
    }

    // create query
    const entries = await client.getEntries(Contentfully.createQuery(cleanedQuery))

    // parse includes
    const links = await this._createLinks(entries, multiLocale, options.mediaTransform)

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
    // console.debug(`parsing ${assets.length} assets`)
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
    // console.debug(`parsing ${linkedEntries.length} linked entries`)
    for (const entry of linkedEntries) {
      links[entry.sys.id] = {
        _deferred: entry
      }
    }

    // link payload entries
    const mainEntries = get(json, 'items') || []
    // console.debug(`parsing ${mainEntries.length} main entries`)
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
    const description = fields.description
    const title = fields.title

    let url, contentType, size
    let dimensions = { height: 0, width: 0 }

    // Account for possibility of missing file, if user removes file from media
    if (fields.file) {
      url = fields.file.url
      contentType = fields.file.contentType
      dimensions = pick(fields.file.details.image, ['width', 'height'])
      size =  fields.file.details.size
    }

    let media = {
      _id: sys.id,
      url,
      title: title,
      description: description,
      contentType,
      dimensions,
      size,
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

    // console.debug('parsing entry: ', model._id)

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
    model._metadata = {
      type: sys.contentType.sys.id,
      revision: sys.revision,
      createdAt: sys.createdAt ? new Date(sys.createdAt).getTime() : 0,
      updatedAt: sys.updatedAt ? new Date(sys.updatedAt).getTime() : 0
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

  private _parseRichTextValue(value: EntryFields.RichText, links: any, locale?: string): RichText[] | undefined {

    // resolve content list
    const {content} = value

    // skip parsing if no content
    if (!content.length) {
      return undefined
    }

    return this._parseRichTextContent(content, links, locale)
  }

  private _parseRichTextContent(items: Array<Block | Inline | Text>, links: any, locale?: string): RichText[] {

    // convert content items, recursively linking children
    return items.map(item => {

      const {nodeType, data} = item


      // create baseline rich text
      const richText: RichText = {
        nodeType
      }

      // bind text attributes
      if (helpers.isText(item)) {
        richText.value = item.value
        richText.marks = item.marks.map(mark => mark.type as RichText.MarkType)
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
      if (helpers.isBlock(item) || helpers.isInline(item)) {
        richText.content = this._parseRichTextContent(item.content, links, locale)
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

  private static createQuery(query: Readonly<any>): EntriesQueries<EntrySkeletonType, any> {

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
    return assign({}, DEFAULT_QUERY, query, {select}) as EntriesQueries<EntrySkeletonType, any>
  }
}
