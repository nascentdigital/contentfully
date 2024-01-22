# Contentfully
> A simple but fast API client for Contentful that lets developers focus on data instead of Contentful metadata and REST structure.

[![NPM version](https://img.shields.io/npm/v/contentfully.svg)](https://www.npmjs.com/package/contentfully)
[![downloads](https://img.shields.io/npm/dm/contentfully.svg)](http://npm-stat.com/charts.html?package=contentfully&from=2018-01-01)
[![Node version](https://img.shields.io/node/v/contentfully.svg)](http://nodejs.org/download/)
[![Build Status](https://travis-ci.com/nascentdigital/contentfully.svg?branch=master)](https://travis-ci.com/nascentdigital/contentfully.svg?branch=master)
[![Code Coverage](https://img.shields.io/codecov/c/github/nascentdigital/contentfully.svg)](https://codecov.io/github/nascentdigital/contentfully)
[![Known Vulnerabilities](https://snyk.io/test/github/nascentdigital/contentfully/badge.svg)](https://snyk.io/test/github/nascentdigital/contentfully)


## Table of Contents
1. [Features](#features)
2. [Installation](#installation)
3. [Prerequisites](#prerequisites)
4. [Basic Ussage](#basic-usage)
5. [Migration Guide](#migration-guide)


## Features
- Transforms Contentful responses into simple / flat JavaScript objects.
- Stripping of metadata, retaining the basics that you need (e.g. ID, contentType, and fields).
- Recursive folding of linked entries and assets without cloning (i.e. an Entry
  / Asset that is reference multiple times is only created once).
- Supports custom transforms of assets URLs to allow caching or rewrites.
- Supports full [Content Delivery API](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters),
  including custom environments and preview servers.
- Typescript 5 support.
- React Native support.


## Installation

Current stable release (`3.x`)

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

Contentfully takes the same parameters as the Contentful client ([`CreateClientParams`](https://github.com/contentful/contentful.js/blob/a39c783e9db0b725d2109d5016b9e33ac01a2312/lib/contentful.ts#L23)). The following are the most used parameters:

| Option             | Type     | Required? | Default            |
|--------------------|----------|-----------|--------------------|
| accessToken        | string   | YES       |                    |
| space              | string   | YES       |                    |
| environment        | string   | NO        | master             |
| host               | string   | NO        | cdn.contentful.com |

Create an instance of `Contentfully`:

```typescript
import {Contentfully} from 'contentfully'

// create a Contentfully instance
const contentfully = new Contentfully({
  accessToken: 'YOUR_API_KEY',
  space: 'YOUR_SPACE_ID'
})
```

Next, we can now query Contentful using Contenfully's `getEntries()` method.
The first argument to `getEntries()` is a query object that takes the same query
parameters as a direct [Content Delivery API](https://www.contentful.com/developers/docs/references/content-delivery-api/#/reference/search-parameters)
call.

```typescript
// get the 3rd page of my model objects
// can also pass in optional type for the models getting fetched
const data = await contentfully.getEntries<MyModel>({
    content_type: 'myModel',
    skip: 20,
    limit: 10
})

// print the result
console.log(data)
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

### Localization
Just as with the Content Delivery API, you can query entries to retrieve a single locale or all localized versions of an entry.

```typescript
// single entry with specific locale
const modelWithAllLocales = await contentfully.getEntry('myModel_id', {locale: 'en-US'})

// mutliple entries with specific locale
const modelsWithAllLocales = await contentfully.getEntries({
    content_type: 'myModel',
    skip: 20,
    limit: 10,
    locale: 'en-US'
})

// single entry with all locales
const modelWithAllLocales = await contentfully.getEntry('myModel_id', {allLocales: true})

// mutliple entries with all locales
const modelsWithAllLocales = await contentfully.getEntries({
    content_type: 'myModel',
    skip: 20,
    limit: 10
}, {allLocales: true})
```

By default locales will be lifted to top level objects so each locale can be used holistically. Please refer to the example response below. The default locale from the space will be used to for values not defined in any locale. Fallback locales are implemented for lifted responses following Contentful's "Considerations on fallback locales" documentation. Flattening can be disabled for a query by passing the `{flatten: false}`

```typescript
// disable locale flattening for single entry
await contentfully.getEntry('myModel_id', {allLocales: true, flatten: false})

// disable locale flattening for multiple locales
await contentfully.getEntries({query}, {allLocales: true, flatten: false})
```

Example output with (from `getEntries`) flattened locales:
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


## Migration Guide

This guide goes over migrating from `v2.x` to `v3.x`.

### Initializing

Initializing Contentfully in `v2.x` was:
```typescript
// create the contentful client
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

In `v3.x` settings are passed directly

> [!NOTE]
> Also note that keys no longer have `Id`. For example `spaceId` is now `space`.

```typescript
// Contentful settings passed directly into contentfully
const contentfully = new Contentfully({
  accessToken: "YOUR_API_KEY",
  space: "YOUR_SPACE_ID"
})
```

`onRateLimitError` is no longer supported however by default, on error, the request is tried again up to 5 times. This behaviour can be changed by passing in options `retryOnError` and `retryLimit`.

In `v3.x` experimental behaviour is now the default behaviour.

### Localization

Get single locale for entry:
```typescript
// v2.x
const model = await contentfully.getEntry('myModel_id', 'en-US')

// v3.x
const model = await contentfully.getEntry('myModel_id', {locale: 'en-US'})
```

Get all locales for entry:
```typescript
// v2.x
const model = await contentfully.getEntry('myModel_id', '*')

// v3.x
const model = await contentfully.getEntry('myModel_id', {allLocales: true})
```

Get all locales for entries:
```typescript
// v2.x
const model = await contentfully.getEntries({locale: '*'})

// v3.x
const model = await contentfully.getEntries({query}, {allLocales: true})
```