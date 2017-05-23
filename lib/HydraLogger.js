'use strict';

const HydraPlugin = require('hydra-plugin');
const PinoLogger = require('./PinoLogger');

const hydraOpts = (opts, hydra) => {
  let augment = {serviceName: hydra.getServiceName()};
  if (opts.augment) {
    opts.augment = Object.assign(opts.augment, augment);
    return opts;
  }
  return Object.assign(opts, {augment});
};

/**
 * @name HydraPinoLogger
 * @summary Extensions for Hydra
 * @extends PinoLogger
 */
class HydraPinoLogger extends PinoLogger {
  constructor(opts, hydra) {
    super(hydraOpts(opts, hydra));
  }
}

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
    this.opts = opts;
    this._logger.shutdown(() => this.initLogger());
  }
  /**
   * @name initLogger
   * @summary Initialize the logger
   */
  initLogger() {
    this._logger = new HydraPinoLogger(
      Object.assign(
        {serviceName: this.hydraConfig.serviceName},
        this.opts
      ),
      this.hydra
    );
  }
  /**
   * @name getLogger
   * @return {object} The pino logger
   */
  getLogger() {
    return this._logger.logger;
  }
  /**
   * @override
   */
  onServiceReady() {
    this.hydra.on('log', entry => this._logger.pino[entry.type](entry));
  }
}

module.exports = HydraLogger;
