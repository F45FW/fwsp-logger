'use strict';

const PinoLogger = require('./PinoLogger');

/**
 * @name PinoExpressLogger
 * @summary PinoLogger with Express middleware
 * @extends PinoLogger
 */
class PinoExpressLogger extends PinoLogger {
  constructor(opts) {
    super(opts);
  }
  /**
   * @name initPino
   * @summary Initializes express-pino-logger
   * @param {object} opts - options to pass to express-pino-logger
   */
  initPino(opts) {
    this.middleware = require('express-pino-logger')(opts, this.pt);
    this.pino = this.middleware.logger;
  }
}

module.exports = PinoExpressLogger;
