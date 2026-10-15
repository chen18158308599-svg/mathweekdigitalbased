import { useState } from "react";
import { GAME_ACCESS } from "../config/gameAccess";
import { createPlayerSessionId } from "../integration/mathverseApi.js";
import "./PlayerRegistration.css";

const TWO_PLAYER_GAMES = new Set(["conway", "planarity"]);

function createPlayer() {
  return { username: "", studentId: "" };
}

export default function PlayerRegistration({ gameId, onContinue, onBack }) {
  const playerCount = TWO_PLAYER_GAMES.has(gameId) ? 2 : 1;
  const [players, setPlayers] = useState(() =>
    Array.from({ length: playerCount }, createPlayer)
  );
  const [sessionIds, setSessionIds] = useState(() =>
    Array.from({ length: playerCount }, createPlayerSessionId)
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const game = GAME_ACCESS[gameId];

  function updatePlayer(index, field, value) {
    if (hasAttemptedSubmit) {
      setSessionIds((current) =>
        current.map((sessionId, playerIndex) =>
          playerIndex === index ? createPlayerSessionId() : sessionId
        )
      );
    }
    setSubmissionError("");
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index ? { ...player, [field]: value } : player
      )
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const normalizedPlayers = players.map((player) => ({
      username: player.username.trim(),
      studentId: player.studentId.trim(),
    }));

    setHasAttemptedSubmit(true);
    if (normalizedPlayers.some((player) => !player.username || !player.studentId)) {
      return;
    }

    setSubmitting(true);
    setSubmissionError("");
    try {
      await onContinue(normalizedPlayers, sessionIds);
    } catch (error) {
      setSubmissionError(
        error?.code === "PROXY_NOT_CONFIGURED"
          ? "Registration server is not configured. Please contact the organiser."
          : "Registration could not be saved. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="player-registration">
      <section className="player-registration-card" aria-labelledby="player-registration-title">
        <span className="player-registration-eyebrow">{game.name}</span>
        <h1 id="player-registration-title">PLAYER REGISTRATION</h1>
        <p>Enter player details for this session.</p>

        <form className="player-registration-form" onSubmit={handleSubmit}>
          {players.map((player, index) => {
            const playerNumber = index + 1;
            const usernameInvalid = hasAttemptedSubmit && !player.username.trim();
            const studentIdInvalid = hasAttemptedSubmit && !player.studentId.trim();

            return (
              <fieldset className="player-registration-fields" key={playerNumber}>
                {playerCount === 2 && <legend>PLAYER {playerNumber}</legend>}
                <label>
                  <span>USERNAME</span>
                  <input
                    type="text"
                    autoComplete="off"
                    maxLength={40}
                    required
                    value={player.username}
                    onChange={(event) => updatePlayer(index, "username", event.target.value)}
                    aria-invalid={usernameInvalid}
                  />
                  {usernameInvalid && <small>Enter a username.</small>}
                </label>
                <label>
                  <span>STUDENT ID</span>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    maxLength={20}
                    required
                    value={player.studentId}
                    onChange={(event) => updatePlayer(index, "studentId", event.target.value)}
                    aria-invalid={studentIdInvalid}
                  />
                  {studentIdInvalid && <small>Enter a student ID.</small>}
                </label>
              </fieldset>
            );
          })}

          {submissionError && (
            <p className="player-registration-api-error" role="alert">
              {submissionError}
            </p>
          )}

          <button className="player-registration-submit" type="submit" disabled={submitting}>
            {submitting ? "REGISTERING..." : "CONTINUE TO GAME"}
          </button>
        </form>

        <button
          className="player-registration-back"
          type="button"
          onClick={onBack}
          disabled={submitting}
        >
          BACK
        </button>
      </section>
    </main>
  );
}
