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
   * @param {object} augment - props to add to all log messages
   */
  initPino(opts) {
    this.middleware = require('express-pino-logger')(opts, this.pt);
    this.pino = this.middleware.logger;
    this.logger = this.augment ? this.pino.child(this.augment) : this.pino;
  }
}

module.exports = PinoExpressLogger;
