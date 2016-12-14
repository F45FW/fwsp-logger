'use strict';

const HydraPlugin = require('fwsp-hydra/plugin');
const PinoLogger = require('./PinoLogger');

/**
 * @name HydraLogger
 * @summary HydraPlugin for logging
 * @extends HydraPlugin
 */
class HydraLogger extends HydraPlugin {
  constructor() {
    super('logger');
  }
  /**
   * @override
   */
  setConfig(hydraConfig) {
    super.setConfig(hydraConfig);
    this.initLogger();
  }
  /**
   * @override
   */
  configChanged(opts) {
    console.log('New config for logger', opts);
  }
  /**
   * @name initLogger
   * @summary Initialize the logger
   */
  initLogger() {
    this._logger = new PinoLogger(
      Object.assign(
        {serviceName: this.hydraConfig.serviceName},
        this.opts
      ));
  }
  /**
   * @name getLogger
   * @return {object} The pino logger
   */
  getLogger() {
    return this._logger.pino;
  }
}

module.exports = HydraLogger;
