'use strict';
const { handler: baseHandler } = require('./tickets-export.cjs');
exports.handler = async (event) => {
  const url = new URL(event.rawUrl || `http://x${event.path}`);
  url.searchParams.set('extended','1');
  return baseHandler({ ...event, rawUrl: url.toString() });
};
