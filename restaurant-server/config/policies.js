/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions, unless overridden.       *
  * `false` denies access to everything that isn't explicitly allowed below. *
  *                                                                          *
  ***************************************************************************/

  '*': false,

  /***************************************************************************
  *                                                                          *
  * Expose the blueprint actions the front-end actually uses. Restaurants    *
  * are read-only except for `update` (favoriting). Reviews can be read and  *
  * created (posting). Creating/deleting restaurants and editing/deleting    *
  * reviews stay denied via the `'*': false` default above.                  *
  *                                                                          *
  ***************************************************************************/

  RestaurantsController: {
    find: true,
    findOne: true,
    update: true,
  },

  ReviewsController: {
    find: true,
    findOne: true,
    create: true,
  },

};
