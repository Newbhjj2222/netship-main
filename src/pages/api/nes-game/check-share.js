import {
  getTaskExpiry,
  getUserTask,
  getUsernameFromRequest,
  requireMethod,
  rewardTask,
  SHARE_REWARD,
  SHARE_REQUIRED_CLICKS,
} from "../../../lib/nesGame";

export default async function handler(req, res) {
  if (!requireMethod(req, "POST")) {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  try {
    const username = getUsernameFromRequest(req);

    if (!username) {
      return res.status(401).json({
        message: "Login required.",
      });
    }

    const {
      taskId,
      sessionId,
    } = req.body || {};

    if (!taskId) {
      return res.status(400).json({
        message: "Task ID irakenewe.",
      });
    }

    const task = await getUserTask(
      taskId,
      username
    );

    if (!task) {
      return res.status(404).json({
        message: "Task ntabwo ibonetse.",
      });
    }

    if (
      sessionId &&
      task.sessionId &&
      sessionId !== task.sessionId
    ) {
      return res.status(403).json({
        message:
          "Iyi task yatangijwe kuri session itandukanye.",
      });
    }

    const expiresAt =
      task.expiresAt?.toDate
        ? task.expiresAt.toDate()
        : new Date(task.expiresAt);

    if (
      expiresAt instanceof Date &&
      !Number.isNaN(expiresAt.getTime()) &&
      Date.now() > expiresAt.getTime()
    ) {
      return res.status(410).json({
        message:
          "Share task yarangiye. Tangira indi task.",
      });
    }

    const clicks = Number(
      task.clicks || 0
    );

    const requiredClicks = Number(
      task.requiredClicks ||
        SHARE_REQUIRED_CLICKS
    );

    if (clicks < requiredClicks) {
      return res.status(200).json({
        success: true,
        completed: false,
        clicks,
        requiredClicks,
        reward: SHARE_REWARD,
      });
    }

    const result = await rewardTask({
      taskId,
      username,
      reward: SHARE_REWARD,
      taskType: "share",

      validateTask: (freshTask) => {
        const freshClicks = Number(
          freshTask.clicks || 0
        );

        const freshRequired = Number(
          freshTask.requiredClicks ||
            SHARE_REQUIRED_CLICKS
        );

        const freshExpiry =
          freshTask.expiresAt?.toDate
            ? freshTask.expiresAt.toDate()
            : new Date(freshTask.expiresAt);

        if (
          freshExpiry instanceof Date &&
          !Number.isNaN(
            freshExpiry.getTime()
          ) &&
          Date.now() >
            freshExpiry.getTime()
        ) {
          return {
            valid: false,
            message:
              "Share task yarangiye.",
          };
        }

        if (freshClicks < freshRequired) {
          return {
            valid: false,
            message:
              "Clicks zisabwa ntiziragera.",
          };
        }

        if (
          freshTask.status ===
          "completed"
        ) {
          return {
            valid: false,
            message:
              "Task yamaze kurangira.",
          };
        }

        return {
          valid: true,
        };
      },
    });

    return res.status(200).json({
      success: true,
      ...result,
      clicks,
      requiredClicks,
    });
  } catch (error) {
    console.error(
      "CHECK SHARE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to check share task.",
    });
  }
}
