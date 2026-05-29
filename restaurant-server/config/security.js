/**
 * Security Settings
 * (sails.config.security)
 *
 * These settings affect aspects of your app's security, such as the
 * Cross-Origin Resource Sharing (CORS) and Cross-Site Request Forgery (CSRF)
 * protection.
 *
 * For more information on configuring security settings, check out:
 * https://sailsjs.com/config/security
 */

module.exports.security = {

  /***************************************************************************
  *                                                                          *
  * CORS is like a more modern version of JSONP -- it allows your server/API *
  * to successfully respond to requests from client-side JavaScript code     *
  * running on some other domain.                                            *
  *                                                                          *
  * Set CORS_ORIGIN in the environment to the front-end origin(s) allowed to *
  * call this API (comma-delimited for multiple). In production this should   *
  * be set explicitly -- the wildcard default is intentionally absent.       *
  *                                                                          *
  * https://sailsjs.com/docs/concepts/security/cors                          *
  *                                                                          *
  ***************************************************************************/

  cors: {
    allRoutes: true,
    allowOrigins: (process.env.CORS_ORIGIN || 'http://localhost:8080')
      .split(',')
      .map(origin => origin.trim()),
  },

};
