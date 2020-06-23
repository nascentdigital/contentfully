// imports
import "jest";
import {
    ContentfullyMock,
    TestData
} from "../util";


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
            expect(result).toHaveLength(1);
        });
    });
});
