'use strict';
const STORE_NAME     = (process.env.BLOBS_STORE_NAME || 'sityps').trim();
const TICKETS_PREFIX = (process.env.BLOBS_PREFIX || 'tickets/').trim();
module.exports = { STORE_NAME, TICKETS_PREFIX };