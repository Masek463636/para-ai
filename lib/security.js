'use strict';
const crypto=require('node:crypto');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(canonical(v))).digest('hex');
function encryptionKey(){const key=process.env.REPORT_ENCRYPTION_KEY;if(!/^[a-f0-9]{64}$/i.test(key||''))throw Error('Encryption key not configured');return Buffer.from(key,'hex');}
function seal(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),body].map(b=>b.toString('base64url')).join('.');}
function open(value){const [iv,tag,body]=String(value).split('.').map(x=>Buffer.from(x,'base64url'));const cipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),iv);cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(body),cipher.final()]).toString());}
function privateHash(value){return crypto.createHmac('sha256',encryptionKey()).update(JSON.stringify(canonical(value))).digest('hex');}
function session(req,res,create=false){const match=String(req.headers?.cookie||'').match(/(?:^|;\s*)para_session=([A-Za-z0-9_-]{43})(?:;|$)/);let token=match?.[1];if(!token&&create){token=crypto.randomBytes(32).toString('base64url');const secure=process.env.VERCEL||process.env.NODE_ENV==='production';res.setHeader('Set-Cookie',`para_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure?'; Secure':''}`);}return token?hash(token):null;}
function sameOrigin(req){const origin=req.headers?.origin;if(req.headers?.['sec-fetch-site']==='cross-site')return false;if(!origin)return true;const expected=process.env.APP_URL||`https://${req.headers?.host}`;return origin===expected.replace(/\/$/,'');}
function admin(req){const expected=process.env.ADMIN_SECRET,actual=String(req.headers?.authorization||'').replace(/^Bearer /,'');if(!expected||expected.length<32||actual.length>256)return false;return crypto.timingSafeEqual(Buffer.from(hash(actual)),Buffer.from(hash(expected)));}
function headers(res){res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');}
function json(res,status,data){res.statusCode=status;res.end(JSON.stringify(data));}
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
function fail(res,e){json(res,e instanceof HttpError?e.status:503,{error:e instanceof HttpError?e.message:'Сервис временно недоступен. Попробуйте ещё раз чуть позже.'});}
function post(req,res){headers(res);if(req.method!=='POST'){res.setHeader('Allow','POST');throw new HttpError(405,'Метод не поддерживается.');}if(!sameOrigin(req))throw new HttpError(403,'Откройте PARA в исходной вкладке.');}
module.exports={UUID,hash,privateHash,seal,open,encryptionKey,session,sameOrigin,admin,headers,json,HttpError,fail,post};
