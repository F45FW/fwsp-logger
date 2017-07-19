const pump = require('pump');
const pinoElasticSearch = require('./pino-elasticsearch');
process.on('message', opts => pump(process.stdin, pinoElasticSearch(opts)));
