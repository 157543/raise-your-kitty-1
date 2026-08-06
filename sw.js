"use strict";

const APP_VERSION = "cloud-cat-app-v4-5-3-20260806-1";
const APP_CACHE = `${APP_VERSION}-shell`;
const IMAGE_CACHE = "cloud-cat-webp-local-cache-v20-webp-20260806-v4-5-3-layout-stability";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=v453-20260806-1",
  "./cats.js?v=v453-20260806-1",
  "./encyclopedia.js?v=v453-20260806-1",
  "./assets.js?v=v453-20260806-1",
  "./relationships.js?v=v453-20260806-1",
  "./events.js?v=v453-20260806-1",
  "./tasks.js?v=v453-20260806-1",
  "./achievements.js?v=v453-20260806-1",
  "./game.js?v=v453-20260806-1"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => (name.startsWith("cloud-cat-app-") || name.startsWith("cloud-cat-webp-")) && ![APP_CACHE, IMAGE_CACHE].includes(name))
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(APP_CACHE);
  try {
    const freshRequest = new Request(request, { cache: "no-store" });
    const response = await fetch(freshRequest);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) || (fallbackKey ? await cache.match(fallbackKey) : null) || Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.toLowerCase().endsWith(".webp")) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (["style", "script"].includes(request.destination) || /\.(?:css|js)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(APP_CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
