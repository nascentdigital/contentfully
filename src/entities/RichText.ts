import type {BLOCKS, INLINES} from '@contentful/rich-text-types'
import type {JsonObject} from 'type-fest'


export interface RichText {
  nodeType: RichText.NodeType
  content?: RichText[]
  value?: string
  marks?: RichText.MarkType[]
  data?: JsonObject
}


export namespace RichText {
  export type MarkType = 'bold' | 'underline' | 'code' | 'italic'
  export type NodeType = BLOCKS | INLINES | 'text' | 'embedded-asset-block'
}