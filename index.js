const pathToRegexp = require('path-to-regexp');

module.exports = function() {
  return new RequestHandler();
}

function RequestHandler() {
  this.idx = null;
  this.routes = [];
}

RequestHandler.prototype.route = function(path) {
  if (typeof path !== 'string' || path === '') {
    throw new TypeError('Argument must be a non-empty string');
  }
  let pathKeys = [];
  let pathRegex = pathToRegexp(path, pathKeys);
  this.routes.push({
    path: path,
    pathRegex: pathRegex,
    pathKeys: pathKeys.map(key => key.name),
    pathMethods: {}
  });
  this.idx = this.routes.length - 1;
  return this;
}

RequestHandler.prototype.get = function(onRequest) {
  let addMethodToRoute = addMethod.bind(this);
  return addMethodToRoute('GET', onRequest);
}

RequestHandler.prototype.post = function(onRequest) {
  let addMethodToRoute = addMethod.bind(this);
  return addMethodToRoute('POST', onRequest);
}

RequestHandler.prototype.put = function(onRequest) {
  let addMethodToRoute = addMethod.bind(this);
  return addMethodToRoute('PUT', onRequest);
}

RequestHandler.prototype.delete = function(onRequest) {
  let addMethodToRoute = addMethod.bind(this);
  return addMethodToRoute('DELETE', onRequest);
}

function addMethod(method, onRequest) {
  if (typeof onRequest !== 'function') {
    throw new TypeError('Argument must be a function');
  }
  if (this.idx === null) {
    throw new Error(`Cannot add ${method} handler for undefined route`);
  }
  if (this.routes[this.idx].pathMethods[method] === undefined) {
    this.routes[this.idx].pathMethods[method] = onRequest;
  }
  return this;
};

RequestHandler.prototype.notFound = function(onRequest) {
  if (typeof onRequest !== 'function') {
    throw new TypeError('Argument must be a function');
  }
  if (this.notFoundHandler === undefined) {
    this.notFoundHandler = onRequest;
  }
}

RequestHandler.prototype.onRequest = function(req, res) {
  let requestHandler = findRequestHandler(req, this.routes);
  if (requestHandler) {
    requestHandler(req, res);
  } else if (this.notFound === undefined) {
    res.status(404).send();
  } else {
    this.notFoundHandler(req, res);
  }
}

function findRequestHandler(req, routes) {
  let path = req.params[0] !== '' ? req.params[0] : '/';
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
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
}
