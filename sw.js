const V='efr-v16';
const SHELL=['./','index.html','app.css','app.js','manifest.webmanifest','img/hero.webp','img/lancar.webp','img/analisar.webp','img/carteira.webp','img/meta.webp','img/vazio.webp','img/icon.webp','img/icon-192.png','img/favicon.png','fonts/Inter-Regular.woff','fonts/Inter-Medium.woff','fonts/Inter-SemiBold.woff','fonts/Inter-Bold.woff','fonts/InterDisplay-ExtraBold.woff','fonts/InterDisplay-Black.woff'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api/'))return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
