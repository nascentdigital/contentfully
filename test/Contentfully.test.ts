import _ from "lodash";
import "jest";
import { mocked } from "ts-jest/utils";
import { ContentfulClient } from "../src/contentful";
import { Media } from '../src/entities';
import {
    Contentfully
} from "../src";
import fullContent from "./data/linked.json";
import draftedContent from "./data/draftedContent.json";
import localeContent from "./data/locale.json";
import localesResultContent from "./data/localesResult.json";


// setup mocks
jest.mock("../src/contentful/ContentfulClient");
const MockContentfulClient = mocked(ContentfulClient, true);

// start tests
describe("Content with linked entities and assets", () => {

    // create mock for client
    const contentfulOptions = {
        accessToken: "abc123",
        spaceId: "xyz123",
        environmentId: "testing"
    };
    const mockClientQuery = jest.fn()
        .mockImplementation(async () => {
            return _.cloneDeep(fullContent)
        });

    // test setup
    beforeEach(() => {
        // clear all instances
        MockContentfulClient.mockClear();
        mockClientQuery.mockClear();

        // create implementation
        MockContentfulClient.mockImplementation(() => {
            return {
                query: mockClientQuery
            };
        });
    });

    // data constants
    const ROTAX_900 = {
        _id: "Bc6aR9qfPaAQC4I4KsOom",
        _type: "engine",
        id: "rotax.900",
        sku: "903"
    };
    const RALLY = {
        _id: "4vh76dbTGgwsKI6qCe42ck",
        _type: "model",
        id: "ryker.rally"
    };

    // tests
    it("Should parse without errors", async () => {

        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);
        const result = await contentfully.getModels();

        // assert invocations
        expect(MockContentfulClient).toHaveBeenCalledTimes(1);
        expect(mockClientQuery).toHaveBeenCalledTimes(1);

        // assert content
        expect(result).toMatchObject({
            total: 14,
            skip: 0,
            limit: 100
        });
        expect(result.items).toBeInstanceOf(Array);
        expect(result.items.length).toEqual(14);
        expect(result.items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                _id: "5nZHNlP6zCESgGuMGKG2Q8",
                _type: "terms"
            }),
            expect.objectContaining(ROTAX_900),
            expect.objectContaining({
                ...RALLY,
                engines: expect.arrayContaining([
                    expect.objectContaining(ROTAX_900)
                ])
            }),
        ]))
    });

    it("Should not clone linked top-level entries", async () => {

        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);
        const result = await contentfully.getModels();

        // assert invocations
        expect(MockContentfulClient).toHaveBeenCalledTimes(1);

        // assert engine
        const rotax900 = result.items.find((i: any) => i._id === ROTAX_900._id);
        expect(rotax900).toBeDefined();
        expect(rotax900).not.toBe(ROTAX_900);
        expect(rotax900).toMatchObject(ROTAX_900);

        // assert engine link
        const rally = result.items.find((i: any) => i._id === RALLY._id);
        expect(rally).toBeDefined();
        expect(rally).toMatchObject(RALLY);
        expect(rally.engines.length).toEqual(1);
        const rallyEngine = rally.engines[0];
        expect(rallyEngine).toBe(rotax900);

        // change property to validate
        rotax900.id = ROTAX_900.id + "!";
        expect(rallyEngine).toBe(rotax900);
        expect(rotax900).not.toMatchObject(ROTAX_900);
    });

    it("Should query the contentful client with the correct id retrieving a model", async () => {

        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);

        const id = 'test1234';
        const expectedPath = `/entries/${id}`;
        const expectedDefaultOptions = {
            include: 10,
            limit: 1000,
            select: "sys.id,sys.contentType,sys.updatedAt,fields"
        };

        await contentfully.getModel(id);

        // assert invocations
        expect(MockContentfulClient).toHaveBeenCalledTimes(1);
        expect(mockClientQuery).toHaveBeenCalledTimes(1);
        expect(mockClientQuery).toHaveBeenCalledWith(expectedPath, expectedDefaultOptions);
    });


    it("Should query with correct select fields and remove whitespace", async () => {
        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);

        const mockQuery = {
            select: "selectedFields, another, hello"
        };
        const mockPath = "/entries";
        const expectedMockArgs = {
            include: 10,
            limit: 1000,
            select: `sys.id,sys.contentType,sys.updatedAt,selectedFields,another,hello`
        };

        contentfully.getModels(mockQuery);
        expect(contentfulClient.query).toHaveBeenCalledWith(mockPath, expectedMockArgs);
    });

    it("Should remove duplicate sys.id and content type in select query", async () => {
        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);

        const mockQuery = {
            select: "selectedFields, another, hello, sys.id, sys.contentType, sys.updatedAt"
        };
        const mockPath = "/entries";
        const expectedMockArgs = {
            include: 10,
            limit: 1000,
            select: `sys.id,sys.contentType,sys.updatedAt,selectedFields,another,hello`
        };

        contentfully.getModels(mockQuery);
        expect(contentfulClient.query).toHaveBeenCalledWith(mockPath, expectedMockArgs);
    });

    it("Should transform media when option callback is provided", async () => {
        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);

        // fetch models with media transform option
        const result = await contentfully.getModels({}, {
            mediaTransform: async (media: Media) => {
                media.description = 'default description'
                return media
            }
        });

        // filter items with image property
        const items = _.filter(result.items, (r) => !_.isUndefined(r.image));

        // assert transform
        expect(items.length).toBeGreaterThan(0)
        _.forEach(items, item => {
            expect(item.image.description).toEqual('default description');
        })
    });

    // Test with draft mode content
    const mockClientQuery2 = jest.fn()
        .mockImplementation(async () => {
            return _.cloneDeep(draftedContent)
        });

    it("Delivery API - Should skip fields that are empty/undefined", async () => {
        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();
        // create implementation
        MockContentfulClient.mockImplementation(() => {
            return {
                query: mockClientQuery2
            };
        });

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);

        const result = await contentfully.getModels();

        // Validate that unpublished fields have been removed
        expect(Object.keys(result.items[0]).length).toBe(9); // 10 total, 1 unpublished
        expect(result.items[0].blocks.length).toBe(3); // 5 total, 2 unpublished
    });
});

describe("Linked entities and assets with wildcard locale", () => {
    // create mock for client
    const contentfulOptions = {
        accessToken: "abc123",
        spaceId: "xyz123",
        environmentId: "testing"
    };
    const mockClientQuery = jest.fn()
        .mockImplementation(async () => {
            return _.cloneDeep(localeContent)
        })
    const mockClientLocales = jest.fn()
        .mockImplementation(async () => {
            return _.cloneDeep(localesResultContent)
        })

    // test setup
    beforeEach(() => {
        // clear all instances
        MockContentfulClient.mockClear();
        mockClientQuery.mockClear();
        mockClientLocales.mockClear();

        // create implementation
        MockContentfulClient.mockImplementation(() => {
            return {
                query: mockClientQuery,
                getLocales: mockClientLocales
            };
        });
    });

    it("Should parse unflattened locales without errors", async () => {

        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);
        const result = await contentfully.getModels({
            locale: '*'
        }, { flatten: false });

        // assert invocations
        expect(MockContentfulClient).toHaveBeenCalledTimes(1);
        expect(mockClientQuery).toHaveBeenCalledTimes(1);

        // assert content
        expect(result).toMatchObject({
            total: 1,
            skip: 0,
            limit: 1000
        });
        expect(result.items).toBeInstanceOf(Array);
        expect(result.items.length).toEqual(1);

        const nav = _.get(result, 'items[0].nav.en-CA');
        const navLeftItems = _.get(nav, 'itemsLeft.en-CA');

        expect(nav).toBeDefined();
        expect(navLeftItems).toBeInstanceOf(Array);
        expect(navLeftItems).toEqual(expect.arrayContaining([
            expect.objectContaining({
                _id: "7DtmnYUzXUKgygyyomKaQ2",
                _type: "link",
                url: {
                    "en-CA": "#howItWorks"
                },
                type: {
                    "en-CA": "Link"
                },
                id: {
                    "en-CA": "howItWorksLink"
                },
                text: {
                    "en-CA": "How It Works",
                    "fr-CA": "Fonctionnement"
                }
            })
        ]));

        const heroBanner = (_.get(result, 'items[0].heroBanner.en-CA'));
        const heroBannerContent = _.get(heroBanner, 'content.en-CA.title');
        const heroBannerLogo = _.get(heroBanner, 'logo');

        expect(heroBanner).toBeDefined();
        expect(heroBannerContent).toHaveProperty('en-CA')
        expect(heroBannerContent).toHaveProperty('en-CA-BC');
        expect(heroBannerContent).toHaveProperty('fr-CA');

        expect(heroBannerLogo).toHaveProperty('en-CA');
        expect(heroBannerLogo['en-CA']).toHaveProperty('size');
        expect(heroBannerLogo['en-CA']).toHaveProperty('contentType');
        expect(heroBannerLogo['en-CA'].dimensions).toMatchObject({
            width: 500,
            height: 116
        });
        expect(heroBannerLogo).toHaveProperty('fr-CA');
        expect(heroBannerLogo['fr-CA']).toHaveProperty('size');
        expect(heroBannerLogo['fr-CA']).toHaveProperty('contentType');
        expect(heroBannerLogo['fr-CA'].dimensions).toMatchObject({
            width: 597,
            height: 157
        });

    });

    it("Should parse flattened locales without errors", async () => {

        // ensure mock has never been called
        expect(MockContentfulClient).not.toHaveBeenCalled();

        // create client
        const contentfulClient = new ContentfulClient(contentfulOptions);
        const contentfully = new Contentfully(contentfulClient);
        const result = await contentfully.getModels({
            locale: '*'
        });

        // assert invocations
        expect(MockContentfulClient).toHaveBeenCalledTimes(1);
        expect(mockClientQuery).toHaveBeenCalledTimes(1);

        // assert content
        expect(result).toMatchObject({
            total: 1,
            skip: 0,
            limit: 1000
        });
        expect(result.items).toBeInstanceOf(Object);
        expect(result.items).toHaveProperty("en-CA");
        expect(result.items).toHaveProperty("en-CA-BC");
        expect(result.items).toHaveProperty("fr-CA");
        expect(result.items["en-CA"]).toBeInstanceOf(Array);
        expect(result.items["en-CA-BC"]).toBeInstanceOf(Array);
        expect(result.items["fr-CA"]).toBeInstanceOf(Array);
        expect(result.items["en-CA"].length).toEqual(1);
        expect(result.items["en-CA-BC"].length).toEqual(1);
        expect(result.items["fr-CA"].length).toEqual(1);

        // check that nested locales are now lifted
        let nav = _.get(result, 'items.en-CA[0].nav');
        let navLeftItems = _.get(nav, 'itemsLeft');

        expect(nav).toBeDefined();
        expect(navLeftItems).toBeInstanceOf(Array);
        expect(navLeftItems).toEqual(expect.arrayContaining([
            expect.objectContaining({
                _id: "7DtmnYUzXUKgygyyomKaQ2",
                _type: "link",
                url: "#howItWorks",
                type: "Link",
                id: "howItWorksLink",
                text: "How It Works",
            })
        ]));

        nav = _.get(result, 'items.fr-CA[0].nav');
        navLeftItems = _.get(nav, 'itemsLeft');

        // check french copy is included for the french locale
        // check that fallback default english is used for the french locale
        expect(nav).toBeDefined();
        expect(navLeftItems).toBeInstanceOf(Array);
        expect(navLeftItems).toEqual(expect.arrayContaining([
            expect.objectContaining({
                _id: "7DtmnYUzXUKgygyyomKaQ2",
                _type: "link",
                url: "#howItWorks",
                type: "Link",
                id: "howItWorksLink",
                text: "Fonctionnement",
            })
        ]));

        const heroBannerEN_CA = (_.get(result, 'items.en-CA[0].heroBanner'));
        const heroBannerContentEN_CA = _.get(heroBannerEN_CA, 'content.title');
        const heroBannerLogoEN_CA = _.get(heroBannerEN_CA, 'logo');

        const heroBannerFR_CA = (_.get(result, 'items.fr-CA[0].heroBanner'));
        const heroBannerContentFR_CA = _.get(heroBannerFR_CA, 'content.title');
        const heroBannerLogoFR_CA = _.get(heroBannerFR_CA, 'logo');

        const heroBannerEN_CA_BC = (_.get(result, 'items.en-CA-BC[0].heroBanner'));
        const heroBannerContentSubtitleEN_CA_BC = _.get(heroBannerEN_CA_BC, 'content.subtitle');

        expect(heroBannerEN_CA).toBeDefined();
        expect(heroBannerFR_CA).toBeDefined();
        expect(heroBannerEN_CA_BC).toBeDefined();

        expect(heroBannerLogoEN_CA).toBeDefined();
        expect(heroBannerLogoEN_CA).toHaveProperty('size');
        expect(heroBannerLogoEN_CA).toHaveProperty('contentType');
        expect(heroBannerContentEN_CA).toEqual('Healthcare in your hands.')
        expect(heroBannerLogoEN_CA.dimensions).toMatchObject({
            width: 500,
            height: 116
        });

        expect(heroBannerContentSubtitleEN_CA_BC).toEqual('*Doctor consultations for BC residents are covered under the Medical Services Plan (MSP).')

        expect(heroBannerLogoFR_CA).toBeDefined();
        expect(heroBannerLogoFR_CA).toHaveProperty('size');
        expect(heroBannerLogoFR_CA).toHaveProperty('contentType');
        expect(heroBannerContentFR_CA).toEqual('La santé au bout des doigts')
        expect(heroBannerLogoFR_CA.dimensions).toMatchObject({
            width: 597,
            height: 157
        });

    });
});