const V='efr-v89';
const SHELL=['./','index.html','app.css','app.js','manifest.webmanifest','img/hero.webp','img/lancar.webp','img/analisar.webp','img/carteira.webp','img/meta.webp','img/vazio.webp','img/reacao1.webp','img/reacao2.webp','img/reacao3.webp','img/reacao4.webp','img/icon.webp','img/icon-192.png','img/favicon.png','fonts/Inter-Regular.woff2','fonts/Inter-SemiBold.woff2','fonts/Inter-Bold.woff2','fonts/InterDisplay-Black.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.pathname.startsWith('/api/'))return;
  if(u.origin===location.origin&&/^\/(fonts|img|oferta\/img)\//.test(u.pathname)){
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok){const k=r.clone();caches.open(V).then(x=>x.put(e.request,k))}return r})));return;
  }
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
