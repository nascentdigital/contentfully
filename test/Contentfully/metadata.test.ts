// imports
import "jest";
import {findEntry, TestData} from "../util";
import {Contentfully} from "../../src";
import {mockParams} from "../data/mockParams";


// setup test data
const testData: TestData = TestData.for({
    resultFormat: "collection",
    resultCount: "one",
    resultDepth: "deep",
    sharedRefs: true
});


// setup mock
jest.mock("contentful", () => {
    const originalModule = jest.requireActual("contentful")

    return {
        __esModule: true,
        ...originalModule,
        createClient: jest.fn(() => ({
            withoutLinkResolution: {
                getEntries: jest.fn(() => testData.data)
            }
        }))
    }
});


// tests
describe("Contentfully metadata", () => {
    describe(`linked entities [${testData.key}]`, () => {

        test("should load", async () => {
            const contentfully = new Contentfully(mockParams)

            // execute query
            const result = await contentfully.getEntries({});

            // verify blog was returned
            expect(result).toBeDefined();
            expect(result.items).toBeDefined();
            expect(result.items).toHaveLength(1);

            // verify blog articles
            const blog = result.items[0];
            expect(blog.articles).toBeDefined();
            expect(blog.articles).toHaveLength(5);
        });

        test("should have type", async () => {
            const contentfully = new Contentfully(mockParams)

            // execute query
            const result = await contentfully.getEntries();

            // verify legacy support is being used
            const blog = result.items[0];
            expect(blog._id).toBeDefined();
            expect(blog._metadata).toBeDefined();
            expect(blog._type).toBeUndefined();
            expect(blog._revision).toBeUndefined();
            expect(blog._createdAt).toBeUndefined();
            expect(blog._updatedAt).toBeUndefined();

            // verify blog metadata
            expect(typeof blog._metadata.type).toBe("string");
            expect(blog._metadata.type).toBe("blog");

            for (const article of blog.articles) {
                expect(article._metadata).toBeDefined();
                expect(article._type).toBeUndefined();
                expect(typeof article._metadata.type).toBe("string");
                expect(article._metadata.type).toBe("article");
            }
        });

        test("should have revision", async () => {
            const contentfully = new Contentfully(mockParams)

            // execute query
            const result = await contentfully.getEntries({});

            // verify blog metadata
            const blog = result.items[0];
            expect(typeof blog._metadata.revision).toBe("number");
            expectRevision(testData.data, blog._id, blog._metadata.revision);

            for (const article of blog.articles) {
                expect(article._revision).toBeUndefined();
                expect(typeof article._metadata.revision).toBe("number");
                expectRevision(testData.data, article._id, article._metadata.revision);
            }
        });

        test("should have createdAt", async () => {
            const contentfully = new Contentfully(mockParams)

            // execute query
            const result = await contentfully.getEntries({});

            // verify metadata
            const blog = result.items[0];
            expectMetadataDate(blog._metadata.createdAt, true);
            expectCreatedAt(testData.data, blog._id, blog._metadata.createdAt);

            for (const article of blog.articles) {
                expectMetadataDate(article._metadata.createdAt, true);
                expectCreatedAt(testData.data, article._id, article._metadata.createdAt);
            }
        });

        test("should have updatedAt", async () => {
            const contentfully = new Contentfully(mockParams)

            // execute query
            const result = await contentfully.getEntries({});

            // verify metadata
            const blog = result.items[0];
            expectMetadataDate(blog._metadata.updatedAt, true);
            expectUpdatedAt(testData.data, blog._id, blog._metadata.updatedAt);

            for (const article of blog.articles) {
                expectMetadataDate(article._metadata.updatedAt, true);
                expectUpdatedAt(testData.data, article._id, article._metadata.updatedAt);
            }
        });
    });
});


// helpers
function expectMetadataDate(value: any, experimental: boolean = false) {
    expect(value).toBeDefined();

    if (experimental) {
        expect(typeof value).toBe("number");
    }
    else {
        expect(typeof value).toBe("string");
        expect(Date.parse(value)).not.toBeNaN();
    }
}

function expectRevision(json: any, entryId: string, value: number) {
    const entry = findEntry(json, entryId);
    expect(entry.sys.revision).toBe(value);
}

function expectCreatedAt(json: any, entryId: string, value: string | Date | number) {
    const entry = findEntry(json, entryId);
    if (typeof value === 'number') {
        expect(new Date(entry.sys.createdAt).getTime()).toBe(value);
    }
    else if (value instanceof Date) {
        expect(new Date(entry.sys.createdAt).getTime()).toBe(value.getTime());
    }
    else {
        expect(entry.sys.createdAt).toBe(value);
    }
}

function expectUpdatedAt(json: any, entryId: string, value: string | Date | number) {
    const entry = findEntry(json, entryId);
    if (typeof value === 'number') {
        expect(new Date(entry.sys.updatedAt).getTime()).toBe(value);
    }
    else if (value instanceof Date) {
        expect(new Date(entry.sys.updatedAt).getTime()).toBe(value.getTime());
    }
    else {
        expect(entry.sys.updatedAt).toBe(value);
    }
}