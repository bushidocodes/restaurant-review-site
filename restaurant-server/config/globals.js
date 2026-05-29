/**
 * Global Variable Configuration
 * (sails.config.globals)
 *
 * Configure which global variables Sails exposes automatically.
 *
 * For more information on configuration, see:
 * https://sailsjs.com/config/globals
 */

module.exports.globals = {

  // This app doesn't rely on a global lodash/async, so leave them disabled
  // (avoids pulling them in as direct dependencies).
  _: false,
  async: false,

  // Expose models (e.g. `Restaurants`, `Reviews`) and the `sails` app instance
  // as globals — used by `config/bootstrap.js`.
  models: true,
  sails: true,

};
