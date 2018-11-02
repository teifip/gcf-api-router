const pathToRegexp = require('path-to-regexp');

function RequestHandler() {
  if (!(this instanceof RequestHandler)) {
    return new RequestHandler();
  }

  this.idx = null;
  this.routes = [];

  function onRequest(req, res) {
    let requestHandlers = findRequestHandlers(req, this.routes);
    if (requestHandlers) {
      executeRequestHandlers(req, res, requestHandlers, 0);
    } else if (this.notFoundHandlers === undefined) {
      res.status(404).send();
    } else {
      executeRequestHandlers(req, res, this.notFoundHandlers, 0);
    }
  }

  this.onRequest = onRequest.bind(this);
}

RequestHandler.prototype.route = function(path) {
  if (typeof path !== 'string' || path === '') {
    throw new TypeError('Argument must be a non-empty string');
  }
  let pathKeys = [];
  let pathRegex = pathToRegexp(path, pathKeys);
  this.routes.push({
    pathRegex: pathRegex,
    pathKeys: pathKeys.map(key => key.name),
    pathMethods: {}
  });
  this.idx = this.routes.length - 1;
  return this;
}

RequestHandler.prototype.get = function(...onRequest) {
  return addMethod.call(this, 'GET', onRequest);
}

RequestHandler.prototype.post = function(...onRequest) {
  return addMethod.call(this, 'POST', onRequest);
}

RequestHandler.prototype.put = function(...onRequest) {
  return addMethod.call(this, 'PUT', onRequest);
}

RequestHandler.prototype.delete = function(...onRequest) {
  return addMethod.call(this, 'DELETE', onRequest);
}

RequestHandler.prototype.patch = function(...onRequest) {
  return addMethod.call(this, 'PATCH', onRequest);
}

RequestHandler.prototype.options = function(...onRequest) {
  return addMethod.call(this, 'OPTIONS', onRequest);
}

function addMethod(method, onRequest) {
  if (onRequest.length === 0 || onRequest.some(a => typeof a !== 'function')) {
    throw new TypeError('Must specify one or more functions as arguments');
  }
  if (this.idx === null) {
    throw new Error(`Cannot add ${method} handler for undefined route`);
  }
  if (this.routes[this.idx].pathMethods[method] === undefined) {
    this.routes[this.idx].pathMethods[method] = onRequest;
  }
  return this;
};

RequestHandler.prototype.notFound = function(...onRequest) {
  if (onRequest.length === 0 || onRequest.some(a => typeof a !== 'function')) {
    throw new TypeError('Must specify one or more functions as arguments');
  }
  if (this.notFoundHandlers === undefined) {
    this.notFoundHandlers = onRequest;
  }
}

function findRequestHandlers(req, routes) {
  let path = req.path || '/';
  for (let route of routes) {
    let match = route.pathRegex.exec(path);
    if (match && route.pathMethods[req.method]) {
      req.params = route.pathKeys.reduce((params, key, idx) => {
        params[key] = decode(match[idx + 1]);
        return params;
      }, {});
      return route.pathMethods[req.method];
    }
  }
  return null;
}

function decode(value) {
  if (!value) return value;
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
}

function executeRequestHandlers(req, res, handlers, idx) {
  if (idx === handlers.length - 1) {
    handlers[idx](req, res);
  } else {
    handlers[idx](req, res, () => {
      executeRequestHandlers(req, res, handlers, ++idx);
    });
  }
}

module.exports = RequestHandler;
