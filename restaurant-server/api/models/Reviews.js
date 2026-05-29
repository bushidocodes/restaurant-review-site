/**
 * Reviews.js
 *
 * @description :: A user-submitted review tied to a restaurant by `restaurant_id`.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    restaurant_id: { type: 'number', required: true },
    name: { type: 'string', required: true },
    rating: { type: 'number' },
    comments: { type: 'string' },
  },

};
