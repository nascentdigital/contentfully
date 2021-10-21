import {EntryFields, RichTextNodeType} from 'contentful'
import {JsonObject} from 'type-fest'


export type RichTextMarkType = 'bold' | 'underline' | 'code' | 'italic'

export interface RichText {
  nodeType: RichTextNodeType
  content?: RichText[]
  value?: string
  marks?: RichTextMarkType[]
  data?: JsonObject
}
