// imports
import "jest";
import {
    ContentfullyMock,
    findEntry,
    TestData
} from "../util";
import {
    REQUIRED_QUERY_SELECT
} from "../../src";


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
function expectRequestSelect(url: URL, ...parameters: string[]) {

    // fail if there is no select in query
    const urlQuery = url.searchParams;
    const select = urlQuery.get("select");
    expect(urlQuery.has("select")).toBeTruthy();
    expect(select).not.toBeNull();

    // fail if expected parameters aren't in select
    const selectParameters = (select || "").split(",");
    expect(selectParameters).toEqual(expect.arrayContaining(parameters));
}


// suite
describe("Contentfully metadata", () => {

    // initialize mock
    ContentfullyMock.initialize();

    // define data
    const testData: TestData = TestData.for({
        resultFormat: "collection",
        resultCount: "one",
        resultDepth: "deep",
        sharedRefs: true
    });

    describe("query.select", () => {

        test("should default correct selection", async () => {

            // prepare mock
            const contentfully = ContentfullyMock.create(testData,
                {},
                url => expectRequestSelect(url, ...REQUIRED_QUERY_SELECT));

            // execute query
            const result = await contentfully.getEntries({});

        });
    });

    describe(`linked entities [${testData.key}]`, () => {

        test("should load", async () => {

            // prepare mock
            const contentfully = ContentfullyMock.create(testData);

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

        test("should have id", async () => {

            // prepare mock
            const contentfully = ContentfullyMock.create(testData);

            // execute query
            const result = await contentfully.getEntries({});

            // verify legacy support is being used
            const blog = result.items[0];
            expect(contentfully.options.experimental).toBeFalsy();
            expect(blog._id).toBeDefined();
            expect(typeof blog._id).toBe("string");

            for (const article of blog.articles) {
                expect(article._id).toBeDefined();
                expect(typeof article._id).toBe("string");
            }
        });

        test("should have type (legacy)", async () => {

            // prepare mock
            const contentfully = ContentfullyMock.create(testData);

            // execute query
            const result = await contentfully.getEntries({});

            // verify legacy support is being used
            const blog = result.items[0];
            expect(contentfully.options.experimental).toBeFalsy();
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
            const contentfully = ContentfullyMock.create(testData);

            // execute query
            const result = await contentfully.getEntries({});

            // verify blog metadata
            const blog = result.items[0];
            expect(typeof blog._revision).toBe("number");
            expect(blog._revision).toBeDefined();
            expectRevision(testData.data, blog._id, blog._revision);

            for (const article of blog.articles) {
                expect(article._revision).toBeDefined();
                expect(typeof article._revision).toBe("number");
                expectRevision(testData.data, article._id, article._revision);
            }
        });

        test("should have createdAt (legacy)", async () => {

            // prepare mock
            const contentfully = ContentfullyMock.create(testData);

            // execute query
            const result = await contentfully.getEntries({});

            // verify blog metadata
            const blog = result.items[0];
            expectMetadataDate(blog._createdAt);
            expectCreatedAt(testData.data, blog._id, blog._createdAt);

            for (const article of blog.articles) {
                expectMetadataDate(article._createdAt);
                expectCreatedAt(testData.data, article._id, article._createdAt);
            }
        });

        // issue #28 (https://github.com/nascentdigital/contentfully/issues/28)
        test("should have updatedAt (legacy)", async () => {

            // prepare mock
            const contentfully = ContentfullyMock.create(testData);

            // execute query
            const result = await contentfully.getEntries({});

            // verify metadata
            const blog = result.items[0];
            expectMetadataDate(blog._updatedAt);
            expectUpdatedAt(testData.data, blog._id, blog._updatedAt);

            for (const article of blog.articles) {
                expectMetadataDate(article._updatedAt);
                expectUpdatedAt(testData.data, article._id, article._updatedAt);
            }
        });

        test("should have type", async () => {

            // prepare mock
            const contentfully = ContentfullyMock.create(testData,
                {experimental: true});

            // execute query
            const result = await contentfully.getEntries({});

            // verify legacy support is being used
            const blog = result.items[0];
            expect(contentfully.options.experimental).toBeTruthy();
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
            const contentfully = ContentfullyMock.create(testData,
                {experimental: true});

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

            // prepare mock
            const contentfully = ContentfullyMock.create(testData,
                {experimental: true});

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

            // prepare mock
            const contentfully = ContentfullyMock.create(testData,
                {experimental: true});

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
