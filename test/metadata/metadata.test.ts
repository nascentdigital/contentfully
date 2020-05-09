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
function expectMetadataDate(value: any) {
    expect(value).toBeDefined();
    expect(typeof value).toBe("string");
    expect(Date.parse(value)).not.toBeNaN();
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

        // issue #28 (https://github.com/nascentdigital/contentfully/issues/28)
        test("should bind updatedAt (legacy)", async () => {

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

            for (const article of blog.articles) {
                expectMetadataDate(article._updatedAt);
            }
        });

        test("should createdAt (legacy)", async () => {

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

            for (const article of blog.articles) {
                expectMetadataDate(article._createdAt);
            }
        });
    });
});
