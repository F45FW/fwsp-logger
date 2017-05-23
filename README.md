# Logger [![npm version](https://badge.fury.io/js/fwsp-logger.svg)](https://badge.fury.io/js/fwsp-logger)

## Summary

Provides a [pino](https://github.com/pinojs/pino) logger
that ships its logs to elasticsearch via [pino-elasticsearch](https://github.com/pinojs/pino-elasticsearch).

## Usage

Run `npm install -g pino-elasticsearch` to install the elasticsearch transport module.

See [Configuration](https://github.com/flywheelsports/fwsp-logger#configuration) for details on the logger plugin config options.

Use the `HydraExpressLogger` plugin for Hydra Express apps:
```javascript
const HydraExpressLogger = require('fwsp-logger').HydraExpressLogger;
hydraExpress.use(new HydraExpressLogger());
hydraExpress.init(...);
hydraExpress.appLogger.info('information', {and: 'an object', with: 'some stuff'});
hydraExpress.appLogger.error({err: new Error('this will log a stack trace')});

// in a request handler
req.log.info('this will also log information about the current request');
req.log.error({err: new Error('this will log a stack trace')});

```
with corresponding entry in config.json:
```json
"hydra": {
  "plugins": {
    "logger": {
      "serviceName": "foo-service",
      "toConsole": false,
      "noFile": true,
      "elasticsearch": {
        "host": "localhost",
        "port": 9200,
        "index": "local-dev"
      }
    }
  }
}
```

Or, use the `HydraLogger` plugin for Hydra services:
```javascript
const HydraLogger = require('fwsp-logger').HydraLogger;
let hydraLogger = new HydraLogger();
let log = hydraLogger.getLogger();
hydra.use(hydraLogger);
hydra.init(...);
log.info('some info');
log.error({err: new Error('error with stack trace')});
log.error('just a message, no stack trace');
```

General usage (outside of Hydra):
```javascript
const PinoLogger = require('fwsp-logger').PinoLogger,
      logger = new PinoLogger(
        {
          serviceName: 'my-app',             /* required - name of the app writing logs */
          logPath: '/custom/log-file.log',   /* optional, defaults to ${cwd()}/serviceName.log */
          elasticsearch: {
            host: 'your.elasticsearch.host.com',
            port: 9200,
            index: 'local-dev'
          }
        }
    );
const appLogger = logger.getLogger();
appLogger.error({err: 'An error happened'}); // pass {err} literal for proper error serialization
appLogger.info({
    message: 'Something else happened',
    details: {
      foo: 'bar',
      answer: 42
    }
});
```

## Configuration

| Field | Description | Required | Default
| --- | --- | ---| ---
| serviceName | Name of the service doing the logging | N | `hydra.serviceName`
| logPath | Path to log to if !noFile | N | `service/servicename.log`
| toConsole | Log to console (stdout)? | N | `true`
| noFile | Don't write log to disk | N | `false`
| redact | Fields to redact (e.g. passwords, credit card numbers, etc.) | N | `[]`
| elasticsearch | Connection object for ElasticSearch | N | *none*

## Testing

To make sure logs are getting shipped to Elasticsearch,
you can spin up docker containers with ES and Kibana
using the docker-compose.yml file in this repository.


You will need [docker](https://www.docker.com/) and
[docker-compose](https://docs.docker.com/compose/) installed,
then in this project folder, launch `docker-compose up`.

You'll need to set up an Elasticsearch index in Kibana
before you'll be able to view logs, which should be the value of
`logger.elasticsearch.index` (`local-dev` in above examples),
or `pino` by default.

If you don't have any index patterns set up, Kibana won't let you
proceed without adding one. Otherwise, to add additional indices,
go to Settings -> Indices.

## License

Licensed under [MIT](./LICENSE.txt).
