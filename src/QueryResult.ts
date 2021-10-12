import {KeyValueMap} from 'contentful-management/types'


export interface QueryResult<TEntry extends KeyValueMap> {
  items: TEntry[]
  skip: number
  limit: number
  total: number
}
