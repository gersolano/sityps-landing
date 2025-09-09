// netlify/functions/_store.cjs
// ÚNICA fuente de acceso a Netlify Blobs para Functions CJS.
// Usa import() dinámico (ESM) y expone helpers consistentes.

const STORE_NAME = process.env.BLOBS_STORE_NAME || "sityps";
const INDEX_KEY = "tickets/index.json";

/** Carga @netlify/blobs con import ESM */
async function _loadBlobs() {
  // NUNCA uses require('@netlify/blobs'); provoca ERR_REQUIRE_ESM.
  const mod = await import("@netlify/blobs");
  if (!mod || !mod.getStore) {
    throw new Error("No se pudo cargar @netlify/blobs");
  }
  return mod;
}

/** Devuelve un store listo para tickets */
async function getTicketStore() {
  const { getStore } = await _loadBlobs();
  // Con nombre; en Functions no necesitas siteID/token.
  const store = getStore({ name: STORE_NAME });

  // Polyfills/azúcar para trabajar cómodo desde CJS:
  const api = {
    /** Guarda objeto como JSON */
    async putJSON(key, obj) {
      return store.setJSON(key, obj);
    },
    /** Lee JSON (o null) */
    async getJSON(key) {
      return store.getJSON(key);
    },
    /** Borra una clave */
    async del(key) {
      return store.delete(key);
    },
    /** Lista por prefijo y devuelve arreglo de { key, size } */
    async list(prefix) {
      const out = await store.list({ prefix });
      // La forma estándar es { blobs: [{ key, size, metadata }], directories: [...] }
      const blobs = Array.isArray(out?.blobs) ? out.blobs : [];
      return blobs.map(b => ({ key: b.key, size: b.size }));
    },
    /** Compatibilidad con código previo que usa listByPrefix */
    async listByPrefix(prefix) {
      return this.list(prefix);
    },
    // También exponemos acceso crudo por si lo necesitas en el futuro:
    _raw: store,
  };

  return api;
}

/** Lee el índice global (si no existe, devuelve objeto vacío) */
async function readIndex() {
  const store = await getTicketStore();
  return (await store.getJSON(INDEX_KEY)) || {};
}

/** Escribe el índice global */
async function writeIndex(data) {
  const store = await getTicketStore();
  await store.putJSON(INDEX_KEY, data || {});
}

module.exports = {
  getTicketStore,
  readIndex,
  writeIndex,
  STORE_NAME,
  INDEX_KEY,
};
