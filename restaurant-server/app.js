/**
 * app.js
 *
 * Use `app.js` to run your app without `sails lift`.
 * To start the server, run: `node app.js`.
 *
 * The same command-line arguments are supported, e.g.:
 * `node app.js --silent --port=80 --prod`
 */

// Ensure we're in the project directory, so cwd-relative paths work as expected
// no matter where we actually lift from.
process.chdir(__dirname);

if (!process.env.SESSION_SECRET) {
  console.error('Error: SESSION_SECRET environment variable is required.');
  process.exit(1);
}

// Attempt to import `sails` (and `rc`, which Sails bundles).
var sails;
var rc;
try {
  sails = require('sails');
  rc = require('sails/accessible/rc');
} catch (err) {
  console.error('Encountered an error when attempting to require(\'sails\'):');
  console.error(err.stack);
  console.error('--');
  console.error('To run an app using `node app.js`, you need to have Sails installed');
  console.error('locally (`./node_modules/sails`). To do that, just make sure you\'re');
  console.error('in the same directory as your app and run `npm install`.');
  return;
}

// Start server
sails.lift(rc('sails'));
