# Logger [![Build Status](https://travis-ci.org/flywheelsports/fwsp-logger.svg?branch=master)](https://travis-ci.org/flywheelsports/fwsp-logger)

## Synopsis

Provides a [pino](https://github.com/pinojs/pino) logger
that ships its logs to Elasticsearch via [pino-elasticsearch](https://github.com/pinojs/pino-elasticsearch).

First, run `npm install -g pino-elasticsearch`

In Hydra Express service entry-point script:
```javascript
if (config.logger) {
  const Logger = require('fwsp-logger'),
        logger = new Logger({
          name: config.logger.name || config.hydra.serviceName
        },
        config.logger.elasticsearch
      );
  hydraExpress.logger = logger;
  hydraExpress.appLogger = logger.getLogger();
}
```
with corresponding entry in config.json:

```json
"logger": {
  "elasticsearch": {
    "host": "localhost",
    "port": 9200
  }
},
```

General usage:
```javascript
const Logger = require('fwsp-logger'),
      logger = new Logger(
        { name: 'myApp' },
        { host: 'your.elasticsearch.host.com', port: 9200 }
    );
const appLogger = logger.getLogger();
appLogger.error('An error happened');
appLogger.info('Something else happened');
```

## Testing

To make sure logs are getting shipped to Elasticsearch,
you can spin up docker containers with ES and Kibana
using the docker-compose.yml file in this repository.


You will need [docker](https://www.docker.com/) and
[docker-compose](https://docs.docker.com/compose/) installed,
then in this project folder, launch `docker-compose up`.

## License

Licensed under [MIT](./LICENSE.txt).
