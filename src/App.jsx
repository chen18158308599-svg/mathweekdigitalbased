import { useState } from "react";
import "./App.css";

import Home from "./Home/Home";

import AverageGame from "./games/AverageGame/AverageGame";
import Conway from "./games/Conway/Conway";
import DealOrNoDeal from "./games/DealOrNoDeal/DealOrNoDeal";
import KNN from "./games/KNN/KNN";
import NumberSequence from "./games/NumberSequence/NumberSequence";
import Planarity from "./games/Planarity/Planarity";
import SymmetryGame from "./games/Symmetry/Symmetry";

export default function App() {
  const [page, setPage] = useState("home");

  /* =====================================================
     HOME
     ===================================================== */

  if (page === "home") {
    return (
      <Home
        onSelectGame={setPage}
      />
    );
  }

  /* =====================================================
     GAMES
     ===================================================== */

  return (
    <>
      {/* =========================
          GLOBAL HOME BUTTON
      ========================= */}

      <button
        type="button"
        className="back-home-button"
        onClick={() => setPage("home")}
        aria-label="Return to Home"
        title="Home"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 11.5L12 4l9 7.5" />
          <path d="M5.5 10v9h5v-5h3v5h5v-9" />
        </svg>
      </button>

      {/* =========================
          AVERAGE GAME
      ========================= */}

      {page === "average" && (
        <AverageGame />
      )}

      {/* =========================
          CONWAY
      ========================= */}

      {page === "conway" && (
        <Conway />
      )}

      {/* =========================
          DEAL OR NO DEAL
      ========================= */}

      {page === "deal" && (
        <DealOrNoDeal />
      )}

      {/* =========================
          KNN
      ========================= */}

      {page === "knn" && (
        <KNN />
      )}

      {/* =========================
          NUMBER SEQUENCE
      ========================= */}

      {page === "sequence" && (
        <NumberSequence />
      )}

      {/* =========================
          PLANARITY
      ========================= */}

      {page === "planarity" && (
        <Planarity />
      )}

      {/* =========================
          SYMMETRY
      ========================= */}

      {page === "symmetry" && (
        <SymmetryGame
          onBack={() => setPage("home")}
        />
      )}
    </>
  );
}