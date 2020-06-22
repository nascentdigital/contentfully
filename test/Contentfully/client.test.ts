import "jest";
import {ContentfullyMock, TestData} from "../util";
import {ContentfulClient} from "../../src/contentful";

// suite
describe("Contentfully client", () => {

    // initialize mock
    ContentfullyMock.initialize();

    const mockFetch = jest.fn(() => {
        return {
            ok: true,
            json: async () => {
                return {}
            }
        }
    });

    const path = '/test-path'

    describe("query", () => {

        describe("has host option", () => {
            test("should call the host passed as an option", async () => {
                const options = {
                    accessToken: "1234",
                    spaceId: "mockSpaceId",
                    host: "mock.host.com",
                    fetch: mockFetch
                };
                const contentfulClient = new ContentfulClient(options)
                await contentfulClient.query(path)

                expect(mockFetch).toHaveBeenCalledWith(
                    `${options.host}/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
                    {
                        headers: undefined
                    }
                )
            })
        });

        describe("does not have host option", () => {
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

        describe("has headers option", () => {
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

        describe("does not have headers option", () => {
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
});
