const {createHmac,createHash,randomUUID,timingSafeEqual}=require('node:crypto');
const claims=new Map(),rates=new Map();
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const key=()=>createHmac('sha256',process.env.GEMINI_API_KEY||'').update('PARA-coach-v7').digest();
function issue(context){const body=Buffer.from(JSON.stringify({v:7,id:randomUUID(),hash:digest(context),exp:Date.now()+24*60*60*1000,limit:1})).toString('base64url');return body+'.'+createHmac('sha256',key()).update(body).digest('base64url');}
function verify(token,context){if(typeof token!=='string'||token.length>1000)throw Error('Invalid pass');const [body,sig]=token.split('.');const actual=Buffer.from(sig||'','base64url'),expected=createHmac('sha256',key()).update(body||'').digest();if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Invalid pass');const data=JSON.parse(Buffer.from(body,'base64url'));if(data.v!==7||data.exp<Date.now()||data.limit!==1||data.hash!==digest(context))throw Error('Expired or modified pass');return data;}
function allow(req,scope,max,windowMs){const ip=String(req.headers?.['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];const id=digest([scope,ip]);const now=Date.now();for(const [k,v] of rates)if(v.until<now)rates.delete(k);if(rates.size>10000)return false;const v=rates.get(id)||{count:0,until:now+windowMs};v.count++;rates.set(id,v);return v.count<=max;}
function reserve(pass,question){const now=Date.now();for(const [k,v] of claims)if(v.exp<now)claims.delete(k);const old=claims.get(pass.id);if(old)return old.hash===digest(question)&&old.answer?{answer:old.answer}:{blocked:true};if(claims.size>10000)return {blocked:true};claims.set(pass.id,{hash:digest(question),exp:pass.exp});return {};}
function finish(pass,answer){const row=claims.get(pass.id);if(row)row.answer=answer;}
function release(pass){if(pass)claims.delete(pass.id);}
module.exports={issue,verify,allow,reserve,finish,release};
