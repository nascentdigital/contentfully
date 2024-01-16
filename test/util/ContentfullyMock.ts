// imports
import "jest";
import fetch, {RequestInfo} from "node-fetch";
import {TestData} from "./TestData";
import {
    ContentfulClient,
    Contentfully,
    ContentfullyOptions
} from "../../src";


// types
export type RequestValidator = (url: URL) => void;


// mocks
jest.mock("node-fetch", () => {
    return jest.fn();
});


// exports
export class ContentfullyMock {

    private static _contenfulClient?: ContentfulClient;


    public static get contentfulClient() { return this._contenfulClient; }


    public static initialize(spaceId: string = "", accessToken: string = "") {

        // bind lifecycle
        beforeEach(() => {

            // clear mocks
            jest.mocked(fetch).mockClear();

            // prepare contentful client
            this._contenfulClient = new ContentfulClient({
                spaceId,
                accessToken,
                fetch: fetch
            });
        });
    }

    public static create(testData: TestData,
                         contentfullyOptions: Readonly<Partial<ContentfullyOptions>> = {},
                         requestValidator?: RequestValidator): Contentfully {

        // fail if not initialized
        if (!this._contenfulClient) {
            throw new Error("ContentfullyMock.initialize() must be called before ContenfullyMock.create()");
        }

        // bind data to mock client
        jest.mocked(fetch).mockImplementation(async (url: RequestInfo): Promise<any> => {

            // invoke validator (if provided)
            if (requestValidator) {

                // fail if url isn't a string
                if (!url) {
                    fail("Missing url");
                    throw new Error("Missing url");
                }

                // fail if url isn't a string
                else if (typeof url !== "string") {
                    fail(`Expected url to be a string, found ${typeof url}`);
                    throw new Error("Expected url to be a string");
                }

                // invoke validator
                requestValidator(new URL(url));
            }

            // mock response
            return {
                ok: true,
                async json() {
                    return testData.data;
                }
            };
        });

        // return mocked client
        return new Contentfully(this._contenfulClient, contentfullyOptions);
    }
}
