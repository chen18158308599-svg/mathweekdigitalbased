import { useState } from "react";
import { GAME_ACCESS } from "../config/gameAccess";
import "./GamePasswordGate.css";

export default function GamePasswordGate({ gameId, onAuthorized, onBack }) {
  const [pin, setPin] = useState("");
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const game = GAME_ACCESS[gameId];

  function handleSubmit(event) {
    event.preventDefault();

    if (pin === game.pin) {
      setHasError(false);
      onAuthorized();
      return;
    }

    setPin("");
    setHasError(true);
  }

  return (
    <main className="game-password-gate">
      <section className="game-password-card" aria-labelledby="game-password-title">
        <span className="game-password-eyebrow">{game.name}</span>
        <h1 id="game-password-title">GAME ACCESS</h1>
        <p>Enter your 4-digit game PIN</p>

        <form className="game-password-form" onSubmit={handleSubmit}>
          <label className="game-password-label" htmlFor="game-pin">
            GAME PIN
          </label>
          <div className="game-password-input-wrap">
            <input
              id="game-pin"
              type={isPinVisible ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              autoComplete="off"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                setHasError(false);
              }}
              aria-label="4-digit game PIN"
              aria-invalid={hasError}
              aria-describedby={hasError ? "game-pin-error" : undefined}
              required
            />
            <button
              className="game-password-visibility"
              type="button"
              onClick={() => setIsPinVisible((visible) => !visible)}
              aria-pressed={isPinVisible}
            >
              {isPinVisible ? "Hide PIN" : "Show PIN"}
            </button>
          </div>

          {hasError && (
            <p className="game-password-error" id="game-pin-error" role="alert">
              Incorrect PIN. Please try again.
            </p>
          )}

          <button className="game-password-submit" type="submit">
            ENTER GAME
          </button>
        </form>

        <button className="game-password-back" type="button" onClick={onBack}>
          BACK TO HOME
        </button>
      </section>
    </main>
  );
}
