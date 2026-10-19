import { db } from "../../components/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

/* =========================
GET USER FROM COOKIE (nkuko izindi page zikora)
========================= */
function getUserFromCookie(cookieString) {
  const cookies = cookieString || "";
  const userCookie = cookies.split(";").find((c) => c.trim().startsWith("user="));

  if (!userCookie) return null;

  try {
    const cookieValue = userCookie.split("=")[1];
    const userData = JSON.parse(decodeURIComponent(cookieValue));
    return userData;
  } catch {
    return null;
  }
}

/* =========================
HANDLER
========================= */
export default async function handler(req, res) {
  // ===== 1. CHECK METHOD =====
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // ===== 2. GET DATA FROM BODY =====
    const { depositId, phone, username: bodyUsername } = req.body;

    if (!depositId || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing depositId or phone",
      });
    }

    // ===== 3. GET USERNAME FROM COOKIE (nkuko izindi page zikora) =====
    const cookieHeader = req.headers.cookie || "";
    const userData = getUserFromCookie(cookieHeader);

    // ===== 4. PRIORITY: cookie username > body username =====
    const finalUsername = userData?.username || bodyUsername || null;

    console.log("📝 Saving member:", { depositId, phone, finalUsername });

    // ===== 5. CHECK IF USER ALREADY EXISTS IN MEMBERS =====
    const memberRef = doc(db, "members", phone);
    const memberSnap = await getDoc(memberRef);

    if (memberSnap.exists() && memberSnap.data().isMember === true) {
      return res.status(200).json({
        success: true,
        message: "User is already a member.",
        alreadyMember: true,
      });
    }

    // ===== 6. SAVE TO MEMBERS COLLECTION =====
    await setDoc(
      memberRef,
      {
        phone,
        username: finalUsername,
        isMember: true,
        depositId,
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: "deposit-result-page",
      },
      { merge: true }
    );

    console.log(`✅ Member saved: ${phone} (${finalUsername || "anonymous"})`);

    // ===== 7. ALSO UPDATE USERDATE/DATA IF USERNAME EXISTS =====
    if (finalUsername) {
      try {
        const userDateRef = doc(db, "userdate", "data");
        const userDateSnap = await getDoc(userDateRef);

        if (userDateSnap.exists()) {
          const userDateData = userDateSnap.data();
          let userKey = null;

          for (const key in userDateData) {
            const data = userDateData[key];
            if (data?.username === finalUsername || data?.fName === finalUsername) {
              userKey = key;
              break;
            }
          }

          if (userKey) {
            await setDoc(
              doc(db, "userdate", "data"),
              {
                [userKey]: {
                  ...userDateData[userKey],
                  isMember: true,
                  membershipType: "premium",
                  membershipStartDate: new Date().toISOString(),
                  membershipExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                },
              },
              { merge: true }
            );
            console.log(`✅ Userdate updated for ${finalUsername}`);
          }
        }
      } catch (err) {
        console.error("Error updating userdate:", err);
        // Continue even if this fails
      }
    }

    // ===== 8. RETURN SUCCESS =====
    return res.status(200).json({
      success: true,
      message: "Member saved successfully",
      data: {
        phone,
        username: finalUsername,
        depositId,
      },
    });
  } catch (error) {
    console.error("Deposit result error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
