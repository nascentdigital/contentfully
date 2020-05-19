export function findAsset(json: any, assetId: string, includedAssetOnly: boolean = false) {

  // search items
  if (!includedAssetOnly) {
      for (const asset of json.items) {
          if (asset.sys.id === assetId) {
              return asset;
          }
      }
  }

  // search includes
  for (const asset of json.includes.Asset) {
      if (asset.sys.id === assetId) {
          return asset;
      }
  }

  // throw if not found
  throw new Error(`Unable to find asset in JSON data matching '${assetId}'`);
}