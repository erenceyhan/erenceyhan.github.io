// Notifications only: no request interception, offline cache or user data storage.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url=new URL('/ogretmen/#/getiris',self.location.origin).href;
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=clients.find(client=>new URL(client.url).origin===self.location.origin&&new URL(client.url).pathname.startsWith('/ogretmen/'));
    if(existing){existing.postMessage({type:'teacher-open-returns'});await existing.focus()}
    else await self.clients.openWindow(url);
  })());
});
