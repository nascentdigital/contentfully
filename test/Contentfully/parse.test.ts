// imports
import "jest";
import {TestData} from "../util";
import {Contentfully} from '../../src';
import {mockParams} from '../data/mockParams';


// setup test data
const testData: TestData = TestData.for({
    resultFormat: "collection",
    resultCount: "one",
    resultDepth: "deep",
    sharedRefs: true,
    recursive: true
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


// suite
describe("Contentfully.getModels()", () => {
    describe("recursive data", () => {

        test("should parse without errors", async () => {
            const contentfully = new Contentfully(mockParams)

            // execute query
            const result = await contentfully.getEntries({});

            // validate
            expect(result).toBeDefined();
            expect(result.items).toBeDefined();
            expect(result.items).toHaveLength(1);
        });

        test("should not leave any residue (e.g. _model or _deferred)", async () => {
            const contentfully = new Contentfully(mockParams)

            // execute query
            const result = await contentfully.getEntries({});

            // validate
            const model = result.items[0];
            expect(model).toBeDefined();
            expect(model._id).toBeDefined();
            expect(model._model).toBeUndefined();
            expect(model._deferred).toBeUndefined();
        });
    });
});
