'use strict';
// Best-effort fallback rate guard only when persistent storage is unconfigured. No entitlements live here.
const {hash}=require('./security');const rates=new Map();
function allow(req,scope,max,ms){const now=Date.now(),id=hash([scope,String(req.headers?.['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0]]);for(const[k,v]of rates)if(v.until<now)rates.delete(k);if(rates.size>10000)return false;const v=rates.get(id)||{count:0,until:now+ms};v.count++;rates.set(id,v);return v.count<=max;}
module.exports={allow};
