// netlify/functions/tickets.cjs
// “Shim” de compatibilidad: reexporta helpers desde _store.cjs
const { getTicketStore, readIndex, writeIndex, STORE_NAME, INDEX_KEY } = require("./_store.cjs");

module.exports = {
  getTicketStore,
  readIndex,
  writeIndex,
  STORE_NAME,
  INDEX_KEY,
};
