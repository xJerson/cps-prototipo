/* Service worker del "modo Gustavo". El prototipo se partió en varios
   archivos (índice + estilos + una serie de .js) — hay que cachear TODOS,
   no solo el índice, o si no la app queda vacía sin internet: index.html
   carga pero sus <script src> no resuelven. Sube CACHE_V cuando cambies
   algo de estos archivos para que el celular baje la versión nueva. */
const CACHE_V = "gustavo-v2";
const SHELL = [
  "index.html?gustavo=1",
  "gustavo.html",
  "manifest.json",
  "icon-gustavo.svg",
  "estilos.css",
  "catalogos.js",
  "datos.js",
  "helpers.js",
  "render-core.js",
  "celular-tecnico.js",
  "celular-supervisor.js",
  "vistas.js",
  "acciones.js",
  "bootstrap.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_V).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_V).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Cache-first para el shell; para todo lo demás intenta red y si no hay,
   cae al cache. No hay backend real todavía — esto es la parte de "que
   funcione sin señal" que sí se puede probar ya con el prototipo. */
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_V).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => hit)
    )
  );
});
