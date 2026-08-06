"use strict";

const APP_VERSION = "cloud-cat-app-v4-3-1-20260806";
const APP_CACHE = `${APP_VERSION}-shell`;
const IMAGE_CACHE = "cloud-cat-webp-local-cache-v16-webp-20260806-v4-3-1-expanded-events";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./cats.js",
  "./assets.js",
  "./relationships.js",
  "./events.js",
  "./tasks.js",
  "./game.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("cloud-cat-app-") && ![APP_CACHE, IMAGE_CACHE].includes(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.toLowerCase().endsWith(".webp")) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const hit = await cache.match(request, {ignoreSearch:true});
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(APP_CACHE);
        cache.put("./index.html", response.clone());
        return response;
      } catch (_) {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(APP_CACHE);
    const hit = await cache.match(request);
    const network = fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    }).catch(() => null);
    return hit || (await network) || Response.error();
  })());
});
