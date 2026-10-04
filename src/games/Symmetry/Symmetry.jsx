import { useEffect, useMemo, useRef, useState } from "react";
import symmetryIsland from "../../assets/home-layers/symmetry.png";
import "./Symmetry.css";

/* =========================================================
   ENDLESS SYMMETRY RUNNER
   ========================================================= */

const PLAYER_X = 22;
const WORLD_SCALE = 0.46;
const SEGMENT_LEN = 460;
const MAX_VITALITY = 3;
const START_SPEED = 46;
const MAX_SPEED = 92;

const SKILL_INFO = {
  shield: {
    label: ["相位护盾", "PHASE SHIELD"],
    short: "SHIELD",
    icon: "⬡",
    distance: 560,
  },
  magnet: {
    label: ["磁力场", "MAGNET FIELD"],
    short: "MAGNET",
    icon: "∩",
    distance: 520,
  },
  overdrive: {
    label: ["超载推进", "OVERDRIVE"],
    short: "BOOST",
    icon: "⚡",
    distance: 430,
  },
  repair: {
    label: ["生命修复", "VITALITY REPAIR"],
    short: "REPAIR",
    icon: "+",
    distance: 0,
  },
};

const WINDOW_THEMES = ["meadow", "inferno", "storm", "aurora"];

const COPY = {
  zh: {
    brand: "镜界无尽推进实验",
    introTitle: "镜界疾驰",
    introSub: "SYMMETRY · ENDLESS JET RUN",
    intro:
      "进入无限延伸的镜像实验隧道。按住屏幕启动喷射背包、闪避障碍与锁定导弹，并在高速推进中完成不断出现的对称题。速度、障碍密度与导弹压力会随距离持续增加。",
    launch: "启动无尽推进",
    hold: "按住 / Space 上升",
    release: "松开下降",
    vitality: "生命",
    distance: "距离",
    speed: "速度",
    level: "难度",
    coins: "能源",
    solved: "已解题",
    missile: "导弹锁定",
    warning: "改变高度躲避锁定轨迹",
    repairFull: "生命已满 · 修复核心转化为 15 能源",
    repair: "生命修复 +1",
    shield: "相位护盾已启动",
    magnet: "磁力场已启动",
    boost: "超载推进已启动",
    shieldAbsorb: "相位护盾吸收冲击",
    obstacleHit: "撞击障碍 · 生命 -1",
    missileHit: "导弹命中 · 生命 -1",
    wrong: "答案错误 · 生命 -1",
    correct: "校准正确 · 继续推进",
    failTitle: "推进单元失效",
    failText: "三点生命全部耗尽。本次无尽推进结束。",
    restart: "重新挑战",
    back: "返回大厅",
    guide: "操作说明",
    guide1: "按住屏幕、鼠标或 Space 让角色持续向上喷射；松开后受重力下降。",
    guide2: "闪避激光、尖刺、无人机与追踪导弹。导弹会先锁定当前高度，再高速冲入画面。",
    guide3: "每次答错对称题都会直接失去 1 点生命；途中收集绿色 REPAIR 核心可以恢复 1 点生命。",
    guide4: "跑得越远，速度越快、障碍越密、导弹越频繁。跑道没有固定终点。",
    close: "继续",
    tap: "按住喷射",
  },
  en: {
    brand: "ENDLESS MIRROR PROPULSION",
    introTitle: "Mirror Rush",
    introSub: "SYMMETRY · ENDLESS JET RUN",
    intro:
      "Enter an endlessly extending mirror-research tunnel. Hold to fire the jetpack, dodge hazards and missile locks, and solve recurring symmetry calibrations while the run gets faster and more dangerous over time.",
    launch: "START ENDLESS RUN",
    hold: "Hold / Space to rise",
    release: "Release to descend",
    vitality: "Vitality",
    distance: "Distance",
    speed: "Speed",
    level: "Difficulty",
    coins: "Energy",
    solved: "Solved",
    missile: "MISSILE LOCK",
    warning: "Change altitude before the missile arrives",
    repairFull: "Vitality full · Repair core converted to 15 energy",
    repair: "Vitality restored +1",
    shield: "Phase Shield online",
    magnet: "Magnet Field online",
    boost: "Overdrive online",
    shieldAbsorb: "Phase Shield absorbed the impact",
    obstacleHit: "Obstacle impact · Vitality -1",
    missileHit: "Missile hit · Vitality -1",
    wrong: "Wrong answer · Vitality -1",
    correct: "Calibration correct · Run resumed",
    failTitle: "PROPULSION UNIT OFFLINE",
    failText: "All three vitality points were lost. The endless run is over.",
    restart: "RUN AGAIN",
    back: "RETURN TO HUB",
    guide: "OPERATION MANUAL",
    guide1: "Hold the screen, mouse, or Space to continuously fire the jetpack upward. Release to fall under gravity.",
    guide2: "Avoid lasers, spikes, drones and homing missiles. Missiles first lock your current altitude, then rush into the tunnel.",
    guide3: "Every wrong symmetry answer directly costs 1 vitality. Collect green REPAIR cores along the route to restore 1 vitality.",
    guide4: "The farther you run, the faster the tunnel scrolls, the denser the hazards become, and the more often missiles appear. There is no fixed finish line.",
    close: "CONTINUE",
    tap: "HOLD THRUST",
  },
};

/* =========================================================
   HELPERS
   ========================================================= */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function screenX(at, progress) {
  return PLAYER_X + (at - progress) * WORLD_SCALE;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function nonZeroInt(rng, min = -6, max = 6) {
  let value = 0;
  while (value === 0) value = randInt(rng, min, max);
  return value;
}

function formatCoord(x, y) {
  return `(${x}, ${y})`;
}

function shuffled(values, rng) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function uniqueOptions(correct, distractors, rng) {
  const result = [correct];
  for (const value of distractors) {
    if (!result.includes(value)) result.push(value);
    if (result.length === 3) break;
  }
  return shuffled(result, rng);
}

/* =========================================================
   INFINITE QUESTION GENERATOR
   ========================================================= */

function makeQuestion(index) {
  const rng = mulberry32(index * 7919 + 2026);
  const mode = index % 12;
  const x = nonZeroInt(rng);
  let y = nonZeroInt(rng);
  if (y === x) y += y > 0 ? 1 : -1;

  const base = {
    id: `q-${index}`,
    number: String(index + 1).padStart(2, "0"),
    visual: "axis",
  };

  if (mode === 0) {
    const answer = formatCoord(-x, y);
    return {
      ...base,
      title: ["Y 轴镜像", "Y-AXIS REFLECTION"],
      type: ["轴对称", "AXIS SYMMETRY"],
      visual: "vertical",
      question: [
        `点 P${formatCoord(x, y)} 关于 y 轴对称后坐标是什么？`,
        `Point P${formatCoord(x, y)} is reflected across the y-axis. What is the image coordinate?`,
      ],
      hint: ["关于 y 轴对称：x 变号，y 不变。", "Across the y-axis: change the sign of x; keep y."],
      answer,
      options: uniqueOptions(answer, [formatCoord(x, -y), formatCoord(-x, -y), formatCoord(y, x)], rng),
    };
  }

  if (mode === 1) {
    const answer = formatCoord(x, -y);
    return {
      ...base,
      title: ["X 轴镜像", "X-AXIS REFLECTION"],
      type: ["轴对称", "AXIS SYMMETRY"],
      visual: "horizontal",
      question: [
        `点 P${formatCoord(x, y)} 关于 x 轴对称后坐标是什么？`,
        `Point P${formatCoord(x, y)} is reflected across the x-axis. What is the image coordinate?`,
      ],
      hint: ["关于 x 轴对称：y 变号，x 不变。", "Across the x-axis: change the sign of y; keep x."],
      answer,
      options: uniqueOptions(answer, [formatCoord(-x, y), formatCoord(-x, -y), formatCoord(y, x)], rng),
    };
  }

  if (mode === 2) {
    const answer = formatCoord(y, x);
    return {
      ...base,
      title: ["对角镜像", "DIAGONAL REFLECTION"],
      type: ["y = x", "y = x"],
      visual: "diagonal",
      question: [
        `点 P${formatCoord(x, y)} 关于直线 y = x 对称。新坐标是什么？`,
        `Point P${formatCoord(x, y)} is reflected across y = x. What is the new coordinate?`,
      ],
      hint: ["关于 y = x 对称时交换 x 与 y。", "Reflection across y = x swaps x and y."],
      answer,
      options: uniqueOptions(answer, [formatCoord(-y, x), formatCoord(y, -x), formatCoord(-x, -y)], rng),
    };
  }

  if (mode === 3) {
    const answer = formatCoord(-y, -x);
    return {
      ...base,
      title: ["反对角镜像", "ANTI-DIAGONAL REFLECTION"],
      type: ["y = -x", "y = -x"],
      visual: "antiDiagonal",
      question: [
        `点 P${formatCoord(x, y)} 关于直线 y = -x 对称。新坐标是什么？`,
        `Point P${formatCoord(x, y)} is reflected across y = -x. What is the new coordinate?`,
      ],
      hint: ["关于 y = -x：交换坐标并同时变号。", "Across y = -x: swap the coordinates and change both signs."],
      answer,
      options: uniqueOptions(answer, [formatCoord(y, x), formatCoord(-y, x), formatCoord(y, -x)], rng),
    };
  }

  if (mode === 4) {
    const answer = formatCoord(-y, x);
    return {
      ...base,
      title: ["逆时针旋转", "COUNTER-CLOCKWISE ROTATION"],
      type: ["旋转 90°", "90° ROTATION"],
      visual: "rotation",
      question: [
        `点 P${formatCoord(x, y)} 绕原点逆时针旋转 90°。结果是什么？`,
        `Point P${formatCoord(x, y)} rotates 90° counter-clockwise about the origin. What is the result?`,
      ],
      hint: ["逆时针 90°：(x, y) → (-y, x)。", "90° counter-clockwise: (x, y) → (-y, x)."],
      answer,
      options: uniqueOptions(answer, [formatCoord(y, -x), formatCoord(-x, -y), formatCoord(y, x)], rng),
    };
  }

  if (mode === 5) {
    const answer = formatCoord(y, -x);
    return {
      ...base,
      title: ["顺时针旋转", "CLOCKWISE ROTATION"],
      type: ["旋转 90°", "90° ROTATION"],
      visual: "rotationCW",
      question: [
        `点 P${formatCoord(x, y)} 绕原点顺时针旋转 90°。结果是什么？`,
        `Point P${formatCoord(x, y)} rotates 90° clockwise about the origin. What is the result?`,
      ],
      hint: ["顺时针 90°：(x, y) → (y, -x)。", "90° clockwise: (x, y) → (y, -x)."],
      answer,
      options: uniqueOptions(answer, [formatCoord(-y, x), formatCoord(-x, -y), formatCoord(y, x)], rng),
    };
  }

  if (mode === 6) {
    const answer = formatCoord(-x, -y);
    return {
      ...base,
      title: ["半周旋转", "HALF-TURN"],
      type: ["旋转 180°", "180° ROTATION"],
      visual: "halfTurn",
      question: [
        `点 P${formatCoord(x, y)} 绕原点旋转 180°。新坐标是什么？`,
        `Point P${formatCoord(x, y)} rotates 180° about the origin. What is the new coordinate?`,
      ],
      hint: ["旋转 180° 后 x 与 y 都变号。", "A 180° rotation changes the signs of both coordinates."],
      answer,
      options: uniqueOptions(answer, [formatCoord(-x, y), formatCoord(x, -y), formatCoord(y, x)], rng),
    };
  }

  if (mode === 7) {
    const cx = randInt(rng, -3, 3);
    const cy = randInt(rng, -3, 3);
    const px = cx + nonZeroInt(rng, -5, 5);
    const py = cy + nonZeroInt(rng, -5, 5);
    const ax = 2 * cx - px;
    const ay = 2 * cy - py;
    const answer = formatCoord(ax, ay);
    return {
      ...base,
      title: ["中心对称", "CENTRAL SYMMETRY"],
      type: ["关于点 C 对称", "POINT REFLECTION"],
      visual: "centre",
      question: [
        `P${formatCoord(px, py)} 关于中心 C${formatCoord(cx, cy)} 对称。P′ 是什么？`,
        `P${formatCoord(px, py)} is centrally symmetric about C${formatCoord(cx, cy)}. What is P′?`,
      ],
      hint: ["中心 C 必须是 PP′ 的中点。", "The centre C must be the midpoint of PP′."],
      answer,
      options: uniqueOptions(answer, [formatCoord(2 * cx + px, 2 * cy + py), formatCoord(-px, -py), formatCoord(ax, py)], rng),
    };
  }

  if (mode === 8) {
    const cx = randInt(rng, -4, 4);
    const cy = randInt(rng, -4, 4);
    const dx = nonZeroInt(rng, -4, 4);
    const dy = nonZeroInt(rng, -4, 4);
    const p1 = [cx + dx, cy + dy];
    const p2 = [cx - dx, cy - dy];
    const answer = formatCoord(cx, cy);
    return {
      ...base,
      title: ["寻找对称中心", "FIND THE CENTRE"],
      type: ["中点", "MIDPOINT"],
      visual: "midpoint",
      question: [
        `A${formatCoord(...p1)} 与 A′${formatCoord(...p2)} 中心对称。对称中心在哪里？`,
        `A${formatCoord(...p1)} and A′${formatCoord(...p2)} are centrally symmetric. Where is the centre?`,
      ],
      hint: ["对称中心就是 AA′ 的中点。", "The symmetry centre is the midpoint of AA′."],
      answer,
      options: uniqueOptions(answer, [formatCoord(cx + 1, cy), formatCoord(cx, cy - 1), formatCoord(-cx, -cy)], rng),
    };
  }

  if (mode === 9) {
    const values = [3, 4, 5, 6, 8, 10, 12];
    const n = values[randInt(rng, 0, values.length - 1)];
    const angle = 360 / n;
    const answer = `${angle}°`;
    return {
      ...base,
      title: ["旋转对称阶", "ROTATIONAL SYMMETRY"],
      type: ["最小旋转角", "SMALLEST ROTATION"],
      visual: "rotor",
      question: [
        `一个具有 ${n} 个完全相同等距叶片的转子，第一次与原图重合的最小旋转角是多少？`,
        `A rotor has ${n} identical equally spaced blades. What is the smallest rotation that maps it onto itself?`,
      ],
      hint: ["用 360° 除以相同位置的数量。", "Divide 360° by the number of identical positions."],
      answer,
      options: uniqueOptions(answer, [`${Math.max(15, angle * 2)}°`, `${Math.max(15, 180 / n)}°`, "90°"], rng),
    };
  }

  if (mode === 10) {
    const a = randInt(rng, -3, 3);
    const px = a + nonZeroInt(rng, -6, 6);
    const py = nonZeroInt(rng);
    const reflectedX = 2 * a - px;
    const answer = formatCoord(reflectedX, py);
    return {
      ...base,
      title: ["移动镜轴", "SHIFTED MIRROR AXIS"],
      type: [`x = ${a}`, `x = ${a}`],
      visual: "shiftedVertical",
      question: [
        `点 P${formatCoord(px, py)} 关于直线 x = ${a} 对称。P′ 是什么？`,
        `Point P${formatCoord(px, py)} is reflected across x = ${a}. What is P′?`,
      ],
      hint: ["镜轴必须是原点与像点 x 坐标的中点。", "The mirror line must be midway between the original and image x-coordinates."],
      answer,
      options: uniqueOptions(answer, [formatCoord(-px, py), formatCoord(reflectedX, -py), formatCoord(px - 2 * a, py)], rng),
    };
  }

  const a = randInt(rng, -3, 3);
  const py = a + nonZeroInt(rng, -6, 6);
  const px = nonZeroInt(rng);
  const reflectedY = 2 * a - py;
  const answer = formatCoord(px, reflectedY);
  return {
    ...base,
    title: ["移动水平镜轴", "SHIFTED HORIZONTAL AXIS"],
    type: [`y = ${a}`, `y = ${a}`],
    visual: "shiftedHorizontal",
    question: [
      `点 P${formatCoord(px, py)} 关于直线 y = ${a} 对称。P′ 是什么？`,
      `Point P${formatCoord(px, py)} is reflected across y = ${a}. What is P′?`,
    ],
    hint: ["镜轴必须是原点与像点 y 坐标的中点。", "The mirror line must be midway between the original and image y-coordinates."],
    answer,
    options: uniqueOptions(answer, [formatCoord(-px, reflectedY), formatCoord(px, -py), formatCoord(px, py - 2 * a)], rng),
  };
}

/* =========================================================
   ENDLESS SEGMENT GENERATOR
   ========================================================= */

function buildSegment(index) {
  const rng = mulberry32((index + 91) * 104729);
  const start = index * SEGMENT_LEN;
  const difficulty = Math.max(1, 1 + Math.floor(index / 4));
  const obstacleCount = clamp(2 + Math.floor(difficulty / 3), 2, 4);
  const obstacleTypes = ["floorLaser", "ceilingLaser", "drone", "spikes"];

  const obstacles = Array.from({ length: obstacleCount }, (_, i) => {
    const baseGap = (SEGMENT_LEN - 150) / obstacleCount;
    const at = start + 95 + i * baseGap + rng() * Math.min(48, baseGap * 0.42);
    const type = obstacleTypes[(index + i + randInt(rng, 0, 2)) % obstacleTypes.length];
    return {
      id: `seg-${index}-ob-${i}`,
      at,
      type,
      y: type === "drone" ? randInt(rng, 31, 67) : undefined,
    };
  });

  const coinCount = 11 + randInt(rng, 0, 5);
  const coinCentre = randInt(rng, 35, 62);
  const amplitude = randInt(rng, 8, 18);
  const coins = Array.from({ length: coinCount }, (_, i) => ({
    id: `seg-${index}-coin-${i}`,
    at: start + 35 + i * ((SEGMENT_LEN - 80) / Math.max(1, coinCount - 1)),
    y: clamp(coinCentre + Math.sin(i * 0.8 + index) * amplitude, 23, 73),
  }));

  const skills = [];
  if (index >= 1) {
    if (index % 4 === 2) {
      skills.push({
        id: `seg-${index}-repair`,
        at: start + SEGMENT_LEN * (0.42 + rng() * 0.2),
        y: randInt(rng, 30, 66),
        type: "repair",
      });
    } else if (rng() < 0.48) {
      const typeRoll = rng();
      const type = typeRoll < 0.36 ? "shield" : typeRoll < 0.7 ? "magnet" : "overdrive";
      skills.push({
        id: `seg-${index}-${type}`,
        at: start + SEGMENT_LEN * (0.38 + rng() * 0.28),
        y: randInt(rng, 28, 68),
        type,
      });
    }
  }

  return {
    index,
    obstacles,
    coins,
    skills,
    window: {
      id: `window-${index}`,
      at: start + 18,
      width: 285 + randInt(rng, 0, 55),
      theme: WINDOW_THEMES[((index % WINDOW_THEMES.length) + WINDOW_THEMES.length) % WINDOW_THEMES.length],
    },
  };
}

function obstacleBounds(obstacle) {
  if (obstacle.type === "floorLaser") return [57, 84];
  if (obstacle.type === "ceilingLaser") return [15, 42];
  if (obstacle.type === "spikes") return [61, 84];
  return [obstacle.y - 8.5, obstacle.y + 8.5];
}

/* =========================================================
   VISUAL COMPONENTS
   ========================================================= */

function JetpackPilot({ thrust, overdrive, hit }) {
  return (
    <svg
      className={`runner-pilot-svg ${thrust ? "thrusting" : ""} ${overdrive ? "overdrive" : ""} ${hit ? "damaged" : ""}`}
      viewBox="0 0 190 210"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="runnerSuit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd76d" />
          <stop offset="48%" stopColor="#d9932f" />
          <stop offset="100%" stopColor="#7b4318" />
        </linearGradient>
        <linearGradient id="runnerMetal" x1="0" x2="1">
          <stop offset="0%" stopColor="#202938" />
          <stop offset="48%" stopColor="#8795a8" />
          <stop offset="100%" stopColor="#19212e" />
        </linearGradient>
        <linearGradient id="runnerVisor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#effcff" />
          <stop offset="43%" stopColor="#70e3ff" />
          <stop offset="100%" stopColor="#17689a" />
        </linearGradient>
      </defs>

      <g className="pilot-pack">
        <rect x="33" y="70" width="43" height="78" rx="13" fill="url(#runnerMetal)" stroke="#0e141d" strokeWidth="4" />
        <rect x="26" y="84" width="16" height="48" rx="6" fill="#303b4a" />
        <circle cx="55" cy="91" r="8" fill="#4dd9ff" opacity="0.86" />
        <circle cx="55" cy="91" r="3" fill="#e8fbff" />
        <rect x="39" y="142" width="14" height="17" rx="4" fill="#151b25" />
        <rect x="58" y="142" width="14" height="17" rx="4" fill="#151b25" />
      </g>

      <g className="pilot-flames">
        <path className="flame-outer left" d="M39 156 C30 171 32 191 46 207 C47 185 58 176 51 156 Z" />
        <path className="flame-inner left" d="M43 157 C39 171 41 183 47 194 C49 178 55 171 50 157 Z" />
        <path className="flame-outer right" d="M58 156 C49 173 52 191 65 207 C67 185 77 176 70 156 Z" />
        <path className="flame-inner right" d="M62 157 C57 171 60 184 65 194 C67 178 74 171 69 157 Z" />
      </g>

      <g className="pilot-body">
        <path className="pilot-back-leg" d="M102 144 Q124 151 145 169 L137 185 Q112 178 92 160 Z" fill="#3b4656" stroke="#121821" strokeWidth="4" />
        <path d="M136 169 L164 171 Q175 175 169 185 L137 185 Z" fill="#151b24" />

        <path className="pilot-front-leg" d="M88 143 Q105 151 112 165 L105 193 L86 193 L84 163 Z" fill="url(#runnerSuit)" stroke="#4b2a12" strokeWidth="4" />
        <path d="M84 187 L108 187 L111 199 L78 199 Q73 194 78 189 Z" fill="#1b212a" />

        <path d="M69 76 Q91 61 119 70 Q139 78 141 106 L130 146 Q101 156 76 143 L62 105 Z" fill="url(#runnerSuit)" stroke="#4b2b15" strokeWidth="4" />
        <path d="M83 87 Q105 77 126 87 L122 125 Q104 136 84 124 Z" fill="#202a38" opacity="0.9" />
        <path d="M104 91 L115 105 L104 119 L93 105 Z" fill="none" stroke="#8be7ff" strokeWidth="3" />
        <circle cx="104" cy="105" r="4" fill="#c9f5ff" />

        <path className="pilot-arm-back" d="M72 84 Q53 90 45 111 L57 122 Q69 106 83 99 Z" fill="#3c4654" stroke="#151b25" strokeWidth="3" />
        <circle cx="54" cy="120" r="7" fill="#242b36" />

        <path className="pilot-arm-front" d="M128 82 Q151 85 166 104 L153 116 Q139 102 119 98 Z" fill="url(#runnerSuit)" stroke="#4b2b15" strokeWidth="3" />
        <path d="M157 103 Q174 101 184 110 L179 119 Q166 119 153 114 Z" fill="#242b36" />

        <circle cx="106" cy="43" r="36" fill="#252f3d" stroke="#0e141d" strokeWidth="5" />
        <path d="M75 41 Q80 8 108 7 Q139 8 146 36 Q128 20 99 24 Z" fill="#3c495a" />
        <path d="M94 27 Q124 20 145 39 L141 57 Q119 66 93 55 Q87 41 94 27 Z" fill="url(#runnerVisor)" stroke="#8de8ff" strokeWidth="3" />
        <path d="M101 31 Q122 24 136 32" stroke="rgba(255,255,255,.8)" strokeWidth="4" strokeLinecap="round" />
        <path d="M89 18 L78 7" stroke="#8d9aaa" strokeWidth="3" />
        <circle cx="76" cy="6" r="4" fill="#ffd46d" />
      </g>
    </svg>
  );
}

function TunnelWindow({ windowData, progress }) {
  const left = screenX(windowData.at, progress);
  const width = windowData.width * WORLD_SCALE;
  if (left + width < -8 || left > 108) return null;

  return (
    <div
      className={`tunnel-window ${windowData.theme}`}
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      <div className="window-world">
        <div className="outside-sky" />
        <div className="outside-land" />
        <div className="outside-detail d1" />
        <div className="outside-detail d2" />
        <div className="outside-detail d3" />
      </div>
      <div className="window-glass" />
      <div className="window-frame left" />
      <div className="window-frame right" />
      <span className="window-label">
        {windowData.theme === "meadow"
          ? "GREENLAND SECTOR"
          : windowData.theme === "inferno"
            ? "INFERNO EXTERIOR"
            : windowData.theme === "storm"
              ? "STORM FRONT"
              : "AURORA RIDGE"}
      </span>
    </div>
  );
}

function EnergyCoin({ coin, progress, magnet }) {
  let x = screenX(coin.at, progress);
  const dx = x - PLAYER_X;
  if (magnet && dx > -4 && dx < 17) x -= dx * clamp(1 - dx / 17, 0, 1) * 0.62;
  if (x < -7 || x > 107) return null;
  return (
    <div className={`runner-coin ${magnet ? "magnet-active" : ""}`} style={{ left: `${x}%`, top: `${coin.y}%` }}>
      <i />
      <span>◇</span>
    </div>
  );
}

function SkillPickup({ skill, progress }) {
  const x = screenX(skill.at, progress);
  if (x < -8 || x > 108) return null;
  const info = SKILL_INFO[skill.type];
  return (
    <div className={`runner-skill ${skill.type}`} style={{ left: `${x}%`, top: `${skill.y}%` }}>
      <div className="skill-pulse" />
      <div className="skill-core">{info.icon}</div>
      <small>{info.short}</small>
    </div>
  );
}

function Obstacle({ obstacle, progress }) {
  const x = screenX(obstacle.at, progress);
  if (x < -13 || x > 113) return null;

  if (obstacle.type === "floorLaser") {
    return (
      <div className="runner-obstacle floor-laser" style={{ left: `${x}%` }}>
        <div className="laser-emitter">!</div>
        <div className="laser-column" />
      </div>
    );
  }

  if (obstacle.type === "ceilingLaser") {
    return (
      <div className="runner-obstacle ceiling-laser" style={{ left: `${x}%` }}>
        <div className="laser-emitter">!</div>
        <div className="laser-column" />
      </div>
    );
  }

  if (obstacle.type === "spikes") {
    return (
      <div className="runner-obstacle runner-spikes" style={{ left: `${x}%` }}>
        {Array.from({ length: 5 }).map((_, i) => <i key={i} />)}
      </div>
    );
  }

  return (
    <div className="runner-obstacle sentry-drone" style={{ left: `${x}%`, top: `${obstacle.y}%` }}>
      <div className="drone-orbit one" />
      <div className="drone-orbit two" />
      <div className="drone-body">◆</div>
      <i className="drone-eye" />
    </div>
  );
}

function Missile({ missile }) {
  if (missile.phase === "warning") {
    return (
      <div className="missile-lock-line" style={{ top: `${missile.y}%` }}>
        <div className="missile-lock-arrow">◀</div>
        <span>MISSILE LOCK</span>
      </div>
    );
  }

  return (
    <div className="hunter-missile" style={{ left: `${missile.x}%`, top: `${missile.y}%` }}>
      <div className="missile-flame" />
      <div className="missile-body">
        <i className="fin top" />
        <i className="fin bottom" />
        <span />
      </div>
    </div>
  );
}

function QuestionDiagram({ mode }) {
  if (mode === "rotor") {
    return (
      <div className="question-rotor">
        <div className="rotor-ring">
          {Array.from({ length: 8 }).map((_, i) => <i key={i} style={{ "--i": i }} />)}
          <b>?</b>
        </div>
      </div>
    );
  }

  return (
    <div className={`question-grid mode-${mode}`}>
      <div className="grid-lines" />
      <div className="axis x" />
      <div className="axis y" />
      {(mode === "diagonal" || mode === "antiDiagonal") && <div className="diag" />}
      {(mode === "shiftedVertical") && <div className="shift-line vertical" />}
      {(mode === "shiftedHorizontal") && <div className="shift-line horizontal" />}
      <span className="point original">P</span>
      <span className="point image">?</span>
      {(mode.includes("rotation") || mode === "halfTurn") && <strong className="rotation-arrow">↻</strong>}
      {(mode === "centre" || mode === "midpoint") && <span className="centre-point">C</span>}
    </div>
  );
}

/* =========================================================
   MAIN
   ========================================================= */

export default function SymmetryGame({ onBack }) {
  const [lang, setLang] = useState("en");
  const [screen, setScreen] = useState("intro");
  const [showRules, setShowRules] = useState(false);

  const [progress, setProgress] = useState(0);
  const [playerY, setPlayerY] = useState(50);
  const [thrust, setThrust] = useState(false);
  const [vitality, setVitality] = useState(MAX_VITALITY);
  const [coins, setCoins] = useState(0);
  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [currentSpeed, setCurrentSpeed] = useState(START_SPEED);

  const [activeSkill, setActiveSkill] = useState(null);
  const [missiles, setMissiles] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [notice, setNotice] = useState("");
  const [hit, setHit] = useState(false);

  const [activePuzzle, setActivePuzzle] = useState(null);
  const [selected, setSelected] = useState(null);
  const [wrongChoices, setWrongChoices] = useState([]);
  const [answerState, setAnswerState] = useState("idle");

  const [bestDistance, setBestDistance] = useState(() => {
    try {
      return Number(localStorage.getItem("symmetry-endless-best-v2")) || 0;
    } catch {
      return 0;
    }
  });
  const [pickupRevision, setPickupRevision] = useState(0);

  const t = COPY[lang];

  const progressRef = useRef(0);
  const playerYRef = useRef(50);
  const velocityRef = useRef(0);
  const thrustRef = useRef(false);
  const vitalityRef = useRef(MAX_VITALITY);
  const difficultyRef = useRef(1);
  const activeSkillRef = useRef(null);
  const lastFrameRef = useRef(null);
  const nextQuestionAtRef = useRef(620);
  const questionIndexRef = useRef(0);
  const nextMissileAtRef = useRef(980);
  const missileIdRef = useRef(1);
  const missilesRef = useRef([]);
  const burstsRef = useRef([]);
  const collectedCoinsRef = useRef(new Set());
  const collectedSkillsRef = useRef(new Set());
  const processedObstaclesRef = useRef(new Set());
  const processedMissilesRef = useRef(new Set());
  const damageCooldownRef = useRef(0);
  const noticeTimerRef = useRef(null);
  const hitTimerRef = useRef(null);
  const puzzleTimerRef = useRef(null);
  const failTimerRef = useRef(null);

  const paused = screen !== "play" || showRules || activePuzzle !== null;
  const skillType = activeSkill?.type;
  const shield = skillType === "shield";
  const magnet = skillType === "magnet";
  const overdrive = skillType === "overdrive";

  const segmentIndex = Math.floor(progress / SEGMENT_LEN);
  const scene = useMemo(() => {
    const segments = [];
    for (let i = Math.max(0, segmentIndex - 1); i <= segmentIndex + 4; i += 1) {
      segments.push(buildSegment(i));
    }
    return {
      obstacles: segments.flatMap((segment) => segment.obstacles),
      coins: segments.flatMap((segment) => segment.coins),
      skills: segments.flatMap((segment) => segment.skills),
      windows: segments.map((segment) => segment.window),
    };
  }, [segmentIndex]);

  const visibleCoins = useMemo(
    () => scene.coins.filter((coin) => !collectedCoinsRef.current.has(coin.id)),
    [scene.coins, pickupRevision]
  );
  const visibleSkills = useMemo(
    () => scene.skills.filter((skill) => !collectedSkillsRef.current.has(skill.id)),
    [scene.skills, pickupRevision]
  );

  function tr(zh, en) {
    return lang === "en" ? en : zh;
  }

  function showNotice(text) {
    setNotice(text);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), 1500);
  }

  function addBurst(x = PLAYER_X, y = playerYRef.current, kind = "impact") {
    const burst = {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      age: 0,
      kind,
    };
    burstsRef.current = [...burstsRef.current, burst];
    setBursts(burstsRef.current);
  }

  function endRunSoon() {
    thrustRef.current = false;
    setThrust(false);
    clearTimeout(failTimerRef.current);
    failTimerRef.current = setTimeout(() => setScreen("fail"), 420);
  }

  function damagePlayer(source, y = playerYRef.current) {
    const now = performance.now();
    if (damageCooldownRef.current > now || vitalityRef.current <= 0) return false;

    const skill = activeSkillRef.current;
    if (skill?.type === "shield" || skill?.type === "overdrive") {
      damageCooldownRef.current = now + 420;
      addBurst(PLAYER_X + 1, y, "shield");
      showNotice(t.shieldAbsorb);
      return false;
    }

    damageCooldownRef.current = now + 760;
    const next = vitalityRef.current - 1;
    vitalityRef.current = next;
    setVitality(next);
    setHit(true);
    addBurst(PLAYER_X + 1, y, source === "missile" ? "missile" : "impact");
    velocityRef.current = -9;
    showNotice(source === "missile" ? t.missileHit : t.obstacleHit);

    clearTimeout(hitTimerRef.current);
    hitTimerRef.current = setTimeout(() => setHit(false), 520);

    if (next <= 0) endRunSoon();
    return true;
  }

  function damageFromWrongAnswer() {
    if (vitalityRef.current <= 0) return;
    const next = vitalityRef.current - 1;
    vitalityRef.current = next;
    setVitality(next);
    addBurst(50, 49, "error");
    showNotice(t.wrong);
    if (next <= 0) endRunSoon();
  }

  function startGame() {
    clearTimeout(puzzleTimerRef.current);
    clearTimeout(failTimerRef.current);
    clearTimeout(hitTimerRef.current);
    clearTimeout(noticeTimerRef.current);

    progressRef.current = 0;
    playerYRef.current = 50;
    velocityRef.current = 0;
    thrustRef.current = false;
    vitalityRef.current = MAX_VITALITY;
    difficultyRef.current = 1;
    activeSkillRef.current = null;
    lastFrameRef.current = null;
    nextQuestionAtRef.current = 620;
    questionIndexRef.current = 0;
    nextMissileAtRef.current = 980;
    missileIdRef.current = 1;
    missilesRef.current = [];
    burstsRef.current = [];
    collectedCoinsRef.current = new Set();
    collectedSkillsRef.current = new Set();
    processedObstaclesRef.current = new Set();
    processedMissilesRef.current = new Set();
    damageCooldownRef.current = 0;

    setProgress(0);
    setPlayerY(50);
    setThrust(false);
    setVitality(MAX_VITALITY);
    setCoins(0);
    setQuestionsSolved(0);
    setDifficulty(1);
    setCurrentSpeed(START_SPEED);
    setActiveSkill(null);
    setMissiles([]);
    setBursts([]);
    setNotice("");
    setHit(false);
    setActivePuzzle(null);
    setSelected(null);
    setWrongChoices([]);
    setAnswerState("idle");
    setPickupRevision((value) => value + 1);
    setScreen("play");
  }

  function backHome() {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
    window.history.back();
  }

  function backToIntro() {
    thrustRef.current = false;
    velocityRef.current = 0;
    lastFrameRef.current = null;

    clearTimeout(noticeTimerRef.current);
    clearTimeout(hitTimerRef.current);
    clearTimeout(puzzleTimerRef.current);
    clearTimeout(failTimerRef.current);

    setThrust(false);
    setShowRules(false);
    setActivePuzzle(null);
    setSelected(null);
    setWrongChoices([]);
    setAnswerState("idle");
    setMissiles([]);
    setBursts([]);
    setNotice("");
    setHit(false);
    setScreen("intro");
  }

  function pointerDown(event) {
    if (paused) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Optional pointer capture.
    }
    thrustRef.current = true;
    setThrust(true);
    if (velocityRef.current > -11) velocityRef.current = -11;
  }

  function pointerUp(event) {
    thrustRef.current = false;
    setThrust(false);
    try {
      if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Optional pointer capture.
    }
  }

  useEffect(() => {
    function down(event) {
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      event.preventDefault();
      if (paused) return;
      thrustRef.current = true;
      setThrust(true);
      if (velocityRef.current > -11) velocityRef.current = -11;
    }
    function up(event) {
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      thrustRef.current = false;
      setThrust(false);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [paused]);

  useEffect(() => {
    if (paused) {
      lastFrameRef.current = null;
      return undefined;
    }

    let raf = 0;
    function frame(time) {
      if (lastFrameRef.current === null) lastFrameRef.current = time;
      const dt = Math.min((time - lastFrameRef.current) / 1000, 0.034);
      lastFrameRef.current = time;

      const currentProgress = progressRef.current;
      const nextDifficulty = 1 + Math.floor(currentProgress / 1450);
      if (nextDifficulty !== difficultyRef.current) {
        difficultyRef.current = nextDifficulty;
        setDifficulty(nextDifficulty);
      }

      const skill = activeSkillRef.current;
      const baseSpeed = Math.min(MAX_SPEED, START_SPEED + (nextDifficulty - 1) * 4.4);
      const speed = Math.min(MAX_SPEED + 16, baseSpeed + (skill?.type === "overdrive" ? 16 : 0));
      setCurrentSpeed(Math.round(speed));

      const nextProgress = currentProgress + speed * dt;
      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (skill && nextProgress >= skill.endsAt) {
        activeSkillRef.current = null;
        setActiveSkill(null);
      }

      let velocity = velocityRef.current;
      const gravity = 82;
      const jetPower = skill?.type === "overdrive" ? 222 : 196;
      if (thrustRef.current) velocity -= jetPower * dt;
      else velocity += gravity * dt;
      velocity = clamp(velocity, -42, 34);

      let y = playerYRef.current + velocity * dt;
      if (y < 19) {
        y = 19;
        velocity = Math.max(0, velocity);
      }
      if (y > 76) {
        y = 76;
        velocity = Math.min(0, velocity);
      }
      velocityRef.current = velocity;
      playerYRef.current = y;
      setPlayerY(y);

      if (nextProgress >= nextMissileAtRef.current) {
        const idBase = missileIdRef.current++;
        const lockY = clamp(y + Math.sin(idBase * 1.93) * 7, 24, 71);
        const spawned = [
          {
            id: `missile-${idBase}-a`,
            phase: "warning",
            age: 0,
            x: 110,
            y: lockY,
          },
        ];
        if (nextDifficulty >= 6 && idBase % 3 === 0) {
          spawned.push({
            id: `missile-${idBase}-b`,
            phase: "warning",
            age: -0.18,
            x: 110,
            y: clamp(lockY + (idBase % 2 === 0 ? 17 : -17), 23, 72),
          });
        }
        missilesRef.current = [...missilesRef.current, ...spawned];
        setMissiles(missilesRef.current);
        nextMissileAtRef.current = nextProgress + Math.max(420, 1030 - nextDifficulty * 58);
      }

      const updatedMissiles = [];
      for (const missile of missilesRef.current) {
        const age = missile.age + dt;
        if (age < 0.95) {
          updatedMissiles.push({ ...missile, age, phase: "warning", x: 110 });
          continue;
        }
        const travel = age - 0.95;
        const missileSpeed = 68 + nextDifficulty * 2.6;
        const x = 112 - travel * missileSpeed;
        if (x > -12) {
          updatedMissiles.push({ ...missile, age, phase: "active", x });
          if (
            !processedMissilesRef.current.has(missile.id) &&
            x < PLAYER_X + 4 &&
            x > PLAYER_X - 5 &&
            Math.abs(missile.y - y) < 8.2
          ) {
            processedMissilesRef.current.add(missile.id);
            damagePlayer("missile", missile.y);
          }
        }
      }
      missilesRef.current = updatedMissiles;
      setMissiles(updatedMissiles);

      const updatedBursts = burstsRef.current
        .map((burst) => ({ ...burst, age: burst.age + dt }))
        .filter((burst) => burst.age < 0.62);
      if (updatedBursts.length !== burstsRef.current.length || updatedBursts.some((b, i) => b.age !== burstsRef.current[i]?.age)) {
        burstsRef.current = updatedBursts;
        setBursts(updatedBursts);
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, t.missileHit, t.obstacleHit, t.shieldAbsorb]);

  useEffect(() => {
    if (screen !== "play" || paused) return;
    let amount = 0;
    for (const coin of scene.coins) {
      if (collectedCoinsRef.current.has(coin.id)) continue;
      const x = screenX(coin.at, progress);
      const xRange = magnet ? 14 : 3;
      const yRange = magnet ? 27 : 8;
      if (Math.abs(x - PLAYER_X) <= xRange && Math.abs(coin.y - playerY) <= yRange) {
        collectedCoinsRef.current.add(coin.id);
        amount += 1;
      }
    }
    if (amount > 0) {
      setCoins((value) => value + amount);
      setPickupRevision((value) => value + 1);
    }
  }, [progress, playerY, magnet, paused, screen, scene.coins]);

  useEffect(() => {
    if (screen !== "play" || paused) return;
    for (const skill of scene.skills) {
      if (collectedSkillsRef.current.has(skill.id)) continue;
      const x = screenX(skill.at, progress);
      if (Math.abs(x - PLAYER_X) > 3.2 || Math.abs(skill.y - playerY) > 10) continue;

      collectedSkillsRef.current.add(skill.id);
      setPickupRevision((value) => value + 1);

      if (skill.type === "repair") {
        if (vitalityRef.current < MAX_VITALITY) {
          vitalityRef.current += 1;
          setVitality(vitalityRef.current);
          addBurst(PLAYER_X, playerY, "repair");
          showNotice(t.repair);
        } else {
          setCoins((value) => value + 15);
          showNotice(t.repairFull);
        }
      } else {
        const info = SKILL_INFO[skill.type];
        const active = {
          type: skill.type,
          endsAt: progressRef.current + info.distance,
          totalDistance: info.distance,
        };
        activeSkillRef.current = active;
        setActiveSkill(active);
        showNotice(skill.type === "shield" ? t.shield : skill.type === "magnet" ? t.magnet : t.boost);
      }
      break;
    }
  }, [progress, playerY, paused, screen, scene.skills, t.boost, t.magnet, t.repair, t.repairFull, t.shield]);

  useEffect(() => {
    if (screen !== "play" || paused) return;
    for (const obstacle of scene.obstacles) {
      if (processedObstaclesRef.current.has(obstacle.id)) continue;
      const x = screenX(obstacle.at, progress);
      if (x > PLAYER_X + 3.2) continue;
      if (x < PLAYER_X - 4.5) {
        processedObstaclesRef.current.add(obstacle.id);
        continue;
      }

      const [top, bottom] = obstacleBounds(obstacle);
      const playerTop = playerY - 7;
      const playerBottom = playerY + 7;
      const collided = playerBottom > top && playerTop < bottom;
      processedObstaclesRef.current.add(obstacle.id);
      if (collided) {
        damagePlayer("obstacle", playerY);
        break;
      }
    }
  }, [progress, playerY, paused, screen, scene.obstacles]);

  useEffect(() => {
    if (screen !== "play" || activePuzzle !== null || showRules) return;
    if (progress < nextQuestionAtRef.current) return;

    thrustRef.current = false;
    setThrust(false);
    velocityRef.current = 0;
    setSelected(null);
    setWrongChoices([]);
    setAnswerState("idle");
    setActivePuzzle(makeQuestion(questionIndexRef.current));
  }, [progress, activePuzzle, screen, showRules]);

  function chooseAnswer(option) {
    if (!activePuzzle || answerState === "correct" || wrongChoices.includes(option)) return;
    setSelected(option);

    if (option !== activePuzzle.answer) {
      setWrongChoices((values) => [...values, option]);
      setAnswerState("wrong");
      damageFromWrongAnswer();
      return;
    }

    setAnswerState("correct");
    showNotice(t.correct);
    clearTimeout(puzzleTimerRef.current);
    puzzleTimerRef.current = setTimeout(() => {
      questionIndexRef.current += 1;
      setQuestionsSolved(questionIndexRef.current);
      const interval = Math.max(540, 900 - difficultyRef.current * 26);
      nextQuestionAtRef.current = progressRef.current + interval;
      setActivePuzzle(null);
      setSelected(null);
      setWrongChoices([]);
      setAnswerState("idle");
      velocityRef.current = -5;
    }, 720);
  }

  useEffect(() => {
    if (screen !== "fail") return;
    const distance = Math.floor(progressRef.current);
    if (distance > bestDistance) {
      setBestDistance(distance);
      try {
        localStorage.setItem("symmetry-endless-best-v2", String(distance));
      } catch {
        // Storage is optional.
      }
    }
  }, [screen, bestDistance]);

  useEffect(() => () => {
    clearTimeout(noticeTimerRef.current);
    clearTimeout(hitTimerRef.current);
    clearTimeout(puzzleTimerRef.current);
    clearTimeout(failTimerRef.current);
  }, []);

  const skillPercent = activeSkill
    ? clamp(((activeSkill.endsAt - progress) / activeSkill.totalDistance) * 100, 0, 100)
    : 0;
  const distanceDisplay = Math.floor(progress);
  const score = distanceDisplay + coins * 6 + questionsSolved * 160;
  const farScroll = -(progress * 1.1);
  const midScroll = -(progress * 2.3);
  const floorScroll = -(progress * 5.8);

  return (
    <div className="mirror-game-root">
      <main className="mirror-game-stage">
        <header className="mirror-header">
          {screen === "play" && (
            <button
              type="button"
              className="mirror-back-intro"
              onClick={backToIntro}
              aria-label="Back to Symmetry Menu"
              title="Back to Symmetry Menu"
            >
              ←
            </button>
          )}

          <div className="mirror-brand">
            <small>MATH WEEK 2026 · SYMMETRY FACILITY</small>
            <strong>{t.brand}</strong>
          </div>
          <div className="mirror-actions">
            {screen === "play" && (
              <>
                <div className="header-stat"><small>{t.distance}</small><b>{distanceDisplay} m</b></div>
                <div className="header-stat speed"><small>{t.speed}</small><b>{currentSpeed}</b></div>
              </>
            )}
            <button type="button" className="header-help" onClick={() => setShowRules(true)}>?</button>
            <button type="button" className="header-lang" onClick={() => setLang((value) => (value === "zh" ? "en" : "zh"))}>
              {lang === "zh" ? "中 / EN" : "EN / 中"}
            </button>
          </div>
        </header>

        {screen === "intro" && (
          <section className="mirror-intro">
            <div className="intro-background">
              <div className="intro-stars" />
              <div className="intro-nebula n1" />
              <div className="intro-nebula n2" />
              <div className="intro-cloud-layer" />
            </div>

            <div className="mirror-intro-copy">
              <span className="facility-label">◆ ENDLESS MIRROR FACILITY</span>
              <h1><span>SYMMETRY</span><strong>{t.introTitle}</strong></h1>
              <h2>{t.introSub}</h2>
              <p>{t.intro}</p>
              <div className="intro-data">
                <div><b>3</b><span>{t.vitality.toUpperCase()}</span></div>
                <div><b>∞</b><span>RUNWAY</span></div>
                <div><b>▲</b><span>RISING DIFFICULTY</span></div>
              </div>
              <button type="button" className="launch-button" onClick={startGame}><span>{t.launch}</span><i>▶</i></button>
              <small className="intro-tip">{t.hold} · {t.release}</small>
            </div>

            <div className="intro-island-zone">
              <div className="intro-island-aura" />
              <img src={symmetryIsland} className="intro-symmetry-island" alt="Symmetry island" />
              <div className="intro-runner-preview">
                <div className="preview-ring" />
                <JetpackPilot thrust overdrive={false} hit={false} />
              </div>
              <div className="intro-island-plate"><strong>ENDLESS JET LAB</strong><span>SECTOR ∞ · ADAPTIVE DIFFICULTY</span></div>
            </div>
          </section>
        )}

        {screen === "play" && (
          <section
            className={`mechanical-run ${paused ? "paused" : ""} ${thrust ? "thrusting" : ""} ${hit ? "hit" : ""} ${overdrive ? "overdrive" : ""}`}
            onPointerDown={pointerDown}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="tunnel-depth" style={{ backgroundPositionX: `${farScroll}px` }} />
            <div className="outside-ambient" />
            {scene.windows.map((windowData) => <TunnelWindow key={windowData.id} windowData={windowData} progress={progress} />)}
            <div className="tunnel-wall-grid" style={{ backgroundPositionX: `${midScroll}px` }} />
            <div className="tunnel-columns" style={{ backgroundPositionX: `${midScroll}px` }} />
            <div className="ceiling-rail" style={{ backgroundPositionX: `${floorScroll}px` }} />
            <div className="floor-rail" style={{ backgroundPositionX: `${floorScroll}px` }} />
            <div className="tunnel-light-strip top" style={{ backgroundPositionX: `${floorScroll}px` }} />
            <div className="tunnel-light-strip bottom" style={{ backgroundPositionX: `${floorScroll}px` }} />

            <div className="velocity-streaks">
              {Array.from({ length: 14 }).map((_, i) => <i key={i} />)}
            </div>

            {visibleCoins.map((coin) => <EnergyCoin key={coin.id} coin={coin} progress={progress} magnet={magnet} />)}
            {visibleSkills.map((skill) => <SkillPickup key={skill.id} skill={skill} progress={progress} />)}
            {scene.obstacles.map((obstacle) => <Obstacle key={obstacle.id} obstacle={obstacle} progress={progress} />)}
            {missiles.map((missile) => <Missile key={missile.id} missile={missile} />)}

            {bursts.map((burst) => (
              <div key={burst.id} className={`impact-burst ${burst.kind}`} style={{ left: `${burst.x}%`, top: `${burst.y}%`, "--age": burst.age }}>
                {Array.from({ length: 8 }).map((_, i) => <i key={i} style={{ "--i": i }} />)}
              </div>
            ))}

            <div className={`jet-exhaust ${thrust ? "active" : ""}`} style={{ top: `${playerY + 8}%` }}>
              {Array.from({ length: 10 }).map((_, i) => <i key={i} style={{ "--i": i }} />)}
            </div>

            <div className="mechanical-pilot" style={{ top: `${playerY}%` }}>
              {shield && <div className="pilot-shield" />}
              <div className="pilot-speed-aura" />
              <JetpackPilot thrust={thrust} overdrive={overdrive} hit={hit} />
            </div>

            <div className="game-hud-panel">
              <div className="vitality-panel">
                <small>{t.vitality}</small>
                <div className="vitality-hearts">
                  {Array.from({ length: MAX_VITALITY }).map((_, i) => <i key={i} className={i < vitality ? "active" : ""}>♥</i>)}
                </div>
              </div>
              <div className="hud-chip"><small>{t.coins}</small><b>◇ {coins}</b></div>
              <div className="hud-chip"><small>{t.solved}</small><b>{questionsSolved}</b></div>
              <div className="hud-chip danger"><small>{t.level}</small><b>LV {difficulty}</b></div>
              <div className="hud-chip score"><small>SCORE</small><b>{score}</b></div>
            </div>

            {activeSkill && (
              <div className={`active-module ${activeSkill.type}`}>
                <div className="module-icon">{SKILL_INFO[activeSkill.type].icon}</div>
                <div className="module-info">
                  <strong>{SKILL_INFO[activeSkill.type].label[lang === "en" ? 1 : 0]}</strong>
                  <div className="module-track"><i style={{ width: `${skillPercent}%` }} /></div>
                </div>
              </div>
            )}

            {missiles.some((missile) => missile.phase === "warning") && (
              <div className="missile-warning-card"><span>⚠</span><div><b>{t.missile}</b><small>{t.warning}</small></div></div>
            )}

            <div className="jet-control-hint"><span>↑</span><div><b>{t.tap}</b><small>{t.release}</small></div></div>
            {notice && <div className="system-notice"><span>◆</span>{notice}</div>}

            {activePuzzle && (
              <div className="security-overlay" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
                <div className={`security-console ${answerState === "correct" ? "solved" : ""} ${answerState === "wrong" ? "error" : ""}`}>
                  <header className="console-header">
                    <div className="console-number">{activePuzzle.number}</div>
                    <div className="console-title">
                      <small>SYMMETRY CALIBRATION · #{activePuzzle.number}</small>
                      <h2>{activePuzzle.title[lang === "en" ? 1 : 0]}</h2>
                    </div>
                    <div className="console-vitality">
                      {Array.from({ length: MAX_VITALITY }).map((_, i) => <i key={i} className={i < vitality ? "active" : ""}>♥</i>)}
                    </div>
                  </header>

                  <div className="console-body">
                    <div className="console-diagram">
                      <QuestionDiagram mode={activePuzzle.visual} />
                      <span className="diagram-type">{activePuzzle.type[lang === "en" ? 1 : 0]}</span>
                    </div>
                    <div className="console-question">
                      <span className="override-label">LIVE MIRROR CORE</span>
                      <h3>{activePuzzle.question[lang === "en" ? 1 : 0]}</h3>
                      <div className="security-options">
                        {activePuzzle.options.map((option, index) => {
                          const wrong = wrongChoices.includes(option);
                          const correct = answerState === "correct" && option === activePuzzle.answer;
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={wrong || answerState === "correct"}
                              className={`${wrong ? "wrong" : ""} ${correct ? "correct" : ""} ${selected === option ? "selected" : ""}`}
                              onClick={() => chooseAnswer(option)}
                            >
                              <small>{String.fromCharCode(65 + index)}</small>
                              <strong>{option}</strong>
                            </button>
                          );
                        })}
                      </div>
                      <div className={`console-feedback ${answerState}`}>
                        {answerState === "idle" && <><span>◇</span><p>{tr("选择正确答案以继续无尽推进。", "Choose the correct answer to resume the endless run.")}</p></>}
                        {answerState === "wrong" && <><span>!</span><div><b>{t.wrong}</b><p>{activePuzzle.hint[lang === "en" ? 1 : 0]}</p></div></>}
                        {answerState === "correct" && <><span>◆</span><div><b>{t.correct}</b><p>{tr("镜像核心已重新校准。", "Mirror core recalibrated successfully.")}</p></div></>}
                      </div>
                    </div>
                  </div>
                  <footer className="console-footer"><span>RUN PAUSED · PROPULSION STANDBY</span><b>{tr("答错会直接损失生命", "WRONG ANSWERS COST VITALITY")}</b></footer>
                </div>
              </div>
            )}
          </section>
        )}

        {screen === "fail" && (
          <section className="mission-fail">
            <div className="fail-backdrop" />
            <div className="fail-panel">
              <span className="failure-kicker">◆ ENDLESS RUN TERMINATED</span>
              <h1>{t.failTitle}</h1>
              <p>{t.failText}</p>
              <div className="fail-stats">
                <div><small>{t.distance}</small><strong>{Math.floor(progressRef.current)} m</strong></div>
                <div><small>BEST</small><strong>{Math.max(bestDistance, Math.floor(progressRef.current))} m</strong></div>
                <div><small>{t.solved}</small><strong>{questionsSolved}</strong></div>
                <div><small>SCORE</small><strong>{score}</strong></div>
              </div>
              <div className="mission-buttons">
                <button type="button" className="primary" onClick={startGame}>{t.restart}</button>
                <button type="button" className="secondary" onClick={backHome}>{t.back}</button>
              </div>
            </div>
          </section>
        )}

        {showRules && (
          <div className="rules-overlay">
            <div className="mechanical-rules">
              <button type="button" className="rules-close" onClick={() => setShowRules(false)}>×</button>
              <span>OPERATION MANUAL</span>
              <h2>{t.guide}</h2>
              {[t.guide1, t.guide2, t.guide3, t.guide4].map((item, index) => (
                <div className="manual-row" key={item}>
                  <b>{["↑", "⚠", "+", "∞"][index]}</b>
                  <div><strong>{["JETPACK", "MISSILES", "VITALITY", "ENDLESS"][index]}</strong><p>{item}</p></div>
                </div>
              ))}
              <button type="button" className="manual-confirm" onClick={() => setShowRules(false)}>{t.close}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
