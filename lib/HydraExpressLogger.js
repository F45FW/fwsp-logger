'use strict';

const HydraExpressPlugin = require('fwsp-hydra-express/plugin');
const PinoExpressLogger = require('./PinoExpressLogger');

/**
 * @name HydraExpressLogger
 * @summary HydraExpressPlugin for logging (adds Express 'log' middleware)
 * @extends HydraExpressPlugin
 */
class HydraExpressLogger extends HydraExpressPlugin {
  constructor() {
    super('logger');
  }
  /**
   * @override
   */
  setConfig(serviceConfig) {
    super.setConfig(serviceConfig);
    this.initLogger();
    this.hydraExpress.appLogger = this._logger.pino;
  }
  /**
   * @override
   */
  onServiceReady() {
    this.hydraExpress.getExpressApp().use(this.getMiddleware());
  }
  /**
   * @override
   */
  configChanged(opts) {
    this.opts = opts;
    console.log('re-initializing logger plugin');
    console.dir(this.opts, {colors: true, depth: null});
    this._logger.shutdown(() => this.initLogger());
  }
  /**
   * @name initLogger
   * @summary Initialize the logger
   */
  initLogger() {
    this._logger = new PinoExpressLogger(
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
  /**
   * @name getMiddleware
   * @return {object} Logger middleware for express
   */
  getMiddleware() {
    if (this.middlewareWrapper) {
      return this.middlewareWrapper;
    }
    this.middlewareWrapper = (...args) => this._logger.middleware(...args);
    return this.middlewareWrapper;
  }
}

module.exports = HydraExpressLogger;
