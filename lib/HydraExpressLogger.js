'use strict';

const HydraExpressPlugin = require('hydra-express/plugin');
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
    this.hydraExpress.appLogger = this._logger.logger;
  }
  /**
   * @override
   */
  onServiceReady() {
    this.hydra.on('log', entry => this._logger.logger[entry.type](entry));
    this.hydraExpress.getExpressApp().use(this.getMiddleware());
  }
  /**
   * @override
   */
  configChanged(opts) {
    this.opts = opts;
    this._logger.shutdown(() => this.initLogger());
  }
  /**
   * @name initLogger
   * @summary Initialize the logger
   */
  initLogger() {
    this._logger = new PinoExpressLogger(
      Object.assign(
        {
          augment: {
            serviceName: this.hydraConfig.serviceName,
            serviceVersion: this.hydraConfig.serviceVersion
          }
        },
        this.opts
      ));
  }
  /**
   * @name getLogger
   * @return {object} The pino logger
   */
  getLogger() {
    return this._logger.logger;
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
