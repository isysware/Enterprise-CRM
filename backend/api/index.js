const app = require('../dist/app');

module.exports = function handler(req, res) {
  return app(req, res);
};
