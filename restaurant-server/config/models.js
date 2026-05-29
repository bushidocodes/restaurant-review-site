/**
 * Default model settings
 * (sails.config.models)
 *
 * Unless overridden, the properties below are inherited by every model.
 *
 * For more info on Sails models, see:
 * https://sailsjs.com/config/models
 */

module.exports.models = {

  /***************************************************************************
  *                                                                          *
  * The default datastore for every model (see `config/datastores.js`).      *
  *                                                                          *
  ***************************************************************************/
  datastore: 'default',

  /***************************************************************************
  *                                                                          *
  * How and whether Sails will attempt to automatically rebuild the          *
  * tables/collections/etc. in your schema. `sails-disk` only supports        *
  * 'alter'/'drop'. See https://sailsjs.com/docs/concepts/models-and-orm/    *
  * model-settings#?migrate                                                   *
  *                                                                          *
  ***************************************************************************/
  migrate: 'alter',

  /***************************************************************************
  *                                                                          *
  * Base attributes inherited by all models: an auto-incrementing numeric     *
  * primary key plus ISO-8601 string timestamps (kept as strings so the       *
  * front-end's `new Date(...)` / `Date.parse(...)` calls keep working).      *
  *                                                                          *
  ***************************************************************************/
  attributes: {
    id: { type: 'number', autoIncrement: true },
    createdAt: { type: 'string', autoCreatedAt: true },
    updatedAt: { type: 'string', autoUpdatedAt: true },
  },

  primaryKey: 'id',

};
