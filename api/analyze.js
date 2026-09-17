'use strict';
const A=require('../lib/analysis'),S=require('../lib/security'),R=require('../lib/reports'),legacyRate=require('../lib/access');const {calculate}=require('../questionnaire');
module.exports=async function(req,res){
 let row,base,started=false,controller,timer;const emit=(event,data)=>res.write(JSON.stringify({event,data})+'\n');
 try{
 S.post(req,res);let answers;try{answers=A.validatePayload(req.body);}catch{throw new S.HttpError(400,'Заполните все 18 вопросов и начало отношений.');}
 if(!process.env.GEMINI_API_KEY)throw new S.HttpError(503,'Смысловой анализ временно недоступен.');
 const owner=S.session(req,res,true),stored=R.storageReady();
 if(stored){if(!await R.rate(owner,'analysis',6,600000))throw new S.HttpError(429,'Слишком много разборов подряд. Попробуйте через несколько минут.');
 const lease=await R.begin(owner,req.body.requestId,{answers,months:req.body.relationshipDurationMonths});row=lease.row;
 if(!lease.run)return S.json(res,row.status==='complete'?200:202,row.content_cipher?R.response(row,S.open(row.content_cipher)):{reportId:row.id,status:row.status,storageAvailable:true});
 }else if(!legacyRate.allow(req,'analyze',6,600000))throw new S.HttpError(429,'Слишком много разборов подряд. Попробуйте позже.');
 controller=new AbortController();timer=setTimeout(()=>controller.abort(),165000);
 if(req.body.stream===true){res.setHeader('Content-Type','application/x-ndjson; charset=utf-8');res.setHeader('X-Accel-Buffering','no');started=true;emit('accepted',{reportId:row?.id||null,storageAvailable:stored});}
 const selections=[req.body.answers.map(a=>a.personA),req.body.answers.map(a=>a.personB)],months=req.body.relationshipDurationMonths;
 base=row?.content_cipher?S.open(row.content_cipher):await A.generateStructured(process.env.GEMINI_API_KEY,A.makePrompt(answers,months,calculate(selections).c)+'\nСейчас НЕ генерируй metricNarratives: для них будут два отдельных подробных запроса.',A.BASE_SCHEMA,controller.signal);
 A.validateResult(base,A.BASE_SCHEMA);
 if([selections[0][10],selections[1][10]].sort().join(',')==='0,3'){base.metrics.future=Math.min(base.metrics.future,40);base.metrics.values=Math.min(base.metrics.values,65);}
 Object.assign(base,A.calculateIndices(base.metrics,base.textSignals.severity),{analysisVersion:8,relationshipDurationMonths:months});
 if(row)await R.save(row,base,'partial');
 const free=report=>row?R.response({...row,status:report.metricNarratives?'complete':'partial'},report):{...R.freeProjection(report),storageAvailable:false,status:report.metricNarratives?'complete':'partial'};
 if(started)emit('base',free(base));
 const batches=await Promise.all([A.METRIC_KEYS.slice(0,6),A.METRIC_KEYS.slice(6)].map(keys=>A.generateStructured(process.env.GEMINI_API_KEY,A.metricPrompt(answers,keys,base.metrics)+`\nПара вместе примерно ${months} месяцев. Не делай выводы только по стажу.`,{type:'object',properties:Object.fromEntries(keys.map(k=>[k,A.narrative])),required:keys},controller.signal)));
 const report=A.validateResult({...base,metricNarratives:Object.assign({},...batches)});if(row)await R.save(row,report,'complete');
 console.info('PARA analysis complete',{version:8,stored:Boolean(row),generationPasses:3});
 if(started){emit('complete',free(report));return res.end();}return S.json(res,200,free(report));
 }catch(e){if(row)await R.failed(row).catch(()=>{});console.warn('PARA analysis unavailable',{stage:base?'details':'base'});if(started){emit(base?'partial':'error',{error:'Не удалось завершить анализ. Сохранённую часть можно прочитать, а анализ — повторить.'});return res.end();}S.fail(res,e);}
 finally{clearTimeout(timer);controller?.abort();}
};
