/**
 * Restaurants.js
 *
 * @description :: A restaurant that can be browsed, filtered, and favorited.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    name: { type: 'string', required: true },
    neighborhood: { type: 'string' },
    photograph: { type: 'string' },
    address: { type: 'string' },
    latlng: { type: 'json' },
    cuisine_type: { type: 'string' },
    operating_hours: { type: 'json' },
    is_favorite: { type: 'boolean', defaultsTo: false },
  },

};
