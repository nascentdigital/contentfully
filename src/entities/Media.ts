import {Size} from "./Size";

export interface Media {
    _id: string
    url: string
    title: string
    description: string
    contentType: string
    dimensions: Size
    size: number
    version: number
}
