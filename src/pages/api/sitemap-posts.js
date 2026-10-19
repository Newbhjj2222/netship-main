// pages/api/sitemap-posts.js

import { db } from "@/components/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

export const runtime = "nodejs";

export default async function handler(req, res) {
  try {
    const domain = "https://www.newtalentsg.co.rw";

    const snapshot = await getDocs(
      query(
        collection(db, "posts"),
        orderBy("createdAt", "desc")
      )
    );

    const stories = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      const head = data.head || "";

      const match = head.match(
        /^(.*?)\s*(?:S\d+|Season\s*\d+)?\s*(?:EP|Episode)?\s*\d+/i
      );

      const title = match
        ? match[1].trim()
        : head.trim();

      if (title) {
        stories[title] = true;
      }
    });


    const storiesXml = Object.keys(stories)
      .map((title) => `
<url>
 <loc>${domain}/story/${encodeURIComponent(title)}</loc>
 <changefreq>weekly</changefreq>
 <priority>0.9</priority>
</url>
`)
      .join("");


    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${storiesXml}
</urlset>`;


    res.setHeader(
      "Content-Type",
      "text/xml"
    );

    res.status(200).send(sitemap);

  } catch(error) {
    console.error(error);
    res.status(500).send(
      "Error generating sitemap"
    );
  }
}
