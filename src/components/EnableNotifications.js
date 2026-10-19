import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function EnableNotifications() {
  const { t } = useI18n();


  const [loading, setLoading] =
    useState(false);

  const [status, setStatus] =
    useState("");


  const enableNotifications =
    async () => {

      setLoading(true);
      setStatus("");

      try {

        if (
          typeof window === "undefined"
        ) {
          return;
        }


        if (
          !window.OneSignalDeferred
        ) {

          throw new Error(
            "OneSignal ntabwo iratangira."
          );

        }


        window.OneSignalDeferred.push(
          async function (OneSignal) {

            try {

              const permission =
                await Notification.requestPermission();

              console.log(
                "Browser permission:",
                permission
              );


              if (
                permission !== "granted"
              ) {

                setStatus(
                  t("Ntiwemeye notifications.")
                );

                return;
              }


              await OneSignal.User.PushSubscription.optIn();


              const optedIn =
                OneSignal.User
                  .PushSubscription
                  .optedIn;


              if (optedIn) {

                setStatus(
                  t("Notifications zatangiye gukora.")
                );

                console.log(
                  "OneSignal subscription active."
                );

              } else {

                setStatus(
                  t("Subscription ntiyakozwe.")
                );

              }

            } catch (error) {

              console.error(
                "Subscription error:",
                error
              );

              setStatus(
                error?.message ||
                t("Habaye ikibazo mu kwiyandikisha.")
              );

            }

          }
        );

      } catch (error) {

        console.error(error);

        setStatus(
          error?.message ||
          t("Habaye ikibazo.")
        );

      } finally {

        setLoading(false);

      }

    };


  return (
    <div>

      <button
        type="button"
        onClick={enableNotifications}
        disabled={loading}
      >

        {loading
          ? t("Birategurwa...")
          : t("🔔 Fungura Notifications")}

      </button>


      {status && (
        <p>
          {status}
        </p>
      )}

    </div>
  );
}
