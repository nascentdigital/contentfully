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

        // fetch models with media transform option
        const result = await contentfully.getModels();

        // Validate that unpublished fields have been removed
        expect(Object.keys(result.items[0]).length).toBe(9); // 10 total, 1 unpublished
        expect(result.items[0].blocks.length).toBe(3); // 5 total, 2 unpublished
    });
});
