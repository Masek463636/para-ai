'use strict';
const db=require('./db'),S=require('./security'),events=require('./events');const {randomUUID}=require('node:crypto');
const DAY=86400000;
function storageReady(){try{S.encryptionKey();return db.configured();}catch{return false;}}
function freeProjection(report){
 const clip=(s,n)=>String(s||'').slice(0,n);
 // Explicit allow-list: never spread the model result into a free response.
 return {analysisVersion:8,coupleType:report.coupleType,archetype:Object.fromEntries(['code','title','description','strength','weakness','bond'].map(k=>[k,report.archetype[k]])),superpower:{title:report.superpower.title,text:report.superpower.text},
 metrics:Object.fromEntries(require('./analysis').METRIC_KEYS.map(k=>[k,report.metrics[k]])),overallCompatibility:report.overallCompatibility,breakupRiskIndex:report.breakupRiskIndex,
 personAProfile:clip(report.personAProfile,360),personBProfile:clip(report.personBProfile,360),
 profiles:{personA:{needs:report.profiles.personA.needs},personB:{needs:report.profiles.personB.needs}},
 highlights:{greenFlag:report.highlights.greenFlag},
 misunderstandings:Object.fromEntries(['personA','personB'].map(k=>[k,{behavior:clip(report.misunderstandings[k].behavior,230)}])),
 cycle:{title:report.cycle.title,caveat:report.cycle.caveat,steps:[report.cycle.steps[0]]},
 riskZone:{title:report.riskZone.title,preview:clip(report.riskZone.text,190)},
 metricPreviews:Object.fromEntries(Object.entries(report.metricNarratives||{}).map(([k,n])=>[k,clip(n.together,220)])),council:report.council.map(x=>({speaker:x.speaker,text:x.text}))};
}
async function owned(id,session,connection){if(!S.UUID.test(id||'')||!session)throw new S.HttpError(404,'Отчёт не найден в этой сессии.');const r=await db.one('SELECT * FROM reports WHERE id=? AND anonymous_session_id=? AND expires_at>?',[id,session,Date.now()],connection);if(!r)throw new S.HttpError(404,'Отчёт не найден или срок хранения закончился.');return r;}
async function begin(session,requestId,payload){if(!S.UUID.test(requestId||''))throw new S.HttpError(400,'Обновите страницу и повторите анализ.');const digest=S.privateHash(payload);return db.transaction(async tx=>{
 let r=await db.one('SELECT * FROM reports WHERE anonymous_session_id=? AND request_id=?',[session,requestId],tx);const now=Date.now();
 if(r){if(r.report_hash!==digest)throw new S.HttpError(409,'Этот запрос уже связан с другой анкетой.');if(r.expires_at<=now)throw new S.HttpError(410,'Срок хранения отчёта закончился. Пройдите тест заново.');if(r.status==='complete'||r.lease_until>now)return {row:r,run:false};
 const generation=randomUUID();await db.execute('UPDATE reports SET lease_until=?,generation_id=?,status=? WHERE id=?',[now+180000,generation,r.content_cipher?'partial':'pending',r.id],tx);r={...r,generation_id:generation};return {row:r,run:true};}
 const id=randomUUID(),generation=randomUUID();await db.execute('INSERT INTO reports(id,anonymous_session_id,request_id,report_hash,created_at,expires_at,status,lease_until,generation_id) VALUES(?,?,?,?,?,?,?,?,?)',[id,session,requestId,digest,now,now+30*DAY,'pending',now+180000,generation],tx);
 await events.record(session,'analysis_started',id,tx);return {row:await db.one('SELECT * FROM reports WHERE id=?',[id],tx),run:true};});}
async function save(row,report,status){const cipher=S.seal(report);await db.transaction(async tx=>{const r=await db.execute('UPDATE reports SET content_cipher=?,status=?,lease_until=? WHERE id=? AND generation_id=?',[cipher,status,status==='complete'?0:Date.now()+180000,row.id,row.generation_id],tx);if(r.rowsAffected!==1)throw Error('Stale generation');if(status==='complete')await events.record(row.anonymous_session_id,'analysis_completed',row.id,tx);});}
async function failed(row){await db.execute("UPDATE reports SET status=CASE WHEN content_cipher IS NULL THEN 'failed' ELSE 'partial' END,lease_until=0 WHERE id=? AND generation_id=?",[row.id,row.generation_id]);}
function entitlement(row){return {premiumUnlocked:Boolean(row.premium_unlocked),coachFreeRemaining:Math.max(0,1-row.coach_free_used),coachPaidRemaining:row.premium_unlocked?Math.max(0,8-row.coach_paid_used):0};}
function response(row,report){return {...freeProjection(report),reportId:row.id,status:row.status,storageAvailable:true,expiresAt:row.expires_at,...entitlement(row)};}
async function rate(session,scope,max,ms){const now=Date.now(),id=S.hash([scope,session,Math.floor(now/ms)]);return db.transaction(async tx=>{await db.execute('DELETE FROM rate_limits WHERE expires_at<?',[now],tx);await db.execute('INSERT INTO rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1',[id,now+ms],tx);return (await db.one('SELECT count FROM rate_limits WHERE id=?',[id],tx)).count<=max;});}
module.exports={freeProjection,storageReady,owned,begin,save,failed,response,entitlement,rate};
