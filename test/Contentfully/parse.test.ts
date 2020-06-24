// imports
import "jest";
import {Scribe} from "@nascentdigital/scribe";
import {
    ContentfullyMock,
    TestData
} from "../util";


Scribe.setLogLevel("*", "debug");

// suite
describe("Contentfully.getModels()", () => {

    // initialize mock
    ContentfullyMock.initialize();

    describe("recursive data", () => {

        // define data
        const testData: TestData = TestData.for({
            resultFormat: "collection",
            resultCount: "one",
            resultDepth: "deep",
            sharedRefs: true,
            recursive: true
        });

        test("should parse without errors", async () => {

            // prepare mock
            const contentfully = ContentfullyMock.create(testData);

            // execute query
            const result = await contentfully.getModels({});

            // validate
            expect(result).toBeDefined();
            expect(result.items).toBeDefined();
            expect(result.items).toHaveLength(1);
        });
    });
});
