const https = require('https');
const urlencode = require('urlencode');
const delegate = require('./delegate.js');

module.exports = function(authleteApiServer, authleteApiPort, authleteApiKey, authleteApiSecret, options) {

  const defaultMap = {
    config: '/.well-known/well-configuration',
    jwks: '/api/jwks',
    par: '/api/par',
    authorize: '/api/authorization',
    token: '/api/token',
    introspect: '/api/introspect'

  }

  if (options == undefined || options == null) {
    options = {
      endpointsMap: {}
    };
  }

  const endpointsMap = Object.assign(defaultMap, options.endpointsMap);

  const proxy = {
    config: function(req, res) {
      delegate.authleteSimpleGetDelegate(authleteApiServer, authleteApiPort,
        authleteApiKey, authleteApiSecret,
        res, '/api/service/configuration');
    },

    jwks: function(req, res) {
      delegate.authleteSimpleGetDelegate(authleteApiServer, authleteApiPort,
        authleteApiKey, authleteApiSecret,
        res, '/api/service/jwks/get');
    },

    par: function(req, res, next) {
      if (req.method !== "POST")
        return next();

      delegate.authletePostDelegate(authleteApiServer, authleteApiPort,
        authleteApiKey, authleteApiSecret,
        req, res, next,
        '/api/pushed_auth_req', false);
    },

    authorize: function(req, res, next) {

      if (req.method == 'GET') {
        req.body = req.query;
      }

      delegate.authletePostDelegate(authleteApiServer, authleteApiPort,
        authleteApiKey, authleteApiSecret,
        req, res, next,
        '/api/auth/authorization', true);
    },

    issue: function(body, req, res) {

      const data = JSON.stringify(body);

      const options = {
        method: 'POST',
        hostname: authleteApiServer,
        port: authleteApiPort,
        path: '/api/auth/authorization/issue',
        auth: authleteApiKey + ":" + authleteApiSecret,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }

      const authleteRequest =
        https.request(options,
          (authleteResponse) => {

            res.statusCode = authleteResponse.statusCode;

            var bodyStr = ""
            authleteResponse.on('data', (d) => {
              bodyStr = bodyStr + d;
            });

            authleteResponse.on('end', () => {

              var authleteResponse = JSON.parse(bodyStr);
              if (authleteResponse.action == 'LOCATION') {
                res.redirect(authleteResponse.responseContent);
              } else {
                const responseContent = JSON.parse(authleteResponse.responseContent);
                res.json(responseContent);
              }
            })

          }).on('error', (e) => {
          res.error(e);
        });
      authleteRequest.write(data);
    },

    cancel: function(req, res, next) {

    },


    token: function(req, res, next) {
      if (req.method !== 'POST') {
        next();
      }

      delegate.authletePostDelegate(authleteApiServer, authleteApiPort,
        authleteApiKey, authleteApiSecret,
        req, res, next,
        '/api/auth/token', false);

    },

    introspect: function(req, res, next) {
      if (req.method !== 'POST') {
        next();
      }

      delegate.authletePostDelegate(authleteApiServer, authleteApiPort,
        authleteApiKey, authleteApiSecret,
        req, res, next,
        '/api/auth/introspection/standard', false);
    }

  }

  const swap = function(map) {
    var ret = {};
    for (var key in map) {
      ret[map[key]] = proxy[key];
    }
    return ret;
  }

  const middlewareMap = swap(endpointsMap);

  return Object.assign(proxy, {

    middleware: function(req, res, next) {
      var func = middlewareMap[req.baseUrl];
      if (func !== undefined) {
        return func(req, res, next);
      }
      next();
    }
  });

}
