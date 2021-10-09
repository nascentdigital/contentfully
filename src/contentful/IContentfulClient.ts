import {CollectionProp, EntryProps, KeyValueMap, LocaleProps, QueryOptions} from 'contentful-management/types'


export interface IContentfulClient {

  getEntry<T extends KeyValueMap>(entryId: string): Promise<EntryProps<T>>

  getEntries<T extends KeyValueMap>(query?: QueryOptions): Promise<CollectionProp<EntryProps<T>>>

  getLocales(): Promise<CollectionProp<LocaleProps>>
}
