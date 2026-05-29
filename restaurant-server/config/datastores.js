/**
 * Datastores
 * (sails.config.datastores)
 *
 * A set of datastore configurations which tell Sails where to fetch or save
 * data when you execute built-in model methods like `.find()` and `.create()`.
 *
 *  > This app uses the file-based `sails-disk` adapter for local development.
 *  > It is not suitable for production persistence.
 *
 * For more information on configuring datastores, check out:
 * https://sailsjs.com/config/datastores
 */

module.exports.datastores = {

  /***************************************************************************
  *                                                                          *
  * Local disk storage for DEVELOPMENT ONLY.                                 *
  *                                                                          *
  * Installed by default.                                                    *
  *                                                                          *
  ***************************************************************************/
  default: {
    adapter: 'sails-disk',
  },

};
