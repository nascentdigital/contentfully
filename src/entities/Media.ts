import {Size} from "./Size";

export interface Media {
    _id: string
    url: string
    description: string
    contentType: string
    dimensions: Size
    size: number
    version: number
}
