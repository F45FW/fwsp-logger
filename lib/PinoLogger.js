'use strict';

const pino = require('pino');
const spawn = require('cross-spawn');
const PassThrough = require('stream').PassThrough;
const fs = require('fs');
const _ = require('lodash');

/**
 * @name PinoLogger
 * @summary Provides a Pino logger with transport to elasticsearch
 */
class PinoLogger {
  /**
   * @param {object} opts - logger options
   * @param {string} [opts.serviceName] - service being logged
   * @param {boolean} [opts.noFile=false] - don't log to disk if true
   * @param {string} [opts.logPath] - log file path
   * @param {boolean} [opts.toConsole] - log to console?
   * @param {object} opts.elasticsearch - elasticsearch connection info
   * @param {string} opts.elasticsearch.host - elasticsearch host
   * @param {number} opts.elasticsearch.port - elasticsearch port
   * @param {number} [opts.elasticsearch.index=pino] - elasticsearch index
   */
  constructor(opts) {
    if (!opts) {
      throw new Error('no configuration found for logger');
    }
    this.pt = new PassThrough();
    if (opts.elasticsearch) {
      this.initTransport(opts.elasticsearch);
      this.pt.pipe(this.esTransport.stdin);
    }
    if (!opts.noFile) {
      let logFilePath = '';
      let lowercaseServiceName = (opts.serviceName || 'service').toLowerCase();
      if (opts.logPath && opts.logPath.length > 0) {
        logFilePath = opts.logPath;
      } else {
        logFilePath = `${process.cwd()}/${lowercaseServiceName}.log`;
      }
      this.initFile(logFilePath);
    }
    if (!(opts.toConsole === false)) {
      const pretty = pino.pretty();
      this.pt.pipe(pretty);
      pretty.pipe(process.stdout);
    }
    this.augment = opts.augment;
    this.initPino({ serializers: this.serializers(opts.redact) });
  }

  /**
   * @name initPino
   * @summary Initializes pino
   * @param {object} opts - options to pass to Pino
   */
  initPino(opts) {
    this.pino = pino(opts, this.pt);
    this.logger = this.augment ? this.pino.child(this.augment) : this.pino;
  }

  /**
   * @name getLogger
   * @return {object} pino logger object
   */
  getLogger() {
    return this.logger;
  }

  /**
   * @name serializers
   * @summary Provides serializers for pino
   * @param {array} redactFields - fields to redact
   * @return {object} - req and res serializers
   */
  serializers(redactFields = []) {
    this.redactFields = redactFields;
    return {
      req: (req) => this.reqSerializer(req),
      res: (res) => this.resSerializer(res),
      err: (err) => this.errSerializer(err)
    };
  }

  redacted(obj) {
    let censored = _.clone(obj);
    if (this.redactFields.length) {
      this.redactFields.forEach(field => {
        if (_.has(censored, field)) {
          _.set(censored, field, '[redacted]');
        }
      });
    }
    return censored;
  }

  resSerializer(res) {
    return {
      statusCode: res.statusCode
    };
  }

  reqSerializer(req) {
    return Object.assign(
      {
        id: req.id,
        url: req.url,
        originalUrl: req.originalUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        method: req.method,
        body: (req.method === 'post' || req.method === 'POST') ? this.redacted(req.body) : {},
        xForwardedFor: req.headers['x-forwarded-for'],
        host: req.headers['host'],
        userAgent: req.headers['user-agent']
      },
      this.augment
    );
  }

  errSerializer(err) {
    let ret = err;
    if (err instanceof Error) {
      ret = Object.assign(
        JSON.parse(JSON.stringify(err)),
        {
          type: err.name || err.constructor.name,
          message: err.message,
          stack: err.stack
        }
      );
    }
    return ret;
  }

  /**
   * @name initFile
   * @param {string} file - path to log file
   * @return {object} - WriteStream to file
   */
  initFile(file) {
    let toFile = fs.createWriteStream(file, { flags: 'a' });
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
    this.esTransport.on('error', err => {
      throw new Error(`Failed to start pino-elasticsearch: ${err}`);
    });
    this.esTransport.on('close', code => {
      if (this.onShutdown) {
        this.onShutdown(code);
      }
    });
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

module.exports = PinoLogger;
