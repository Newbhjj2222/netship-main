// pages/api/payout.js

import { db } from "../../components/firebase";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { randomUUID } from "crypto";

// ======================================================
// PAWAPAY PRODUCTION
// ======================================================

// Shyiramo PawaPay API key yawe nshya hano.
// Ntukoreshe ya production key wari washyize muri chat.
const PAWAPAY_API_KEY =
  "eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjIwMTgiLCJtYXYiOiIxIiwiZXhwIjoyMDgwMzgxOTU2LCJpYXQiOjE3NjQ4NDkxNTYsInBtIjoiREFGLFBBRiIsImp0aSI6ImI0YWM3MzQ4LWYyNDEtNDVjNy04MmQ1LTI0ZTgwZjVlZmJhNSJ9.8qxWc0Aph9QhrhKcfPXvaFe5l_RzSPjOWsCGFr6W88QpMmcyWwqm7W7M83-UCE4OrM8UQZOncdnx-t1MACbObA";

const PAWAPAY_BASE_URL =
  "https://api.pawapay.io";

const COUNTRY = "RWA";
const CURRENCY = "RWF";

// ======================================================
// SERVICE UNAVAILABLE MESSAGE
// ======================================================

const SERVICE_UNAVAILABLE_MESSAGE =
  "Serivisi yo kubikura ubu ntabwo iri gukora. Turaza kuyishyira online vuba. Gerageza nyuma.";

// ======================================================
// PAWAPAY REQUEST
// ======================================================

async function pawapayRequest(
  endpoint,
  options = {}
) {
  const response = await fetch(
    `${PAWAPAY_BASE_URL}${endpoint}`,
    {
      ...options,

      headers: {
        Authorization:
          `Bearer ${PAWAPAY_API_KEY}`,

        Accept:
          "application/json",

        "Content-Type":
          "application/json",

        ...(options.headers || {}),
      },
    }
  );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  return {
    response,
    data,
  };
}

// ======================================================
// CHECK PAWAPAY WALLET BALANCE
//
// IMPORTANT:
//
// Iyi function ntivuga ko balance ari 0 igihe
// response ya PawaPay itarasomwa neza.
//
// Itandukanya:
//
// SUCCESS
// API_ERROR
// NETWORK_ERROR
// INVALID_RESPONSE
// NO_RWF_BALANCE
// ======================================================

async function checkPawaPayBalance() {
  try {
    const result =
      await pawapayRequest(
        `/v2/wallet-balances?country=${COUNTRY}`,
        {
          method: "GET",
        }
      );

    console.log(
      "========================================"
    );

    console.log(
      "PAWAPAY WALLET BALANCE"
    );

    console.log(
      "HTTP STATUS:",
      result.response.status
    );

    console.log(
      "RESPONSE:",
      JSON.stringify(
        result.data,
        null,
        2
      )
    );

    console.log(
      "========================================"
    );

    // --------------------------------------------------
    // PAWAPAY API ERROR
    // --------------------------------------------------

    if (
      !result.response.ok
    ) {
      return {
        ok: false,

        type:
          "API_ERROR",

        balance:
          null,

        details:
          result.data,
      };
    }

    // --------------------------------------------------
    // READ BALANCES
    // --------------------------------------------------

    const balances =
      result.data?.balances;

    if (
      !Array.isArray(
        balances
      )
    ) {
      console.error(
        "PawaPay wallet response ntabwo irimo balances array."
      );

      return {
        ok: false,

        type:
          "INVALID_RESPONSE",

        balance:
          null,

        details:
          result.data,
      };
    }

    // --------------------------------------------------
    // FIND RWANDA RWF BALANCES
    // --------------------------------------------------

    const rwfBalances =
      balances.filter(
        (item) =>
          String(
            item?.country || ""
          ).toUpperCase() ===
            COUNTRY &&
          String(
            item?.currency || ""
          ).toUpperCase() ===
            CURRENCY
      );

    console.log(
      "RWA/RWF BALANCES:",
      JSON.stringify(
        rwfBalances,
        null,
        2
      )
    );

    // --------------------------------------------------
    // NO RWF BALANCE
    // --------------------------------------------------

    if (
      rwfBalances.length ===
      0
    ) {
      console.log(
        "PawaPay nta RWF balance yabonetse."
      );

      return {
        ok: true,

        type:
          "NO_RWF_BALANCE",

        balance:
          0,

        details:
          balances,
      };
    }

    // --------------------------------------------------
    // TOTAL RWF BALANCE
    // --------------------------------------------------

    let totalBalance = 0;

    for (
      const item of rwfBalances
    ) {
      const value =
        Number(
          item?.balance
        );

      if (
        Number.isFinite(
          value
        )
      ) {
        totalBalance +=
          value;
      }
    }

    console.log(
      "========================================"
    );

    console.log(
      "PAWAPAY RWF TOTAL BALANCE:",
      totalBalance
    );

    console.log(
      "========================================"
    );

    return {
      ok: true,

      type:
        "SUCCESS",

      balance:
        totalBalance,

      details:
        rwfBalances,
    };
  } catch (error) {
    console.error(
      "PawaPay wallet balance error:",
      error
    );

    return {
      ok: false,

      type:
        "NETWORK_ERROR",

      balance:
        null,

      error:
        error?.message ||
        "PawaPay wallet balance check failed.",
    };
  }
}

// ======================================================
// CHECK PAYOUT STATUS
// ======================================================

async function checkPayoutStatus(
  payoutId
) {
  try {
    const result =
      await pawapayRequest(
        `/v2/payouts/${encodeURIComponent(
          payoutId
        )}`,
        {
          method: "GET",
        }
      );

    return {
      ok:
        result.response.ok,

      statusCode:
        result.response.status,

      data:
        result.data,
    };
  } catch (error) {
    console.error(
      "PawaPay status check error:",
      error
    );

    return {
      ok: false,

      statusCode: 0,

      data: null,

      error:
        error?.message,
    };
  }
}

// ======================================================
// DEDUCT NES
//
// NES zigabanywa gusa nyuma ya PawaPay ACCEPTED.
// ======================================================

async function deductNES({
  username,
  nesAmount,
  payoutId,
}) {
  const authorRef =
    doc(
      db,
      "authors",
      username
    );

  const authorSnap =
    await getDoc(
      authorRef
    );

  if (
    !authorSnap.exists()
  ) {
    throw new Error(
      "User ntaboneka muri Firestore."
    );
  }

  const authorData =
    authorSnap.data();

  const currentNES =
    Number(
      authorData.nes || 0
    );

  if (
    !Number.isFinite(
      currentNES
    )
  ) {
    throw new Error(
      "NES balance ntabwo ari valid."
    );
  }

  if (
    currentNES <
    nesAmount
  ) {
    throw new Error(
      `NES zihagije ntabwo zihari. Afite ${currentNES}, asaba ${nesAmount}.`
    );
  }

  const newNES =
    currentNES -
    nesAmount;

  await updateDoc(
    authorRef,
    {
      nes:
        newNES,

      updatedAt:
        new Date().toISOString(),
    }
  );

  console.log(
    "========================================"
  );

  console.log(
    "NES DEDUCTED"
  );

  console.log(
    "Username:",
    username
  );

  console.log(
    "Payout ID:",
    payoutId
  );

  console.log(
    "Old NES:",
    currentNES
  );

  console.log(
    "Deducted NES:",
    nesAmount
  );

  console.log(
    "New NES:",
    newNES
  );

  console.log(
    "========================================"
  );

  return {
    oldNES:
      currentNES,

    deductedNES:
      nesAmount,

    newNES:
      newNES,
  };
}

// ======================================================
// MARK PAYOUT AS DEDUCTED
// ======================================================

async function markNESDeducted({
  payoutRef,
  payoutId,
  payoutData,
  nesAmount,
}) {
  await updateDoc(
    payoutRef,
    {
      status:
        payoutData?.status ||
        "ACCEPTED",

      pawapayResponse:
        payoutData || null,

      pawapayStatus:
        payoutData?.status ||
        "ACCEPTED",

      nesDeducted:
        true,

      nesDeductedAmount:
        nesAmount,

      nesDeductedAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    }
  );

  console.log(
    "Payout marked as NES deducted:",
    payoutId
  );
}

// ======================================================
// MAIN HANDLER
// ======================================================

export default async function handler(
  req,
  res
) {
  // ====================================================
  // METHOD
  // ====================================================

  if (
    req.method !==
    "POST"
  ) {
    return res
      .status(405)
      .json({
        success: false,

        message:
          "Method not allowed.",
      });
  }

  // ====================================================
  // API KEY CHECK
  // ====================================================

  if (
    !PAWAPAY_API_KEY ||
    PAWAPAY_API_KEY.includes(
      "SHYIRAMO"
    )
  ) {
    return res
      .status(500)
      .json({
        success: false,

        message:
          "PawaPay API key ntabwo yashyizwe neza.",
      });
  }

  let payoutId =
    null;

  let payoutRef =
    null;

  try {
    // ==================================================
    // 1. INPUT
    // ==================================================

    const {
      phone,
      provider,
      nesRequested,
      rwfAmount,
      username,
    } =
      req.body || {};

    // ==================================================
    // 2. BASIC VALIDATION
    // ==================================================

    if (
      !phone ||
      !provider ||
      !nesRequested ||
      !rwfAmount ||
      !username
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Missing information.",

          nesDeducted:
            false,
        });
    }

    const cleanUsername =
      String(
        username
      ).trim();

    const requestedNES =
      Number(
        nesRequested
      );

    const amount =
      Number(
        rwfAmount
      );

    if (
      !cleanUsername
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Username ntabwo ari valid.",

          nesDeducted:
            false,
        });
    }

    if (
      !Number.isInteger(
        requestedNES
      ) ||
      requestedNES <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "NES amount ntabwo ari valid.",

          nesDeducted:
            false,
        });
    }

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "RWF amount ntabwo ari valid.",

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 3. CHECK USER
    // ==================================================

    const authorRef =
      doc(
        db,
        "authors",
        cleanUsername
      );

    const authorSnap =
      await getDoc(
        authorRef
      );

    if (
      !authorSnap.exists()
    ) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "User ntaboneka.",

          nesDeducted:
            false,
        });
    }

    const authorData =
      authorSnap.data();

    const currentNES =
      Number(
        authorData.nes || 0
      );

    if (
      !Number.isFinite(
        currentNES
      )
    ) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "NES balance ntabwo ari valid.",

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 4. CHECK USER NES
    // ==================================================

    if (
      currentNES <
      requestedNES
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Ntabwo ufite NES zihagije.",

          currentNES,

          requestedNES,

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 5. CHECK PAWAPAY WALLET
    //
    // MBERE YO KOHEREZA PAYOUT.
    // ==================================================

    console.log(
      "========================================"
    );

    console.log(
      "CHECKING PAWAPAY FUNDS"
    );

    console.log(
      "Requested payout:",
      amount,
      CURRENCY
    );

    console.log(
      "========================================"
    );

    const walletCheck =
      await checkPawaPayBalance();

    // --------------------------------------------------
    // PAWAPAY BALANCE COULD NOT BE VERIFIED
    // --------------------------------------------------

    if (
      !walletCheck.ok
    ) {
      console.error(
        "PawaPay balance verification failed:",
        walletCheck
      );

      return res
        .status(503)
        .json({
          success: false,

          serviceUnavailable:
            true,

          message:
            SERVICE_UNAVAILABLE_MESSAGE,

          nesDeducted:
            false,
        });
    }

    const pawaPayBalance =
      Number(
        walletCheck.balance
      );

    // --------------------------------------------------
    // INSUFFICIENT PAWAPAY FUNDS
    // --------------------------------------------------

    if (
      !Number.isFinite(
        pawaPayBalance
      ) ||
      pawaPayBalance <
        amount
    ) {
      console.log(
        "========================================"
      );

      console.log(
        "PAWAPAY FUNDS NOT ENOUGH"
      );

      console.log(
        "Required:",
        amount
      );

      console.log(
        "Available:",
        pawaPayBalance
      );

      console.log(
        "PAYOUT WILL NOT BE SENT"
      );

      console.log(
        "NES WILL NOT BE DEDUCTED"
      );

      console.log(
        "========================================"
      );

      return res
        .status(503)
        .json({
          success: false,

          serviceUnavailable:
            true,

          message:
            SERVICE_UNAVAILABLE_MESSAGE,

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 6. ACTIVE CONFIG
    // ==================================================

    const configResult =
      await pawapayRequest(
        `/v2/active-conf?country=${COUNTRY}&operationType=PAYOUT`,
        {
          method:
            "GET",
        }
      );

    if (
      !configResult
        .response
        .ok
    ) {
      console.error(
        "PawaPay active configuration failed:",
        configResult.data
      );

      return res
        .status(503)
        .json({
          success: false,

          serviceUnavailable:
            true,

          message:
            SERVICE_UNAVAILABLE_MESSAGE,

          nesDeducted:
            false,
        });
    }

    const countries =
      Array.isArray(
        configResult
          .data
          ?.countries
      )
        ? configResult
            .data
            .countries
        : [];

    const country =
      countries.find(
        (item) =>
          item.country ===
          COUNTRY
      );

    if (
      !country
    ) {
      return res
        .status(503)
        .json({
          success: false,

          serviceUnavailable:
            true,

          message:
            SERVICE_UNAVAILABLE_MESSAGE,

          nesDeducted:
            false,
        });
    }

    const prefix =
      String(
        country.prefix ||
          "250"
      );

    const providers =
      Array.isArray(
        country.providers
      )
        ? country.providers
        : [];

    // ==================================================
    // 7. PROVIDER
    // ==================================================

    const selectedProvider =
      providers.find(
        (item) =>
          item.provider ===
          provider
      );

    if (
      !selectedProvider
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Provider wahisemo ntabwo yemerewe kuri PawaPay.",

          provider,

          availableProviders:
            providers.map(
              (item) =>
                item.provider
            ),

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 8. RWF CONFIG
    // ==================================================

    const currencies =
      Array.isArray(
        selectedProvider
          .currencies
      )
        ? selectedProvider
            .currencies
        : [];

    const rwfConfig =
      currencies.find(
        (item) =>
          item.currency ===
          CURRENCY
      );

    if (
      !rwfConfig
    ) {
      return res
        .status(503)
        .json({
          success: false,

          serviceUnavailable:
            true,

          message:
            SERVICE_UNAVAILABLE_MESSAGE,

          nesDeducted:
            false,
        });
    }

    const payoutConfig =
      rwfConfig
        .operationTypes
        ?.PAYOUT;

    if (
      !payoutConfig
    ) {
      return res
        .status(503)
        .json({
          success: false,

          serviceUnavailable:
            true,

          message:
            SERVICE_UNAVAILABLE_MESSAGE,

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 9. AMOUNT LIMITS
    // ==================================================

    const minAmount =
      payoutConfig
        .minAmount !==
      undefined
        ? Number(
            payoutConfig
              .minAmount
          )
        : null;

    const maxAmount =
      payoutConfig
        .maxAmount !==
      undefined
        ? Number(
            payoutConfig
              .maxAmount
          )
        : null;

    if (
      minAmount !==
        null &&
      Number.isFinite(
        minAmount
      ) &&
      amount <
        minAmount
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            `Amount ntoya cyane. Minimum ni ${minAmount} RWF.`,

          minAmount,

          amount,

          nesDeducted:
            false,
        });
    }

    if (
      maxAmount !==
        null &&
      Number.isFinite(
        maxAmount
      ) &&
      amount >
        maxAmount
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            `Amount nini cyane. Maximum ni ${maxAmount} RWF.`,

          maxAmount,

          amount,

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 10. DECIMAL VALIDATION
    // ==================================================

    if (
      payoutConfig
        .decimalsInAmount ===
        "NONE" &&
      !Number.isInteger(
        amount
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Uyu provider ntabwo yemera decimal amount.",

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 11. NORMALIZE PHONE
    // ==================================================

    let normalizedPhone =
      String(
        phone
      )
        .trim()
        .replace(
          /\s+/g,
          ""
        );

    if (
      normalizedPhone.startsWith(
        "+"
      )
    ) {
      normalizedPhone =
        normalizedPhone.substring(
          1
        );
    }

    if (
      normalizedPhone.startsWith(
        prefix
      )
    ) {
      // Already international.
    } else if (
      normalizedPhone.startsWith(
        "0"
      )
    ) {
      normalizedPhone =
        prefix +
        normalizedPhone.substring(
          1
        );
    } else {
      normalizedPhone =
        prefix +
        normalizedPhone;
    }

    console.log(
      "Normalized phone:",
      normalizedPhone
    );

    // ==================================================
    // 12. PREDICT PROVIDER
    // ==================================================

    const predictionResult =
      await pawapayRequest(
        "/v2/predict-provider",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              phoneNumber:
                normalizedPhone,
            }),
        }
      );

    if (
      !predictionResult
        .response
        .ok
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "PawaPay yanze kwemeza phone number.",

          details:
            predictionResult
              .data,

          nesDeducted:
            false,
        });
    }

    const predictedCountry =
      predictionResult
        .data
        ?.country;

    const predictedProvider =
      predictionResult
        .data
        ?.provider;

    const sanitizedPhone =
      predictionResult
        .data
        ?.phoneNumber;

    if (
      predictedCountry !==
      COUNTRY
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Iyi nimero ntabwo ari iya Rwanda.",

          country:
            predictedCountry,

          nesDeducted:
            false,
        });
    }

    if (
      !sanitizedPhone
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "PawaPay ntiyatanze nimero isukuye.",

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 13. VERIFY PROVIDER
    // ==================================================

    if (
      predictedProvider &&
      predictedProvider !==
        provider
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Provider wahisemo ntabwo ihuye na nimero watanze.",

          selectedProvider:
            provider,

          predictedProvider:
            predictedProvider,

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 14. PROVIDER AVAILABILITY
    // ==================================================

    const availabilityResult =
      await pawapayRequest(
        `/v2/availability?country=${COUNTRY}&operationType=PAYOUT`,
        {
          method:
            "GET",
        }
      );

    if (
      availabilityResult
        .response
        .ok
    ) {
      const availabilityCountries =
        Array.isArray(
          availabilityResult
            .data
        )
          ? availabilityResult
              .data
          : [];

      const RwandaAvailability =
        availabilityCountries.find(
          (item) =>
            item.country ===
            COUNTRY
        );

      const providerAvailability =
        RwandaAvailability
          ?.providers
          ?.find(
            (item) =>
              item.provider ===
              provider
          );

      const providerStatus =
        providerAvailability
          ?.operationTypes
          ?.PAYOUT;

      console.log(
        "Provider payout availability:",
        providerStatus
      );

      if (
        providerStatus ===
        "CLOSED"
      ) {
        return res
          .status(503)
          .json({
            success: false,

            serviceUnavailable:
              true,

            message:
              SERVICE_UNAVAILABLE_MESSAGE,

            provider,

            availability:
              providerStatus,

            nesDeducted:
              false,
          });
      }
    }

    // ==================================================
    // 15. CREATE PAYOUT ID
    // ==================================================

    payoutId =
      randomUUID();

    payoutRef =
      doc(
        db,
        "payouts",
        payoutId
      );

    // ==================================================
    // 16. SAVE PAYOUT AS PENDING
    // ==================================================

    await setDoc(
      payoutRef,
      {
        payoutId,

        username:
          cleanUsername,

        phone:
          sanitizedPhone,

        provider,

        predictedProvider:
          predictedProvider ||
          null,

        country:
          COUNTRY,

        currency:
          CURRENCY,

        nesRequested:
          requestedNES,

        rwfAmount:
          amount,

        status:
          "PENDING",

        nesDeducted:
          false,

        nesDeductedAmount:
          0,

        pawapayResponse:
          null,

        pawapayStatus:
          null,

        providerTransactionId:
          null,

        failureReason:
          null,

        createdAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),
      }
    );

    // ==================================================
    // 17. PAYOUT PAYLOAD
    // ==================================================

    const payoutPayload =
      {
        payoutId,

        amount:
          String(
            amount
          ),

        currency:
          CURRENCY,

        recipient: {
          type:
            "MMO",

          accountDetails: {
            phoneNumber:
              sanitizedPhone,

            provider,
          },
        },
      };

    console.log(
      "========================================"
    );

    console.log(
      "SENDING PAYOUT TO PAWAPAY"
    );

    console.log(
      JSON.stringify(
        payoutPayload,
        null,
        2
      )
    );

    console.log(
      "========================================"
    );

    // ==================================================
    // 18. SEND PAYOUT
    // ==================================================

    let initiationResult;

    try {
      initiationResult =
        await pawapayRequest(
          "/v2/payouts",
          {
            method:
              "POST",

            body:
              JSON.stringify(
                payoutPayload
              ),
          }
        );
    } catch (
      networkError
    ) {
      console.error(
        "PawaPay network error:",
        networkError
      );

      // ----------------------------------------------
      // CHECK IF PAWAPAY ACTUALLY CREATED IT
      // ----------------------------------------------

      const statusCheck =
        await checkPayoutStatus(
          payoutId
        );

      if (
        statusCheck
          .data
          ?.status ===
        "FOUND"
      ) {
        const found =
          statusCheck
            .data
            .data;

        await updateDoc(
          payoutRef,
          {
            status:
              found.status ||
              "PENDING",

            pawapayResponse:
              found,

            pawapayStatus:
              found.status ||
              "PENDING",

            updatedAt:
              new Date().toISOString(),
          }
        );

        // IMPORTANT:
        // Ntitugabanya NES kuko final
        // status itaramenyekana.

        return res
          .status(202)
          .json({
            success:
              true,

            message:
              "Payout iri PENDING. PawaPay yakiriye request ariko final status ntiramenyekana.",

            payoutId,

            status:
              found.status ||
              "PENDING",

            nesDeducted:
              false,
          });
      }

      if (
        statusCheck
          .data
          ?.status ===
        "NOT_FOUND"
      ) {
        await updateDoc(
          payoutRef,
          {
            status:
              "FAILED",

            failureReason:
              "Payout ntiyageze kuri PawaPay.",

            updatedAt:
              new Date().toISOString(),
          }
        );

        return res
          .status(503)
          .json({
            success:
              false,

            serviceUnavailable:
              true,

            message:
              SERVICE_UNAVAILABLE_MESSAGE,

            payoutId,

            nesDeducted:
              false,
          });
      }

      await updateDoc(
        payoutRef,
        {
          status:
            "PENDING",

          failureReason:
            "PawaPay response ntiyamenyekanye kubera network error.",

          updatedAt:
            new Date().toISOString(),
        }
      );

      return res
        .status(202)
        .json({
          success:
            true,

          message:
            "Payout iri PENDING. Final status ntiramenyekana.",

          payoutId,

          status:
            "PENDING",

          nesDeducted:
            false,
        });
    }

    const {
      response:
        payoutResponse,

      data:
        payoutData,
    } =
      initiationResult;

    console.log(
      "========================================"
    );

    console.log(
      "PAWAPAY PAYOUT RESPONSE"
    );

    console.log(
      "HTTP:",
      payoutResponse.status
    );

    console.log(
      JSON.stringify(
        payoutData,
        null,
        2
      )
    );

    console.log(
      "========================================"
    );

    // ==================================================
    // 19. UNKNOWN ERROR
    // ==================================================

    if (
      payoutResponse
        .status >=
        500 &&
      payoutData
        ?.failureCode ===
        "UNKNOWN_ERROR"
    ) {
      const statusCheck =
        await checkPayoutStatus(
          payoutId
        );

      if (
        statusCheck
          .data
          ?.status ===
        "FOUND"
      ) {
        const found =
          statusCheck
            .data
            .data;

        await updateDoc(
          payoutRef,
          {
            status:
              found.status ||
              "PENDING",

            pawapayResponse:
              found,

            pawapayStatus:
              found.status ||
              "PENDING",

            updatedAt:
              new Date().toISOString(),
          }
        );

        return res
          .status(202)
          .json({
            success:
              true,

            message:
              "Payout isigaye PENDING kuko final status itaramenyekana.",

            payoutId,

            status:
              found.status ||
              "PENDING",

            nesDeducted:
              false,
          });
      }

      if (
        statusCheck
          .data
          ?.status ===
        "NOT_FOUND"
      ) {
        await updateDoc(
          payoutRef,
          {
            status:
              "FAILED",

            pawapayResponse:
              payoutData,

            failureReason:
              "PawaPay UNKNOWN_ERROR kandi payout ntiyabonetse.",

            updatedAt:
              new Date().toISOString(),
          }
        );

        return res
          .status(503)
          .json({
            success:
              false,

            serviceUnavailable:
              true,

            message:
              SERVICE_UNAVAILABLE_MESSAGE,

            payoutId,

            nesDeducted:
              false,
          });
      }

      await updateDoc(
        payoutRef,
        {
          status:
            "PENDING",

          pawapayResponse:
            payoutData,

          failureReason:
            "UNKNOWN_ERROR. Final status ntiramenyekana.",

          updatedAt:
            new Date().toISOString(),
        }
      );

      return res
        .status(202)
        .json({
          success:
            true,

          message:
            "Payout isigaye PENDING kuko status yayo itaramenyekana.",

          payoutId,

          status:
            "PENDING",

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 20. PAWAPAY REJECTED
    // ==================================================

    if (
      !payoutResponse.ok
    ) {
      const failureMessage =
        payoutData
          ?.failureReason ||
        payoutData
          ?.message ||
        payoutData
          ?.failureMessage ||
        payoutData
          ?.error ||
        "PawaPay rejected payout.";

      await updateDoc(
        payoutRef,
        {
          status:
            "FAILED",

          pawapayResponse:
            payoutData,

          pawapayStatus:
            payoutData
              ?.status ||
            "FAILED",

          failureReason:
            failureMessage,

          updatedAt:
            new Date().toISOString(),
        }
      );

      // ----------------------------------------------
      // NTA NES ZIGABANYWE
      // ----------------------------------------------

      return res
        .status(
          payoutResponse
            .status >=
            400 &&
          payoutResponse
            .status <
            600
            ? payoutResponse
                .status
            : 400
        )
        .json({
          success:
            false,

          message:
            failureMessage,

          payoutId,

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 21. PAWAPAY ACCEPTED
    //
    // AHA NI HO DUTEGEREZA KO PAYOUT YEMEWE.
    // ==================================================

    const initialStatus =
      payoutData
        ?.status ||
      "ACCEPTED";

    console.log(
      "========================================"
    );

    console.log(
      "PAWAPAY ACCEPTED"
    );

    console.log(
      "Payout ID:",
      payoutId
    );

    console.log(
      "Status:",
      initialStatus
    );

    console.log(
      "========================================"
    );

    // ==================================================
    // 22. DEDUCT NES
    //
    // NTA DEDUCTION YABAYE MBERE YAHO.
    // ==================================================

    let deductionResult;

    try {
      deductionResult =
        await deductNES({
          username:
            cleanUsername,

          nesAmount:
            requestedNES,

          payoutId,
        });
    } catch (
      deductionError
    ) {
      console.error(
        "NES deduction failed:",
        deductionError
      );

      await updateDoc(
        payoutRef,
        {
          status:
            initialStatus,

          pawapayResponse:
            payoutData,

          pawapayStatus:
            initialStatus,

          nesDeducted:
            false,

          nesDeductionError:
            deductionError
              .message,

          failureReason:
            "PawaPay accepted payout but NES deduction failed.",

          updatedAt:
            new Date().toISOString(),
        }
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "PawaPay yemeye payout ariko NES ntizashoboye kugabanywa.",

          payoutId,

          status:
            initialStatus,

          nesDeducted:
            false,
        });
    }

    // ==================================================
    // 23. MARK NES DEDUCTED
    // ==================================================

    try {
      await markNESDeducted({
        payoutRef,

        payoutId,

        payoutData,

        nesAmount:
          requestedNES,
      });
    } catch (
      markError
    ) {
      console.error(
        "Failed to mark payout as deducted:",
        markError
      );

      // NES ZAMAZE KUGABANUKA.
      // NTIZONGERA KUGABANWA.

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "NES zamaze kugabanywa ariko payout record ntiyashoboye kuvugururwa.",

          payoutId,

          status:
            initialStatus,

          nesDeducted:
            true,

          oldNES:
            deductionResult
              .oldNES,

          deductedNES:
            deductionResult
              .deductedNES,

          newNES:
            deductionResult
              .newNES,
        });
    }

    // ==================================================
    // 24. SUCCESS
    // ==================================================

    console.log(
      "========================================"
    );

    console.log(
      "PAYOUT SUCCESS"
    );

    console.log(
      "Payout ID:",
      payoutId
    );

    console.log(
      "Amount:",
      amount,
      CURRENCY
    );

    console.log(
      "NES deducted:",
      requestedNES
    );

    console.log(
      "Old NES:",
      deductionResult
        .oldNES
    );

    console.log(
      "New NES:",
      deductionResult
        .newNES
    );

    console.log(
      "========================================"
    );

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          "Kubikuza byagenze neza. PawaPay yemeye payout kandi NES zagabanyijwe.",

        payoutId,

        status:
          initialStatus,

        amount,

        currency:
          CURRENCY,

        phoneNumber:
          sanitizedPhone,

        provider,

        nesRequested:
          requestedNES,

        nesDeducted:
          true,

        oldNES:
          deductionResult
            .oldNES,

        newNES:
          deductionResult
            .newNES,
      });
  } catch (
    error
  ) {
    console.error(
      "========================================"
    );

    console.error(
      "PAYOUT UNEXPECTED ERROR"
    );

    console.error(
      error
    );

    console.error(
      "========================================"
    );

    if (
      payoutRef &&
      payoutId
    ) {
      try {
        await updateDoc(
          payoutRef,
          {
            failureReason:
              error?.message ||
              "Unknown error",

            updatedAt:
              new Date().toISOString(),
          }
        );
      } catch (
        firebaseError
      ) {
        console.error(
          "Could not update payout:",
          firebaseError
        );
      }
    }

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          "Server error yabaye mu payout.",

        payoutId,

        nesDeducted:
          false,
      });
  }
}
