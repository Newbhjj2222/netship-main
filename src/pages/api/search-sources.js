// pages/api/search-sources.js

import {
  searchSources,
} from "../../lib/sourceSearch";

export default async function handler(
  req,
  res
) {
  /*
   * Only POST.
   */
  if (req.method !== "POST") {
    res.setHeader(
      "Allow",
      "POST"
    );

    return res.status(405).json({
      success: false,
      error:
        "Only POST requests are allowed.",
    });
  }

  try {
    const {
      text,
    } = req.body || {};

    /*
     * Validate text.
     */
    if (
      typeof text !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Text must be a string.",
      });
    }

    const cleanText =
      text.trim();

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        error:
          "Text cannot be empty.",
      });
    }

    /*
     * Protect the endpoint from
     * extremely large requests.
     */
    if (
      cleanText.length > 100000
    ) {
      return res.status(413).json({
        success: false,
        error:
          "Text is too long. Maximum is 100,000 characters.",
      });
    }

    const results =
      await searchSources(
        cleanText
      );

    return res.status(200).json({
      success: true,

      count:
        results.length,

      results,
    });
  } catch (error) {
    console.error(
      "Search sources API error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Failed to search sources.",
    });
  }
}
