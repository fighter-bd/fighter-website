const CACHE_NAME = "fighter-cache-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./fighter-cricket-logo.png"
];

// Install (ফাইল ক্যাশ করা)
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch (অফলাইন সাপোর্ট)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// 🔔 পুশ নোটিফিকেশন সাপোর্ট (ব্যাকগ্রাউন্ড হ্যান্ডেলিং)
self.addEventListener("push", event => {
  // আমরা যেহেতু মেইন ফাইল থেকে নোটিফিকেশন ট্রিগার করছি, 
  // তাই ব্রাউজারকে নোটিফিকেশন ফ্রেন্ডলি রাখতে এই ব্ল্যাংক ইভেন্টটি দরকার।
});

// 🎯 নোটিফিকেশনে ক্লিক করলে যা হবে (সাইট ওপেন বা ফোকাস করা)
self.addEventListener("notificationclick", event => {
  event.notification.close(); // ক্লিক করার পর নোটিফিকেশনটি বন্ধ হয়ে যাবে

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      // যদি সাইটটি অলরেডি কোনো ট্যাবে ওপেন থাকে, তবে সেই ট্যাবে নিয়ে যাবে
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // যদি সাইট ওপেন না থাকে, তবে নতুন ট্যাবে ওপেন করবে
      if (clients.openWindow) {
        return clients.openWindow("./");
      }
    })
  );
});