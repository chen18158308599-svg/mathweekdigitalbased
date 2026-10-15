import { useCallback, useEffect, useState } from "react";
import { COMPETITION_RESULT_EVENT } from "../scoring/competitionScoring.js";
import {
  getPendingPostGameResults,
  queuePostGameResult,
  submitPostGamePlayer,
  updatePostGamePlayer,
} from "./mathverseApi.js";
import { getLocalGameIdForResult } from "./gameApiConfig.js";

const AVERAGE_RESULT_EVENT = "mathweek:average-result";

function isCompleteResult(record) {
  return record.requiredSlots.every((slot) => record.results[slot]);
}

export function useScoreRecording() {
  const [pendingSubmission, setPendingSubmission] = useState(() => {
    const saved = getPendingPostGameResults()
      .filter(isCompleteResult)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    return saved ?? null;
  });

  useEffect(() => {
    function acceptResult(localGameId, result) {
      try {
        const pending = queuePostGameResult(localGameId, result);
        if (isCompleteResult(pending)) setPendingSubmission(pending);
      } catch (error) {
        console.error("Unable to retain finalized game result:", error);
      }
    }

    function handleCompetitionResult(event) {
      const result = event.detail;
      const localGameId = getLocalGameIdForResult(result?.gameId);
      if (localGameId) acceptResult(localGameId, result);
    }

    function handleAverageResult(event) {
      acceptResult("average", event.detail);
    }

    window.addEventListener(COMPETITION_RESULT_EVENT, handleCompetitionResult);
    window.addEventListener(AVERAGE_RESULT_EVENT, handleAverageResult);
    return () => {
      window.removeEventListener(
        COMPETITION_RESULT_EVENT,
        handleCompetitionResult
      );
      window.removeEventListener(AVERAGE_RESULT_EVENT, handleAverageResult);
    };
  }, []);

  const updatePlayer = useCallback((attemptId, playerSlot, player) => {
    const updated = updatePostGamePlayer(attemptId, playerSlot, player);
    setPendingSubmission(updated);
  }, []);

  const submitPlayer = useCallback(async (attemptId, playerSlot, player) => {
    try {
      const updated = await submitPostGamePlayer(attemptId, playerSlot, player);
      setPendingSubmission(updated);
      return updated;
    } catch (error) {
      const updated = getPendingPostGameResults().find(
        (record) => record.attemptId === attemptId
      );
      if (updated) setPendingSubmission(updated);
      throw error;
    }
  }, []);

  const clearPending = useCallback(() => setPendingSubmission(null), []);

  return {
    pendingSubmission,
    updatePlayer,
    submitPlayer,
    clearPending,
  };
}
