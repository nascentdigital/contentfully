import "jest";
import {ContentfulClient} from "../src/contentful";
import fetch from "node-fetch";

jest.mock("node-fetch", () => {
    return jest.fn(() => {
        return {
            ok: true,
            json: async () => {
                return {}
            }
        }
    })
})

const mockFetch = jest.fn(() => {
    return {
        ok: true,
        json: async () => {
            return {}
        }
    }
})

describe("Content with linked entities and assets", () => {
    it("should make a request with correct client options", async () => {
        const options = {
            accessToken: "1234",
            spaceId: "mockSpaceId",
            host: "https://cdn-mr.contentful.com",
            fetch: mockFetch,
            headers: {testing: 123}
        }

        const path = '/test'
        const contentfulClient = new ContentfulClient(options)

        await contentfulClient.query(path)

        expect(mockFetch).toHaveBeenCalledWith(
            `${options.host}/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
            {
                "headers": options.headers
            }
        )
    })

    it("should make a request with default client options", async () => {
        const options = {
            accessToken: "1234",
            spaceId: "mockSpaceId"
        }

        const path = '/test'
        const contentfulClient = new ContentfulClient(options)

        await contentfulClient.query(path)

        expect(fetch).toHaveBeenCalledWith(
            `https://cdn.contentful.com/spaces/${options.spaceId}/environments/master${path}?access_token=${options.accessToken}`,
            {
                "headers": undefined
            }
        )
    })
});
