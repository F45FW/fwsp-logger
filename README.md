# Logger [![Build Status](https://travis-ci.org/flywheelsports/fwsp-logger.svg?branch=master)](https://travis-ci.org/flywheelsports/fwsp-logger)

## Synopsis

Provides a [pino](https://github.com/pinojs/pino) logger
that ships its logs to Elasticsearch via [pino-elasticsearch](https://github.com/pinojs/pino-elasticsearch).

First, run `npm install -g pino-elasticsearch`

In [Hydra-Express](https://github.com/flywheelsports/fwsp-hydra-express) service entry-point script:
```javascript

// set up the logger for hydra express
let logger = config.logger && require('fwsp-logger').initHydraExpress(
  hydraExpress, config.hydra.serviceName, config.logger
);
return hydraExpress.init(config.getObject(), version, () => {

  // register the logging middleware if this is a dev environment and logger.logRequests is true
  let logRequests = config.environment === 'development' && logger && config.logger.logRequests;
  logRequests && hydraExpress.getExpressApp().use(logger.middleware);

  hydraExpress.registerRoutes({
    '/v1/service': require('./routes/service-v1-routes')
  });
})
```
with corresponding entry in config.json:
```json
"logger": {
  "name": "optional - will default to service name",
  "logPath": "optional - will default to service/servicename.log",
  "toConsole": false, // don't log to console
  "noFile": true, // don't log to disk
  "logRequests": true, // log all requests in development env
  "redact": ["password"], // fields to redact when logging req.body
  "elasticsearch": {
    "host": "localhost",
    "port": 9200,
    "index": "local-dev"
  }
},
```

Or, in Hydra services:
```javascript

// set up logger
let logger;
if (config.logger) {
  const Logger = require('fwsp-logger').Logger;
  logger = new Logger(
    {
      name: config.hydra.serviceName,
      toConsole: true
    },
    config.logger.elasticsearch
  ).getLogger();
}

// initialize hydra
hydra.init(config.hydra)
  .then(() => {
    return hydra.registerService();
  })
  .then(serviceInfo => {

    // log hydra 'log' events
    hydra.on('log', (entry) => {
      let msg = Utils.safeJSONParse(entry);
      if (msg) {
        if (logger[msg.type]) {
          logger[msg.type](msg.message);
        } else {
          logger.info(msg.type, msg.message);
        }
      }
    });

    // log service start
    logger.info({
      message: `Started ${config.hydra.serviceName} (v.${config.version})`
      serviceInfo
    });
  })

  // log hydra.init error
  .catch(error => logger.error({
    message: 'Error initializing Hydra',
    error
  });
});
```

General usage:
```javascript
const Logger = require('fwsp-logger').Logger,
      logger = new Logger(
        {
          name: 'my-service',             // required - name of the app writing logs
          file: '/custom/log-file.log',   // optional, defaults to ${cwd()}/serviceName.log
          toConsole: true                 // defaults to false
        }, {
          host: 'your.elasticsearch.host.com',
          port: 9200,
          index: 'local-dev'
        }
    );
const appLogger = logger.getLogger();
appLogger.error('An error happened');
appLogger.info({
    message: 'Something else happened',
    details: {
      foo: 'bar',
      answer: 42
    }
});
```

## Testing

To make sure logs are getting shipped to Elasticsearch,
you can spin up docker containers with ES and Kibana
using the docker-compose.yml file in this repository.


You will need [docker](https://www.docker.com/) and
[docker-compose](https://docs.docker.com/compose/) installed,
then in this project folder, launch `docker-compose up`.

You'll need to set up an Elasticsearch index in Kibana
before you'll be able to view logs, which should be the value of
logger.elasticsearch.index ('local-dev' in above examples),
or 'pino' by default.

If you don't have any index patterns set up, Kibana won't let you
proceed without adding one. Otherwise, to add additional indices,
go to Settings -> Indices.

## License

Licensed under [MIT](./LICENSE.txt).
