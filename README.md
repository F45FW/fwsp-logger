# Logger [![Build Status](https://travis-ci.org/flywheelsports/fwsp-logger.svg?branch=master)](https://travis-ci.org/flywheelsports/fwsp-logger)

## Synopsis

First, run `npm install -g pino-elasticsearch`

In Hydra Express service entry-point script:
```javascript
if (config.logger) {
  const Logger = require('./logger'),
        logger = new Logger({
          name: config.logger.name || config.hydra.serviceName
        },
        config.logger.elasticsearch
      );
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
const Logger = require('./logger'),
      logger = new Logger(
        { name: 'myApp' },
        { host: 'your.elasticsearch.host.com', port: 9200 }
    );
const appLogger = logger.getLogger();
appLogger.error('An error happened');
appLogger.info('Something else happened');
```
