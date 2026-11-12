var CACHE="caphec-v5";
var SHELL=["./","index.html","app.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-180.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL)}));self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){
  if(e.request.method!=="GET")return;
  // Réseau d'abord (contenu toujours à jour), cache si hors ligne
  e.respondWith(fetch(e.request).then(function(r){var copy=r.clone();if(r.ok&&new URL(e.request.url).origin===location.origin){caches.open(CACHE).then(function(c){c.put(e.request.url.split("?")[0],copy)})}return r}).catch(function(){return caches.match(e.request.url.split("?")[0])}));
});
self.addEventListener("push",function(e){
  var d={title:"Cap HEC",body:"Un rappel t'attend.",view:"jour"};
  try{if(e.data)d=Object.assign(d,e.data.json())}catch(_){try{d.body=e.data.text()}catch(__){}}
  e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:"icons/icon-192.png",badge:"icons/icon-192.png",data:{view:d.view||"jour"},tag:d.tag||undefined}));
});
self.addEventListener("notificationclick",function(e){
  e.notification.close();
  var url="./#"+((e.notification.data&&e.notification.data.view)||"jour");
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(cs){for(var i=0;i<cs.length;i++){if("focus" in cs[i]){cs[i].navigate&&cs[i].navigate(url);return cs[i].focus()}}return self.clients.openWindow(url)}));
});
