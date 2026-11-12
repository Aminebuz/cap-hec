(function(){
"use strict";
var VAPID_PUBLIC="BCL9kLoKGl43fB798Ozk4FTjNwr1KaqARF_nr1_976bkXFPlTCd3eIvskwQOVTb7ElFHamDDHnLPzAVorEreZEg";
var DAYS=["dim","lun","mar","mer","jeu","ven","sam"];
var DAYNAMES=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
var routine={limits:{tiktok:30},tasks:[],deadlines:[]}, qcms=[], tracks=[], carnet=null;
var today=new Date(), todayKey=key(today);

/* ---------- Storage (sur le téléphone) ---------- */
function lsGet(k,def){try{var v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var days=lsGet("caphec.days",{});           // {date:{done:{},tiktok}}
var scores=lsGet("caphec.scores",{});       // {qcmId:{best,last,attempts:[]}}
function dayDoc(k){if(!days[k])days[k]={done:{},tiktok:null};return days[k]}
function saveDays(){lsSet("caphec.days",days)}

function key(d){var m=d.getMonth()+1,dd=d.getDate();return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(dd<10?"0":"")+dd}
function el(tag,attrs,kids){var e=document.createElement(tag);if(attrs)for(var k in attrs){if(k==="text")e.textContent=attrs[k];else if(k==="cls")e.className=attrs[k];else e.setAttribute(k,attrs[k])}(kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==="string"?document.createTextNode(c):c)});return e}
function $(id){return document.getElementById(id)}
function tasksFor(d){var wd=d.getDay();return (routine.tasks||[]).filter(function(t){return (t.days||[]).indexOf(wd)>=0})}
function coreIds(d){return tasksFor(d).filter(function(t){return!t.optional}).map(function(t){return t.id})}
function showStatus(msg){var s=$("status");if(!msg){s.hidden=true;return}s.textContent=msg;s.hidden=false}

/* ---------- Onglets ---------- */
var views=["jour","toeic","semaine","objectifs"];
function setView(v){views.forEach(function(x){$("v-"+x).hidden=(x!==v);$("tab-"+x).setAttribute("aria-selected",x===v?"true":"false")});lsSet("caphec.view",v);window.scrollTo(0,0)}
document.querySelectorAll("nav.tabs button").forEach(function(b){b.addEventListener("click",function(){setView(b.dataset.v)})});
var sv=lsGet("caphec.view",null);if(sv&&views.indexOf(sv)>=0)setView(sv);

/* ---------- Ma journée ---------- */
function renderDay(){
  today=new Date();todayKey=key(today);
  var doc=dayDoc(todayKey);
  $("todayLabel").textContent=DAYNAMES[today.getDay()]+" "+today.getDate()+" "+today.toLocaleDateString("fr-FR",{month:"long"});
  var list=tasksFor(today), groups={}, order=["Matin","Journée","Soir"];
  list.forEach(function(t){(groups[t.moment]=groups[t.moment]||[]).push(t)});
  var sp=list.filter(function(t){return t.id.indexOf("sport")===0})[0];
  $("sportToday").textContent=sp?("Salle aujourd'hui : "+sp.t.toLowerCase()):"Pas de salle aujourd'hui : repos ou cardio";
  var host=$("groups");host.innerHTML="";
  if(!list.length){host.appendChild(el("div",{cls:"empty",text:"Chargement de ta routine…"}))}
  order.forEach(function(m){
    if(!groups[m])return;
    var c=el("div",{cls:"card"},[el("div",{cls:"row spread"},[el("h3",{text:m}),el("span",{cls:"pill",text:groups[m].filter(function(t){return doc.done[t.id]}).length+" / "+groups[m].length})])]);
    groups[m].forEach(function(t){
      var id="chk-"+t.id, det=(t.detail&&t.detail[String(today.getDay())])||t.d;
      var cb=el("input",{type:"checkbox",id:id});cb.checked=!!doc.done[t.id];
      cb.addEventListener("change",function(){doc.done[t.id]=cb.checked;saveDays();renderDay();renderWeek()});
      var lab=el("label",{"for":id},[el("div",{cls:"t",text:t.t}),det?el("div",{cls:"d",text:det+(t.optional?" · bonus":"")}):null]);
      c.appendChild(el("div",{cls:"task"+(doc.done[t.id]?" done":"")},[cb,lab]));
    });
    host.appendChild(c);
  });
  var core=coreIds(today), n=core.filter(function(id){return doc.done[id]}).length, pct=core.length?Math.round(100*n/core.length):0;
  $("ringFg").setAttribute("stroke-dashoffset",(169.6*(1-pct/100)).toFixed(1));$("ringTxt").textContent=pct+"%";
  var tk=$("tiktokMin"); if(document.activeElement!==tk) tk.value=(doc.tiktok==null?"":doc.tiktok);
  var lim=(routine.limits&&routine.limits.tiktok)||30, p=$("tiktokPill");
  if(doc.tiktok==null){p.className="pill";p.textContent="Limite : "+lim+" min"}
  else if(doc.tiktok<=lim){p.className="pill ok";p.textContent="Dans la limite"}
  else{p.className="pill bad";p.textContent="+"+(doc.tiktok-lim)+" min au-delà"}
  renderStreak();
}
var tkTimer=null;
$("tiktokMin").addEventListener("input",function(){var v=this.value;clearTimeout(tkTimer);tkTimer=setTimeout(function(){dayDoc(todayKey).tiktok=v===""?null:Math.max(0,Math.round(+v));saveDays();renderDay();renderWeek()},600)});
function dayPct(k,d){var doc=days[k];var core=coreIds(d);if(!doc||!core.length)return null;var n=core.filter(function(id){return doc.done&&doc.done[id]}).length;return Math.round(100*n/core.length)}
function renderStreak(){
  var s=0,d=new Date(today);
  if((dayPct(todayKey,d)||0)>=80)s=1;
  d.setDate(d.getDate()-1);
  for(var i=0;i<365;i++){var p=dayPct(key(d),d);if(p!=null&&p>=80){s++;d.setDate(d.getDate()-1)}else break}
  $("streak").textContent=s+(s>1?" jours":" jour")+" ≥ 80 %";
}

/* ---------- Semaine ---------- */
function monday(d){var x=new Date(d);var wd=(x.getDay()+6)%7;x.setDate(x.getDate()-wd);return x}
function weekData(){
  var m=monday(today),r={sport:0,cardio:0,rev:0,ben:0,tk:[],qcm:0,days:[]};
  for(var i=0;i<7;i++){
    var d=new Date(m);d.setDate(m.getDate()+i);var k=key(d),doc=days[k];
    r.days.push({d:d,k:k,p:dayPct(k,d)});
    if(doc&&doc.done){if(doc.done.sport||doc.done.sport_lower)r.sport++;if(doc.done.cardio)r.cardio++;if(doc.done.revisions)r.rev+=2;if(doc.done.benevolat)r.ben++;if(doc.done.qcm_matin)r.qcm++;if(doc.done.qcm_aprem)r.qcm++}
    if(doc&&doc.tiktok!=null)r.tk.push(doc.tiktok);
  }
  r.start=m;return r;
}
function renderWeek(){
  var w=weekData(),grid=$("weekGrid");grid.innerHTML="";
  var end=new Date(w.start);end.setDate(end.getDate()+6);
  $("weekRange").textContent=w.start.getDate()+"/"+(w.start.getMonth()+1)+" – "+end.getDate()+"/"+(end.getMonth()+1);
  w.days.forEach(function(x){
    grid.appendChild(el("div",{cls:"day"+(x.k===todayKey?" today":"")},[el("b",{text:DAYS[x.d.getDay()]}),el("span",{cls:"p",text:x.p==null?"–":x.p+"%"}),el("div",{cls:"bar"},[el("i",{style:"width:"+(x.p||0)+"%"})])]));
  });
  var st=$("weekStats");st.innerHTML="";
  var lim=(routine.limits&&routine.limits.tiktok)||30;
  function stat(label,v,goal,ok){st.appendChild(el("div",{cls:"stat"},[el("span",{cls:"eyebrow",text:label}),el("span",{cls:"v",text:v}),el("span",{cls:"pill "+(ok?"ok":"warn"),text:goal})]))}
  stat("Séances de sport",w.sport+" / 5","Objectif 4 à 5",w.sport>=4);
  stat("Cardio",w.cardio+" / 2","Objectif 2",w.cardio>=2);
  stat("QCM faits",w.qcm+" / 14","2 par jour",w.qcm>=12);
  stat("Révisions",w.rev+" h","4 h le week-end",w.rev>=4);
  stat("Bénévolat",w.ben?"Fait":"Pas encore","1 à 2 h par semaine",w.ben>0);
  var avg=w.tk.length?Math.round(w.tk.reduce(function(a,b){return a+b},0)/w.tk.length):null;
  stat("TikTok (moyenne)",avg==null?"–":avg+" min/j","Limite "+lim+" min",avg!=null&&avg<=lim);
}

/* ---------- Bilan à copier pour Claude ---------- */
function bilanText(){
  var doc=dayDoc(todayKey),list=tasksFor(today),w=weekData();
  var lines=["Bilan Cap HEC du "+todayKey+" :"];
  list.forEach(function(t){lines.push((doc.done[t.id]?"[x] ":"[ ] ")+t.t)});
  lines.push("TikTok : "+(doc.tiktok==null?"non renseigné":doc.tiktok+" min"));
  var done=qcms.filter(function(q){return scores[q.id]}).map(function(q){var s=scores[q.id];var last=s.attempts[s.attempts.length-1];return q.title+" : "+s.last+"/"+(last?last.total:"?")+(last&&last.wrong.length?" (ratées : "+last.wrong.join(", ")+")":"")});
  if(done.length){lines.push("QCM :");done.slice(-4).forEach(function(x){lines.push("- "+x)})}
  lines.push("Semaine : sport "+w.sport+"/5, cardio "+w.cardio+"/2, QCM "+w.qcm+"/14, révisions "+w.rev+" h, bénévolat "+(w.ben?"fait":"pas encore"));
  return lines.join("\n");
}
function copyText(txt,btn){
  var done=function(){var o=btn.textContent;btn.textContent="Copié";setTimeout(function(){btn.textContent=o},1500)};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done,function(){fallback()})}else fallback();
  function fallback(){var ta=$("copyArea");ta.hidden=false;ta.value=txt;ta.select();done()}
}
$("copyBilan").addEventListener("click",function(){copyText(bilanText(),this)});

/* ---------- Objectifs ---------- */
function renderDeadlines(){
  var host=$("deadlines");host.innerHTML="";
  (routine.deadlines||[]).slice().sort(function(a,b){return a.date<b.date?-1:1}).forEach(function(it){
    var dd=new Date(it.date+"T12:00:00"),diff=Math.round((dd-new Date(todayKey+"T12:00:00"))/864e5);
    var cls=diff<0?"pill":(diff<=7?"pill bad":(diff<=21?"pill warn":"pill"));
    var label=diff<0?"passé":(diff===0?"aujourd'hui":"J-"+diff);
    host.appendChild(el("div",{cls:"item"},[el("div",{cls:"grow"},[el("div",{text:it.t,style:"font-weight:500"}),el("div",{cls:"muted mono",style:"font-size:.82rem",text:dd.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})})]),el("span",{cls:cls,text:label})]));
  });
}

/* ---------- QCM ---------- */
function renderQcmList(){
  var host=$("qcmList");
  if(!qcms.length){host.innerHTML="";host.appendChild(el("div",{cls:"empty",text:"Tes QCM du matin et de l'après-midi arrivent ici."}));$("qcmCount").textContent="0";return}
  host.innerHTML="";
  var done=qcms.filter(function(q){return scores[q.id]}).length;
  $("qcmCount").textContent=done+" / "+qcms.length+" faits";
  qcms.forEach(function(q){
    var n=(q.questions||[]).length, s=scores[q.id], pill;
    if(!s)pill=el("span",{cls:"pill acc",text:"À faire"});
    else pill=el("span",{cls:"pill "+(s.best===n?"ok":(s.best>=n*0.8?"warn":"bad")),text:"Meilleur : "+s.best+"/"+n});
    var b=el("button",{cls:"btn",type:"button"},[s?"Refaire":"Commencer"]);
    b.addEventListener("click",function(){startQuiz(q)});
    host.appendChild(el("div",{cls:"item"},[el("div",{cls:"grow"},[el("div",{text:q.title||"QCM",style:"font-weight:500"}),el("div",{cls:"muted",style:"font-size:.82rem",text:(q.theme?q.theme+" · ":"")+n+" questions"})]),pill,b]));
  });
}
function startQuiz(q){
  var P=$("quizPlayer"),i=0,score=0,wrong=[],qs=q.questions||[];
  $("qcmList").hidden=true;P.hidden=false;P.scrollIntoView({block:"start"});
  function show(){
    P.innerHTML="";
    if(i>=qs.length)return finish();
    var cur=qs[i],answered=false;
    var box=el("div",{cls:"q"},[el("div",{cls:"row spread"},[el("span",{cls:"eyebrow",text:"Question "+(i+1)+" / "+qs.length}),el("span",{cls:"mono muted",text:score+" bonnes"})]),el("div",{style:"font-weight:500;font-size:1rem",text:cur.prompt})]);
    var opts=[];
    (cur.options||[]).forEach(function(o,oi){
      var b=el("button",{cls:"opt",type:"button",text:String.fromCharCode(65+oi)+") "+o});
      b.addEventListener("click",function(){
        if(answered)return;answered=true;
        if(oi===cur.answer){score++;b.classList.add("right")}else{wrong.push(i+1);b.classList.add("wrong");if(opts[cur.answer])opts[cur.answer].classList.add("right")}
        if(cur.explanation)box.appendChild(el("div",{cls:"expl",text:cur.explanation}));
        var nx=el("button",{cls:"btn primary",type:"button",text:i+1<qs.length?"Question suivante":"Voir le score"});
        nx.addEventListener("click",function(){i++;show()});box.appendChild(nx);
      });
      opts.push(b);box.appendChild(b);
    });
    var quit=el("button",{cls:"btn",type:"button",text:"Quitter"});quit.addEventListener("click",close);
    P.appendChild(box);P.appendChild(quit);
  }
  function finish(){
    P.innerHTML="";
    var s=scores[q.id]||{best:null,last:null,attempts:[]};
    s.attempts=(s.attempts||[]).slice(-19);s.attempts.push({at:new Date().toISOString(),score:score,total:qs.length,wrong:wrong});
    s.best=s.best==null?score:Math.max(s.best,score);s.last=score;scores[q.id]=s;lsSet("caphec.scores",scores);
    var msg=score===qs.length?"Parfait, c'est exactement le niveau visé.":(score>=qs.length*0.8?"Presque. Note les questions ratées dans ton carnet.":"Relis les explications des questions ratées, puis refais-le demain.");
    P.appendChild(el("div",{cls:"q"},[el("span",{cls:"eyebrow",text:"Résultat"}),el("div",{cls:"mono",style:"font-size:2rem",text:score+" / "+qs.length}),el("div",{text:msg}),wrong.length?el("div",{cls:"muted",text:"Questions ratées : "+wrong.join(", ")}):null]));
    var cp=el("button",{cls:"btn",type:"button",text:"Copier le score pour Claude"});cp.addEventListener("click",function(){copyText(q.title+" : "+score+"/"+qs.length+(wrong.length?" — ratées : "+wrong.join(", "):""),cp)});
    var b=el("button",{cls:"btn primary",type:"button",text:"Retour à la liste"});b.addEventListener("click",close);
    P.appendChild(el("div",{cls:"row"},[b,cp]));
  }
  function close(){P.hidden=true;P.innerHTML="";$("qcmList").hidden=false;renderQcmList()}
  show();
}

/* ---------- Carnet ---------- */
function renderCarnet(){
  var host=$("carnet"),rules=(carnet&&carnet.rules)||[];
  if(!rules.length)return;
  host.innerHTML="";
  $("carnetCount").textContent=rules.filter(function(r){return r.status!=="maîtrisée"}).length+" à travailler";
  function rank(r){return r.status==="priorité"?0:r.status==="maîtrisée"?2:1}
  rules.slice().sort(function(a,b){return rank(a)-rank(b)}).forEach(function(r){
    var cls=r.status==="priorité"?"pill bad":(r.status==="maîtrisée"?"pill ok":"pill warn");
    host.appendChild(el("div",{cls:"item"},[el("div",{cls:"grow"},[el("div",{text:r.rule,style:"font-weight:500"}),r.example?el("div",{cls:"muted",style:"font-size:.84rem",text:r.example}):null]),el("span",{cls:cls,text:r.status||"à revoir"})]));
  });
}

/* ---------- Écoute ---------- */
var speaking=false,wakeLock=null,voices=[];
function loadVoices(){try{voices=speechSynthesis.getVoices()||[]}catch(e){voices=[]}}
if("speechSynthesis" in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
function pickVoice(lang,idx){var c=voices.filter(function(v){return v.lang&&v.lang.toLowerCase().indexOf(lang)===0});if(!c.length)return null;return c[idx%c.length]}
function say(text,lang,vi,rate){return new Promise(function(res){if(!speaking)return res();var u=new SpeechSynthesisUtterance(text);u.lang=lang==="fr"?"fr-FR":(vi%2?"en-GB":"en-US");var v=pickVoice(lang==="fr"?"fr":"en",vi||0);if(v)u.voice=v;u.rate=rate||0.95;u.onend=res;u.onerror=res;speechSynthesis.speak(u)})}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
async function playTrack(t){
  $("nowPlaying").hidden=false;$("nowPlaying").textContent="En cours : "+t.title;
  for(var i=0;i<(t.lines||[]).length&&speaking;i++){var ln=t.lines[i];await say(ln.text,"en",ln.v==="B"?1:(ln.v==="C"?2:0));await wait(350)}
  for(var q=0;q<(t.questions||[]).length&&speaking;q++){
    var Q=t.questions[q];await wait(700);
    await say("Question "+(q+1)+". "+Q.q,"en",3);
    for(var o=0;o<Q.options.length&&speaking;o++)await say(String.fromCharCode(65+o)+". "+Q.options[o],"en",3,1);
    await wait(6000);
    await say("The answer is "+String.fromCharCode(65+Q.answer)+".","en",3);
    if(Q.explanation)await say(Q.explanation,"fr",0,1.05);
  }
}
async function startPlaying(list){
  if(!("speechSynthesis" in window)){showStatus("Ce téléphone ne sait pas lire le texte à voix haute.");return}
  speaking=true;$("stopAll").disabled=false;$("playAll").disabled=true;
  try{if(navigator.wakeLock)wakeLock=await navigator.wakeLock.request("screen")}catch(e){wakeLock=null}
  for(var i=0;i<list.length&&speaking;i++){await playTrack(list[i]);await wait(1200)}
  stopPlaying();
}
function stopPlaying(){speaking=false;try{speechSynthesis.cancel()}catch(e){}$("stopAll").disabled=true;$("playAll").disabled=false;$("nowPlaying").hidden=true;try{wakeLock&&wakeLock.release()}catch(e){}wakeLock=null}
$("playAll").addEventListener("click",function(){if(tracks.length)startPlaying(tracks.slice())});
$("stopAll").addEventListener("click",stopPlaying);
function renderTracks(){
  var host=$("trackList");if(!tracks.length)return;host.innerHTML="";
  tracks.forEach(function(t){
    var tr=el("div",{cls:"transcript",hidden:""});
    (t.lines||[]).forEach(function(l){tr.appendChild(el("div",{},[el("b",{text:(l.v||"A")+" : "}),l.text]))});
    (t.questions||[]).forEach(function(Q,qi){tr.appendChild(el("div",{style:"margin-top:6px"},[el("b",{text:"Q"+(qi+1)+". "}),Q.q+" → "+String.fromCharCode(65+Q.answer)+") "+Q.options[Q.answer]]))});
    var play=el("button",{cls:"btn",type:"button",text:"Écouter"});play.addEventListener("click",function(){if(speaking)stopPlaying();startPlaying([t])});
    var show=el("button",{cls:"btn",type:"button",text:"Texte"});show.addEventListener("click",function(){tr.hidden=!tr.hidden});
    host.appendChild(el("div",{cls:"list",style:"gap:6px"},[el("div",{cls:"item"},[el("div",{cls:"grow"},[el("div",{text:t.title,style:"font-weight:500"}),el("div",{cls:"muted",style:"font-size:.82rem",text:(t.part||"Écoute")+" · "+((t.questions||[]).length)+" questions"})]),play,show]),tr]));
  });
}

/* ---------- Notifications ---------- */
function b64ToU8(s){var p="=".repeat((4-s.length%4)%4),b=(s+p).replace(/-/g,"+").replace(/_/g,"/"),r=atob(b),a=new Uint8Array(r.length);for(var i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a}
function isStandalone(){return (window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true}
function renderNotif(){
  var st=$("notifState"),btn=$("notifBtn");
  if(!("serviceWorker" in navigator)||!("PushManager" in window)){
    st.textContent=isStandalone()?"Ce téléphone ne gère pas les notifications web (iOS 16.4 minimum).":"Ajoute d'abord l'app à ton écran d'accueil (Partager → Sur l'écran d'accueil), puis ouvre-la depuis l'icône.";
    btn.disabled=true;return;
  }
  btn.disabled=false;
  if(Notification.permission==="granted"){st.textContent="Notifications autorisées.";btn.textContent="Afficher le code des notifications"}
  else if(Notification.permission==="denied"){st.textContent="Notifications refusées. Réactive-les dans Réglages → Notifications → Cap HEC.";btn.disabled=true}
  else{st.textContent="Active les notifications pour recevoir tes rappels (abdos, salle, QCM, bilan).";btn.textContent="Activer les notifications"}
}
$("notifBtn").addEventListener("click",async function(){
  var btn=this;
  try{
    var perm=await Notification.requestPermission();
    if(perm!=="granted"){renderNotif();return}
    var reg=await navigator.serviceWorker.ready;
    var sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(VAPID_PUBLIC)});
    showCode(JSON.stringify(sub));
  }catch(e){$("notifState").textContent="Impossible d'activer les notifications ("+(e&&e.name||"")+" "+(e&&e.message||"erreur")+")."}
});
function showCode(code){
  var ta=$("copyArea");ta.hidden=false;ta.value=code;ta.readOnly=true;
  $("notifState").textContent="Notifications autorisées. Touche « Copier le code » ci-dessous, puis colle-le dans le secret PUSH_SUBSCRIPTIONS sur GitHub.";
  var cb=$("copyCode");cb.hidden=false;
}
$("copyCode").addEventListener("click",function(){
  var ta=$("copyArea"),btn=this;ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);
  var ok=false;try{ok=document.execCommand("copy")}catch(e){}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(function(){btn.textContent="Code copié ✓"},function(){btn.textContent=ok?"Code copié ✓":"Sélectionne le texte et copie-le"})}
  else btn.textContent=ok?"Code copié ✓":"Sélectionne le texte et copie-le";
});
// Si les notifications sont déjà autorisées, réaffiche le code au chargement
if("serviceWorker" in navigator&&"PushManager" in window&&window.Notification&&Notification.permission==="granted"){navigator.serviceWorker.ready.then(function(r){return r.pushManager.getSubscription()}).then(function(s){if(s)showCode(JSON.stringify(s))}).catch(function(){})}

/* ---------- Chargement du contenu ---------- */
async function getJSON(p){var r=await fetch(p+"?t="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error(p);return r.json()}
async function loadAll(){
  var cached=lsGet("caphec.content",null);
  if(cached)apply(cached);
  try{
    var c={routine:await getJSON("content/routine.json"),qcm:await getJSON("content/qcm.json"),listening:await getJSON("content/listening.json"),carnet:await getJSON("content/carnet.json")};
    lsSet("caphec.content",c);apply(c);showStatus(null);
  }catch(e){if(!cached)showStatus("Pas de connexion : impossible de charger ton contenu. Réessaie avec du réseau.")}
}
function apply(c){
  routine=c.routine||routine;
  qcms=((c.qcm&&c.qcm.items)||[]).slice().sort(function(a,b){return (a.created<b.created)?1:-1});
  tracks=((c.listening&&c.listening.items)||[]).slice().sort(function(a,b){return (a.created<b.created)?1:-1});
  carnet=c.carnet||null;
  renderDay();renderWeek();renderDeadlines();renderQcmList();renderTracks();renderCarnet();
}
document.addEventListener("visibilitychange",function(){if(!document.hidden){renderDay();renderWeek();loadAll()}});
if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js").then(renderNotif,renderNotif)}else renderNotif();
var hashView=(location.hash||"").slice(1);if(views.indexOf(hashView)>=0)setView(hashView);
loadAll();
})();
