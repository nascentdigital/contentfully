# Contentfully

A simple but fast API client for Contentful that lets developers focus on data
instead of Contentful metadata and REST structure.  Core features include:

- Transforms Contentful responses into simple / flat JavaScript objects.
- Stripping of metadata, retaining the basics that you need (e.g. ID, contentType, and fields).
- Recursive folding of linked entries and assets without cloning (i.e. an Entry
  / Asset that is reference multiple times is only created once).
- Supports custom transforms of assets URLs to allow caching or rewrites.
- Supports full [Content Delivery API](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters),
  including custom environments and preview servers.
- Typescript 3 support.
- React Native support.


## Installation

Current stable release (`1.x`)

```sh
$ npm i -s contentfully
```


## Prerequisites

You'll need the **Space ID** and **API key** for the space that you wish to access.
You can get these by doing the following after logging into the 
[Contentful Web App](https://be.contentful.com/login):

1. Navigate to your *Organization / Space* (usually from the upper-left space 
   selector in the top toolbar).
2. Select *Settings &rarr; General Settings* to find your `Space ID`.
3. Select *Settings &rarr; API keys* to see your generated API keys (you will
   need to have the correct permissions on the space to do this).  Create a new
   `API key` if you need to.
   

## Basic Usage

Getting started is really easy.  First you'll need to create and configure a 
`ContentfulClient` instance and pass it to a `Contentfully` instance: 

```javascript
import {ContentfulClient, Contentfully} from "contentfully";

// create the contentful client (we can use this later)
const contentfulClient = new ContentfulClient({
    accessToken: "YOUR_API_KEY",
    spaceId:     "YOUR_SPACE_ID"
);

// create a Contentfully instance
const contentfully = new Contentfully(contentfulClient);
```

Next, we can now query Contentful using Contenfully's `getModels()` method.
The first argument to `getModels()` is a query object that takes the same query
parameters as a direct [Content Delivery API](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters)
call.

```javascript
async function query() {

    // get the 3rd page of my model objects
    const json = await contentfully.getModels({
        content_type: "myModel",
        skip: 20,
        limit: 10
    });

    // print the result
    console.log(json);
};

query();
```

Contentfully will execute the query, recursively linking any assets or embedded
content models, returning a basic JavaScript object without the Contentful
metadata that you don't need.

It should look something like this:

```javascript
{
    total: 10,
    skip: 20,
    limit: 10,
    items: [
        {
            _id: "5nZHNlP6zCESgGuMGKG2Q8",
            _type: "myModel",
            field1: "value1",
            field2: "value2",
            field3: false,
            field5: {
                _id: "m972ick1jqhi",
                _type: "myModelDependency",
                field1: "foo"
                field2: "bar",
                field3: true,
            },
            field6: [
                1, 4, 10, 20
            ]
        },
        ...
    ]
}

```
