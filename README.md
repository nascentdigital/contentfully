# Contentfully
> A simple but fast API client for Contentful that lets developers focus on data instead of Contentful metadata and REST structure.

[![NPM version](https://img.shields.io/npm/v/contentfully.svg)](https://www.npmjs.com/package/contentfully)
[![downloads](https://img.shields.io/npm/dm/contentfully.svg)](http://npm-stat.com/charts.html?package=contentfully&from=2018-01-01)
[![Node version](https://img.shields.io/node/v/contentfully.svg)](http://nodejs.org/download/)
[![Build Status](https://travis-ci.com/nascentdigital/contentfully.svg?branch=master)](https://travis-ci.com/nascentdigital/contentfully.svg?branch=master)
[![Code Coverage](https://img.shields.io/codecov/c/github/nascentdigital/contentfully.svg)](https://codecov.io/github/nascentdigital/contentfully)
[![Known Vulnerabilities](https://snyk.io/test/github/nascentdigital/contentfully/badge.svg)](https://snyk.io/test/github/nascentdigital/contentfully)


## Features
- Transforms Contentful responses into simple / flat JavaScript objects.
- Stripping of metadata, retaining the basics that you need (e.g. ID, contentType, and fields).
- Recursive folding of linked entries and assets without cloning (i.e. an Entry
  / Asset that is reference multiple times is only created once).
- Supports custom transforms of assets URLs to allow caching or rewrites.
- Supports full [Content Delivery API](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters),
  including custom environments and preview servers.
- Typescript 4 support.
- React Native support.
- **Customizable retries when Contentful rate-limit throttling occurs.**


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

Getting started is really easy. First you'll need to create and configure a
`ContentfulClient` instance.

 | Option             | Type    | Required? | Default            |
 |--------------------|----------|-----------|--------------------|
 | accessToken        | string   | YES       |                    |
 | spaceId            | string   | YES       |                    |
 | environmentId      | string   | NO        | master             |
 | preview            | boolean  | NO        | false              |
 | fetch              | Function | NO        | fetch / node-fetch |
 | onRateLimitError   | Function | NO        | () => false        |

 Once configured, pass the client into a `Contentfully` instance:

```javascript
import {ContentfulClient, Contentfully} from "contentfully";

// create the contentful client (we can use this later)
const contentfulClient = new ContentfulClient({

    // credentials for the space
    accessToken: "YOUR_API_KEY",
    spaceId:     "YOUR_SPACE_ID",

    // setup a handler to auto-retry when a rate-limit error occurs
    onRateLimitError: ExponentialBackoffHandler.create()
});

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
                field1: "foo",
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

### Localization with the wildcard locale parameter
Just as with the Content Delivery API, you can query entries to retrieve all localized versions of an entry by using the 'wildcard' `locale=*` parameter.

**However** the response is different from Contentful API.  The locales will be lifted to top level objects so each locale can be used holistically.  Please refer to the example response below.  The default locale from the space will be used to for values not defined in any locale.  Fallback locales are implemented for lifted responses following Contentful's "Considerations on fallback locales" documentation.  Flattening can be disabled for a query by passing the _Query Option_ `flatten=false`


```javascript
async function query() {

    const json = await contentfully.getModels({
        content_type: "myModel",
        skip: 20,
        limit: 10,
        locale: '*'
    });

    // print the result
    console.log(json);
};

query();
```

Which would return models mapped by locale:
```javascript
{
    total: 10,
    skip: 20,
    limit: 10,
    items: {
      "en-CA": [
        {
          _id: "5nZHNlP6zCESgGuMGKG2Q8",
          _type: "myModel",
          field1: "Hello",
          field2: "",
          field3: "foo",
          field4: true,
          field5: {
              _id: "m972ick1jqhi",
              _type: "myModelDependency",
              field1: "foo",
              field2: "bar",
              field3: true
          },
          field6: [1, 4, 10, 20],
          image: {
            _id: "m12mkd123fdr4",
            url: "foo.png",
            title: "title",
            dimensions: {
              width: 1,
              height: 1
            },
            size: 44335
          }
        }
      ],
      "fr-CA": [
        {
          _id: "5nZHNlP6zCESgGuMGKG2Q8",
          _type: "myModel",
          field1: "Bonjour",
          field2: "Comment vas-tu",
          field3: "foo",
          field3: false,
          field5: {
              _id: "m972ick1jqhi",
              _type: "myModelDependency",
              field1: "foo",
              field2: "bar",
              field3: true
          },
          field6: [2, 8, 20, 40],
          image: {
            _id: "m12mkd123fdr4",
            url: "bar.jpg",
            title: "french title",
            dimensions: {
              width: 2,
              height: 2
            },
            size: 123124
          }
        }
      ]
    }
}
```


## Enabling `experimental` features

There are a couple of early-access features that have been included in the `v1.x.x` builds which you can enable as follows:

```javascript
// create a Contentfully instance with experimental features enabled
const contentfully = new Contentfully(contentfulClient, {
    experimental: true
});
```

This gets you access to:

- Consolidates metadata (i.e. `type`, `revision`, `createdAt`, `updatedAt`) into a new `_metadata` property of each
  entity, with dates translated to native Javascript `Date` objects.
- *More to come...*


## IE Support

> **TL;DR** - We don't support IE.

By default, `Contentfully` uses the native fetch client in the browser, otherwise it will use `node-fetch`. Since IE does
not have `fetch` native to it, use the `fetch` option with something like [`isomorphic-fetch`](https://www.npmjs.com/package/isomorphic-fetch)
when instantiating `ContentfulClient`.


## Todo: add into docs

all locale cases with `getEntry` and `getEntries`:
```
1.  [ok]    getEntry('someid')
2.  [warn]  getEntry('someid', 'en-US')
3.  [warn]  getEntry('someid', '*')
4.  [ok]    getEntry('someid', {allLocales: true})
5.  [error] getEntry('someid', {locale: '*'})
6.  [ok]    getEntry('someid', {locale: 'en-US'})
7.  [ok]    getEntry('someid', {locale: 'en-US', allLocales: true}) note: allLocales overrides
8.  [warn]  getEntries({locale: '*'})
9.  [ok]    getEntries({locale: 'en-US'})
10. [ok]    getEntries({}, {allLocales: true})
11. [ok]    getEntries({locale: 'en-US'}, {allLocales: true}) note: allLocales overrides
```
