'use strict';
const {Q,cats}=PARAQuestionnaire;
const $=s=>document.querySelector(s);
const STORAGE_KEY='para:report:v7';
let S={names:['Человек 1','Человек 2'],dates:['',''],duration:0,durationApprox:true,q:0,p:0,a:[Array(Q.length).fill(null),Array(Q.length).fill(null)],r:null,local:null,ai:null,sel:null,details:'idle',coach:{question:'',answer:'',used:false}};
let analysisRun=0,modalReturnFocus=null,activeMetric=null,observer=null;
function nameForm(name,form){
 if(!form||!/^[А-ЯЁа-яё]+$/.test(name))return name;
 const lower=name.toLowerCase();let stem=name.slice(0,-1),forms;
 if(lower.endsWith("ия"))forms={gen:stem+"и",dat:stem+"и",acc:stem+"ю",ins:stem+"ей",pre:stem+"и"};
 else if(lower.endsWith("я"))forms={gen:stem+"и",dat:stem+"е",acc:stem+"ю",ins:stem+"ей",pre:stem+"е"};
 else if(lower.endsWith("а"))forms={gen:stem+(/[гкхжчшщ]$/i.test(stem)?"и":"ы"),dat:stem+"е",acc:stem+"у",ins:stem+(/[жчшщц]$/i.test(stem)?"ей":"ой"),pre:stem+"е"};
 else if(lower.endsWith("ий")){stem=name.slice(0,-2);forms={gen:stem+"ия",dat:stem+"ию",acc:stem+"ия",ins:stem+"ием",pre:stem+"ии"};}
 else if(lower.endsWith("ей"))forms={gen:stem+"я",dat:stem+"ю",acc:stem+"я",ins:stem+"ем",pre:stem+"е"};
 else if(["александр","максим","артём","артем","иван","роман","михаил","владимир","денис","никита","олег","андрей","дмитрий"].includes(lower))forms={gen:name+"а",dat:name+"у",acc:name+"а",ins:name+"ом",pre:name+"е"};
 return forms?.[form]||name;
}
function personalize(value){
 const input=String(value??"");
 return input.replace(/\[?\bPerson[\s_]*([AB])\b(?::(nom|gen|dat|acc|ins|pre))?\]?/gi,(match,p,explicit,offset)=>{
  let form=explicit?.toLowerCase();const before=input.slice(0,offset).toLowerCase(),after=input.slice(offset+match.length).toLowerCase();
  // A model can accidentally reuse an oblique marker as the subject of a new sentence.
  if(/(?:^|[.!?]\s*|\n\s*)$/.test(before)&&/^\s+(?:(?:чётко|четко|обычно|скорее|также|больше|сильнее)\s+)*(?:смотрит|ценит|хочет|мечтает|предпочитает|нуждается|ищет|стремится|ориентирован|готов|боится|считает|воспринимает|чувствует|выбирает|ждёт|ждет|планирует)(?=[\s,.!?;:]|$)/.test(after))form="nom";
  if(!form){
   if(/(?:^|[\s,;:—(])(?:для|у|от|без|ради|вместо|против|кроме|тревогу|тревога|потребность|потребности|желание|попытки|поведение|поведения|реакция|реакцию|молчание|паузу|пауза|ожидания|границы|свободу|позиция|чувства|слова|ответы|способ)\s+$/.test(before))form="gen";
   else if(/(?:^|[\s,;:—(])(?:к|даст|даёт|дает|позволяет|помогает|поможет)\s+$/.test(before))form="dat";
   else if(/(?:^|[\s,;:—(])(?:с|со)\s+$/.test(before))form="ins";
   else if(/(?:^|[\s,;:—(])(?:о|об)\s+$/.test(before))form="pre";
   else if(/(?:^|[\s,;:—(])(?:заставляет|заставить|понять|понимать|услышать|поддержать|обнять|ранить|любить|уважать)\s+$/.test(before))form="acc";
   else if(/^\s+(?:важна|важны|важен|нужна|нужны|нужен|важно|нужно|хочется|необходимо|страшно|больно|легче|сложнее|тяжело|приятно)(?=[\s,.!?;:]|$)/.test(after))form="dat";
  }
  return nameForm(S.names[p.toUpperCase()==="A"?0:1],form);
 });
}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeAI(value){return escapeHTML(personalize(value));}



function lifePath(date){
 const digits=date.replace(/\D/g,"").split("").map(Number);let n=digits.reduce((a,b)=>a+b,0);
 while(n>9 && ![11,22,33].includes(n)) n=String(n).split("").reduce((a,b)=>a+Number(b),0);
 return n;
}
function zodiac(date){
 const d=new Date(date+"T12:00:00"),m=d.getMonth()+1,day=d.getDate();
 const z=[["Козерог",1,19],["Водолей",2,18],["Рыбы",3,20],["Овен",4,19],["Телец",5,20],["Близнецы",6,20],["Рак",7,22],["Лев",8,22],["Дева",9,22],["Весы",10,22],["Скорпион",11,21],["Стрелец",12,21],["Козерог",12,31]];
 for(const [name,mm,dd] of z){if(m<mm||(m===mm&&day<=dd))return name} return "Козерог";
}
function numerologyCompatibility(a,b){
 const x=lifePath(a),y=lifePath(b);const diff=Math.abs((x>9?x%9:x)-(y>9?y%9:y));
 return Math.max(54,Math.min(96,92-diff*6));
}
function astroCompatibility(a,b){
 const z1=zodiac(a),z2=zodiac(b);
 const groups={
 "Овен":"огонь","Лев":"огонь","Стрелец":"огонь",
 "Телец":"земля","Дева":"земля","Козерог":"земля",
 "Близнецы":"воздух","Весы":"воздух","Водолей":"воздух",
 "Рак":"вода","Скорпион":"вода","Рыбы":"вода"};
 const g1=groups[z1],g2=groups[z2];
 if(g1===g2)return 88;
 const good=[["огонь","воздух"],["земля","вода"]];
 if(good.some(x=>x.includes(g1)&&x.includes(g2)))return 82;
 return 66;
}
function verdict(s){return s>=85?"Очень сильное совпадение":s>=70?"Хорошее совпадение":s>=55?"Есть различия. Есть и общая точка.":s>=40?"Важные темы ждут разговора":"Вы по-разному видите важные вещи";}
function riskText(r){return r<30?"В ответах мало противоречий, которые усиливают друг друга. Ваш ресурс — замечать небольшие различия до того, как они станут обидами.":r<55?"Несколько ожиданий расходятся. Если считать их очевидными и не обсуждать, в этих местах может появляться дистанция.":r<75?"Несколько чувствительных тем накладываются друг на друга. Здесь особенно полезно выяснить, что каждый пытается защитить: близость, доверие или свободу.":"В ответах есть сочетание сильных противоречий. Оно требует внимательного разговора о границах и будущем. Высокий индекс не означает, что расставание обязательно произойдёт.";}
function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400);}
function show(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');window.scrollTo({top:0,behavior:'instant'});}
function excerpt(text,max=260){const str=String(text||'');if(str.length<=max)return str;const end=str.lastIndexOf(' ',max);return str.slice(0,end>0?end:max)+'…';}
function lockedText(text,extra=''){return `<div class="lockedExcerpt ${extra}" aria-hidden="true" inert><div class="blurText">${safeAI(text)}</div></div>`;}
function lockLink(){return '<a href="#paywall" class="premiumLink">🔒 В полном разборе</a>';}
function calc(){return PARAQuestionnaire.calculate(S.a);}
function redactNames(text){let value=String(text??'');const replacements=[];S.names.forEach((name,i)=>{if(name.length<2)return;for(const form of ['', 'gen','dat','acc','ins','pre'])replacements.push([nameForm(name,form),i]);});replacements.sort((a,b)=>b[0].length-a[0].length);for(const [name,i] of replacements){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');value=value.replace(new RegExp('(?<![\\p{L}])'+escaped+'(?![\\p{L}])','giu'),()=>i===0?'Person A':'Person B');}return value;}
function buildAIPayload(){return {questionnaireVersion:7,relationshipDurationMonths:S.duration,answers:Q.map((q,i)=>({id:q.id,personA:q.free?redactNames(S.a[0][i]):S.a[0][i],personB:q.free?redactNames(S.a[1][i]):S.a[1][i]}))};}
function saveReport(){if(!S.r)return;try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify({version:7,savedAt:S.savedAt||(S.savedAt=Date.now()),names:S.names,dates:S.dates,duration:S.duration,durationApprox:S.durationApprox,a:S.a,r:S.r,local:S.local,ai:S.ai,details:S.details,coach:S.coach}));$('#storageNote').textContent='Результат сохранён в этой вкладке на 24 часа и переживёт обновление страницы. Можно удалить его кнопкой ниже.';}catch{$('#storageNote').textContent='Браузер не разрешил сохранить результат. При обновлении он может потеряться.';}}
function restoreReport(){try{const raw=sessionStorage.getItem(STORAGE_KEY);if(!raw)return;const d=JSON.parse(raw);if(d.version!==7||Date.now()-d.savedAt>86400000||!Array.isArray(d.names)||d.names.length!==2||d.names.some(x=>typeof x!=='string'||x.length>24)||!Array.isArray(d.a)||d.a.length!==2||d.a.some(row=>!Array.isArray(row)||row.length!==Q.length||row.some((x,i)=>Q[i].free?typeof x!=='string'||x.length>700:!Number.isInteger(x)||!Q[i].o[x]))||!Number.isInteger(d.duration))throw Error('Invalid saved report');S={...S,...d};S.local=calc();S.r=S.local;if(S.ai)applyAIResult(S.ai);if(S.details==='loading')S.details='partial';S.coach=S.coach||{used:false};renderResult();show('#results');saveReport();}catch{try{sessionStorage.removeItem(STORAGE_KEY);}catch{}}}
function clearReport(){analysisRun++;try{sessionStorage.removeItem(STORAGE_KEY);}catch{}location.reload();}
$('#startBtn').onclick=()=>{
 S.names=[$('#n1').value.trim()||'Человек 1',$('#n2').value.trim()||'Человек 2'];S.dates=[$('#d1').value,$('#d2').value];
 const today=new Date().toISOString().slice(0,10);if(S.dates.some(d=>!d||d>today||Number(d.slice(0,4))<1900))return toast('Проверь даты рождения: нужна дата в прошлом, начиная с 1900 года.');
 const duration=PARAQuestionnaire.durationMonths($('#relationshipStart').value);if(duration===null)return toast('Укажи месяц и год начала отношений — можно примерно.');
 S.duration=duration;S.durationApprox=$('#durationApprox').checked;S.q=0;S.p=0;S.a=[Array(Q.length).fill(null),Array(Q.length).fill(null)];S.coach={question:'',answer:'',used:false};show('#quiz');renderQ();
};
function renderQ(){const q=Q[S.q];S.sel=null;$('#progText').textContent=`Вопрос ${S.q+1} из ${Q.length}`;$('#person').textContent=S.names[S.p];$('#fill').style.width=((S.q*2+S.p)/(Q.length*2)*100)+'%';$('#who').textContent='Отвечает: '+S.names[S.p];$('#qtext').textContent=q.t;$('#qhint').textContent=q.h;$('#handoff').style.display='none';$('#qcard').style.display='';const ch=$('#choices'),fr=$('#free');ch.innerHTML='';fr.value='';if(q.free){ch.style.display='none';fr.style.display='';}else{fr.style.display='none';ch.style.display='grid';q.o.forEach((opt,i)=>{const b=document.createElement('button');b.className='choice';b.textContent=opt[0];b.onclick=()=>{S.sel=i;document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');};ch.appendChild(b);});}}
$('#save').onclick=()=>{const q=Q[S.q];let val;if(q.free){val=$('#free').value.trim();if(val.length<12)return toast('Напиши хотя бы одно предложение — от 12 символов.');}else{if(S.sel===null)return toast('Выбери один вариант.');val=S.sel;}S.a[S.p][S.q]=val;$('#free').blur();$('#free').value='';$('#choices').innerHTML='';$('#qcard').style.display='none';$('#handoff').style.display='';if(S.p===0){$('#handoffTitle').textContent=`Теперь отвечает ${S.names[1]}`;$('#handoffText').textContent='Предыдущий ответ скрыт. Передайте телефон друг другу.';}else if(S.q<Q.length-1){$('#handoffTitle').textContent=`Вопрос ${S.q+1} завершён`;$('#handoffText').textContent=`Оба ответа сохранены. ${S.names[0]}, переходим к следующему вопросу.`;}else{$('#handoffTitle').textContent='Ваша история начинается';$('#handoffText').textContent='Gemini сопоставит ответы по смыслу. Имена и даты рождения останутся здесь.';}};
$('#next').onclick=()=>{if(S.p===0){S.p=1;renderQ();}else if(S.q<Q.length-1){S.p=0;S.q++;renderQ();}else startAIAnalysis();};
function applyAIResult(ai){S.ai=ai;const local=S.local||calc();S.r={qScores:local.qScores,c:{...local.c,...ai.metrics},overall:ai.overallCompatibility,risk:ai.breakupRiskIndex};}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function startAIAnalysis(){const run=++analysisRun;S.savedAt=Date.now();S.local=calc();S.r=S.local;S.ai=null;S.details='loading';S.coach={question:'',answer:'',used:false};show('#analysis');$('#skipCouncil').hidden=true;$('#aiStatusText').textContent='Сначала соберём вашу общую историю. Глубокие главы появятся следом.';$('.council').innerHTML='<div class="waitingOrb" aria-hidden="true">✧</div><p class="waitingCopy">Не ищем одинаковые слова.<br>Ищем, что за ними стоит.</p>';$('#pulse').style.width='20%';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),172000);let councilStarted=false,complete=false;
 const receive=packet=>{if(run!==analysisRun)return;if(packet.event==='base'||packet.event==='complete'){applyAIResult(packet.data);S.details=packet.event==='complete'?'complete':'loading';complete=packet.event==='complete';saveReport();if(!councilStarted){councilStarted=true;prepareAnalysis(run);}else if($('#results').classList.contains('active'))refreshDetails();}else if(packet.event==='partial'){S.details='partial';saveReport();if($('#results').classList.contains('active'))refreshDetails();}};
 try{const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...buildAIPayload(),stream:true}),signal:controller.signal});if(!response.ok)throw Error('Analysis unavailable');
 if(response.headers.get('content-type')?.includes('application/x-ndjson')){const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(line.trim())receive(JSON.parse(line));}}buffer+=decoder.decode();if(buffer.trim())receive(JSON.parse(buffer));}else receive({event:'complete',data:await response.json()});
 if(!councilStarted)throw Error('Missing base');if(!complete&&S.details==='loading'){S.details='partial';saveReport();if($('#results').classList.contains('active'))refreshDetails();}
 }catch{if(run!==analysisRun)return;if(S.ai){S.details='partial';saveReport();if($('#results').classList.contains('active'))refreshDetails();}else{S.details='fallback';S.r=S.local;saveReport();prepareAnalysis(run);}}
 finally{clearTimeout(timer);}
}
async function prepareAnalysis(run){$('#aiStatusText').textContent=S.ai?'Общая история готова. Подробные главы дописываются.':'Gemini недоступен. Покажем ориентиры по вариантам.';$('.council').innerHTML='';$('#skipCouncil').hidden=false;let finished=false;
 const finish=()=>{if(run!==analysisRun||finished)return;finished=true;renderResult();show('#results');saveReport();};$('#skipCouncil').onclick=finish;
 const lines=S.ai?.council||[{speaker:'ChatGPT',text:'🧪 Сейчас доступны только сигналы из вариантов ответа.'},{speaker:'Grok',text:'Читать мысли по кнопкам не будем. Текстам нужен смысловой анализ.'},{speaker:'Gemini',text:'✨ Сохраните результат и попробуйте позже. Анкета уже у вас.'},{speaker:'PARA',text:'Резервный разбор — повод начать разговор, а не вывод о всей вашей истории.'}];
 const icons={ChatGPT:'🧪',Grok:'⚡',Gemini:'✨',PARA:'♡'};for(const line of lines){if(run!==analysisRun||finished)return;const speaker=icons[line.speaker]?line.speaker:'PARA',msg=document.createElement('div');msg.className='msg show';msg.innerHTML=`<div class="avatar">${icons[speaker]}</div><div class="bubble"><div class="name">${speaker}</div><div class="councilText"><span class="typingDots"><i></i><i></i><i></i></span></div></div>`;$('.council').appendChild(msg);msg.scrollIntoView({block:'nearest',behavior:'smooth'});await pause(450);if(run!==analysisRun||finished)return;msg.querySelector('.councilText').textContent=personalize(line.text);await pause(Math.max(1100,Math.round(12500/lines.length)-450));}finish();}
const PROFILE_LABELS={needs:'Что нужно от любви',fears:'Чего боится',affection:'Как проявляет чувства',loyalty:'Что значит верность',conflict:'Что происходит в ссоре',money:'Как смотрит на деньги',closeness:'Сколько нужно близости',freedom:'Где нужна свобода',hurt:'Что ранит сильнее всего',misread:'Что можно понять неправильно'};
function fallbackProfile(person){const keys=['pause','receive_care','give_care','family_plans'];return keys.map(id=>{const i=Q.findIndex(q=>q.id===id);return Q[i].o[S.a[person][i]][0];}).join('. ')+'. Это ориентиры по вариантам. Свободные ответы не оценены.';}
function renderResult(){const ai=S.ai,r=S.r,entries=Object.entries(r.c).filter(x=>x[1]!=null).sort((a,b)=>a[1]-b[1]),strong=entries.at(-1),weak=entries[0];
 $('#pairNames').textContent=S.names.join(' + ');$('#coupleType').textContent=personalize(ai?.archetype?.title||'Два взгляда на одну историю');$('#story').dataset.archetype=ai?.archetype?.code||'bridge';$('#score').textContent=r.overall;$('#verdict').textContent=verdict(r.overall);$('#sub').textContent=`Вместе ${S.durationApprox?'примерно ':''}${S.duration} мес. · Ваша опора — ${cats[strong[0]].toLowerCase()}.`;
 $('#resultSource').textContent=ai?'Смысловой анализ Gemini · 18 вопросов · две точки зрения':'Резервный результат · 15 ситуаций · свободные ответы не оценены';$('#portraitBadge').textContent=ai?'ВАШ АРХЕТИП PARA · МЕТАФОРА, НЕ ДИАГНОЗ':'ТОЛЬКО ВАРИАНТЫ ОТВЕТОВ';$('#coupleSummary').textContent=personalize(ai?.archetype?.description||`Сейчас Gemini недоступен. По вариантам ближе всего ожидания в теме «${cats[strong[0]]}». Обсудить стоит «${cats[weak[0]]}». Смысл трёх свободных ответов мы не подменяем совпадением слов.`);
 $('#superpower').innerHTML=ai?`<span class="chapterLabel">ВАША СУПЕРСИЛА</span><span class="powerGlyph" aria-hidden="true">✦</span><h2>${safeAI(ai.superpower.title)}</h2><p>${safeAI(ai.superpower.text)}</p>`:'';$('#superpower').hidden=!ai;
 $('#highlights').innerHTML=ai?[["💚","Что у вас получается",ai.archetype.strength],["⚡","Где нужна бережность",ai.archetype.weakness],["♡","Что вас соединяет",ai.archetype.bond],["↗","Ваш зелёный флаг",ai.highlights.greenFlag]].map(([icon,title,text])=>`<article class="insight"><span class="insightIcon">${icon}</span><h3>${title}</h3><p>${safeAI(text)}</p></article>`).join(''):'';
 $('#peoplePortraits').innerHTML=S.names.map((name,i)=>`<article class="personPortrait"><div class="personMonogram">${escapeHTML([...name][0])}</div><span class="chapterLabel">ПОРТРЕТ ${i+1}</span><h3>${escapeHTML(name)}</h3><p class="profileIntro">${safeAI(excerpt(ai?.[i===0?'personAProfile':'personBProfile']||fallbackProfile(i),360))}</p>${ai?`<p class="needQuote">${safeAI(ai.profiles[i===0?'personA':'personB'].needs)}</p><a class="premiumLink" href="#deepReport">Ещё 9 сторон этого человека ↓</a>`:''}</article>`).join('');
 $('#misunderstandings').innerHTML=ai?`<span class="chapterLabel">МЕЖДУ НАМЕРЕНИЕМ И РЕАКЦИЕЙ</span><h2>Одно действие.<br><span class="grad">Два прочтения.</span></h2><div class="misreadGrid">${['personA','personB'].map((key,i)=>{const m=ai.misunderstandings[key];return `<article class="misreadCard"><span class="chapterLabel">${escapeHTML(S.names[i])} → ${escapeHTML(S.names[1-i])}</span><h3>Что легко понять иначе</h3><p>${safeAI(excerpt(m.behavior,230))}</p>${lockedText(m.interpretation+'\n\n'+m.meaning+'\n\n'+m.consequence)}${lockLink()}</article>`;}).join('')}</div>`:'';
 $('#cycle').innerHTML=ai?`<span class="chapterLabel">ВАШ ВОЗМОЖНЫЙ ПОВТОРЯЮЩИЙСЯ ЦИКЛ</span><h2>${safeAI(ai.cycle.title)}</h2><p class="chapterIntro">${safeAI(ai.cycle.caveat)}</p><ol class="cycleSteps">${ai.cycle.steps.map((step,i)=>`<li><span class="stepNumber">0${i+1}</span><div>${i===0?`<p>${safeAI(step)}</p>`:lockedText(step,'cycleBlur')}</div></li>`).join('')}</ol><div class="cycleExit"><h3>Как выйти из этого круга</h3>${lockedText(ai.cycle.breakSteps.join('\n\n'))}${lockLink()}</div>`:'';
 $('#riskZone').innerHTML=ai?`<div class="riskQuote"><span class="chapterLabel">ВАША ЗОНА РИСКА</span><h2>${safeAI(ai.riskZone.title)}</h2><p>${safeAI(excerpt(ai.riskZone.text,190))}</p>${lockedText(ai.riskZone.text)}${lockLink()}</div>`:'';
 $('#metrics').innerHTML=Object.entries(r.c).map(([key,value],i)=>`<button class="metric" data-metric="${key}" aria-label="Подробнее: ${cats[key]} ${value}%"><div class="metricIndex">${String(i+1).padStart(2,'0')} <span>↗</span></div><span class="mname">${cats[key]}</span><span class="mval">${value}<small>%</small></span><div class="mbar"><div class="mfill" style="width:${Math.max(0,Math.min(100,value))}%"></div></div><p class="metricCaption">${scoreMeaning(value)}</p></button>`).join('');$('#metrics').querySelectorAll('.metric').forEach(el=>el.onclick=()=>openMetric(el.dataset.metric));
 $('#risk').textContent=r.risk;$('#riskFill').style.width=r.risk+'%';$('#riskText').textContent=ai?'Цифра — начало разговора. Её причины важнее самой оценки.':'Предварительный индекс по вариантам: тексты не учтены.';
 const critical=['trust','honesty','communication','boundaries','future','risk'].sort((a,b)=>r.c[a]-r.c[b]);$('#riskZones').innerHTML=`<span>Первая тема для внимания: <b>${cats[critical[0]]}</b></span>${ai?'<span>🔒 Ещё две темы — в полном разборе</span>':''}`;$('#riskMethod').textContent='Индекс учитывает сочетание чувствительных зон. Он не измеряет любовь и не определяет будущее.';
 $('#lockedRiskTitle').textContent=`Что стоит за вашими ${r.risk}%?`;
 const lp1=lifePath(S.dates[0]),lp2=lifePath(S.dates[1]);$('#mystic').innerHTML=S.names.map((name,i)=>`<div class="mysticCard"><small>${escapeHTML(name)}</small><div class="big">${zodiac(S.dates[i])}</div><small>Число жизненного пути ${lifePath(S.dates[i])}</small></div>`).join('')+`<div class="mysticCard"><small>Астросовпадение</small><div class="big">${astroCompatibility(...S.dates)}%</div><small>Игровая шкала</small></div><div class="mysticCard"><small>Нумеросовпадение</small><div class="big">${numerologyCompatibility(...S.dates)}%</div><small>Игровая шкала</small></div>`;
 const relationship=(lp1+lp2-1)%9+1;$('#symbolStory').innerHTML=`<span aria-hidden="true">✧</span><div><small>СИМВОЛИЧЕСКОЕ ЧИСЛО ВАШЕЙ ПАРЫ</small><h3>${relationship}</h3><p>Красивый образ для вашей истории. Не участвует в AI-анализе и индексе риска.</p></div>`;
 $('#paymentNotice').hidden=true;refreshDetails();if(observer)observer.disconnect();observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.add('arrived');observer.unobserve(item.target);}}),{threshold:.03});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
function scoreMeaning(v){return v>=85?'Очень сильное совпадение':v>=70?'Хорошее совпадение':v>=55?'Нормальные заметные различия':v>=40?'Серьёзная тема для разговора':'Сильное противоречие в ответах';}
function premiumSections(){const ai=S.ai;if(!ai)return [];const p=ai.premium;return [
 ['Вся динамика вашей пары',ai.coupleSummary],
 ...S.names.map((name,i)=>['Глубокий портрет: '+name,Object.entries(ai.profiles[i===0?'personA':'personB']).filter(([k])=>k!=='needs').map(([key,value])=>PROFILE_LABELS[key]+'\n'+value).join('\n\n')]),
 ['Что '+S.names[0]+' может не проговаривать',p.unspokenA],['Что '+S.names[1]+' может не проговаривать',p.unspokenB],
 ['Какое ожидание кажется очевидным: '+S.names[0],p.obviousA],['Какое ожидание кажется очевидным: '+S.names[1],p.obviousB],
 ['Что каждый боится потерять',p.fearA+'\n\n'+p.fearB],['Кто может первым отдалиться',p.whoWithdraws],
 ['Главный триггер возможного отдаления',p.mainTrigger],['Возможный сценарий расставания',p.breakupScenario],
 ['Почему индекс риска — '+S.r.risk+'%',ai.textSignals.explanation+'\n\n'+ai.highlights.breakingPoint],
 ['Что говорят ваши свободные ответы',ai.textSignals.future+'\n\n'+ai.textSignals.hurt+'\n\n'+ai.textSignals.separation],
 ['Ваш сценарий разговора',p.conversationPlan],['Семь дней для вашей пары',p.sevenDayPlan]
 ];}
function refreshDetails(){const sections=premiumSections();$('#premiumPreview').innerHTML=sections.map(([title,text],i)=>`<article class="premiumChapter ${i===sections.length-1?'sevenDays':''}"><div class="premiumChapterHead"><span>${String(i+1).padStart(2,'0')} / PARA DEEP</span><span>🔒</span></div><h3>${escapeHTML(title)}</h3>${lockedText(text)}${lockLink()}</article>`).join('');
 const metricCount=Object.keys(S.ai?.metricNarratives||{}).length;$('#deepCount').textContent=S.ai?`${sections.length} глубоких глав${metricCount?' и '+metricCount+' подробных тем':''} уже написаны для вашей пары. Ниже видны их начала и объём — полные тексты закрыты.`:'Глубокие главы появятся после успешного смыслового анализа. Резервные тексты не выдаём за персональный premium.';
 $('#detailStatus').textContent=S.details==='loading'?'Ваша основная история готова. Gemini дописывает 12 подробных тем — можно читать дальше.':S.details==='partial'?'Основная история сохранена. Подробные метрики не загрузились полностью; можно повторить анализ.':S.details==='fallback'?'Gemini недоступен. Три свободных ответа пока не оценены.':'Готово: основная история и 12 подробных тем.';
 $('#retryAnalysis').hidden=!['partial','fallback'].includes(S.details);if(activeMetric)fillMetric(activeMetric);renderCoach();saveReport();}
function fillMetric(key){const v=S.r.c[key],n=S.ai?.metricNarratives?.[key];$('#metricTitle').textContent=cats[key];$('#metricScore').textContent=v+'%';$('#metricModalFill').style.width=v+'%';$('#metricDesc').textContent=n?personalize(excerpt(n.together,220)):S.details==='loading'?'Подробный разбор этой темы ещё готовится.':scoreMeaning(v)+'. Это ориентир по ответам.';
 const rows=n?[[S.names[0]+' — как устроена эта тема',n.personA],[S.names[1]+' — как устроена эта тема',n.personB],['Что происходит между вами',n.together],['Почему получилось '+v+'%',n.meaning],['Что здесь хорошо',n.good],['Где может возникнуть проблема',n.tension],['Что можно сделать',n.action]]:[];
 $('#metricExplain').innerHTML=rows.map(([title,text])=>`<div class="explainRow"><b>${escapeHTML(title)}</b>${lockedText(text)}</div>`).join('');$('#metricPremium').hidden=!n;}
function openMetric(key){if(!cats[key])return;activeMetric=key;modalReturnFocus=document.activeElement;fillMetric(key);$('#metricModal').classList.add('open');$('#metricModal').setAttribute('aria-hidden','false');document.querySelector('main').inert=true;document.body.style.overflow='hidden';$('.metricSheet').scrollTop=0;$('#metricClose').focus();}
function closeMetric(){activeMetric=null;$('#metricModal').classList.remove('open');$('#metricModal').setAttribute('aria-hidden','true');document.querySelector('main').inert=false;document.body.style.overflow='';modalReturnFocus?.focus();}
function renderCoach(){const c=S.coach;$('#coachMessages').innerHTML=(c.question?`<div class="coachMessage user"><span>Твой вопрос</span><p>${escapeHTML(c.question)}</p></div>`:'')+(c.answer?`<div class="coachMessage para"><span>✦ PARA</span><p>${safeAI(c.answer)}</p></div>`:'');$('#coachLock').hidden=!c.used;$('#coachSend').textContent=c.used?'Продолжить разговор · Premium $1.99':'Задать бесплатный вопрос';$('#coachSend').disabled=!S.ai?.coachPass||S.details!=='complete';$('#coachStatus').textContent=c.used?'Бесплатный вопрос использован.':S.ai?.coachPass?'Один персональный ответ бесплатно.':'Coach станет доступен, когда закончится полный смысловой анализ.';}
$('#coachForm').onsubmit=async e=>{e.preventDefault();if(S.coach.used){$('#paywall').scrollIntoView({behavior:'smooth'});return;}const question=$('#coachQuestion').value.trim();if(question.length<8)return toast('Напиши вопрос чуть подробнее — от 8 символов.');if(!S.ai?.coachPass)return;const run=analysisRun;$('#coachSend').disabled=true;$('#coachStatus').textContent='PARA читает вопрос в контексте вашей пары…';const {coachPass,...report}=S.ai;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
 try{const response=await fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...buildAIPayload(),question:redactNames(question),report,coachPass}),signal:controller.signal});const data=await response.json();if(run!==analysisRun)return;if(!response.ok){if(response.status===402){S.coach.used=true;saveReport();renderCoach();}throw Error(data.error||'Не удалось получить ответ.');}S.coach={question,answer:data.answer,used:true};$('#coachQuestion').value='';renderCoach();saveReport();$('#coachMessages').scrollIntoView({block:'start',behavior:'smooth'});}catch(error){if(run===analysisRun)$('#coachStatus').textContent=error.name==='AbortError'?'Ответ задержался. Попробуй ещё раз с тем же вопросом.':error.message;}finally{clearTimeout(timer);if(run===analysisRun)$('#coachSend').disabled=false;}};
$('#pay').onclick=()=>{$('#paymentNotice').hidden=false;$('#paymentNotice').scrollIntoView({block:'nearest',behavior:'smooth'});};$('#metricClose').onclick=closeMetric;$('#metricPremium').onclick=()=>{closeMetric();$('#paywall').scrollIntoView({behavior:'smooth'});};$('#metricModal').onclick=e=>{if(e.target===$('#metricModal'))closeMetric();};
document.addEventListener('keydown',e=>{if(!$('#metricModal').classList.contains('open'))return;if(e.key==='Escape')closeMetric();if(e.key==='Tab'){const targets=[$('#metricClose'),$('#metricPremium')].filter(el=>!el.hidden),index=targets.indexOf(document.activeElement);e.preventDefault();targets[(index+(e.shiftKey?-1:1)+targets.length)%targets.length].focus();}});
['#d1','#d2'].forEach(id=>{$(id).max=new Date().toISOString().slice(0,10);$(id).min='1900-01-01';});$('#relationshipStart').max=new Date().toISOString().slice(0,7);$('#relationshipStart').min='1900-01';$('#restart').onclick=clearReport;$('#retryAnalysis').onclick=startAIAnalysis;
$('#copy').onclick=async()=>{const text=`PARA AI\n${S.names.join(' + ')}\nСовместимость: ${S.r.overall}%\nРиск расставания: ${S.r.risk}%\nИндекс по ответам, не прогноз будущего.`;try{await navigator.clipboard.writeText(text);toast('Скопировано');}catch{toast('Не удалось скопировать');}};
restoreReport();
