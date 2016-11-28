'use strict';

const pino = require('pino');
const spawn = require('child_process').spawn;
const PassThrough = require('stream').PassThrough;
const fs = require('fs');

/** Provides logging via pino and transport to elasticsearch **/
class Logger {
  /**
   * Create a logger
   * @param {object} opts - pino options
   * @param {string} [opts.name] - name for this logger
   * @param {object} es - elasticsearch connection info
   * @param {string} es.host - elasticsearch host
   * @param {number} es.port - elasticsearch port
   */
  constructor(opts, es) {
    this.pt = new PassThrough();
    const pretty = pino.pretty();
    this.initTransport(es);
    this.pt.pipe(this.esTransport.stdin);
    if (opts.file) {
      this.initFile(opts.file);
      delete opts.file;
    }
    this.pt.pipe(pretty);
    pretty.pipe(process.stdout);
    this.pino = pino(opts, this.pt);
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
    this.esTransport = spawn(
      'pino-elasticsearch',
      es ? ['-H', es.host, '-p', es.port] : null
    );
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
 * @param {object} hydraExpress - hydraExpress instance
 * @param {string} serviceName - the name of the service
 * @param {object} config - logger options
 * @param {object} config.elasticsearch - elasticsearch connection info
 * @param {string} config.elasticsearch.host - elasticsearch host
 * @param {number} config.elasticsearch.port - elasticsearch port
 * @param {boolean} [config.noFile] - don't log to disk if true
 * @param {string} [config.logPath] - override default log file
 * @param {string} [config.name]- name for this logger
 */
const initHydraExpress = (hydraExpress, serviceName, config) => {
  let opts = {
    name: config.name || serviceName
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
  const logger = new Logger(opts, config.elasticsearch);
  hydraExpress.logger = logger;
  hydraExpress.appLogger = logger.getLogger();
};

module.exports = {
  Logger,
  initHydraExpress
};
