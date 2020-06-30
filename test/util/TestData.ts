// imports
import EntryOneFlatJson from "../data/entry-one_flat.json";
import EntriesOneDeepJson from "../data/entries-one_deep.json";
import EntriesOneDeepRecursiveJson from "../data/entries-one_deep_recursive.json";
import EntriesOneDeepRichTextJson from "../data/entries-rich_text.json";


// TODO: change this to be an array of tuples that use regex patters (scaled better)
// constants
const TEST_DATA: Readonly<Record<string, any>> = {
    "single-flat": EntryOneFlatJson,
    "collection-one_deep": EntriesOneDeepJson,
    "collection-one_deep_shared": EntriesOneDeepJson,
    "collection-one_deep_recursive": EntriesOneDeepRecursiveJson,
    "collection-one_deep_shared_recursive": EntriesOneDeepRecursiveJson,
    "collection-one_deep_rich_text": EntriesOneDeepRichTextJson
};


// types
export type ResultFormat = "single" | "collection";
export type ResultCount = "none" | "one" | "few" | "many" | "lots";
export type ResultDepth = "flat" | "shallow" | "deep";

/**
 * Specifies the requested shape of test data.
 */
export type TestDataOptions = {

    /**
     * Determines if the structure of test data.
     *
     * Setting to <code>single</code> will create a document that is an entry, without any linked entries / assets.
     * Setting to <code>collection</code> will create a document an array of "items" entries, as well as collections
     * for included linked assets and entries.
     */
    resultFormat: ResultFormat;

    /**
     * Determines the number of top-level items results in the document, not including linked references.
     *
     * Setting to <code>none</code> will create an empty document.
     * Setting to <code>one</code> will create a document with a single entry.
     * Setting to <code>few</code> will create a document with 10 entries.
     * Setting to <code>many</code> will create a document with 100 entries.
     * Setting to <code>lots</code> will create a document with 1000 entries.
     */
    resultCount: ResultCount;

    /**
     * Determines the linking depth of the returned test data.
     *
     * Setting to <code>flat</code> will ensure there is no linking in the document.
     * Setting to <code>shallow</code> will ensure <b>there are some</b> single level links, but no deep links.
     * Setting to <code>deep</code> will ensure <b>there are some</b> deep links.
     */
    resultDepth: ResultDepth;

    /**
     * Ensures test data has many-to-one relationships when set to <code>true</code>.
     */
    sharedRefs?: boolean;

    /**
     * Ensures test data has a top-level result linking to another top-level result when <code>true</code>.
     */
    siblingRefs?: boolean;

    /**
     * Ensures test data has recursive relationships when <code>true</code>.
     */
    recursive?: boolean;

    /**
     * Ensures test data contains rich text elements with all possible configurations.
     *
     * Configurations: "embedded-entry-block" | "embedded-asset-block" | "embedded-entry-inline";
     */
    richText?: boolean;
}


// constants
export const TEST_DATA_DEFAULTS: Readonly<TestDataOptions> = {
    resultFormat: "collection",
    resultCount: "one",
    resultDepth: "deep",
    sharedRefs: true,
    siblingRefs: false,
    recursive: false,
    richText: false
};


// class definition
export class TestData {

    public readonly key: string;
    public readonly options: Readonly<TestDataOptions>;
    public readonly data: Readonly<any>;


    private constructor(key: string, options: Readonly<TestDataOptions>) {

        // initialize instance variable
        this.key = key;
        this.options = options;
        this.data = TEST_DATA[key];
    }

    public static for(options: Readonly<TestDataOptions>): TestData {

        // apply defaults
        const normalizedOptions = Object.assign({}, TEST_DATA_DEFAULTS, options);

        // resolve key for options
        const dataKey = this.getTestDataKey(normalizedOptions);

        // throw if there is no registered data for key
        if (!TEST_DATA.hasOwnProperty(dataKey)) {
            console.error("No test data registered for requested options: ", normalizedOptions);
            throw new Error("Unable to provide test data for key: " + dataKey);
        }

        // return test data
        return new TestData(dataKey, normalizedOptions);
    }

    private static getTestDataKey(options: Readonly<TestDataOptions>) {

        // get key for single entry
        if (options.resultFormat === "single") {

            // warn if requesting anything inappropriate
            let invalidOptions = false;
            if (options.resultCount !== "one") {
                console.log(`resultFormat of "single" can only provide resultCount === "one"`);
                invalidOptions = true;
            }
            if (options.sharedRefs) {
                console.log(`sharedRefs does not apply to resultFormat of "single"`);
                invalidOptions = true;
            }
            if (options.siblingRefs) {
                console.log(`siblingRefs does not apply to resultFormat of "single"`);
                invalidOptions = true;
            }
            if (options.recursive) {
                console.log(`recursive does not apply to resultFormat of "single"`);
                invalidOptions = true;
            }

            // throw if there were any invalid options
            if (invalidOptions) {
                throw new Error("Invalid options provided for test data.")
            }

            // return formatted key
            return `single-${options.resultDepth === "flat" ? "flat" : "deep"}`;
        }

        // or get key for collection
        else if (options.resultFormat === "collection") {

            // create base key
            let key = `collection-${options.resultCount}`;

            // handle sharedRefs
            let invalidOptions = false;
            if (options.resultDepth) {

                // fail if apply when there are no results
                if (options.resultCount === "none") {
                    console.log(`"resultDepth" only applies when "resultCount" > 0`);
                    invalidOptions = true;
                }
                else {
                    key += `_${options.resultDepth}`;
                }
            }

            // handle sharedRefs
            if (options.sharedRefs) {

                // fail if apply when there are no results
                if (options.resultCount === "none") {
                    console.log(`"sharedRefs" only applies when "resultCount" > 0`);
                    invalidOptions = true;
                }
                else {
                    key += "_shared";
                }
            }

            // handle siblingRefs
            if (options.siblingRefs) {

                // fail if apply when there are not multiple results
                if (options.resultCount === "none"
                    || options.resultCount === "one") {
                    console.log(`"siblingRefs" only applies when "resultCount" > 1`);
                    invalidOptions = true;
                }
                else {
                    key += "_sibling";
                }
            }

            // handle recursive
            if (options.recursive) {

                // fail if apply when there are not multiple results
                if (options.resultCount === "none") {
                    console.log(`"recursive" only applies when "resultCount" > 0`);
                    invalidOptions = true;
                }
                else {
                    key += "_recursive";
                }
            }

            // handle rich text
            if (options.richText) {
                key += "_rich_text";
            }

            // throw if there were any invalid options
            if (invalidOptions) {
                throw new Error("Invalid options provided for test data.")
            }

            // return key
            return key;
        }

        // or throw
        else {
            throw new Error(`Invalid resultFormat ${options.resultFormat}`);
        }
    }
}
