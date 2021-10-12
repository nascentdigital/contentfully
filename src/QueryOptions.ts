import {Media} from './entities'


export type MediaTransform = (media: Media) => Promise<Media>


export interface QueryOptions {
  mediaTransform?: MediaTransform
  flatten?: boolean
}
