const CACHE_NAME = "newtal-offline-v1";

const OFFLINE_URL = "/offline";
const DRAFTS_URL = "/dashboard/drafts";

/*
|--------------------------------------------------------------------------
| Pages dushaka kubika mbere
|--------------------------------------------------------------------------
*/

const PRECACHE_URLS = [
  OFFLINE_URL,
  DRAFTS_URL,
];

/*
|--------------------------------------------------------------------------
| INSTALL
|--------------------------------------------------------------------------
*/

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        /*
         * Bika offline page na drafts page.
         *
         * Niba imwe muri izi pages yanze kubikwa,
         * ntitushaka ko installation yose ipfa.
         */

        for (const url of PRECACHE_URLS) {
          try {
            await cache.add(url);
          } catch (error) {
            console.error(
              `Service Worker: Failed to cache ${url}`,
              error
            );
          }
        }
      })
  );

  /*
   * Bituma version nshya ya SW idategereza
   * ko tabs zose zishaje zifunga.
   */
  self.skipWaiting();
});

/*
|--------------------------------------------------------------------------
| ACTIVATE
|--------------------------------------------------------------------------
*/

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter(
              (key) => key !== CACHE_NAME
            )
            .map((key) => {
              console.log(
                "Service Worker: deleting old cache:",
                key
              );

              return caches.delete(key);
            })
        );
      })
      .then(() => {
        /*
         * SW nshya ihita ifata control ya pages
         * ziri gufunguka.
         */
        return self.clients.claim();
      })
  );
});

/*
|--------------------------------------------------------------------------
| FETCH
|--------------------------------------------------------------------------
*/

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /*
   * Dufata GET gusa.
   *
   * POST, PUT, DELETE n'izindi ntizihindurwa.
   */
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(
    request.url
  );

  /*
   * Ntitukore kuri external websites.
   */
  if (
    url.origin !==
    self.location.origin
  ) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | PAGE NAVIGATION
  |--------------------------------------------------------------------------
  */

  if (
    request.mode === "navigate"
  ) {
    event.respondWith(
      (async () => {
        /*
         * 1. Banza dushake page nshya kuri internet.
         */
        try {
          const response =
            await fetch(request);

          /*
           * Niba page ari nzima,
           * tuyibike muri cache.
           */
          if (
            response &&
            response.ok
          ) {
            const cache =
              await caches.open(
                CACHE_NAME
              );

            /*
             * Cache copy kuko response
             * ishobora gukoreshwa rimwe gusa.
             */
            await cache.put(
              request,
              response.clone()
            );
          }

          return response;
        } catch (error) {
          /*
           * 2. Internet ntihari.
           *
           * Banza ushake URL nyirizina
           * muri cache.
           */
          const cache =
            await caches.open(
              CACHE_NAME
            );

          const cachedPage =
            await cache.match(
              request
            );

          if (cachedPage) {
            return cachedPage;
          }

          /*
           * 3. Niba URL nyirizina itabitswe,
           * cyane cyane kuri drafts,
           * gerageza drafts page.
           */
          if (
            url.pathname ===
            DRAFTS_URL
          ) {
            const cachedDrafts =
              await cache.match(
                DRAFTS_URL
              );

            if (cachedDrafts) {
              return cachedDrafts;
            }
          }

          /*
           * 4. Niba nta page ibonetse,
           * garuka kuri offline page.
           */
          const offlinePage =
            await cache.match(
              OFFLINE_URL
            );

          if (offlinePage) {
            return offlinePage;
          }

          /*
           * 5. Fallback ya nyuma cyane.
           */
          return new Response(
            `
              <!DOCTYPE html>
              <html lang="rw">
                <head>
                  <meta charset="UTF-8">
                  <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                  >
                  <title>Offline</title>
                </head>

                <body>
                  <h2>Offline</h2>
                  <p>
                    Internet ntabwo ihari kandi
                    offline page ntabwo irabikwa.
                  </p>
                </body>
              </html>
            `,
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/html; charset=utf-8",
              },
            }
          );
        }
      })()
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | /offline
  |--------------------------------------------------------------------------
  */

  if (
    url.pathname ===
      OFFLINE_URL ||
    url.pathname.startsWith(
      "/offline/"
    )
  ) {
    event.respondWith(
      (async () => {
        const cache =
          await caches.open(
            CACHE_NAME
          );

        /*
         * Banza ugerageze cache.
         */
        const cached =
          await cache.match(
            request
          );

        if (cached) {
          return cached;
        }

        /*
         * Niba itari muri cache,
         * gerageza internet.
         */
        try {
          const response =
            await fetch(request);

          if (
            response &&
            response.ok
          ) {
            await cache.put(
              request,
              response.clone()
            );
          }

          return response;
        } catch {
          /*
           * Niba internet nayo itariho,
           * gerageza offline page nyirizina.
           */
          const offline =
            await cache.match(
              OFFLINE_URL
            );

          if (offline) {
            return offline;
          }

          return new Response(
            "<h2>Offline</h2><p>Offline page ntabwo irabikwa.</p>",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/html; charset=utf-8",
              },
            }
          );
        }
      })()
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | OTHER STATIC RESOURCES
  |--------------------------------------------------------------------------
  |
  | CSS, JS, images, fonts n'izindi GET requests:
  |
  | 1. Banza urebe cache.
  | 2. Niba zidahari, zive kuri internet.
  | 3. Iyo zibonetse, zibike.
  |
  */

  event.respondWith(
    (async () => {
      const cache =
        await caches.open(
          CACHE_NAME
        );

      const cached =
        await cache.match(
          request
        );

      if (cached) {
        return cached;
      }

      try {
        const response =
          await fetch(request);

        /*
         * Bika resources z'ingenzi
         * zituruka kuri server yawe.
         */
        if (
          response &&
          response.ok &&
          response.type === "basic"
        ) {
          await cache.put(
            request,
            response.clone()
          );
        }

        return response;
      } catch (error) {
        /*
         * Niba resource ari image kandi
         * itabonetse, reka browser ikore
         * normal fallback yayo.
         */
        if (
          request.destination ===
          "image"
        ) {
          return new Response(
            "",
            {
              status: 404,
            }
          );
        }

        /*
         * Ku zindi resources,
         * subiza error isobanutse.
         */
        return new Response(
          "",
          {
            status: 503,
          }
        );
      }
    })()
  );
});
