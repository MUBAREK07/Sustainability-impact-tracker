const CACHE_NAME = 'sit-static-v3'
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

  // For navigation/static assets: network-first to avoid stale CSS/JS after updates
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return res
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL)))
  )
})
