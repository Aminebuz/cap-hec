(function(){
"use strict";
var VAPID_PUBLIC="BCL9kLoKGl43fB798Ozk4FTjNwr1KaqARF_nr1_976bkXFPlTCd3eIvskwQOVTb7ElFHamDDHnLPzAVorEreZEg";
var DAYS=["D","L","M","M","J","V","S"];
var DAYNAMES=["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
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
var views=["jour","toeic","semaine","objectifs"];
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
  var m=monday(today),r={sport:0,cardio:0,rev:0,ben:0,tk:[],qcm:0,days:[]};
  for(var i=0;i<7;i++){var d=new Date(m);d.setDate(m.getDate()+i);var k=key(d),doc=days[k];r.days.push({d:d,k:k,p:dayPct(k,d)});
    if(doc&&doc.done){if(doc.done.sport||doc.done.sport_lower)r.sport++;if(doc.done.cardio)r.cardio++;if(doc.done.revisions)r.rev+=1.5;if(doc.done.benevolat)r.ben++;if(doc.done.qcm_matin)r.qcm++;if(doc.done.qcm_aprem)r.qcm++}
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
function startQuiz(q){
  var P=$("quizPlayer"),i=0,score=0,wrong=[],qs=q.questions||[];
  $("qcmList").hidden=true;P.hidden=false;
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
  function close(){P.hidden=true;P.innerHTML="";$("qcmList").hidden=false;renderQcmList();renderWords()}
  show();
}

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
  var c0=lsGet("caphec.content2",null);if(c0)apply(c0);
  try{var c={routine:await getJSON("content/routine.json"),qcm:await getJSON("content/qcm.json"),carnet:await getJSON("content/carnet.json"),vocab:await getJSON("content/vocab.json")};lsSet("caphec.content2",c);apply(c);showStatus(null)}
  catch(e){if(!c0)showStatus("Pas de connexion : ton contenu n'a pas pu se charger. Réessaie avec du réseau.")}
}
function apply(c){
  routine=c.routine||routine;carnet=c.carnet||null;vocab=c.vocab||vocab;
  qcms=((c.qcm&&c.qcm.items)||[]).slice().sort(function(a,b){return a.created<b.created?1:-1});
  renderDay();renderWords();renderWeek();renderDeadlines();renderQcmList();renderCarnet();firstLoad=false;
}
document.addEventListener("visibilitychange",function(){if(!document.hidden)loadAll()});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").then(renderNotif,renderNotif);else renderNotif();
if(window.Notification&&Notification.permission==="granted"&&"serviceWorker" in navigator)navigator.serviceWorker.ready.then(function(r){return r.pushManager&&r.pushManager.getSubscription()}).then(function(s){if(s){$("copyArea").value=JSON.stringify(s)}}).catch(function(){});
renderDay();loadAll();
})();
