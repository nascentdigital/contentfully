export function findEntry(json: any, entryId: string, includedEntryOnly: boolean = false) {

    // search items
    if (!includedEntryOnly) {
        for (const entry of json.items) {
            if (entry.sys.id === entryId) {
                return entry;
            }
        }
    }

    // search includes
    for (const entry of json.includes.Entry) {
        if (entry.sys.id === entryId) {
            return entry;
        }
    }

    // throw if not found
    throw new Error(`Unable to find entry in JSON data matching '${entryId}'`);
}