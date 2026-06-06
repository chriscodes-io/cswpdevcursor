const serverless = require('serverless-http');
const { createApp } = require('../../backend/app');

const app = createApp();

module.exports.handler = serverless(app);
