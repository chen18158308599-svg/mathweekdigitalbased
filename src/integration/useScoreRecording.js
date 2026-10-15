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

function hasUnsavedPlayers(record) {
  return record.requiredSlots.some(
    (slot) => record.players[slot]?.state !== "submitted"
  );
}

function sortSubmissions(submissions) {
  return submissions.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );
}

export function useScoreRecording() {
  const [submissions, setSubmissions] = useState(() =>
    sortSubmissions(
      getPendingPostGameResults().filter(
        (record) => isCompleteResult(record) && hasUnsavedPlayers(record)
      )
    )
  );
  const [activeAttemptId, setActiveAttemptId] = useState(
    () => submissions[0]?.attemptId ?? null
  );
  const [resultRevision, setResultRevision] = useState(0);

  const pendingSubmissions = submissions.filter(
    (record) => isCompleteResult(record) && hasUnsavedPlayers(record)
  );
  const pendingSubmission =
    submissions.find((record) => record.attemptId === activeAttemptId) ??
    submissions[0] ??
    null;

  const storeSubmission = useCallback((record) => {
    setSubmissions((current) =>
      sortSubmissions([
        ...current.filter((item) => item.attemptId !== record.attemptId),
        record,
      ])
    );
  }, []);

  const setActiveSubmission = useCallback((attemptId) => {
    setActiveAttemptId(attemptId);
  }, []);

  const updatePlayer = useCallback((attemptId, playerSlot, player) => {
    const updated = updatePostGamePlayer(attemptId, playerSlot, player);
    storeSubmission(updated);
  }, [storeSubmission]);

  const submitPlayer = useCallback(async (attemptId, playerSlot, player) => {
    try {
      const updated = await submitPostGamePlayer(attemptId, playerSlot, player);
      storeSubmission(updated);
      return updated;
    } catch (error) {
      const updated = getPendingPostGameResults().find(
        (record) => record.attemptId === attemptId
      );
      if (updated) storeSubmission(updated);
      throw error;
    }
  }, [storeSubmission]);

  useEffect(() => {
    function acceptResult(localGameId, result) {
      try {
        const pending = queuePostGameResult(localGameId, result);
        if (isCompleteResult(pending)) {
          storeSubmission(pending);
          setActiveAttemptId(pending.attemptId);
          setResultRevision((revision) => revision + 1);
        }
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
  }, [storeSubmission]);

  return {
    pendingSubmission,
    pendingSubmissions,
    resultRevision,
    setActiveSubmission,
    updatePlayer,
    submitPlayer,
  };
}
