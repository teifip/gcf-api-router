# gcf-api-router

Simple [Express](http://expressjs.com/)-style HTTP request router to build API handlers with [Google Cloud Functions](https://cloud.google.com/functions/).

### Overview

```javascript
const router = require('gcf-api-router')();

// Define routes and assign route/method handlers

router.route('/subscriptions')
      .get(listSubscriptions)
      .post(createSubscription);

router.route('/subscriptions/:id')
      .get(showSubscription)
      .put(updateSubscription)
      .delete(deleteSubscription);

// Export the router as Google Cloud HTTP Function

exports.myApiHandler = router.onRequest;
```

Each individual route/method handler must be designed to expect `(req, res)` as input arguments.

This module uses [path-to-regex](https://github.com/pillarjs/path-to-regexp) for matching the route paths. Therefore, route parameters can be specified following the [route path conventions](http://expressjs.com/en/guide/routing.html) of [Express](http://expressjs.com/). When a specific route includes parameters, the `req.params` property is updated with the actual set of parameter keys/values before invoking the route/method handler.

Example:

```javascript
router.route('/models/:model/:year').get(showModel);

// GET /{basePath}/models/Model%20X/2017

function showModel(req, res) {
  console.log(req.params);
  // { model: 'Model X', year: '2017'}
}
```

In the above example, `basePath` is the path associated with your Google Cloud Function, i.e. the name of the function itself.

The API router automatically replies `404 Not Found` - with no body and no event logging - to requests that do not match any of the specified routes. When needed, the behavior can be customized by assigning a dedicated handler to the not found case:

```javascript
router.notFound(notFoundHandler);
```

Multiple handlers can be defined for each individual route/method and for the not found case. Example:

```javascript
router.route('/sensors/:id/status')
      .get(showStatus)
      .put(enforceAuthorization, updateStatus);

router.notFound(doSomething, doSomethingElse);
```

When multiple handlers are used, each handler that is not the last of the list must be designed to expect `(req, res, next)` as input arguments, and to invoke `next()` to pass the control to the next following handler in the list. Example:

```javascript
function doSomething(req, res, next) {
  if (someCondition) {
    // Respond without executing next handler
    res.status(400).send();
  } else {
    // Pass control to next handler
    next();
  }
}

function doSomethingElse(req, res) {
  res.send('Both handlers have been invoked in sequence');
}
```

This approach enables the direct reuse of some of the middleware designed for [Express](http://expressjs.com/). As an example, the following snippet illustrates the use of the [cookie-parser](https://www.npmjs.com/package/cookie-parser) package.

```javascript
const cookieParser = require('cookie-parser')();

router.route('/sensors/:id/status')
      .get(cookieParser, showStatus);

function showStatus(req, res) {
  // Find parsed cookies in req.cookies

  res.json(someData);
}
```

### Installation

```
npm install gcf-api-router --save
```

### Usage

The API router can be instantiated following either one of two possible options. The difference is merely a style preference.

```javascript
// OPTION #1
const router = require('gcf-api-router')();

// OPTION #2
const apiRouter = require('gcf-api-router');
const router = apiRouter();
```

The following methods are supported:

**router.onRequest(req, res)**

This is the method that must be exported as entry point of the Google Cloud HTTP Function. For example, if **Function to execute** is set equal to `myApiHandler` in the Google Cloud Functions console, then:

```javascript
exports.myApiHandler = router.onRequest;
```

Alternatively, in case every HTTP request must undergo some processing/verification/logging common to all routes, the `router.onRequest` method can be used in the following manner:

```javascript
exports.myApiHandler = function(req, res) {

  // Some request processing/verification/logging here

  router.onRequest(req, res);
}
```

**router.route(path)**

Specifies a route path. The route path can include parameters encoded in accordance with the [route path conventions](http://expressjs.com/en/guide/routing.html) of [Express](http://expressjs.com/). Those conventions enable also compound names like the following:

```javascript
router.route('/flights/:from-:to')

router.route('/plantae/:genus.:species')
```

A regular expression within parentheses can be used to have more control over the exact string that can be matched by a route parameter:

```javascript
router.route('/user/:userId(\\d+)')
```

In the above example, note the escaping of `\` due to the fact that the regular expression is part of a string.

**router.get(reqHandler[, reqHandler2] ... [, reqHandlerN])**

Specifies one or more request handlers to be invoked in sequence for GET requests. The `router.get` method must always be chained to a `router.route` method or to another `router.{httpMethod}` method. The chaining order of different `router.{httpMethod}` methods is irrelevant.

`reqHandler` must be a function that accepts `(req, res)` as arguments. When multiple handlers are specified, all handlers except the last of the sequence must also accept `next` as argument, i.e. `(req, res, next)`.

If appropriate, the same `requestHandler` can be associated with multiple routes/methods.

**router.post(reqHandler[, reqHandler2] ... [, reqHandlerN])**

Same as `router.get` above, but for POST requests.

**router.put(reqHandler[, reqHandler2] ... [, reqHandlerN])**

Same as `router.get` above, but for PUT requests.

**router.patch(reqHandler[, reqHandler2] ... [, reqHandlerN])**

Same as `router.get` above, but for PATCH requests.

**router.delete(reqHandler[, reqHandler2] ... [, reqHandlerN])**

Same as `router.get` above, but for DELETE requests.

**router.options(reqHandler[, reqHandler2] ... [, reqHandlerN])**

Same as `router.get` above, but for OPTIONS requests.

**router.notFound(reqHandler[, reqHandler2] ... [, reqHandlerN])**

Specifies one or more request handlers to be invoked in sequence for requests that do not match any of the defined routes/methods.

`reqHandler` must be a function that accepts `(req, res)` as arguments. When multiple handlers are specified, all handlers except the last of the sequence must also accept `next` as argument, i.e. `(req, res, next)`.

If the `router.notFound` method is not used, then the API router simply replies `404 Not Found` - with no body and no event logging - to requests that do not match any of the defined routes/methods.
