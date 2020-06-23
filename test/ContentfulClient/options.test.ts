import "jest";
import {ContentfulClient} from "../../src/contentful";

// suite
describe("Contentful client options", () => {

    // initialize mock
    const mockFetch = jest.fn(() => {
        return {
            ok: true,
            json: async () => {
                return {}
            }
        }
    });

    const path = '/test-path'

    describe("with apiUrl option", () => {
        test("should call the apiUrl passed as an option", async () => {
            const options = {
                accessToken: "1234",
                spaceId: "mockSpaceId",
                apiUrl: new URL("/", "https://mock.apiUrl.com"),
                fetch: mockFetch
            };
            const contentfulClient = new ContentfulClient(options)
            await contentfulClient.query(path)

            expect(mockFetch).toHaveBeenCalledWith(
                `${options.apiUrl}/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
                {
                    headers: undefined
                }
            )
        })
    });

    describe("without apiUrl option", () => {
        test("should call the production url by default", async () => {
            const options = {
                accessToken: "1234",
                spaceId: "mockSpaceId",
                fetch: mockFetch
            };
            const contentfulClient = new ContentfulClient(options)
            await contentfulClient.query(path)

            expect(mockFetch).toHaveBeenCalledWith(
                `https://cdn.contentful.com/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
                {
                    headers: undefined
                }
            )
        });

        test("should call the preview url when preview option is passed as true", async () =>{
            const options = {
                accessToken: "1234",
                spaceId: "mockSpaceId",
                fetch: mockFetch,
                preview: true
            };
            const contentfulClient = new ContentfulClient(options)
            await contentfulClient.query(path)

            expect(mockFetch).toHaveBeenCalledWith(
                `https://preview.contentful.com/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
                {
                    headers: undefined
                }
            )
        });

        test("should call the production url when preview option is passed as false", async () =>{
            const options = {
                accessToken: "1234",
                spaceId: "mockSpaceId",
                fetch: mockFetch,
                preview: false
            };
            const contentfulClient = new ContentfulClient(options)
            await contentfulClient.query(path)

            expect(mockFetch).toHaveBeenCalledWith(
                `https://cdn.contentful.com/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
                {
                    headers: undefined
                }
            )
        });
    });

    describe("with headers option", () => {
        test("should call the same same headers", async () => {
            const options = {
                accessToken: "1234",
                spaceId: "mockSpaceId",
                fetch: mockFetch,
                headers: {
                    header1: "one",
                    header2: "two"
                }
            };
            const contentfulClient = new ContentfulClient(options)
            await contentfulClient.query(path)

            expect(mockFetch).toHaveBeenCalledWith(
                `https://cdn.contentful.com/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
                {
                    headers: options.headers
                }
            )
        })
    });

    describe("without headers option", () => {
        test("should pass undefined for headers", async () => {
            const options = {
                accessToken: "1234",
                spaceId: "mockSpaceId",
                fetch: mockFetch
            };
            const contentfulClient = new ContentfulClient(options)
            await contentfulClient.query(path)

            expect(mockFetch).toHaveBeenCalledWith(
                `https://cdn.contentful.com/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
                {
                    headers: undefined
                }
            )
        });
    });
});
