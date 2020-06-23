// imports
import "jest";
import get from "lodash/get";
import isArray from "lodash/isArray";
import isObject from "lodash/isObject";
import {TestData} from ".";



// suite
describe("TestData", () => {

    // suite
    describe("collection, one, deep [shared]", () => {

        // define data
        const testData: TestData = TestData.for({
            resultFormat: "collection",
            resultCount: "one",
            resultDepth: "deep",
            sharedRefs: true
        });

        test("should be a collection", async () => {

            expect(testData.data.items).toBeDefined();
        });

        test("should have exactly 1 top-level item", async () => {

            expect(testData.data.items).toHaveLength(1);
        });

        test("should have at least one deep link", async () => {

            // verify at least a link exists at the top
            expect(testData.data.items).toBeDefined();
            expect(countEntryCollectionLinks(testData.data.items)).toBeGreaterThan(0);

            // a deep link also needs to have another link in the includes
            expect(testData.data.includes).toBeDefined();
            expect(testData.data.includes.Entry).toBeDefined();
            expect(testData.data.includes.Entry.length).toBeGreaterThan(0);
            expect(countEntryCollectionLinks(testData.data.includes.Entry)).toBeGreaterThan(0);
        });

    });

    // TODO: test recursive test data
});


// types
type LinkType = "Asset" | "Entry";


// helper functions

function countEntryCollectionLinks(entries: ReadonlyArray<Readonly<any>>, linkType: LinkType = "Entry") {
    return entries.reduce((sum, object) => sum + countEntryLinks(object, linkType), 0);
}

function countEntryLinks(object: Readonly<any>, linkType: LinkType = "Entry") {

    // define count
    let count = 0;

    // count if object itself is a link
    if (isLink(object, linkType)) {
        ++count;
    }

    // iterate over entry fields

    const entryFields = object.fields;
    if (entryFields) {
        for (const key of Object.getOwnPropertyNames(entryFields)) {

            // handle object
            const object = entryFields[key];
            if (isLink(object, linkType)) {
                ++count;
            }

            // handle array
            else if (isArray(object)) {
                count += countEntryCollectionLinks(object, linkType);
            }
        }
    }

    // return count
    return count;
}

function isLink(object: Readonly<any>, linkType: LinkType) {
    return isObject(object) && get(object, "sys.linkType") === linkType;
}
