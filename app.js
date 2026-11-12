(function(){
"use strict";
var VAPID_PUBLIC="BCL9kLoKGl43fB798Ozk4FTjNwr1KaqARF_nr1_976bkXFPlTCd3eIvskwQOVTb7ElFHamDDHnLPzAVorEreZEg";
var DAYS=["D","L","M","M","J","V","S"];
var DAYNAMES=["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
var culture={days:[]}, cgFilter="Tout", cgDayIdx=0;
var routine={limits:{tiktok:30},tasks:[],deadlines:[]}, qcms=[], carnet=null, vocab={start:"2026-11-13",perDay:2,words:[]};
var today=new Date(), todayKey=key(today), firstPaint=true, wasFull=false;

/* ---------- Données sur le téléphone ---------- */
function lsGet(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var days=lsGet("caphec.days",{}), scores=lsGet("caphec.scores",{});
function dayDoc(k){if(!days[k])days[k]={done:{},tiktok:null};return days[k]}
function saveDays(){lsSet("caphec.days",days)}

function key(d){var m=d.getMonth()+1,dd=d.getDate();return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(dd<10?"0":"")+dd}
function parseKey(k){return new Date(k+"T12:00:00")}
function el(t,a,k){var e=document.createElement(t);if(a)for(var x in a){if(x==="text")e.textContent=a[x];else if(x==="cls")e.className=a[x];else e.setAttribute(x,a[x])}(k||[]).forEach(function(c){if(c!=null&&c!==false)e.appendChild(typeof c==="string"?document.createTextNode(c):c)});return e}
function $(id){return document.getElementById(id)}
function tasksFor(d){var wd=d.getDay();return (routine.tasks||[]).filter(function(t){return (t.days||[]).indexOf(wd)>=0})}
function coreIds(d){return tasksFor(d).filter(function(t){return!t.optional}).map(function(t){return t.id})}
function showStatus(m){var s=$("status");s.hidden=!m;if(m)s.textContent=m}

/* ---------- Onglets ---------- */
var views=["jour","toeic","culture","semaine","objectifs"];
function setView(v){views.forEach(function(x){$("v-"+x).hidden=x!==v;$("tab-"+x).setAttribute("aria-selected",x===v?"true":"false")});lsSet("caphec.view",v);window.scrollTo(0,0)}
document.querySelectorAll(".tabs button").forEach(function(b){b.addEventListener("click",function(){setView(b.dataset.v)})});
var hv=(location.hash||"").slice(1);setView(views.indexOf(hv)>=0?hv:"jour");

/* ---------- Vocabulaire ---------- */
function dayIndex(d){return Math.floor((parseKey(key(d))-parseKey(vocab.start))/864e5)}
function wordsUpTo(d){var n=(dayIndex(d)+1)*(vocab.perDay||2);return n<=0?[]:vocab.words.slice(0,Math.min(n,vocab.words.length))}
function wordsOfDay(d){var i=dayIndex(d),p=vocab.perDay||2;if(i<0)return[];return vocab.words.slice(i*p,i*p+p)}
function monday(d){var x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function wordsThisWeek(){var m=monday(today),out=[];for(var i=0;i<7;i++){var d=new Date(m);d.setDate(m.getDate()+i);if(key(d)>key(today))break;out=out.concat(wordsOfDay(d))}return out}
function flipCard(w){
  var b=el("button",{cls:"flip",type:"button","aria-label":w.en+" : touche pour voir la traduction"},[el("div",{cls:"inner"},[
    el("div",{cls:"face front"},[el("div",{cls:"w",text:w.en}),el("div",{cls:"hint",text:"Que veut dire ce mot ?"})]),
    el("div",{cls:"face back"},[el("div",{cls:"fr",text:w.fr}),el("div",{cls:"ex",text:w.ex})])])]);
  b.addEventListener("click",function(){b.classList.toggle("on")});
  return b;
}
function renderWords(){
  var t=$("todayWords");t.innerHTML="";
  var tw=wordsOfDay(today);
  if(!tw.length){t.appendChild(el("div",{cls:"empty",style:"grid-column:1/-1",text:"Tes mots arrivent demain matin."}))}
  tw.forEach(function(w){t.appendChild(flipCard(w))});
  var all=wordsUpTo(today),a=$("allWords");a.innerHTML="";
  $("vocabCount").textContent=all.length+" mots";
  all.slice().reverse().forEach(function(w){a.appendChild(flipCard(w))});
  var wk=wordsThisWeek(),wd=today.getDay(),k="vt-"+key(monday(today)),s=scores[k];
  $("vtMeta").textContent=wk.length+" mots appris depuis lundi"+(s?". Dernier score : "+s.last+"/"+s.attempts[s.attempts.length-1].total:"");
  var tag=$("vtTag");
  if(wd===6||wd===0){tag.className="tag go";tag.textContent="À faire ce week-end"}else{tag.className="tag";tag.textContent="Prévu samedi et dimanche"}
  $("vtStart").disabled=wk.length<2;
}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function buildVocabTest(){
  var wk=wordsThisWeek(),pool=wordsUpTo(today);if(pool.length<4)pool=vocab.words.slice(0,8);
  return shuffle(wk).map(function(w,i){
    var toFr=i%2===0,others=shuffle(pool.filter(function(x){return x.en!==w.en})).slice(0,3);
    var opts=shuffle([w].concat(others));
    return {prompt:toFr?"Que veut dire « "+w.en+" » ?":"Comment dit-on « "+w.fr+" » en anglais ?",options:opts.map(function(o){return toFr?o.fr:o.en}),answer:opts.indexOf(w),explanation:w.en+" = "+w.fr+". "+w.ex};
  });
}
$("vtStart").addEventListener("click",function(){setView("toeic");startQuiz({id:"vt-"+key(monday(today)),title:"Test de vocabulaire de la semaine",questions:buildVocabTest()})});

/* ---------- Aujourd'hui ---------- */
function renderDay(){
  today=new Date();todayKey=key(today);
  var doc=dayDoc(todayKey),list=tasksFor(today);
  $("dayTitle").textContent=DAYNAMES[today.getDay()]+" "+today.getDate()+" "+today.toLocaleDateString("fr-FR",{month:"long"});
  var core=coreIds(today),n=core.filter(function(id){return doc.done[id]}).length,pct=core.length?Math.round(100*n/core.length):0;
  var sp=list.filter(function(t){return t.id.indexOf("sport")===0})[0];
  var next=list.filter(function(t){return!t.optional&&!doc.done[t.id]})[0];
  $("daySub").textContent=n+" sur "+core.length+" faits. "+(pct===100?"Journée validée, bravo.":(next?"Prochaine étape : "+next.t+".":""))+(sp?"":" Pas de salle aujourd'hui.");
  var off=408*(1-pct/100);
  var fill=$("gaugeFill");
  if(firstPaint){requestAnimationFrame(function(){requestAnimationFrame(function(){fill.style.strokeDashoffset=off})});firstPaint=false}else fill.style.strokeDashoffset=off;
  countUp($("pct"),pct);
  $("gauge").classList.toggle("full",pct===100);
  if(pct===100&&!wasFull&&!firstLoad)confetti();
  wasFull=pct===100;
  var host=$("groups");host.innerHTML="";
  var groups={},order=["Matin","Journée","Soir"];
  list.forEach(function(t){(groups[t.moment]=groups[t.moment]||[]).push(t)});
  if(!list.length)host.appendChild(el("div",{cls:"empty",text:"Ta routine se charge…"}));
  order.forEach(function(m){
    if(!groups[m])return;
    var c=el("div",{cls:"moment"},[el("div",{cls:"moment-h"},[el("h3",{text:m}),el("span",{cls:"count num",text:groups[m].filter(function(t){return doc.done[t.id]}).length+"/"+groups[m].length})])]);
    groups[m].forEach(function(t){
      var det=(t.detail&&t.detail[String(today.getDay())])||t.d;
      var cb=el("input",{type:"checkbox",id:"c-"+t.id});cb.checked=!!doc.done[t.id];
      var row=el("label",{cls:"task"+(doc.done[t.id]?" done":""),"for":"c-"+t.id},[cb,el("span",{cls:"tick"},[svgCheck()]),el("div",{},[el("div",{cls:"t"},[t.t,t.optional?el("span",{cls:"bonus",text:"bonus"}):null]),det?el("div",{cls:"d",text:det}):null])]);
      cb.addEventListener("change",function(){doc.done[t.id]=cb.checked;saveDays();row.classList.add("pop");setTimeout(function(){renderDay();renderWeek()},180)});
      c.appendChild(row);
    });
    host.appendChild(c);
  });
  var tk=$("tiktokMin");if(document.activeElement!==tk)tk.value=doc.tiktok==null?"":doc.tiktok;
  var lim=(routine.limits&&routine.limits.tiktok)||30,tg=$("tkTag");
  if(doc.tiktok==null){tg.className="tag";tg.textContent="Limite "+lim+" min"}
  else if(doc.tiktok<=lim){tg.className="tag ok";tg.textContent="Dans la limite"}
  else{tg.className="tag bad";tg.textContent=(doc.tiktok-lim)+" min de trop"}
  renderStreak();
}
var firstLoad=true;
function svgCheck(){var s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 24 24");s.setAttribute("fill","none");s.setAttribute("stroke","currentColor");s.setAttribute("stroke-width","3.5");s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");var p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d","M5 12.5l4.5 4.5L19 7.5");s.appendChild(p);return s}
var cuTimer=null;
function countUp(node,to){var from=+node.textContent||0;if(from===to){node.textContent=to;return}var t0=null;cancelAnimationFrame(cuTimer);function step(ts){if(!t0)t0=ts;var p=Math.min(1,(ts-t0)/900);node.textContent=Math.round(from+(to-from)*(1-Math.pow(1-p,3)));if(p<1)cuTimer=requestAnimationFrame(step)}cuTimer=requestAnimationFrame(step)}
var tkTimer=null;
$("tiktokMin").addEventListener("input",function(){var v=this.value;clearTimeout(tkTimer);tkTimer=setTimeout(function(){dayDoc(todayKey).tiktok=v===""?null:Math.max(0,Math.round(+v));saveDays();renderDay();renderWeek()},600)});
function dayPct(k,d){var doc=days[k],core=coreIds(d);if(!doc||!core.length)return null;return Math.round(100*core.filter(function(id){return doc.done&&doc.done[id]}).length/core.length)}
function renderStreak(){var s=0,d=new Date(today);if((dayPct(todayKey,d)||0)>=80)s=1;d.setDate(d.getDate()-1);for(var i=0;i<365;i++){var p=dayPct(key(d),d);if(p!=null&&p>=80){s++;d.setDate(d.getDate()-1)}else break}$("streak").textContent=s+(s>1?" jours d'affilée":" jour")+" à 80 % ou plus"}

/* Confettis (seulement quand la journée passe à 100 %) */
function confetti(){
  if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  var c=$("confetti"),x=c.getContext("2d");c.hidden=false;c.width=innerWidth*devicePixelRatio;c.height=innerHeight*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);
  var cs=getComputedStyle(document.documentElement),cols=[cs.getPropertyValue("--gold"),cs.getPropertyValue("--mint"),"#ffffff",cs.getPropertyValue("--navy")];
  var P=[];for(var i=0;i<120;i++)P.push({x:innerWidth/2,y:innerHeight*0.25,vx:(Math.random()-.5)*12,vy:-Math.random()*11-3,r:Math.random()*6+3,c:cols[i%4],a:Math.random()*6});
  var t=0;(function f(){x.clearRect(0,0,innerWidth,innerHeight);P.forEach(function(p){p.vy+=.35;p.x+=p.vx;p.y+=p.vy;p.a+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);x.restore()});if(++t<110)requestAnimationFrame(f);else{x.clearRect(0,0,innerWidth,innerHeight);c.hidden=true}})();
}

/* ---------- Semaine ---------- */
function weekData(){
  var m=monday(today),r={sport:0,cardio:0,rev:0,ben:0,tk:[],qcm:0,pr:0,days:[]};
  for(var i=0;i<7;i++){var d=new Date(m);d.setDate(m.getDate()+i);var k=key(d),doc=days[k];r.days.push({d:d,k:k,p:dayPct(k,d)});
    if(doc&&doc.done){if(doc.done.sport||doc.done.sport_lower)r.sport++;if(doc.done.cardio)r.cardio++;if(doc.done.revisions)r.rev+=1.5;if(doc.done.benevolat)r.ben++;if(doc.done.qcm_matin)r.qcm++;if(doc.done.qcm_aprem)r.qcm++}
    if(doc&&doc.prayers){for(var pk in doc.prayers)if(doc.prayers[pk])r.pr++}
    if(doc&&doc.tiktok!=null)r.tk.push(doc.tiktok)}
  r.start=m;return r;
}
function renderWeek(){
  var w=weekData(),g=$("weekGrid");g.innerHTML="";
  var e=new Date(w.start);e.setDate(e.getDate()+6);
  $("weekRange").textContent="du "+w.start.getDate()+"/"+(w.start.getMonth()+1)+" au "+e.getDate()+"/"+(e.getMonth()+1);
  w.days.forEach(function(x){g.appendChild(el("div",{cls:"wd"+(x.k===todayKey?" today":"")},[el("b",{text:DAYS[x.d.getDay()]}),el("div",{cls:"col"},[el("i",{style:"height:"+(x.p||0)+"%"})]),el("span",{cls:"num",text:x.p==null?"–":x.p+"%"})]))});
  var s=$("weekStats");s.innerHTML="";var lim=(routine.limits&&routine.limits.tiktok)||30;
  function st(v,l,ok){s.appendChild(el("div",{cls:"stat"},[el("span",{cls:"v num",text:v}),el("span",{cls:"l",text:l}),el("span",{cls:"tag "+(ok?"ok":"warn"),style:"align-self:flex-start",text:ok?"Objectif atteint":"En cours"})]))}
  st(w.pr+"/35","prières cette semaine",w.pr>=35);
  st(w.sport+"/5","séances de sport",w.sport>=4);
  st(w.cardio+"/2","cardio",w.cardio>=2);
  st(w.qcm+"/14","QCM faits",w.qcm>=12);
  st(w.rev+" h","de révisions le week-end",w.rev>=2.5);
  st(w.ben?"Oui":"Non","bénévolat cette semaine",w.ben>0);
  var avg=w.tk.length?Math.round(w.tk.reduce(function(a,b){return a+b},0)/w.tk.length):null;
  st(avg==null?"–":avg+" min","TikTok par jour en moyenne",avg!=null&&avg<=lim);
}

/* ---------- Bilan à copier ---------- */
function bilanText(){
  var doc=dayDoc(todayKey),w=weekData(),L=["Bilan Cap HEC du "+todayKey+" :"];
  tasksFor(today).forEach(function(t){L.push((doc.done[t.id]?"[x] ":"[ ] ")+t.t)});
  L.push("TikTok : "+(doc.tiktok==null?"non renseigné":doc.tiktok+" min"));
  var pr=doc.prayers||{};L.push("Prières : "+PRAYERS.filter(function(p){return pr[p[0]]}).length+"/5");
  var cs=currentSurah();if(cs)L.push("Sourate du mois : "+cs.name+", "+((sstate.learned[cs.n]||[]).length)+"/"+cs.verses+" versets");
  var q=Object.keys(scores).filter(function(k){var s=scores[k];return s.attempts&&s.attempts.length&&s.attempts[s.attempts.length-1].at.slice(0,10)===new Date().toISOString().slice(0,10)});
  if(q.length){L.push("Scores du jour :");q.forEach(function(k){var a=scores[k].attempts[scores[k].attempts.length-1];L.push("- "+(scores[k].title||k)+" : "+a.score+"/"+a.total+(a.wrong.length?" (ratées : "+a.wrong.join(", ")+")":""))})}
  L.push("Semaine : sport "+w.sport+"/5, cardio "+w.cardio+"/2, QCM "+w.qcm+"/14, révisions "+w.rev+" h, bénévolat "+(w.ben?"fait":"pas encore"));
  return L.join("\n");
}
function copyText(txt,btn,label){
  function ok(){var o=btn.textContent;btn.textContent=label||"Copié";setTimeout(function(){btn.textContent=o},1600)}
  function fb(){var ta=$("copyArea");ta.hidden=false;ta.value=txt;ta.focus();ta.select();try{document.execCommand("copy")}catch(e){}ok()}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,fb);else fb();
}
$("copyBilan").addEventListener("click",function(){copyText(bilanText(),this,"Bilan copié")});

/* ---------- Échéances ---------- */
function renderDeadlines(){
  var h=$("deadlines");h.innerHTML="";
  (routine.deadlines||[]).slice().sort(function(a,b){return a.date<b.date?-1:1}).forEach(function(it){
    var dd=parseKey(it.date),diff=Math.round((dd-parseKey(todayKey))/864e5);if(diff<-1)return;
    h.appendChild(el("div",{cls:"deadline"},[el("div",{cls:"dd num"+(diff<=7?" hot":diff<=21?" warm":"")},[diff<=0?"Auj.":"J-"+diff,el("small",{text:dd.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})})]),el("div",{text:it.t,style:"font-weight:700;line-height:1.3"})]));
  });
}

/* ---------- QCM ---------- */
function renderQcmList(){
  var h=$("qcmList");h.innerHTML="";
  if(!qcms.length){h.appendChild(el("div",{cls:"empty",text:"Tes QCM du matin et de l'après-midi arrivent ici."}));$("qcmCount").textContent="";return}
  $("qcmCount").textContent=qcms.filter(function(q){return scores[q.id]}).length+" sur "+qcms.length+" faits";
  qcms.forEach(function(q){
    var n=(q.questions||[]).length,s=scores[q.id],tag;
    if(!s)tag=el("span",{cls:"tag go",text:"À faire"});else tag=el("span",{cls:"tag "+(s.best===n?"ok":s.best>=n*.8?"warn":"bad"),text:s.best+"/"+n});
    var b=el("button",{cls:"btn",type:"button",text:s?"Refaire":"Commencer"});b.addEventListener("click",function(){startQuiz(q)});
    h.appendChild(el("div",{cls:"row"},[el("div",{cls:"grow"},[el("div",{cls:"ttl",text:q.title||"QCM"}),el("div",{cls:"meta",text:(q.theme?q.theme+", ":"")+n+" questions"})]),tag,b]));
  });
}
function startQuiz(q,playerId,listId){
  var P=$(playerId||"quizPlayer"),LST=$(listId||"qcmList"),i=0,score=0,wrong=[],qs=q.questions||[];
  LST.hidden=true;P.hidden=false;
  setTimeout(function(){P.scrollIntoView({behavior:"smooth",block:"start"})},50);
  function show(){
    P.innerHTML="";if(i>=qs.length)return finish();
    var cur=qs[i],done=false,opts=[];
    var box=el("div",{cls:"quiz"},[el("div",{cls:"head-row"},[el("span",{cls:"soft num",text:"Question "+(i+1)+" sur "+qs.length}),el("span",{cls:"tag num",text:score+" bonne"+(score>1?"s":"")})]),el("div",{cls:"qbar"},[el("i",{style:"width:"+Math.round(100*i/qs.length)+"%"})]),el("div",{cls:"qp",text:cur.prompt})]);
    (cur.options||[]).forEach(function(o,oi){
      var b=el("button",{cls:"opt",type:"button",text:String.fromCharCode(65+oi)+".  "+o});
      b.addEventListener("click",function(){
        if(done)return;done=true;
        if(oi===cur.answer){score++;b.classList.add("right")}else{wrong.push(i+1);b.classList.add("wrong");if(opts[cur.answer])opts[cur.answer].classList.add("right")}
        if(cur.explanation)box.appendChild(el("div",{cls:"expl",text:cur.explanation}));
        var nx=el("button",{cls:"btn main",type:"button",text:i+1<qs.length?"Question suivante":"Voir mon score"});nx.addEventListener("click",function(){i++;show()});box.appendChild(nx);
      });
      opts.push(b);box.appendChild(b);
    });
    var quit=el("button",{cls:"btn",type:"button",text:"Quitter",style:"align-self:flex-start"});quit.addEventListener("click",close);box.appendChild(quit);
    P.appendChild(box);
  }
  function finish(){
    var s=scores[q.id]||{best:null,last:null,attempts:[]};s.title=q.title;
    s.attempts=(s.attempts||[]).slice(-19);s.attempts.push({at:new Date().toISOString(),score:score,total:qs.length,wrong:wrong});
    s.best=s.best==null?score:Math.max(s.best,score);s.last=score;scores[q.id]=s;lsSet("caphec.scores",scores);
    var perfect=score===qs.length;
    var msg=perfect?"Sans faute. C'est exactement le niveau visé.":score>=qs.length*.8?"Presque. Relis les explications des questions ratées.":"Relis les explications, puis refais-le demain.";
    var cp=el("button",{cls:"btn",type:"button",text:"Copier le score pour Claude"});cp.addEventListener("click",function(){copyText(q.title+" : "+score+"/"+qs.length+(wrong.length?" (ratées : "+wrong.join(", ")+")":""),cp,"Score copié")});
    var back=el("button",{cls:"btn main",type:"button",text:"Retour"});back.addEventListener("click",close);
    P.innerHTML="";P.appendChild(el("div",{cls:"quiz"},[el("span",{cls:"soft",text:q.title}),el("div",{cls:"big num",text:score+"/"+qs.length}),el("div",{text:msg}),wrong.length?el("div",{cls:"soft",text:"Questions ratées : "+wrong.join(", ")}):null,el("div",{style:"display:flex;gap:10px;flex-wrap:wrap"},[back,cp])]));
    if(perfect)confetti();
    renderWords();
  }
  function close(){P.hidden=true;P.innerHTML="";LST.hidden=false;renderQcmList();renderWords();renderCulture()}
  show();
}


/* ---------- Culture G ---------- */
function cgDays(){return ((culture&&culture.days)||[]).slice().sort(function(a,b){return a.date<b.date?1:-1})}
function renderTeaser(){
  var t=$("teaser"),d=cgDays()[0];if(!d||!d.items||!d.items.length){t.hidden=true;return}
  t.hidden=false;t.innerHTML="";
  t.appendChild(el("span",{cls:"tl",text:"L'essentiel du jour, au lieu de TikTok"}));
  t.appendChild(el("ul",{},d.items.slice(0,3).map(function(x){return el("li",{text:x.title})})));
  t.appendChild(el("span",{cls:"go",text:"Lire en 10 minutes"}));
}
$("teaser").addEventListener("click",function(){setView("culture")});
function renderCulture(){
  renderTeaser();
  var ds=cgDays();if(!ds.length){$("cgItems").innerHTML="";$("cgItems").appendChild(el("div",{cls:"empty",text:"Ton premier résumé d'actualité arrive demain matin."}));return}
  if(cgDayIdx>=ds.length)cgDayIdx=0;
  var d=ds[cgDayIdx];
  $("cgTitle").textContent=cgDayIdx===0?"L'essentiel du jour":"L'essentiel du "+parseKey(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
  $("cgDate").textContent=parseKey(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
  var cats=["Tout"];(d.items||[]).forEach(function(x){if(cats.indexOf(x.cat)<0)cats.push(x.cat)});
  if(cats.indexOf(cgFilter)<0)cgFilter="Tout";
  var f=$("cgFilters");f.innerHTML="";
  cats.forEach(function(c){var b=el("button",{type:"button","aria-pressed":c===cgFilter?"true":"false",text:c});b.addEventListener("click",function(){cgFilter=c;renderCulture()});f.appendChild(b)});
  var h=$("cgItems");h.innerHTML="";
  (d.items||[]).filter(function(x){return cgFilter==="Tout"||x.cat===cgFilter}).forEach(function(x){
    h.appendChild(el("article",{cls:"news"},[el("span",{cls:"cat",text:x.cat}),el("h3",{text:x.title}),el("p",{text:x.text}),x.why?el("div",{cls:"why"},[el("b",{text:"Pourquoi c'est important : "}),x.why]):null,x.url?el("a",{href:x.url,target:"_blank",rel:"noopener",text:"Source : "+(x.source||"lien")}):null]));
  });
  var ag=$("cgAgenda");ag.innerHTML="";(d.agenda||[]).forEach(function(x){ag.appendChild(el("b",{text:x.date}));ag.appendChild(el("span",{text:x.t}))});
  var hs=$("cgHistory");hs.innerHTML="";(d.history||[]).forEach(function(x){hs.appendChild(el("div",{cls:"news"},[el("h3",{text:x.title}),el("p",{text:x.text})]))});
  var qid="cg-"+d.date,s=scores[qid],n=(d.quiz||[]).length;
  $("cgQuizMeta").textContent=n?(n+" questions sur l'actualité"+(s?". Ton score : "+s.last+"/"+n:"")):"Pas de quiz ce jour-là";
  $("cgQuizBtn").disabled=!n;
  var ab=$("cgArchiveBlock"),ar=$("cgArchive");ar.innerHTML="";ab.hidden=ds.length<2;
  ds.forEach(function(x,i){if(i===cgDayIdx)return;var b=el("button",{cls:"btn",type:"button",text:"Lire"});b.addEventListener("click",function(){cgDayIdx=i;renderCulture();window.scrollTo(0,0)});ar.appendChild(el("div",{cls:"row"},[el("div",{cls:"grow"},[el("div",{cls:"ttl",text:parseKey(x.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}),el("div",{cls:"meta",text:(x.items||[]).length+" sujets"})]),b]))});
}
$("cgQuizBtn").addEventListener("click",function(){var d=cgDays()[cgDayIdx];if(!d)return;startQuiz({id:"cg-"+d.date,title:"Quiz culture G du "+d.date,questions:d.quiz||[]},"cgPlayer","cgItems")});


/* ---------- Prières ---------- */
var PRAYERS=[["fajr","Fajr","Fajr"],["dhuhr","Dhuhr","Dhuhr"],["asr","Asr","Asr"],["maghrib","Maghrib","Maghrib"],["isha","Isha","Isha"]];
var spirit={city:"Marseille",country:"France",method:12,surahs:[]};
var city=lsGet("caphec.city",null), ptimes=lsGet("caphec.ptimes",{});
function cityName(){return city||spirit.city||"Marseille"}
async function loadTimes(){
  var k=todayKey+"|"+cityName();if(ptimes[k]){renderPrayers();return}
  try{var d=today,ds=(d.getDate()<10?"0":"")+d.getDate()+"-"+(d.getMonth()<9?"0":"")+(d.getMonth()+1)+"-"+d.getFullYear();
    var r=await fetch("https://api.aladhan.com/v1/timingsByCity/"+ds+"?city="+encodeURIComponent(cityName())+"&country="+encodeURIComponent(spirit.country||"France")+"&method="+(spirit.method||12));
    var j=await r.json();if(j&&j.data&&j.data.timings){ptimes={};ptimes[k]=j.data.timings;lsSet("caphec.ptimes",ptimes)}}catch(e){}
  renderPrayers();
}
function renderPrayers(){
  var doc=dayDoc(todayKey);doc.prayers=doc.prayers||{};
  var t=ptimes[todayKey+"|"+cityName()]||null,h=$("pchips");h.innerHTML="";
  PRAYERS.forEach(function(p){
    var on=!!doc.prayers[p[0]];
    var b=el("button",{cls:"pchip",type:"button","aria-pressed":on?"true":"false","aria-label":p[1]+(on?" faite":" à faire")},[p[1],el("small",{cls:"num",text:t&&t[p[2]]?t[p[2]].slice(0,5):"–"})]);
    b.addEventListener("click",function(){doc.prayers[p[0]]=!doc.prayers[p[0]];saveDays();renderPrayers();renderWeek()});
    h.appendChild(b);
  });
  var n=PRAYERS.filter(function(p){return doc.prayers[p[0]]}).length;$("prCount").textContent=n+"/5";
  $("ptSource").textContent=t?"Horaires du jour pour "+cityName()+" (calcul UOIF, source aladhan.com).":"Horaires indisponibles hors connexion.";
  var ci=$("cityIn");if(document.activeElement!==ci)ci.value=cityName();
}
$("citySave").addEventListener("click",function(){var v=$("cityIn").value.trim();if(!v)return;city=v;lsSet("caphec.city",v);loadTimes()});

/* ---------- Sourate du mois ---------- */
var sstate=lsGet("caphec.surah",{known:[],done:[],learned:{},current:null});
function saveS(){lsSet("caphec.surah",sstate)}
function monthKey(d){return d.getFullYear()+"-"+(d.getMonth()<9?"0":"")+(d.getMonth()+1)}
function surahByN(n){return (spirit.surahs||[]).filter(function(s){return s.n===n})[0]}
function currentSurah(){
  var list=spirit.surahs||[];if(!list.length)return null;
  var doneN=sstate.done.map(function(x){return x.n});
  if(sstate.current&&sstate.known.indexOf(sstate.current.n)<0&&doneN.indexOf(sstate.current.n)<0)return surahByN(sstate.current.n);
  var next=list.filter(function(s){return sstate.known.indexOf(s.n)<0&&doneN.indexOf(s.n)<0})[0];
  if(!next)return null;
  sstate.current={n:next.n,month:monthKey(today)};saveS();return next;
}
function weekRange(s){var per=Math.ceil(s.verses/4),w=Math.min(3,Math.floor((today.getDate()-1)/7)),a=w*per+1,b=Math.min(s.verses,a+per-1);if(a>s.verses){a=s.verses;b=s.verses}return[a,b]}
function renderSurah(){
  var s=currentSurah(),c=$("surahCard");c.innerHTML="";
  $("sMonth").textContent=today.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  if(!s){c.appendChild(el("div",{text:"Programme terminé, bravo. Dis à Claude d'ajouter de nouvelles sourates."}))}
  else{
    var L=sstate.learned[s.n]||[],pct=Math.round(100*L.length/s.verses),wr=weekRange(s);
    c.appendChild(el("div",{},[el("div",{cls:"nm",text:s.name}),el("div",{cls:"soft",text:"Sourate "+s.n+", « "+s.fr+" », "+s.verses+" versets"})]));
    c.appendChild(el("div",{cls:"pbar"},[el("i",{style:"width:"+pct+"%"})]));
    c.appendChild(el("div",{text:L.length+" verset"+(L.length>1?"s":"")+" sur "+s.verses+" retenus. Cette semaine : versets "+wr[0]+(wr[1]>wr[0]?" à "+wr[1]:"")+"."}));
    var g=el("div",{cls:"verses"});
    for(var v=1;v<=s.verses;v++)(function(v){var on=L.indexOf(v)>=0;var b=el("button",{type:"button",cls:(v>=wr[0]&&v<=wr[1])?"wk":"","aria-pressed":on?"true":"false","aria-label":"Verset "+v+(on?" retenu":""),text:String(v)});b.addEventListener("click",function(){var arr=sstate.learned[s.n]=sstate.learned[s.n]||[];var i=arr.indexOf(v);if(i>=0)arr.splice(i,1);else arr.push(v);saveS();renderSurah();renderPrayers()});g.appendChild(b)})(v);
    c.appendChild(g);
    c.appendChild(el("p",{cls:"soft",style:"margin:0;font-size:.85rem",text:"Méthode : lis la phonétique du verset 10 fois à voix haute, écoute-le si besoin, puis récite-le en mode récitation. Coche un verset quand tu le récites sans erreur le lendemain matin."}));
    var row=el("div",{style:"display:flex;gap:10px;flex-wrap:wrap"});
    row.appendChild(el("a",{cls:"btn main",href:"https://quran.com/"+s.n,target:"_blank",rel:"noopener",text:"Ouvrir sur Quran.com"}));
    var fin=el("button",{cls:"btn gold",type:"button",text:"Je la récite en entier"});fin.disabled=L.length<s.verses;
    fin.addEventListener("click",function(){sstate.done.push({n:s.n,month:monthKey(today)});sstate.current=null;saveS();confetti();renderSurah();renderPrayers()});
    var kn=el("button",{cls:"btn",type:"button",text:"Je la connais déjà"});kn.addEventListener("click",function(){sstate.known.push(s.n);sstate.current=null;saveS();renderSurah();renderPrayers()});
    row.appendChild(fin);row.appendChild(kn);c.appendChild(row);
  }
  var kl=$("knownList");kl.innerHTML="";
  (spirit.surahs||[]).forEach(function(x){var on=sstate.known.indexOf(x.n)>=0;var b=el("button",{type:"button","aria-pressed":on?"true":"false",text:x.name});b.addEventListener("click",function(){var i=sstate.known.indexOf(x.n);if(i>=0)sstate.known.splice(i,1);else sstate.known.push(x.n);if(sstate.current&&sstate.current.n===x.n)sstate.current=null;saveS();renderSurah();renderPrayers()});kl.appendChild(b)});
  var dl=$("surahDone");dl.innerHTML="";
  sstate.done.slice().reverse().forEach(function(d){var x=surahByN(d.n);if(!x)return;dl.appendChild(el("div",{cls:"row"},[el("div",{cls:"grow"},[el("div",{cls:"ttl",text:x.name+" apprise"}),el("div",{cls:"meta",text:"En "+d.month+". Récite-la une fois par semaine pour la garder."})]),el("a",{cls:"btn",href:"https://quran.com/"+x.n,target:"_blank",rel:"noopener",text:"Réviser"})]))});
  var sm=$("smini"),cur=s;sm.innerHTML="";
  if(cur){var Ln=(sstate.learned[cur.n]||[]).length;sm.appendChild(el("span",{},["Sourate du mois : ",el("b",{text:cur.name}),", "+Ln+"/"+cur.verses+" versets"]));sm.appendChild(el("span",{text:"Ouvrir"}))}
}
$("smini").addEventListener("click",function(){setView("objectifs")});
var _rs=renderSurah;renderSurah=function(){_rs();renderAyahs()};


/* ---------- Texte de la sourate (phonétique + arabe + audio) ---------- */
var qcache={}, showAll=lsGet("caphec.showAll",false), showAr=lsGet("caphec.showAr",true), testMode=false, audioEl=null;
async function loadSurahText(n){
  if(qcache[n])return qcache[n];
  var c=lsGet("caphec.q."+n,null);if(c){qcache[n]=c;return c}
  var r=await fetch("https://api.alquran.cloud/v1/surah/"+n+"/editions/quran-uthmani,en.transliteration,ar.alafasy");
  var j=await r.json();if(!j||j.code!==200)throw new Error("indisponible");
  var ar=j.data[0].ayahs,tr=j.data[1].ayahs,au=j.data[2].ayahs;
  var out=ar.map(function(x,i){var t=x.text;if(i===0&&n!==1&&n!==9){t=t.replace(/^\S+\s+\S+\s+\S+\s+\S+\s*/,"")}return {v:x.numberInSurah,ar:t,ph:tr[i]?tr[i].text:"",audio:au[i]?au[i].audio:""}});
  qcache[n]=out;lsSet("caphec.q."+n,out);return out;
}
async function renderAyahs(){
  var host=$("ayahs"),s=currentSurah();host.innerHTML="";
  $("tgAll").setAttribute("aria-pressed",showAll?"true":"false");$("tgAr").setAttribute("aria-pressed",showAr?"true":"false");$("tgTest").setAttribute("aria-pressed",testMode?"true":"false");
  if(!s)return;
  host.appendChild(el("div",{cls:"empty",text:"Chargement du texte…"}));
  var data;try{data=await loadSurahText(s.n)}catch(e){host.innerHTML="";host.appendChild(el("div",{cls:"empty",text:"Le texte n'a pas pu se charger. Vérifie ta connexion, puis rouvre cet onglet."}));return}
  host.innerHTML="";
  var wr=weekRange(s),L=sstate.learned[s.n]||[];
  data.filter(function(x){return showAll||(x.v>=wr[0]&&x.v<=wr[1])||(L.indexOf(x.v)<0&&x.v<wr[0])}).forEach(function(x){
    var inWk=x.v>=wr[0]&&x.v<=wr[1];
    var ph=el("div",{cls:"ph",text:x.ph});
    var card=el("div",{cls:"ayah"+(inWk?" wk":"")+(testMode?" masked":"")},[el("div",{cls:"top"},[el("span",{cls:"no",text:"Verset "+x.v+(L.indexOf(x.v)>=0?", retenu":inWk?", cette semaine":"")}),x.audio?(function(){var b=el("button",{cls:"play",type:"button",text:"Écouter"});b.addEventListener("click",function(){try{if(audioEl)audioEl.pause();audioEl=new Audio(x.audio);audioEl.play()}catch(e){}});return b})():null]),ph,showAr?el("div",{cls:"ar",lang:"ar",text:x.ar}):null]);
    if(testMode)ph.addEventListener("click",function(){card.classList.remove("masked")});
    host.appendChild(card);
  });
  if(!showAll)host.appendChild(el("p",{cls:"soft",style:"margin:0;font-size:.85rem",text:"Tu vois les versets de la semaine et ceux qui restent en retard. Touche « Toute la sourate » pour tout afficher."}));
  if(testMode)host.insertBefore(el("p",{cls:"soft",style:"margin:0;font-size:.85rem",text:"Mode récitation : récite chaque verset de mémoire, puis touche le texte flouté pour vérifier."}),host.firstChild);
}
$("tgAll").addEventListener("click",function(){showAll=!showAll;lsSet("caphec.showAll",showAll);renderAyahs()});
$("tgAr").addEventListener("click",function(){showAr=!showAr;lsSet("caphec.showAr",showAr);renderAyahs()});
$("tgTest").addEventListener("click",function(){testMode=!testMode;renderAyahs()});

/* ---------- Carnet ---------- */
function renderCarnet(){
  var h=$("carnet"),r=(carnet&&carnet.rules)||[];h.innerHTML="";
  if(!r.length){h.appendChild(el("div",{cls:"empty",text:"Ton carnet se remplit après chaque test."}));return}
  $("carnetCount").textContent=r.filter(function(x){return x.status!=="maîtrisée"}).length+" à travailler";
  function rk(x){return x.status==="priorité"?0:x.status==="maîtrisée"?2:1}
  r.slice().sort(function(a,b){return rk(a)-rk(b)}).forEach(function(x){
    h.appendChild(el("div",{cls:"row"},[el("div",{cls:"grow"},[el("div",{cls:"ttl",text:x.rule}),x.example?el("div",{cls:"meta",text:x.example}):null]),el("span",{cls:"tag "+(x.status==="priorité"?"bad":x.status==="maîtrisée"?"ok":"warn"),text:x.status||"à revoir"})]));
  });
}

/* ---------- Notifications ---------- */
function b64ToU8(s){var p="=".repeat((4-s.length%4)%4),b=(s+p).replace(/-/g,"+").replace(/_/g,"/"),r=atob(b),a=new Uint8Array(r.length);for(var i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a}
function standalone(){return (window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true}
function renderNotif(){
  var st=$("notifState"),b=$("notifBtn");
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!window.Notification){st.textContent=standalone()?"Ce téléphone ne gère pas les notifications web (iOS 16.4 minimum).":"Pour les notifications, ajoute l'app à l'écran d'accueil (Partager, puis Sur l'écran d'accueil) et ouvre-la depuis l'icône.";b.disabled=true;return}
  b.disabled=false;
  if(Notification.permission==="granted"){st.textContent="Notifications activées.";b.textContent="Afficher le code"}
  else if(Notification.permission==="denied"){st.textContent="Notifications refusées : réactive-les dans Réglages, Notifications, Cap HEC.";b.disabled=true}
  else{st.textContent="Active les notifications pour recevoir tes rappels.";b.textContent="Activer les notifications"}
}
$("notifBtn").addEventListener("click",async function(){
  try{var p=await Notification.requestPermission();if(p!=="granted"){renderNotif();return}
    var reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(VAPID_PUBLIC)});
    showCode(JSON.stringify(sub));
  }catch(e){$("notifState").textContent="Activation impossible ("+((e&&e.name)||"")+" "+((e&&e.message)||"")+")."}
});
function showCode(c){var ta=$("copyArea");ta.hidden=false;ta.value=c;ta.readOnly=true;$("copyCode").hidden=false;$("notifState").textContent="Notifications activées. Le code ci-dessous sert à recevoir tes rappels sur ce téléphone."}
$("copyCode").addEventListener("click",function(){var ta=$("copyArea"),b=this;ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);try{document.execCommand("copy")}catch(e){}if(navigator.clipboard)navigator.clipboard.writeText(ta.value).then(function(){b.textContent="Code copié"},function(){});else b.textContent="Code copié"});
$("testNotif").addEventListener("click",async function(){try{if(Notification.permission!=="granted")await Notification.requestPermission();var r=await navigator.serviceWorker.ready;await r.showNotification("Test Cap HEC",{body:"Les notifications s'affichent bien sur ce téléphone.",icon:"icons/icon-192.png"});$("notifState").textContent="Notification de test affichée."}catch(e){$("notifState").textContent="Test impossible : "+((e&&e.message)||"erreur")}});

/* ---------- Contenu ---------- */
async function getJSON(p){var r=await fetch(p+"?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error(p);return r.json()}
async function loadAll(){
  var c0=lsGet("caphec.content4",null);if(c0)apply(c0);
  try{var c={routine:await getJSON("content/routine.json"),qcm:await getJSON("content/qcm.json"),carnet:await getJSON("content/carnet.json"),vocab:await getJSON("content/vocab.json"),culture:await getJSON("content/culture.json"),spirit:await getJSON("content/spirituel.json")};lsSet("caphec.content4",c);apply(c);showStatus(null)}
  catch(e){if(!c0)showStatus("Pas de connexion : ton contenu n'a pas pu se charger. Réessaie avec du réseau.")}
}
function apply(c){
  routine=c.routine||routine;carnet=c.carnet||null;vocab=c.vocab||vocab;culture=c.culture||culture;spirit=c.spirit||spirit;
  qcms=((c.qcm&&c.qcm.items)||[]).slice().sort(function(a,b){return a.created<b.created?1:-1});
  renderDay();renderWords();renderWeek();renderDeadlines();renderQcmList();renderCarnet();renderCulture();renderSurah();loadTimes();firstLoad=false;
}
document.addEventListener("visibilitychange",function(){if(!document.hidden)loadAll()});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").then(renderNotif,renderNotif);else renderNotif();
if(window.Notification&&Notification.permission==="granted"&&"serviceWorker" in navigator)navigator.serviceWorker.ready.then(function(r){return r.pushManager&&r.pushManager.getSubscription()}).then(function(s){if(s){$("copyArea").value=JSON.stringify(s)}}).catch(function(){});
renderDay();loadAll();
})();
