'use strict';

const pino = require('pino');
const spawn = require('child_process').spawn;
const PassThrough = require('stream').PassThrough;
const fs = require('fs');
const _ = require('lodash');

/** Provides logging via pino and transport to elasticsearch **/
class Logger {
  /**
   * Create a logger
   * @param {object} opts - pino options
   * @param {string} [opts.name] - name for this logger
   * @param {string} [opts.file] - log file path
   * @param {boolean} [opts.toConsole] - log to console?
   * @param {object} es - elasticsearch connection info
   * @param {string} es.host - elasticsearch host
   * @param {number} es.port - elasticsearch port
   * @param {number} [es.index=pino] - elasticsearch index
   */
  constructor(opts, es) {
    this.pt = new PassThrough();
    this.initTransport(es);
    this.pt.pipe(this.esTransport.stdin);
    let pinoOpts = {
      name: opts.name
    };
    if (opts.file) {
      this.initFile(opts.file);
    }
    if (opts.toConsole) {
      const pretty = pino.pretty();
      this.pt.pipe(pretty);
      pretty.pipe(process.stdout);
    }
    pinoOpts.serializers = this.serializers(opts.redact);
    if (opts.express) {
      this.middleware = require('express-pino-logger')(pinoOpts, this.pt);
      this.pino = this.middleware.logger;
    } else {
      this.pino = pino(pinoOpts, this.pt);
    }
  }
  /**
   * @name serializers
   * @summary Provides serializers for pino
   * @param {array} redactFields - fields to redact
   * @return {object} - req and res serializers
   */
  serializers(redactFields = []) {
    let redacted = obj => {
      let censored = _.clone(obj);
      if (redactFields.length) {
        redactFields.forEach(field => {
          if (_.has(censored, field)) {
            _.set(censored, field, '[redacted]');
          }
        });
      }
      return censored;
    };
    return {
      req: (req) => {
        return {
          url: req.url,
          originalUrl: req.originalUrl,
          fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          method: req.method,
          body: (req.method === 'post' || req.method === 'POST') ? redacted(req.body) : {},
          xForwardedFor: req.headers['x-forwarded-for'],
          host: req.headers['host'],
          userAgent: req.headers['user-agent']
        };
      },
      res: (res) => {
        return {
          statusCode: res.statusCode
          //,header: res._header
        };
      }
    };
  }
  /**
   * @name initFile
   * @param {string} file - path to log file
   * @return {object} - WriteStream to file
   */
  initFile(file) {
    let toFile = fs.createWriteStream(file, {flags: 'a'});
    this.logFileDescriptor = null;
    toFile.on('open', fd => {
      this.logFileDescriptor = fd;
      this.pt.pipe(toFile);
    });
    toFile.on('error', err => console.log(`Error creating writeStream to append to ${file}: ${err}`));
    toFile.on('close', () => {
      console.log(`writeStream to ${file} closed, reopening file descriptor`);
      this.initFile(file);
    });
    let watcher = require('chokidar').watch(file);
    watcher.on('unlink', path => {
      console.log(`Detected unexpected deletion of ${file} (${path})`);
      fs.close(this.logFileDescriptor, () => toFile.emit('close'));
    });
    return toFile;
  }
  /**
  * @name initTransport
  * @param {object} es - elasticsearch connection info
  */
  initTransport(es) {
    let args = es ? ['-H', es.host, '-p', es.port] : null;
    if (es.index) {
      args.push('-i', es.index);
    }
    this.esTransport = spawn('pino-elasticsearch', args);
    this.esTransport.on('close', code => {
      if (this.onShutdown) {
        this.onShutdown(code);
      }
    });
  }
  /**
   * @name getLogger
   * @return {object} logger
   */
  getLogger() {
    return this.pino;
  }
  /**
  * @name shutdown
  * @param {function} cb - callback on shutdown
  */
  shutdown(cb) {
    this.onShutdown = cb;
    this.esTransport.kill('SIGINT');
  }
}

/**
 * @name initHydraExpress
 * @summary Initializes logging for Hydra Express services
 * @param {object} hydraExpress - hydraExpress instance
 * @param {string} serviceName - the name of the service
 * @param {object} config - logger options
 * @param {object} config.elasticsearch - elasticsearch connection info
 * @param {string} config.elasticsearch.host - elasticsearch host
 * @param {number} config.elasticsearch.port - elasticsearch port
 * @param {boolean} [config.toConsole=true] - log to console?
 * @param {boolean} [config.noFile=false] - don't log to disk if true
 * @param {array} [redact] - fields to redact with pino-noir
 * @param {string} [config.logPath] - override default log file
 * @param {string} [config.name]- name for this logger
 * @return {object} Logger object
 */
const initHydraExpress = (hydraExpress, serviceName, config) => {
  let opts = {
    name: config.name || serviceName,
    toConsole: !(config.toConsole === false)
  };
  if (!config.noFile) {
    let logFilePath = '';
    let lowercaseServiceName = serviceName || 'service';
    if (config.logPath && config.logPath.length > 0) {
      logFilePath = config.logPath;
    } else {
      logFilePath = `${process.cwd()}/${lowercaseServiceName}.log`;
    }
    opts.file = logFilePath;
  }
  if (config.redact) {
    opts.redact = config.redact;
  }
  opts.express = true;
  const logger = new Logger(opts, config.elasticsearch);
  hydraExpress.appLogger = logger.getLogger();
  return logger;
};

module.exports = {
  Logger,
  initHydraExpress
};
