// imports
import "jest";
import {
    ContentfullyMock,
    findAsset,
    findEntry,
    TestData
} from "../util";
import {Media, RichText} from "../../src/entities";
import {Contentfully} from '../../src';

// types
type EmbeddedEntryBlockNode = 'embedded-entry-block'
type EmbeddedAssetBlockNode = 'embedded-asset-block'
type EmbeddedEntryInlineNode = 'embedded-entry-inline'

type EmbeddedEntryBlock = {
    data: Readonly<any>,
    content: Array<any>,
    nodeType: EmbeddedEntryBlockNode
}

type EmbeddedAssetBlock = {
    data: Media,
    content: Array<any>,
    nodeType: EmbeddedAssetBlockNode
}

type EmbeddedEntryInline = {
    data: Readonly<any>,
    content: Array<any>,
    nodeType: EmbeddedEntryInlineNode
}

// suite
describe("Contentfully richtext parser", () => {
    // initialize mock
    ContentfullyMock.initialize();

    // define data
    const testData: TestData = TestData.for({
        resultFormat: "collection",
        resultCount: "one",
        resultDepth: "deep",
        sharedRefs: false,
        richText: true
    });

    let contentfully: Contentfully;

    beforeEach(async () => {
        // prepare mock
        contentfully = ContentfullyMock.create(testData)
    });

    const getExpectedEmbeddedEntryBlock = (testData: TestData): { embeddedEntry: any, nodeIndex: number }  => {
        const { fields } = findEntry(testData.data, 'embeddedEntryBlockId', true);
        return {
            embeddedEntry: fields,
            nodeIndex: 0
        }
    }

    const getExpectedEmbeddedAsset = (testData: TestData): { embeddedAsset: any, nodeIndex: number }  => {
        const { fields } = findAsset(testData.data, 'embeddedAssetBlockId', true);

        return {
            embeddedAsset: fields,
            nodeIndex: 3
        }
    }

    const getExpectedShallowEmbeddedInlineEntry = (testData: TestData): { embeddedInlineEntry: any, nodeIndex: number, contentIndex: number }  => {
        const { fields } = findEntry(testData.data, 'shallowEmbeddedInlineEntryId', true);
        return {
            embeddedInlineEntry: fields,
            nodeIndex: 1,
            contentIndex: 1
        }
    }

    const getExpectedDeeplyEmbeddedInlineEntry = (testData: TestData): { embeddedInlineEntry: any, nodeIndex: number, contentIndex: number }  => {
        const { fields } = findEntry(testData.data, 'deeplyEmbeddedInlineEntryId', true);
        return {
            embeddedInlineEntry: fields,
            nodeIndex: 2,
            contentIndex: 1
        }
    }

    const getRawRichTextField = (testData: TestData): RichText => {
        return testData.data.items[0].fields.richText
    }

    it("should replace reference with matching content for an embedded-entry-block rich text node", async () => {

        // get referenced object that should be embedded from test data
        const { embeddedEntry, nodeIndex } = getExpectedEmbeddedEntryBlock(testData);
        
        const result = await contentfully.getEntries({});

        // get rich text node that is referencing an embedded-entry-block
        const richTextNode: EmbeddedEntryBlock = result.items[0].richText.content[nodeIndex];

        // compare the referenced object to the object that is injected
        expect(richTextNode.data).toEqual(expect.objectContaining(embeddedEntry));
    });

    it("should replace reference with matching content for an embedded-asset-block rich text node", async () => {

        // get referenced object that should be embedded from test data
        const { embeddedAsset, nodeIndex } = getExpectedEmbeddedAsset(testData);

        const result = await contentfully.getEntries({});

        // get rich text node that is referencing an embedded-asset-block
        const richTextNode: EmbeddedAssetBlock = result.items[0].richText.content[nodeIndex];

        // resolve asset properties
        const { title, description, file } = embeddedAsset
        const { contentType, url, details } = file

        // compare the referenced object to the object that is injected
        expect(richTextNode.data).toEqual(expect.objectContaining({
            title,
            description,
            contentType,
            url,
            size: details.size,
            dimensions: details.image
        }));
    });    

    it("should replace reference with matching content for a shallow embedded-entry-inline rich text node", async () => {

        // get referenced object that should be embedded from test data
        const { embeddedInlineEntry, nodeIndex, contentIndex } = getExpectedShallowEmbeddedInlineEntry(testData);

        const result = await contentfully.getEntries({});

        // get rich text node that is referencing an embedded-entry-inline
        const richTextNode: EmbeddedEntryInline = result.items[0].richText.content[nodeIndex].content[contentIndex];

        // compare the referenced object to the object that is injected
        expect(richTextNode.data).toEqual(expect.objectContaining(embeddedInlineEntry));
    });

    it("should replace reference with matching content for a deeply embedded-entry-inline rich text node", async () => {

        // get referenced object that should be embedded from test data
        const { embeddedInlineEntry, nodeIndex, contentIndex } = getExpectedDeeplyEmbeddedInlineEntry(testData);

        const result = await contentfully.getEntries({});

        // get rich text node that is referencing a deeply embedded-entry-inline
        const richTextNode: EmbeddedEntryInline = result.items[0].richText.content[nodeIndex].content[0].content[0].content[contentIndex];


        // compare the referenced object to the object that is injected
        expect(richTextNode.data).toEqual(expect.objectContaining(embeddedInlineEntry));
    });

    it("should not overwrite the original properties of the richtext field", async () => {
        
        const result = await contentfully.getEntries({});

        // get rich text field
        const richTexts = result.items[0].richText as RichText[]

        // get raw rich text field from test data
        const rawRichText = getRawRichTextField(testData)

        // get original property keys
        const rawRichTextKeys = Object.keys(rawRichText)

        // transformed rich text should have the same object keys as raw richtext for each item
        for (const richText of richTexts) {
            expect(Object.keys(richText)).toEqual(expect.arrayContaining(rawRichTextKeys))
        }
    });
})