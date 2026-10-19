import {
  getUserTask,
  getUsernameFromRequest,
  requireMethod,
  rewardTask,
  AD_REWARD,
  AD_REQUIRED_SECONDS,
} from "../../../lib/nesGame";

export default async function handler(req, res) {
  if (!requireMethod(req, "POST")) {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  try {
    const username =
      getUsernameFromRequest(req);

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
        message: "Ad task ntabwo ibonetse.",
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

    const startedAt =
      task.startedAt?.toDate
        ? task.startedAt.toDate()
        : new Date(task.startedAt);

    const expiresAt =
      task.expiresAt?.toDate
        ? task.expiresAt.toDate()
        : new Date(task.expiresAt);

    if (
      Number.isNaN(startedAt.getTime())
    ) {
      return res.status(400).json({
        message:
          "Invalid ad start time.",
      });
    }

    const elapsedSeconds =
      Math.floor(
        (Date.now() -
          startedAt.getTime()) /
          1000
      );

    if (
      expiresAt instanceof Date &&
      !Number.isNaN(
        expiresAt.getTime()
      ) &&
      Date.now() >
        expiresAt.getTime()
    ) {
      return res.status(410).json({
        message:
          "Ad task yarangiye. Tangira indi.",
      });
    }

    if (
      elapsedSeconds <
      AD_REQUIRED_SECONDS
    ) {
      return res.status(400).json({
        message: `Ugomba gutegereza nibura ${AD_REQUIRED_SECONDS} seconds.`,
        remainingSeconds:
          AD_REQUIRED_SECONDS -
          elapsedSeconds,
      });
    }

    const result = await rewardTask({
      taskId,
      username,
      reward: AD_REWARD,
      taskType: "ad",

      validateTask: (freshTask) => {
        const freshStartedAt =
          freshTask.startedAt?.toDate
            ? freshTask.startedAt.toDate()
            : new Date(
                freshTask.startedAt
              );

        const freshExpiresAt =
          freshTask.expiresAt?.toDate
            ? freshTask.expiresAt.toDate()
            : new Date(
                freshTask.expiresAt
              );

        if (
          Number.isNaN(
            freshStartedAt.getTime()
          )
        ) {
          return {
            valid: false,
            message:
              "Invalid start time.",
          };
        }

        const elapsed = Math.floor(
          (Date.now() -
            freshStartedAt.getTime()) /
            1000
        );

        if (
          freshExpiresAt instanceof Date &&
          !Number.isNaN(
            freshExpiresAt.getTime()
          ) &&
          Date.now() >
            freshExpiresAt.getTime()
        ) {
          return {
            valid: false,
            message:
              "Ad task yarangiye.",
          };
        }

        if (
          elapsed <
          AD_REQUIRED_SECONDS
        ) {
          return {
            valid: false,
            message: `Ugomba gutegereza ${AD_REQUIRED_SECONDS} seconds.`,
          };
        }

        if (
          freshTask.status ===
          "completed"
        ) {
          return {
            valid: false,
            message:
              "Ad yamaze guhembwa.",
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
      elapsedSeconds,
    });
  } catch (error) {
    console.error(
      "COMPLETE AD ERROR:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to complete ad.",
    });
  }
}
