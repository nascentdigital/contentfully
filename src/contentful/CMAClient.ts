import {PlainClientAPI} from 'contentful-management'
import {CollectionProp, EntryProps, KeyValueMap, LocaleProps, QueryOptions} from 'contentful-management/types'
import {IContentfulClient} from './IContentfulClient'


export class CMAClient implements IContentfulClient {

  public constructor(public readonly cmaClient: PlainClientAPI) {
  }

  public getEntry<T extends KeyValueMap>(entryId: string): Promise<EntryProps<T>> {
    return this.cmaClient.entry.get({entryId})
  }

  public getEntries<T extends KeyValueMap>(query?: QueryOptions): Promise<CollectionProp<EntryProps<T>>> {
    return this.cmaClient.entry.getMany({query})
  }

  public getLocales(): Promise<CollectionProp<LocaleProps>> {
    return this.cmaClient.locale.getMany({})
  }
}
