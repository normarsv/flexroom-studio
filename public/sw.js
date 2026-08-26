const CACHE_NAME = 'flexroom-v1'

// On install: activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// On activate: clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// Network-first strategy: always try the network, fall back to cache
// This ensures booking data is always fresh
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  // Don't intercept API calls or Supabase requests — always network
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful page navigations and static assets
        if (response.ok && (event.request.mode === 'navigate' || url.pathname.match(/\.(png|jpg|svg|webp|woff2|css|js)$/))) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
