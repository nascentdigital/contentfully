import {Media} from './entities'


export type MediaTransform = (media: Media) => Promise<Media>


export interface QueryOptions {
  mediaTransform?: MediaTransform
  flatten?: boolean
  allLocales?: boolean
}

export interface GetEntryQueryOptions extends QueryOptions {
  locale?: string
}