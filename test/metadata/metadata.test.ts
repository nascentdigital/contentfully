// imports
import "jest";
import fetch from "node-fetch";
import {mocked} from "ts-jest/utils";
import {
    ContentfulClient,
    Contentfully
} from "../../src";


// json
import blogJson from "./data/blog.json";


// mocks + containers
jest.mock("node-fetch", () => {
    return jest.fn();
});

function bindFetch(json: any) {
    mocked(fetch).mockImplementation(async (): Promise<any> => {
        return {
            ok: true,
            async json() {
                return json;
            }
        };
    });
}


// helpers
function findEntry(json: any, entryId: string) {

    // search items
    for (const entry of json.items) {
        if (entry.sys.id === entryId) {
            return entry;
        }
    }

    // search includes
    for (const entry of json.includes.Entry) {
        if (entry.sys.id === entryId) {
            return entry;
        }
    }

    // throw if not found
    fail(`Unable to find entry in JSON data matching '${entryId}'`);
}
function expectMetadataDate(value: any) {
    expect(value).toBeDefined();
    expect(typeof value).toBe("string");
    expect(Date.parse(value)).not.toBeNaN();
}
function expectRevision(json: any, entryId: string, value: number) {
    const entry = findEntry(json, entryId);
    expect(entry.sys.revision).toBe(value);
}
function expectCreatedAt(json: any, entryId: string, value: string) {
    const entry = findEntry(json, entryId);
    expect(entry.sys.createdAt).toBe(value);
}
function expectUpdatedAt(json: any, entryId: string, value: string) {
    const entry = findEntry(json, entryId);
    expect(entry.sys.updatedAt).toBe(value);
}


// lifecycle
let contenfulClient: ContentfulClient;

beforeEach(() => {

    // clear mocks
    mocked(fetch).mockClear();

    // prepare contentful client
    contenfulClient = new ContentfulClient({
        spaceId: "my_space",
        accessToken: "my_access_token",
        fetch: fetch
    });
});


// suite
describe("Contentfully metadata", () => {

    describe("linked entities [blog.json]", () => {

        test("should load", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient);
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);
            expect(result).toBeDefined();
            expect(result.items).toBeDefined();
            expect(result.items).toHaveLength(1);

            // verify blog articles
            const blog = result.items[0];
            expect(blog.articles).toBeDefined();
            expect(blog.articles).toHaveLength(5);
        });

        test("should have id", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient);
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify legacy support is being used
            const blog = result.items[0];
            expect(contentfully.options.legacySupport).toBeTruthy();
            expect(blog._id).toBeDefined();
            expect(typeof blog._id).toBe("string");

            for (const article of blog.articles) {
                expect(article._id).toBeDefined();
                expect(typeof article._id).toBe("string");
            }
        });

        test("should have type (legacy)", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient);
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify legacy support is being used
            const blog = result.items[0];
            expect(contentfully.options.legacySupport).toBeTruthy();
            expect(blog._metadata).toBeUndefined();

            // verify blog metadata
            expect(typeof blog._type).toBe("string");
            expect(blog._type).toBeDefined();
            expect(blog._type).toBe("blog");

            for (const article of blog.articles) {
                expect(article._type).toBeDefined();
                expect(article._metadata).toBeUndefined();
                expect(article._type).toBe("article");
            }
        });

        test("should have revision (legacy)", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient);
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify blog metadata
            const blog = result.items[0];
            expect(typeof blog._revision).toBe("number");
            expect(blog._revision).toBeDefined();
            expectRevision(blogJson, blog._id, blog._revision);

            for (const article of blog.articles) {
                expect(article._revision).toBeDefined();
                expect(typeof article._revision).toBe("number");
                expectRevision(blogJson, article._id, article._revision);
            }
        });

        test("should have createdAt (legacy)", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient);
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify blog metadata
            const blog = result.items[0];
            expectMetadataDate(blog._createdAt);
            expectCreatedAt(blogJson, blog._id, blog._createdAt);

            for (const article of blog.articles) {
                expectMetadataDate(article._createdAt);
                expectCreatedAt(blogJson, article._id, article._createdAt);
            }
        });

        // issue #28 (https://github.com/nascentdigital/contentfully/issues/28)
        test("should have updatedAt (legacy)", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient);
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify metadata
            const blog = result.items[0];
            expectMetadataDate(blog._updatedAt);
            expectUpdatedAt(blogJson, blog._id, blog._updatedAt);

            for (const article of blog.articles) {
                expectMetadataDate(article._updatedAt);
                expectUpdatedAt(blogJson, article._id, article._updatedAt);
            }
        });

        test("should have type", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient, {
                legacySupport: false
            });
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify legacy support is being used
            const blog = result.items[0];
            expect(contentfully.options.legacySupport).toBeFalsy();
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

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient, {
                legacySupport: false
            });
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify blog metadata
            const blog = result.items[0];
            expect(typeof blog._metadata.revision).toBe("number");
            expectRevision(blogJson, blog._id, blog._metadata.revision);

            for (const article of blog.articles) {
                expect(article._revision).toBeUndefined();
                expect(typeof article._metadata.revision).toBe("number");
                expectRevision(blogJson, article._id, article._metadata.revision);
            }
        });

        test("should have createdAt", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient, {
                legacySupport: false
            });
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify metadata
            const blog = result.items[0];
            expectMetadataDate(blog._metadata.createdAt);
            expectCreatedAt(blogJson, blog._id, blog._metadata.createdAt);

            for (const article of blog.articles) {
                expectMetadataDate(article._metadata.createdAt);
                expectCreatedAt(blogJson, article._id, article._metadata.createdAt);
            }
        });

        test("should have updatedAt", async () => {

            // prepare mock
            bindFetch(blogJson);

            // execute query
            const contentfully = new Contentfully(contenfulClient, {
                legacySupport: false
            });
            const result = await contentfully.getModels({});

            // verify blog was returned
            expect(mocked(fetch).mock.calls.length).toBe(1);

            // verify metadata
            const blog = result.items[0];
            expectMetadataDate(blog._metadata.updatedAt);
            expectUpdatedAt(blogJson, blog._id, blog._metadata.updatedAt);

            for (const article of blog.articles) {
                expectMetadataDate(article._metadata.updatedAt);
                expectUpdatedAt(blogJson, article._id, article._metadata.updatedAt);
            }
        });
    });
});
