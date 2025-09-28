'use strict';
exports.handler = async () => {
  const pick=(k)=>process.env[k]?String(process.env[k]).trim():undefined;
  const mask=(v)=>v?v.replace(/.(?=.{4})/g,'•'):undefined;
  return { statusCode:200, headers:{'content-type':'application/json; charset=utf-8'}, body: JSON.stringify({ ok:true, env:{ NETLIFY_SITE_ID:pick('NETLIFY_SITE_ID'), NETLIFY_API_TOKEN:mask(pick('NETLIFY_API_TOKEN')), NETLIFY_TOKEN:mask(pick('NETLIFY_TOKEN')), BLOBS_SITE_ID:pick('BLOBS_SITE_ID'), BLOBS_TOKEN:mask(pick('BLOBS_TOKEN')), BLOBS_STORE_NAME:pick('BLOBS_STORE_NAME'), BLOBS_PREFIX:pick('BLOBS_PREFIX') } }, null, 2) };
};
