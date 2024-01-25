import "jest";
import dataEntriesLocales from "../data/entries-locales.json";
import localesCollection from "../data/locales-collection.json";
import dataEntryLocales from "../data/entry-locale.json";
import {Contentfully} from "../../src";
import {mockParams} from "../data/mockParams";


// mock functions 
const getEntryMock = jest.fn(() => dataEntryLocales)
const getEntriesMock = jest.fn(() => dataEntriesLocales)
const getEntryMockAllLocales = jest.fn(() => dataEntryLocales)
const getEntriesMockAllLocales = jest.fn(() => dataEntriesLocales)

// setup contentful mock
jest.mock("contentful", () => {
  const originalModule = jest.requireActual("contentful")

  return {
      __esModule: true,
      ...originalModule,
      createClient: jest.fn(() => ({
          withoutLinkResolution: {
              getLocales: jest.fn(() => localesCollection),
              getEntry: getEntryMock,
              getEntries: getEntriesMock,
              withAllLocales: {
                getEntry: getEntryMockAllLocales,
                getEntries: getEntriesMockAllLocales,
              }
          }
      }))
  }
});


// tests
describe("Contentfully locales", () => {
  describe("Contentful modifiers", () => {

    afterEach(() => {
      // clear mock calls data after each test
      jest.clearAllMocks()
    })

    it("getEntry by default should not use Contentful withAllLocales modifier", async () => {
      const contentfully = new Contentfully(mockParams)
      await contentfully.getEntry('test')
  
      expect(getEntryMock).toHaveBeenCalled()
    })
  
    it("getEntries by default should not use Contentful withAllLocales modifier", async () => {
      const contentfully = new Contentfully(mockParams)
      await contentfully.getEntries()
  
      expect(getEntriesMock).toHaveBeenCalled()
    })
  
    it("getEntry should not use Contentful withAllLocales modifier when specifying single locale", async () => {
      const contentfully = new Contentfully(mockParams)
      await contentfully.getEntry('test', {locale: 'en-US'})
  
      expect(getEntryMock).toHaveBeenCalled()
    })
  
    it("getEntries should not use Contentful withAllLocales modifier when specifying single locale", async () => {
      const contentfully = new Contentfully(mockParams)
      await contentfully.getEntries({locale: 'en-US'})
  
      expect(getEntriesMock).toHaveBeenCalled()
    })

    it("getEntry should use Contentful withAllLocales modifier when specifying all locales", async () => {
      const contentfully = new Contentfully(mockParams)
      await contentfully.getEntry('test', {allLocales: true})
  
      expect(getEntryMockAllLocales).toHaveBeenCalled()
    })
  
    it("getEntries should use Contentful withAllLocales modifier when specifying all locales", async () => {
      const contentfully = new Contentfully(mockParams)
      await contentfully.getEntries({}, {allLocales: true})
  
      expect(getEntriesMockAllLocales).toHaveBeenCalled()
    })

    describe("Deprecated options", () => {
      it("getEntry should not use Contentful withAllLocales modifier when specifying single locale", async () => {
        const contentfully = new Contentfully(mockParams)
        await contentfully.getEntry('test', 'en-US')
    
        expect(getEntryMock).toHaveBeenCalled()
      })

      it("getEntry should use Contentful withAllLocales modifier when specifying all locales", async () => {
        const contentfully = new Contentfully(mockParams)
        await contentfully.getEntry('test', '*')
    
        expect(getEntryMockAllLocales).toHaveBeenCalled()
      })

      it("getEntries should use Contentful withAllLocales modifier when specifying all locales", async () => {
        const contentfully = new Contentfully(mockParams)
        await contentfully.getEntries({locale: '*'})
    
        expect(getEntriesMockAllLocales).toHaveBeenCalled()
      })

      it("getEntry when using both locale and all locales, all locales should override", async () => {
        const contentfully = new Contentfully(mockParams)
        await contentfully.getEntry('test', {locale: 'en-US', allLocales: true})

        expect(getEntryMockAllLocales).toHaveBeenCalled()
        expect(getEntryMock).not.toHaveBeenCalled()
      })

      it("getEntries when using both locale and all locales, all locales should override", async () => {
        const contentfully = new Contentfully(mockParams)
        await contentfully.getEntries({locale: 'en-US'}, {allLocales: true})

        expect(getEntriesMockAllLocales).toHaveBeenCalled()
        expect(getEntriesMock).not.toHaveBeenCalled()
      })
    })
  })
})