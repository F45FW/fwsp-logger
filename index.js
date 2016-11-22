'use strict';

const pino = require('pino');
const spawn = require('child_process').spawn;
const PassThrough = require('stream').PassThrough;

/** Provides logging via pino and transport to elasticsearch **/
class Logger {
  /**
   * Create a logger
   * @param {object} opts - pino options
   * @param {string} opts.name - name for this logger
   * @param {object} es - elasticsearch connection info
   * @param {string} es.host - elasticsearch host
   * @param {number} es.port - elasticsearch port
   */
  constructor(opts, es) {
    const pt = new PassThrough();
    const pretty = pino.pretty();
    this.initTransport(es);
    pt.pipe(this.esTransport.stdin);
    pt.pipe(pretty);
    pretty.pipe(process.stdout);
    this.pino = pino(opts, pt);
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

module.exports = Logger;
