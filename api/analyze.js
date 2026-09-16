const A=require('../lib/analysis');
const access=require('../lib/access');
const {calculate}=require('../questionnaire');
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 const fail=(code,message)=>{res.statusCode=code;return res.end(JSON.stringify({error:message}));};
 if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(405,'Method not allowed');}
 let answers;try{answers=A.validatePayload(req.body);}catch{return fail(400,'Заполните все 18 вопросов и начало отношений. Обновите страницу, если тест старой версии.');}
 const apiKey=process.env.GEMINI_API_KEY;if(!apiKey)return fail(503,'Смысловой анализ временно недоступен.');
 if(!access.allow(req,'analyze',6,10*60*1000))return fail(429,'Слишком много разборов подряд. Попробуйте через несколько минут.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),165000);let started=false,base;
 const emit=(event,data)=>res.write(JSON.stringify({event,data})+'\n');
 const months=req.body.relationshipDurationMonths;
 try{
  const selections=[req.body.answers.map(a=>a.personA),req.body.answers.map(a=>a.personB)];const baseline=calculate(selections).c;
  base=await A.generateStructured(apiKey,A.makePrompt(answers,months,baseline)+'\nСейчас НЕ генерируй metricNarratives: для них будут два отдельных подробных запроса.',A.BASE_SCHEMA,controller.signal);
  A.validateResult(base,A.BASE_SCHEMA);
  Object.assign(base,A.calculateIndices(base.metrics,base.textSignals.severity),{analysisVersion:7});
  if(req.body.stream===true){res.setHeader('Content-Type','application/x-ndjson; charset=utf-8');res.setHeader('X-Accel-Buffering','no');started=true;emit('base',base);}
  const batches=await Promise.all([A.METRIC_KEYS.slice(0,6),A.METRIC_KEYS.slice(6)].map(keys=>A.generateStructured(apiKey,A.metricPrompt(answers,keys,base.metrics)+`\nПара вместе примерно ${months} месяцев. Не делай выводы только по стажу.`,{type:'object',properties:Object.fromEntries(keys.map(k=>[k,A.narrative])),required:keys},controller.signal)));
  const report=A.validateResult({...base,metricNarratives:Object.assign({},...batches)});
  const context={answers,relationshipDurationMonths:months,report};
  const result={...report,coachPass:access.issue(context)};
  console.info('PARA analysis complete',{version:7,metrics:12,generationPasses:3,stream:started});
  if(started){emit('complete',result);return res.end();}return res.end(JSON.stringify(result));
 }catch(error){
  console.warn('PARA analysis unavailable',{stage:base?'details':'base',reason:error?.name==='AbortError'?'timeout':'invalid_response'});
  if(started){emit('partial',{error:'Основной разбор готов, подробные главы сейчас недоступны. Можно повторить анализ позже.'});return res.end();}
  return fail(503,'Не удалось завершить анализ. Доступен резервный результат.');
 }finally{clearTimeout(timeout);controller.abort();}
};
