import {RichTextNodeType} from 'contentful'
import {JsonObject} from 'type-fest'


export interface RichText {
  nodeType: RichText.NodeType
  content?: RichText[]
  value?: string
  marks?: RichText.MarkType[]
  data?: JsonObject
}

export namespace RichText {

  export type MarkType = 'bold' | 'underline' | 'code' | 'italic'
  export type NodeType = RichTextNodeType | 'embedded-asset-block'
}