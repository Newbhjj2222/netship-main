import { db } from "../../components/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { username, postId, lastPosition } = req.body;

      if (!username || !postId) {
        return res.status(400).json({ error: "Missing data" });
      }

      await setDoc(doc(db, "reading_progress", `${username}_${postId}`), {
        username,
        postId,
        lastPosition: lastPosition || 0,
        updatedAt: serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    }

    if (req.method === "GET") {
      const { username, postId } = req.query;

      if (!username || !postId) {
        return res.status(400).json({ error: "Missing data" });
      }

      const ref = doc(db, "reading_progress", `${username}_${postId}`);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return res.status(200).json({ lastPosition: 0 });
      }

      return res.status(200).json(snap.data());
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
