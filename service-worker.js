const CACHE_NAME = 'sit-static-v1'
const OFFLINE_URL = '/'
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map(k => {
      if (k !== CACHE_NAME) return caches.delete(k)
    })))
  )
  self.clients.claim()
})

// Basic fetch handler: serve cached static assets, network-first for API calls with fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // API requests: try network then cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then(resp => resp || new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' } })))
    )
    return
  }

  // For navigation or static assets: cache-first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      // put in cache for future
      return caches.open(CACHE_NAME).then(cache => { cache.put(event.request, res.clone()); return res })
    }).catch(() => caches.match(OFFLINE_URL)))
  )
})
