/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs just before your Sails app gets lifted.
 *
 * Seeds the file-based (`sails-disk`) datastore with the initial restaurants and
 * reviews the first time the app is lifted against an empty database. IDs (and the
 * ISO-8601 string timestamps the front-end expects) are preserved from the seed file.
 *
 * For more information on bootstrapping your app, check out:
 * https://sailsjs.com/config/bootstrap
 */

const seed = require('./seed-data.json');

module.exports.bootstrap = async function() {

  // Only seed an empty datastore, so manual edits and subsequent lifts are preserved.
  if (await sails.models.restaurants.count() > 0) {
    return;
  }

  sails.log.info('Empty datastore detected — seeding restaurants and reviews...');

  await sails.models.restaurants.createEach(seed.restaurants);
  await sails.models.reviews.createEach(seed.reviews);

  sails.log.info(`Seeded ${seed.restaurants.length} restaurants and ${seed.reviews.length} reviews.`);

};
