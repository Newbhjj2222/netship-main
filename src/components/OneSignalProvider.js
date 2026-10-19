import { useEffect } from "react";
import Script from "next/script";

const ONESIGNAL_APP_ID =
  "e0ef3bbd-9bec-4d6c-a50a-7a330d1bc902";

export default function OneSignalProvider() {

  useEffect(() => {

    if (typeof window === "undefined") {
      return;
    }

    window.OneSignalDeferred =
      window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(
      async function (OneSignal) {

        try {

          console.log(
            "OneSignal initializing..."
          );

          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,

            notifyButton: {
              enable: false,
            },

            allowLocalhostAsSecureOrigin: true,
          });

          console.log(
            "OneSignal initialized."
          );

        } catch (error) {

          console.error(
            "OneSignal initialization error:",
            error
          );

        }

      }
    );

  }, []);


  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}
