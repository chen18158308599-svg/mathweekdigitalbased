import { useState } from "react";
import { GAME_ACCESS } from "../config/gameAccess.js";
import "./PostGameSubmission.css";

function PlayerForm({
  slot,
  player,
  result,
  isAverage,
  showSavedConfirmation,
  onChange,
  onSubmit,
}) {
  const [username, setUsername] = useState(player.username);
  const [studentId, setStudentId] = useState(player.studentId);
  const [submitting, setSubmitting] = useState(false);
  const saved = player.state === "submitted";

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || saved) return;
    setSubmitting(true);
    try {
      await onSubmit(slot, { username: username.trim(), studentId: studentId.trim() });
    } catch (error) {
      console.error(`Post-game score submission failed for ${slot}:`, error);
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(field, value) {
    if (field === "username") setUsername(value);
    else setStudentId(value);
    onChange(slot, {
      username: field === "username" ? value : username,
      studentId: field === "studentId" ? value : studentId,
    });
  }

  return (
    <form className="post-game-player" onSubmit={handleSubmit}>
      {slot !== "single" && <h2>PLAYER {slot === "p1" ? "1" : "2"}</h2>}
      <div className="post-game-result-line">
        <span>{isAverage ? "CHOSEN NUMBER" : `${result.outcome.toUpperCase()} · FINAL SCORE`}</span>
        <strong>{result.finalScore}</strong>
      </div>
      {saved ? (
        showSavedConfirmation ? (
          <p className="post-game-saved" role="status">
            SAVED SUCCESSFULLY
          </p>
        ) : null
      ) : (
        <>
          <label>
            <span>USERNAME</span>
            <input
              type="text"
              autoComplete="off"
              maxLength={40}
              required
              value={username}
              onChange={(event) => handleChange("username", event.target.value)}
            />
          </label>
          <label>
            <span>STUDENT ID</span>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={20}
              required
              value={studentId}
              onChange={(event) => handleChange("studentId", event.target.value)}
            />
          </label>
          {player.error && (
            <p className="post-game-error" role="alert">
              {player.error.message || "Could not save. Please retry."}
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? "SAVING..." : "SUBMIT SCORE"}
          </button>
        </>
      )}
    </form>
  );
}

export default function PostGameSubmission({
  submission,
  onUpdatePlayer,
  onSubmitPlayer,
  onReturnHome,
}) {
  const allSaved = submission.requiredSlots.every(
    (slot) => submission.players[slot].state === "submitted"
  );
  const isAverage = submission.localGameId === "average";

  return (
    <main className="post-game-submission">
      <section className="post-game-card" aria-labelledby="post-game-title">
        <span className="post-game-eyebrow">
          {GAME_ACCESS[submission.localGameId]?.name}
        </span>
        <h1 id="post-game-title">POST-GAME REGISTRATION</h1>
        <div className="post-game-player-list">
          {submission.requiredSlots.map((slot) => (
            <PlayerForm
              key={slot}
              slot={slot}
              player={submission.players[slot]}
              result={submission.results[slot]}
              isAverage={isAverage}
              showSavedConfirmation={submission.requiredSlots.length === 2}
              onChange={(playerSlot, player) =>
                onUpdatePlayer(submission.attemptId, playerSlot, player)
              }
              onSubmit={(playerSlot, player) =>
                onSubmitPlayer(submission.attemptId, playerSlot, player)
              }
            />
          ))}
        </div>
        {allSaved ? (
          <>
            <p className="post-game-complete" role="status">
              SAVED SUCCESSFULLY
            </p>
            <div className="post-game-actions">
              <button type="button" onClick={onReturnHome}>
                RETURN HOME
              </button>
              <button type="button" onClick={onReturnHome}>
                PLAY AGAIN
              </button>
            </div>
          </>
        ) : (
          <p className="post-game-note">
            {submission.requiredSlots.length === 2
              ? "Both player scores must be saved to complete this match."
              : "Your finalized result is retained for a safe retry."}
          </p>
        )}
      </section>
    </main>
  );
}
