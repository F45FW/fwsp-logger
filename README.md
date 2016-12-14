# Logger [![npm version](https://badge.fury.io/js/fwsp-logger.svg)](https://badge.fury.io/js/fwsp-logger)
## Synopsis

Provides a [pino](https://github.com/pinojs/pino) logger
that ships its logs to Elasticsearch via [pino-elasticsearch](https://github.com/pinojs/pino-elasticsearch).

First, run `npm install -g pino-elasticsearch`

Use HydraExpressLogger plugin for Hydra Express apps:
```javascript
const HydraExpressLogger = require('fwsp-logger/plugin').HydraExpressLogger;
hydraExpress.use(new HydraExpressLogger());
hydraExpress.init(...);
```
with corresponding entry in config.json hydra.plugins:
```json
"hydra": {
  "plugins": {
    "logger": {
      "serviceName": "optional - will default to hydra.serviceName",
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
    }
  }
}
,
```

Or, use HydraLogger plugin for Hydra services:
```javascript
const HydraLogger = require('fwsp-logger/plugin').HydraLogger;
hydra.use(new HydraLogger());
hydra.init(...);
```

General usage:
```javascript
const PinoLogger = require('fwsp-logger').PinoLogger,
      logger = new PinoLogger(
        {
          serviceName: 'my-service',       // required - name of the app writing logs
          logPath: '/custom/log-file.log', // optional, defaults to ${cwd()}/serviceName.log
          toConsole: true,                 // defaults to false
          elasticsearch: {
            host: 'your.elasticsearch.host.com',
            port: 9200,
            index: 'local-dev'
          }
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
