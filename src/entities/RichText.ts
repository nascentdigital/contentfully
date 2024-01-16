import type {Block, Inline, Text} from '@contentful/rich-text-types'
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
  export type NodeType = (Block | Inline | Text)['nodeType'] | 'embedded-asset-block'
}