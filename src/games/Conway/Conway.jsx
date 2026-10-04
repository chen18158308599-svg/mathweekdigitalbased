import { useCallback, useEffect, useRef, useState } from "react";

import "./Conway.css";



import homeBackground from "../../assets/home-layers/background.png";

import conwayIsland from "../../assets/home-layers/conway.png";



const GRID = 8;

const MAX_CELLS = 10;



const MATCH_TARGET = 21;

const MATCH_CAP = 30;



const TABLE_PHASE_SECONDS = 30;



const CONWAY_READY_SECONDS = 5;

const CONWAY_PICK_SECONDS = 10;

const CONWAY_EVOLVE_SECONDS = 20;



const MIN_BALL_SPEED = 0.026;

const BASE_MAX_BALL_SPEED = 0.050;

const CAP_STEP = 0.008;



const POWER_SKILL_COST = 1;



const PADDLE_RADIUS_X = 5.0;

const PADDLE_RADIUS_Y = 9.5;



const COPY = {

  zh: {

    eyebrow: "MATH WEEK 2026 · 双人策略竞技",

    title: "Conway 乒乓对决",

    englishTitle: "TABLE TENNIS × GAME OF LIFE",

    badge: "滑动挥拍 · 力道系统 · 征召式 Conway",

    intro:

      "两名玩家用手指直接拖动球拍。挥拍速度会决定回球力道，力道越高，球飞得越快，但速度始终受最低与最高上限控制。",

    intro2:

      "每 30 秒强制暂停乒乓球并进入 Conway。5 秒准备后，左侧玩家先部署，再轮到右侧玩家，之后双方棋盘一起演化。",

    start: "开始比赛",

    guide: "玩法",

    language: "中/EN",



    p1: "玩家 1",

    p2: "玩家 2",

    score: "比分",

    skillPoints: "技能点",

    rally: "回合",

    conway: "CONWAY",

    seconds: "秒",

    serve: "发球",



    dragTitle: "滑动球拍",

    dragText: "按住自己的半场自由滑动；挥拍越快，击球力道越高",

    keyboard1: "P1：WASD",

    keyboard2: "P2：方向键",



    force: "力道",

    forceLow: "轻",

    forceHigh: "重",

    forceCap: "力道上限",

    capLevel: "上限等级",

    upgradeCap: "提升力道上限",
    needPoint: "技能点不足",

    upgraded: "力道上限提升",

    onlySkill: "唯一技能",



    conwayIncoming: "时间到 · 强制进入 Conway",

    readyTitle: "Conway 准备阶段",

    readyText: "双方准备 · 5 秒后开始部署",

    p1PickTitle: "玩家 1 部署",

    p2PickTitle: "玩家 2 部署",

    pickText: "最多选择 10 个初始细胞",

    waiting: "等待对方部署",

    confirm: "确认部署",

    autoConfirm: "时间结束自动确认",

    evolveTitle: "生命演化",

    evolveText: "双方棋盘同时演化 20 秒",

    cells: "活细胞",

    placed: "已放置",

    aliveTime: "存活时间",

    rule:

      "每存活 5 秒 +1 技能点；20 秒结束仍有至少 3 个活细胞再 +1；每轮最多 5 点",

    challengeDone: "Conway 挑战完成",

    survival: "存活",

    finalCells: "最终细胞",

    bonus: "结束奖励",

    gained: "获得",

    resume: "回到乒乓球",



    matchOver: "比赛结束",

    wins: "获胜",

    finalScore: "最终比分",

    playAgain: "再来一局",

    backEntrance: "返回游戏入口",



    pauseTitle: "返回游戏入口？",

    pauseText: "当前比分、技能点与力道上限不会保留。",

    stay: "继续比赛",

    leave: "结束比赛",



    howTo: "玩法说明",

    step1: "真正滑动球拍",

    step1Text:

      "P1 只控制左半场，P2 只控制右半场。球拍会跟随手指的 X/Y 位置，不需要额外击球按钮。",

    step2: "力道决定球速",

    step2Text:

      "挥拍速度会转换成 0–100% 力道，再映射到球速。即使轻碰也有最低球速，重击也不会超过你的当前力道上限。",

    step3: "30 秒强制切换",

    step3Text:

      "乒乓球阶段固定 30 秒。倒计时到 0 时会立即冻结球桌，并让两名玩家一起进入 Conway，不等待当前回合结束。",

    step4: "征召式 Conway",

    step4Text:

      "先准备 5 秒，再由玩家 1 单独部署 10 秒，然后玩家 2 部署 10 秒，最后双方棋盘同时演化 20 秒。",

    step5: "唯一技能：力道上限",

    step5Text:

      "技能点只能由 Conway 获得。每花 1 点可永久提高本局的最大击球速度；力道上限可以持续升级，没有等级上限。",

  },



  en: {

    eyebrow: "MATH WEEK 2026 · TWO-PLAYER STRATEGY",

    title: "Conway Table Tennis",

    englishTitle: "TABLE TENNIS × GAME OF LIFE",

    badge: "SWIPE · FORCE SYSTEM · DRAFT-STYLE CONWAY",

    intro:

      "Both players drag their paddles directly. Swipe speed becomes hitting force: stronger swings produce faster shots, bounded by a minimum and your current maximum speed.",

    intro2:

      "Every 30 seconds, table tennis is forcibly paused for Conway. After a 5-second ready phase, Player 1 drafts cells first, then Player 2, then both boards evolve together.",

    start: "Start Match",

    guide: "Guide",

    language: "中/EN",



    p1: "Player 1",

    p2: "Player 2",

    score: "Score",

    skillPoints: "Skill Points",

    rally: "Rally",

    conway: "CONWAY",

    seconds: "sec",

    serve: "Serve",



    dragTitle: "Swipe Paddle",

    dragText: "Drag freely in your half; faster swings create more force",

    keyboard1: "P1: WASD",

    keyboard2: "P2: Arrow keys",



    force: "Force",

    forceLow: "Soft",

    forceHigh: "Hard",

    forceCap: "Force Cap",

    capLevel: "Cap Level",

    upgradeCap: "Increase Force Cap",
    needPoint: "Not enough skill points",

    upgraded: "Force cap increased",

    onlySkill: "Only Skill",



    conwayIncoming: "Time up · entering Conway",

    readyTitle: "Conway Ready",

    readyText: "Both players prepare · drafting begins in 5 seconds",

    p1PickTitle: "Player 1 Draft",

    p2PickTitle: "Player 2 Draft",

    pickText: "Choose up to 10 starting cells",

    waiting: "Waiting for the other player",

    confirm: "Lock In",

    autoConfirm: "Auto-lock when time expires",

    evolveTitle: "Life Evolution",

    evolveText: "Both boards evolve together for 20 seconds",

    cells: "Live Cells",

    placed: "Placed",

    aliveTime: "Alive",

    rule:

      "+1 skill point per 5 seconds alive; +1 if 3+ cells remain after 20 seconds; max 5 per round",

    challengeDone: "Conway Challenge Complete",

    survival: "Survival",

    finalCells: "Final Cells",

    bonus: "End Bonus",

    gained: "Gained",

    resume: "Resume Table Tennis",



    matchOver: "Match Over",

    wins: "Wins",

    finalScore: "Final Score",

    playAgain: "Play Again",

    backEntrance: "Back to Entrance",



    pauseTitle: "Return to the entrance?",

    pauseText: "Score, skill points and force-cap upgrades will be lost.",

    stay: "Keep Playing",

    leave: "End Match",



    howTo: "How to Play",

    step1: "Direct Paddle Drag",

    step1Text:

      "P1 owns the left half and P2 the right. The paddle follows finger X/Y movement directly; there is no separate hit button.",

    step2: "Force Controls Ball Speed",

    step2Text:

      "Swipe speed becomes 0–100% force and maps to ball speed. Light contact still has a minimum speed while hard hits cannot exceed your current force cap.",

    step3: "Forced Switch at 30s",

    step3Text:

      "Each table-tennis phase lasts exactly 30 seconds. At zero, the table freezes immediately and both players enter Conway together.",

    step4: "Draft-Style Conway",

    step4Text:

      "After a 5-second ready phase, Player 1 gets 10 seconds to draft, then Player 2 gets 10 seconds, followed by 20 seconds of simultaneous evolution.",

    step5: "Only Skill: Force Cap",

    step5Text:

      "Skill points come only from Conway. Spend 1 point to permanently raise your maximum shot speed for the current match; the force cap can be upgraded indefinitely.",

  },

};



const makeBoard = () => Array(GRID * GRID).fill(false);



const countAlive = (board) =>

  board.reduce((sum, cell) => sum + (cell ? 1 : 0), 0);



function evolve(board) {

  const next = Array(GRID * GRID).fill(false);



  for (let row = 0; row < GRID; row += 1) {

    for (let col = 0; col < GRID; col += 1) {

      let neighbors = 0;



      for (let dr = -1; dr <= 1; dr += 1) {

        for (let dc = -1; dc <= 1; dc += 1) {

          if (dr === 0 && dc === 0) continue;



          const rr = row + dr;

          const cc = col + dc;



          if (

            rr >= 0 &&

            rr < GRID &&

            cc >= 0 &&

            cc < GRID &&

            board[rr * GRID + cc]

          ) {

            neighbors += 1;

          }

        }

      }



      const index = row * GRID + col;



      next[index] = board[index]

        ? neighbors === 2 || neighbors === 3

        : neighbors === 3;

    }

  }



  return next;

}



function matchWon(p1, p2) {

  const high = Math.max(p1, p2);

  const low = Math.min(p1, p2);



  if (high < MATCH_TARGET) return false;

  if (high === MATCH_CAP) return true;



  return high - low >= 2;

}



function clamp(value, min, max) {

  return Math.max(min, Math.min(max, value));

}



function capSpeed(level) {

  return BASE_MAX_BALL_SPEED + (level - 1) * CAP_STEP;

}



function makePaddle(player) {

  return {

    x: player === "p1" ? 15 : 85,

    y: 50,

    vx: 0,

    vy: 0,

    angle: 0,

    lastMoveAt: performance.now(),

  };

}



function makeRuntime() {

  return {

    p1: makePaddle("p1"),

    p2: makePaddle("p2"),

    rallyActive: false,

    server: "p1",

    lastFrame: performance.now(),



    ball: {

      x: 50,

      y: 50,

      vx: 0,

      vy: 0,

      lastHitter: null,

      hitLockUntil: 0,

    },

  };

}



export default function Conway({ onBack }) {

  const [language, setLanguage] = useState("zh");

  const [view, setView] = useState("entry");



  const [scores, setScores] = useState({ p1: 0, p2: 0 });

  const scoresRef = useRef({ p1: 0, p2: 0 });



  const [skillPoints, setSkillPoints] = useState({ p1: 0, p2: 0 });



  const [capLevels, setCapLevels] = useState({ p1: 1, p2: 1 });

  const capLevelsRef = useRef({ p1: 1, p2: 1 });



  const [forceLevel, setForceLevel] = useState({ p1: 0, p2: 0 });

  const forceRef = useRef({ p1: 0, p2: 0 });



  const runtimeRef = useRef(makeRuntime());

  const [court, setCourt] = useState(() => {

    const rt = runtimeRef.current;

    return {

      ...rt,

      p1: { ...rt.p1 },

      p2: { ...rt.p2 },

      ball: { ...rt.ball },

    };

  });



  const [rallyNumber, setRallyNumber] = useState(0);

  const [message, setMessage] = useState("");

  const [winner, setWinner] = useState(null);



  const [tableTime, setTableTime] = useState(TABLE_PHASE_SECONDS);

  const tableTimeRef = useRef(TABLE_PHASE_SECONDS);



  const [showRules, setShowRules] = useState(false);

  const [showLeave, setShowLeave] = useState(false);



  const [board1, setBoard1] = useState(makeBoard);

  const [board2, setBoard2] = useState(makeBoard);



  const board1Ref = useRef(makeBoard());

  const board2Ref = useRef(makeBoard());



  const [conwayPhase, setConwayPhase] = useState("ready");

  const [conwayTime, setConwayTime] = useState(CONWAY_READY_SECONDS);



  const [survival, setSurvival] = useState({ p1: 0, p2: 0 });

  const survivalRef = useRef({ p1: 0, p2: 0 });



  const [challengeResult, setChallengeResult] = useState(null);



  const keysRef = useRef(new Set());

  const dragRef = useRef(new Map());



  const t = COPY[language];



  const snapshotCourt = useCallback(() => {

    const rt = runtimeRef.current;



    setCourt({

      ...rt,

      p1: { ...rt.p1 },

      p2: { ...rt.p2 },

      ball: { ...rt.ball },

    });

  }, []);



  const setForce = useCallback((player, value) => {

    const next = clamp(value, 0, 1);

    forceRef.current[player] = next;



    setForceLevel((prev) => ({

      ...prev,

      [player]: next,

    }));

  }, []);



  const resetTableTimer = useCallback(() => {

    tableTimeRef.current = TABLE_PHASE_SECONDS;

    setTableTime(TABLE_PHASE_SECONDS);

  }, []);



  const resetMatch = useCallback(() => {

    scoresRef.current = { p1: 0, p2: 0 };

    setScores({ p1: 0, p2: 0 });



    setSkillPoints({ p1: 0, p2: 0 });



    capLevelsRef.current = { p1: 1, p2: 1 };

    setCapLevels({ p1: 1, p2: 1 });



    forceRef.current = { p1: 0, p2: 0 };

    setForceLevel({ p1: 0, p2: 0 });



    setRallyNumber(0);

    setMessage("");

    setWinner(null);



    runtimeRef.current = makeRuntime();

    snapshotCourt();



    resetTableTimer();



    dragRef.current.clear();

    keysRef.current.clear();

  }, [resetTableTimer, snapshotCourt]);



  const startMatch = useCallback(() => {

    resetMatch();

    setView("table");

  }, [resetMatch]);



  const returnToLobby = useCallback(() => {

    if (typeof onBack === "function") {

      onBack();

      return;

    }



    if (window.history.length > 1) {

      window.history.back();

    }

  }, [onBack]);



  const enterConway = useCallback(() => {

    keysRef.current.clear();

    dragRef.current.clear();



    const rt = runtimeRef.current;



    rt.rallyActive = false;

    rt.ball.vx = 0;

    rt.ball.vy = 0;



    snapshotCourt();



    const b1 = makeBoard();

    const b2 = makeBoard();



    board1Ref.current = b1;

    board2Ref.current = b2;



    survivalRef.current = { p1: 0, p2: 0 };



    setBoard1(b1);

    setBoard2(b2);

    setSurvival({ p1: 0, p2: 0 });



    setChallengeResult(null);



    setConwayPhase("ready");

    setConwayTime(CONWAY_READY_SECONDS);



    setMessage("");

    setView("conway");

  }, [snapshotCourt]);



  /* 强制 30 秒：到 0 立即切换，不等待 rally。 */

  useEffect(() => {

    if (view !== "table" || winner || showLeave) {

      return undefined;

    }



    const timer = window.setInterval(() => {

      tableTimeRef.current -= 1;



      const next = Math.max(0, tableTimeRef.current);



      setTableTime(next);



      if (next <= 0) {

        window.clearInterval(timer);

        setMessage(t.conwayIncoming);



        window.setTimeout(() => {

          enterConway();

        }, 420);

      }

    }, 1000);



    return () => window.clearInterval(timer);

  }, [enterConway, showLeave, t.conwayIncoming, view, winner]);



  const registerPoint = useCallback(

    (player) => {

      const rt = runtimeRef.current;



      if (!rt.rallyActive) return;



      rt.rallyActive = false;

      rt.server = player;



      rt.ball.vx = 0;

      rt.ball.vy = 0;

      rt.ball.x = player === "p1" ? rt.p1.x + 6 : rt.p2.x - 6;

      rt.ball.y = player === "p1" ? rt.p1.y : rt.p2.y;

      rt.ball.lastHitter = null;



      const nextScores = {

        ...scoresRef.current,

        [player]: scoresRef.current[player] + 1,

      };



      scoresRef.current = nextScores;

      setScores(nextScores);



      setRallyNumber((value) => value + 1);



      setMessage(`${player === "p1" ? t.p1 : t.p2} +1`);



      snapshotCourt();



      if (matchWon(nextScores.p1, nextScores.p2)) {

        setWinner(player);



        window.setTimeout(() => {

          setView("end");

        }, 700);



        return;

      }



      window.setTimeout(() => setMessage(""), 500);

    },

    [snapshotCourt, t.p1, t.p2]

  );



  const startRally = useCallback(() => {

    if (view !== "table") return;



    const rt = runtimeRef.current;



    if (rt.rallyActive) return;



    const server = rt.server;

    const paddle = rt[server];

    const direction = server === "p1" ? 1 : -1;



    rt.rallyActive = true;



    rt.ball = {

      x: paddle.x + direction * 6,

      y: paddle.y,

      vx: direction * MIN_BALL_SPEED,

      vy: (Math.random() - 0.5) * 0.008,

      lastHitter: server,

      hitLockUntil: performance.now() + 240,

    };



    setMessage("");

    snapshotCourt();

  }, [snapshotCourt, view]);



  const upgradePower = useCallback(

    (player) => {

      const level = capLevelsRef.current[player];



      if (skillPoints[player] < POWER_SKILL_COST) {

        setMessage(t.needPoint);

        window.setTimeout(() => setMessage(""), 800);

        return;

      }



      setSkillPoints((prev) => ({

        ...prev,

        [player]: prev[player] - POWER_SKILL_COST,

      }));



      const nextLevel = level + 1;



      capLevelsRef.current[player] = nextLevel;



      setCapLevels((prev) => ({

        ...prev,

        [player]: nextLevel,

      }));



      setMessage(

        `${player === "p1" ? t.p1 : t.p2} · ${t.upgraded}`

      );



      window.setTimeout(() => setMessage(""), 900);

    },

    [skillPoints, t.needPoint, t.p1, t.p2, t.upgraded]

  );



  const tablePosition = useCallback((event) => {

    const rect = event.currentTarget.getBoundingClientRect();



    return {

      x: ((event.clientX - rect.left) / rect.width) * 100,

      y: ((event.clientY - rect.top) / rect.height) * 100,

    };

  }, []);



  const movePaddle = useCallback(

    (player, rawX, rawY, vx = 0, vy = 0) => {

      const paddle = runtimeRef.current[player];

      const isP1 = player === "p1";



      paddle.x = clamp(rawX, isP1 ? 5 : 55, isP1 ? 45 : 95);

      paddle.y = clamp(rawY, 9, 91);



      paddle.vx = vx;

      paddle.vy = vy;

      paddle.lastMoveAt = performance.now();



      const swipe = Math.hypot(vx, vy);



      /* 力道由真实手指速度而来。

         约 0.15 %/ms 视为满力道。 */

      const normalizedForce = clamp(swipe / 0.15, 0, 1);

      setForce(player, normalizedForce);



      if (swipe > 0.008) {

        const rawAngle = (Math.atan2(vy, Math.abs(vx) + 0.001) * 180) / Math.PI;

        paddle.angle = clamp(rawAngle, -42, 42);

      }



      snapshotCourt();

    },

    [setForce, snapshotCourt]

  );



  const handlePointerDown = useCallback(

    (event) => {

      if (view !== "table") return;



      event.preventDefault();



      const position = tablePosition(event);

      const player = position.x < 50 ? "p1" : "p2";



      const alreadyControlled = Array.from(dragRef.current.values()).some(

        (item) => item.player === player

      );



      if (alreadyControlled) return;



      event.currentTarget.setPointerCapture?.(event.pointerId);



      dragRef.current.set(event.pointerId, {

        player,

        lastX: position.x,

        lastY: position.y,

        lastTime: performance.now(),

      });



      movePaddle(player, position.x, position.y, 0, 0);

    },

    [movePaddle, tablePosition, view]

  );



  const handlePointerMove = useCallback(

    (event) => {

      const drag = dragRef.current.get(event.pointerId);



      if (!drag || view !== "table") return;



      event.preventDefault();



      const position = tablePosition(event);

      const now = performance.now();

      const dt = Math.max(8, now - drag.lastTime);



      const vx = (position.x - drag.lastX) / dt;

      const vy = (position.y - drag.lastY) / dt;



      drag.lastX = position.x;

      drag.lastY = position.y;

      drag.lastTime = now;



      movePaddle(drag.player, position.x, position.y, vx, vy);

    },

    [movePaddle, tablePosition, view]

  );



  const handlePointerUp = useCallback(

    (event) => {

      const drag = dragRef.current.get(event.pointerId);



      if (!drag) return;



      dragRef.current.delete(event.pointerId);



      runtimeRef.current[drag.player].vx *= 0.18;

      runtimeRef.current[drag.player].vy *= 0.18;



      setForce(drag.player, forceRef.current[drag.player] * 0.35);

    },

    [setForce]

  );



  const tryPaddleHit = useCallback(

    (player, now) => {

      const rt = runtimeRef.current;

      const paddle = rt[player];

      const ball = rt.ball;



      const isP1 = player === "p1";

      const direction = isP1 ? 1 : -1;



      const movingTowardPaddle = isP1 ? ball.vx < 0 : ball.vx > 0;



      if (!movingTowardPaddle || now < ball.hitLockUntil) {

        return false;

      }



      const dx = Math.abs(ball.x - paddle.x);

      const dy = Math.abs(ball.y - paddle.y);



      if (dx > PADDLE_RADIUS_X || dy > PADDLE_RADIUS_Y) {

        return false;

      }



      const swipeSpeed = Math.hypot(paddle.vx, paddle.vy);



      /* 0.015 是轻碰，0.15 视作满力道。 */

      const force = clamp((swipeSpeed - 0.015) / 0.135, 0, 1);



      setForce(player, force);



      const currentCap = capSpeed(capLevelsRef.current[player]);



      /* 力道决定球速：

         0% -> MIN_BALL_SPEED

         100% -> 当前玩家的 max cap */

      const shotSpeed =

        MIN_BALL_SPEED + (currentCap - MIN_BALL_SPEED) * force;



      const verticalFromSwipe = clamp(paddle.vy * 0.055, -0.024, 0.024);

      const verticalFromOffset = clamp(

        ((ball.y - paddle.y) / PADDLE_RADIUS_Y) * 0.010,

        -0.010,

        0.010

      );



      ball.vx = direction * shotSpeed;

      ball.vy = clamp(

        verticalFromSwipe + verticalFromOffset,

        -0.027,

        0.027

      );



      ball.x = paddle.x + direction * (PADDLE_RADIUS_X + 1.4);

      ball.lastHitter = player;

      ball.hitLockUntil = now + 180;



      return true;

    },

    [setForce]

  );



  useEffect(() => {

    const onKeyDown = (event) => {

      keysRef.current.add(event.key.toLowerCase());



      if (view === "table" && event.code === "Space" && !event.repeat) {

        event.preventDefault();

        startRally();

      }

    };



    const onKeyUp = (event) => {

      keysRef.current.delete(event.key.toLowerCase());

    };



    window.addEventListener("keydown", onKeyDown);

    window.addEventListener("keyup", onKeyUp);



    return () => {

      window.removeEventListener("keydown", onKeyDown);

      window.removeEventListener("keyup", onKeyUp);

    };

  }, [startRally, view]);



  useEffect(() => {

    if (view !== "table") return undefined;



    let frame;



    const loop = (time) => {

      const rt = runtimeRef.current;



      const dt = Math.min(32, Math.max(0, time - rt.lastFrame || 16));

      rt.lastFrame = time;



      const keyboardSpeed = 0.026;



      if (keysRef.current.has("a")) rt.p1.x = Math.max(5, rt.p1.x - keyboardSpeed * dt);

      if (keysRef.current.has("d")) rt.p1.x = Math.min(45, rt.p1.x + keyboardSpeed * dt);

      if (keysRef.current.has("w")) rt.p1.y = Math.max(9, rt.p1.y - keyboardSpeed * dt);

      if (keysRef.current.has("s")) rt.p1.y = Math.min(91, rt.p1.y + keyboardSpeed * dt);



      if (keysRef.current.has("arrowleft")) rt.p2.x = Math.max(55, rt.p2.x - keyboardSpeed * dt);

      if (keysRef.current.has("arrowright")) rt.p2.x = Math.min(95, rt.p2.x + keyboardSpeed * dt);

      if (keysRef.current.has("arrowup")) rt.p2.y = Math.max(9, rt.p2.y - keyboardSpeed * dt);

      if (keysRef.current.has("arrowdown")) rt.p2.y = Math.min(91, rt.p2.y + keyboardSpeed * dt);



      if (rt.rallyActive) {

        const ball = rt.ball;



        ball.x += ball.vx * dt;

        ball.y += ball.vy * dt;



        /* 极轻微空气阻力，让高力道仍然明显但不会无限飞快。 */

        ball.vx *= Math.pow(0.99986, dt);

        ball.vy *= Math.pow(0.99972, dt);



        tryPaddleHit("p1", time);

        tryPaddleHit("p2", time);



        if (ball.x < -3) {

          registerPoint("p2");

        } else if (ball.x > 103) {

          registerPoint("p1");

        } else if (ball.y < -4 || ball.y > 104) {

          registerPoint(ball.lastHitter === "p1" ? "p2" : "p1");

        }

      }



      ["p1", "p2"].forEach((player) => {

        const paddle = rt[player];



        if (time - paddle.lastMoveAt > 90) {

          paddle.vx *= 0.75;

          paddle.vy *= 0.75;

          paddle.angle *= 0.82;



          const fadedForce = forceRef.current[player] * 0.90;



          if (fadedForce < 0.01) {

            if (forceRef.current[player] !== 0) setForce(player, 0);

          } else if (Math.abs(fadedForce - forceRef.current[player]) > 0.03) {

            setForce(player, fadedForce);

          }

        }

      });



      setCourt({

        ...rt,

        p1: { ...rt.p1 },

        p2: { ...rt.p2 },

        ball: { ...rt.ball },

      });



      frame = requestAnimationFrame(loop);

    };



    runtimeRef.current.lastFrame = performance.now();

    frame = requestAnimationFrame(loop);



    return () => cancelAnimationFrame(frame);

  }, [registerPoint, setForce, tryPaddleHit, view]);



  const setBoardFor = useCallback((player, next) => {

    if (player === "p1") {

      board1Ref.current = next;

      setBoard1(next);

    } else {

      board2Ref.current = next;

      setBoard2(next);

    }

  }, []);



  const toggleCell = useCallback(

    (player, index) => {

      const canPick =

        (conwayPhase === "p1-pick" && player === "p1") ||

        (conwayPhase === "p2-pick" && player === "p2");



      if (!canPick) return;



      const source =

        player === "p1" ? board1Ref.current : board2Ref.current;



      const next = [...source];



      if (!next[index] && countAlive(next) >= MAX_CELLS) {

        return;

      }



      next[index] = !next[index];



      setBoardFor(player, next);

    },

    [conwayPhase, setBoardFor]

  );



  const nextDraftPhase = useCallback(() => {

    if (conwayPhase === "p1-pick") {

      setConwayPhase("p2-pick");

      setConwayTime(CONWAY_PICK_SECONDS);

      return;

    }



    if (conwayPhase === "p2-pick") {

      survivalRef.current = { p1: 0, p2: 0 };

      setSurvival({ p1: 0, p2: 0 });



      setConwayPhase("evolve");

      setConwayTime(CONWAY_EVOLVE_SECONDS);

    }

  }, [conwayPhase]);



  useEffect(() => {

    if (view !== "conway") return undefined;



    if (conwayPhase === "summary") return undefined;



    const timer = window.setInterval(() => {

      setConwayTime((value) => {

        if (value > 1) {

          return value - 1;

        }



        if (conwayPhase === "ready") {

          setConwayPhase("p1-pick");

          return CONWAY_PICK_SECONDS;

        }



        if (conwayPhase === "p1-pick") {

          setConwayPhase("p2-pick");

          return CONWAY_PICK_SECONDS;

        }



        if (conwayPhase === "p2-pick") {

          survivalRef.current = { p1: 0, p2: 0 };

          setSurvival({ p1: 0, p2: 0 });



          setConwayPhase("evolve");

          return CONWAY_EVOLVE_SECONDS;

        }



        return 0;

      });

    }, 1000);



    return () => window.clearInterval(timer);

  }, [conwayPhase, view]);



  useEffect(() => {

    if (view !== "conway" || conwayPhase !== "evolve") {

      return undefined;

    }



    const timer = window.setInterval(() => {

      const current1 = board1Ref.current;

      const current2 = board2Ref.current;



      if (countAlive(current1) > 0) {

        survivalRef.current.p1 += 1;

      }



      if (countAlive(current2) > 0) {

        survivalRef.current.p2 += 1;

      }



      const next1 = evolve(current1);

      const next2 = evolve(current2);



      setBoardFor("p1", next1);

      setBoardFor("p2", next2);



      setSurvival({ ...survivalRef.current });



      setConwayTime((value) => {

        if (value > 1) {

          return value - 1;

        }



        window.clearInterval(timer);



        const alive1 = countAlive(next1);

        const alive2 = countAlive(next2);



        const points1 = Math.min(

          5,

          Math.floor(survivalRef.current.p1 / 5) + (alive1 >= 3 ? 1 : 0)

        );



        const points2 = Math.min(

          5,

          Math.floor(survivalRef.current.p2 / 5) + (alive2 >= 3 ? 1 : 0)

        );



        setChallengeResult({

          p1: {

            survival: survivalRef.current.p1,

            finalCells: alive1,

            bonus: alive1 >= 3 ? 1 : 0,

            points: points1,

          },

          p2: {

            survival: survivalRef.current.p2,

            finalCells: alive2,

            bonus: alive2 >= 3 ? 1 : 0,

            points: points2,

          },

        });



        setSkillPoints((prev) => ({

          p1: prev.p1 + points1,

          p2: prev.p2 + points2,

        }));



        setConwayPhase("summary");



        return 0;

      });

    }, 1000);



    return () => window.clearInterval(timer);

  }, [conwayPhase, setBoardFor, view]);



  const resumeTable = useCallback(() => {

    const rt = runtimeRef.current;



    rt.rallyActive = false;

    rt.p1 = makePaddle("p1");

    rt.p2 = makePaddle("p2");



    rt.ball = {

      x: 50,

      y: 50,

      vx: 0,

      vy: 0,

      lastHitter: null,

      hitLockUntil: 0,

    };



    resetTableTimer();



    setForce("p1", 0);

    setForce("p2", 0);



    snapshotCourt();



    setMessage("");

    setView("table");

  }, [resetTableTimer, setForce, snapshotCourt]);



  const renderBoard = (player, board) => {

    const active =

      (conwayPhase === "p1-pick" && player === "p1") ||

      (conwayPhase === "p2-pick" && player === "p2");



    return (

      <div

        className={[

          "cw-board",

          player === "p1" ? "cw-board-blue" : "cw-board-pink",

          active ? "is-active" : "",

        ]

          .filter(Boolean)

          .join(" ")}

      >

        {board.map((alive, index) => (

          <button

            key={index}

            type="button"

            className={`cw-cell ${alive ? "alive" : ""}`}

            onClick={() => toggleCell(player, index)}

            disabled={!active}

            aria-label={`cell-${index}`}

          >

            {alive && <span />}

          </button>

        ))}

      </div>

    );

  };



  const renderPowerPanel = (player) => {

    const level = capLevels[player];

    const force = forceLevel[player];
    return (

      <section

        className={`cw-power-panel ${

          player === "p1" ? "cw-power-left" : "cw-power-right"

        }`}

      >

        <header>

          <span>{player === "p1" ? t.p1 : t.p2}</span>



          <strong>

  ✦ {skillPoints[player]} · {t.capLevel} {level}

</strong>

        </header>



        <div className="cw-force-row">

          <span>{t.force}</span>



          <div className="cw-force-track">

            <i style={{ width: `${force * 100}%` }} />



          </div>



          <strong>{Math.round(force * 100)}%</strong>

        </div>



        <div className="cw-force-labels">

          <span>{t.forceLow}</span>

          <span>{t.forceHigh}</span>

        </div>



        <button

          type="button"

          className="cw-power-upgrade"

          onClick={() => upgradePower(player)}
        >

          <i>✦</i>



          <div>

            <span>{t.onlySkill}</span>

            <strong>{t.upgradeCap}</strong>

          </div>



          <b>{POWER_SKILL_COST}✦</b>

        </button>

      </section>

    );

  };



  const activePicker =

    conwayPhase === "p1-pick"

      ? "p1"

      : conwayPhase === "p2-pick"

        ? "p2"

        : null;



  return (

    <main className="conway-page">

      <section className="cw-frame">

        {view === "entry" && (

          <section className="cw-entry">

            <img

              src={homeBackground}

              className="cw-entry-bg"

              alt=""

              draggable="false"

            />



            <div className="cw-entry-shade" />







            <header className="cw-entry-topbar">

              <div>

                <span>{t.eyebrow}</span>

                <strong>Conway Table Tennis Arena</strong>

              </div>



              <nav>

                <button

                  type="button"

                  onClick={() =>

                    setLanguage((value) => (value === "zh" ? "en" : "zh"))

                  }

                >

                  {t.language}

                </button>



                <button type="button" onClick={() => setShowRules(true)}>

                  ? {t.guide}

                </button>

              </nav>

            </header>



            <div className="cw-entry-layout">

              <section className="cw-entry-copy">

                <span className="cw-entry-badge">{t.badge}</span>



                <h1>{t.title}</h1>

                <h2>{t.englishTitle}</h2>



                <p>{t.intro}</p>

                <p className="cw-entry-sub">{t.intro2}</p>



                <button

                  type="button"

                  className="cw-entry-start"

                  onClick={startMatch}

                >

                  <span>{t.start}</span>

                  <b>✦</b>

                </button>

              </section>



              <section className="cw-entry-island" aria-hidden="true">

                <div className="cw-island-glow" />

                <img src={conwayIsland} alt="" draggable="false" />

                <div className="cw-entry-orbit orbit-a" />

                <div className="cw-entry-orbit orbit-b" />

              </section>

            </div>

          </section>

        )}



        {view === "table" && (

          <section className="cw-match">

            <header className="cw-match-hud">

             <button

  type="button"

  className="cw-back-button"

  onClick={() => setView("entry")}

  title="Back"

>

  ←

</button>

              <div className="cw-score-box cw-score-left">

                <span>{t.p1}</span>

                <strong>{scores.p1}</strong>

                <small>✦ {skillPoints.p1}</small>

              </div>



              <div className="cw-score-center">

                <span>{t.score}</span>

                <strong>

                  {scores.p1} <i>:</i> {scores.p2}

                </strong>

                <small>

                  {t.rally} {rallyNumber + 1}

                </small>

              </div>



              <div

                className={[

                  "cw-table-countdown",

                  tableTime <= 5 ? "is-danger" : "",

                ]

                  .filter(Boolean)

                  .join(" ")}

              >

                <span>{t.conway}</span>

                <strong>{String(tableTime).padStart(2, "0")}</strong>

                <small>{t.seconds}</small>

              </div>



              <div className="cw-score-box cw-score-right">

                <span>{t.p2}</span>

                <strong>{scores.p2}</strong>

                <small>✦ {skillPoints.p2}</small>

              </div>

            </header>



            <div className="cw-table-shell">

              <div className="cw-table-glow" />



              <div

                className="cw-table"

                onPointerDown={handlePointerDown}

                onPointerMove={handlePointerMove}

                onPointerUp={handlePointerUp}

                onPointerCancel={handlePointerUp}

              >

                <div className="cw-half cw-half-left">

                  <span>P1</span>

                </div>



                <div className="cw-half cw-half-right">

                  <span>P2</span>

                </div>



                <div className="cw-center-net">

                  <i />

                </div>



                <div className="cw-horizontal-line" />

                <div className="cw-quarter-line left" />

                <div className="cw-quarter-line right" />



                <div

                  className="cw-paddle cw-paddle-one"

                  style={{

                    left: `${court.p1.x}%`,

                    top: `${court.p1.y}%`,

                    "--angle": `${court.p1.angle}deg`,

                  }}

                >

                  <div className="cw-paddle-face" />

                  <div className="cw-paddle-handle" />

                  <span>P1</span>

                </div>



                <div

                  className="cw-paddle cw-paddle-two"

                  style={{

                    left: `${court.p2.x}%`,

                    top: `${court.p2.y}%`,

                    "--angle": `${court.p2.angle}deg`,

                  }}

                >

                  <div className="cw-paddle-face" />

                  <div className="cw-paddle-handle" />

                  <span>P2</span>

                </div>



                <div

                  className="cw-ball"

                  style={{

                    left: `${court.ball.x}%`,

                    top: `${court.ball.y}%`,

                  }}

                />



                {!court.rallyActive && !message && (

                  <button

                    type="button"

                    className="cw-serve-button"

                    onPointerDown={(event) => event.stopPropagation()}

                    onClick={startRally}

                  >

                    <span>{court.server === "p1" ? t.p1 : t.p2}</span>

                    <strong>{t.serve}</strong>

                    <small>TAP / SPACE</small>

                  </button>

                )}



                {message && <div className="cw-match-message">{message}</div>}

              </div>



              <div className="cw-drag-tip">

                <b>↔ ↕</b>

                <div>

                  <strong>{t.dragTitle}</strong>

                  <small>{t.dragText}</small>

                </div>

              </div>

            </div>



            {renderPowerPanel("p1")}

            {renderPowerPanel("p2")}



            <div className="cw-keyboard-hint">

              <span>{t.keyboard1}</span>

              <span>{t.keyboard2}</span>

            </div>

          </section>

        )}



        {view === "conway" && (

          <section className="cw-conway">

            <div className="cw-conway-bg" />



            <header className="cw-conway-top">

              <div>

                <span>CONWAY DRAFT PHASE</span>



                <strong>

                  {conwayPhase === "ready"

                    ? t.readyTitle

                    : conwayPhase === "p1-pick"

                      ? t.p1PickTitle

                      : conwayPhase === "p2-pick"

                        ? t.p2PickTitle

                        : conwayPhase === "evolve"

                          ? t.evolveTitle

                          : t.challengeDone}

                </strong>



                <small>

                  {conwayPhase === "ready"

                    ? t.readyText

                    : conwayPhase === "p1-pick" || conwayPhase === "p2-pick"

                      ? t.pickText

                      : conwayPhase === "evolve"

                        ? t.evolveText

                        : t.rule}

                </small>

              </div>



              {conwayPhase !== "summary" && (

                <div className="cw-conway-clock">

                  <span>

                    {conwayPhase === "ready"

                      ? "READY"

                      : conwayPhase === "evolve"

                        ? "LIVE"

                        : "PICK"}

                  </span>



                  <strong>{conwayTime}</strong>

                  <small>SEC</small>

                </div>

              )}

            </header>



            <div className="cw-draft-flow">

              <div className={`cw-draft-step ${conwayPhase === "ready" ? "active" : "done"}`}>

                <i>01</i>

                <span>READY</span>

              </div>



              <div

                className={`cw-draft-step ${

                  conwayPhase === "p1-pick"

                    ? "active blue"

                    : ["p2-pick", "evolve", "summary"].includes(conwayPhase)

                      ? "done"

                      : ""

                }`}

              >

                <i>02</i>

                <span>P1 PICK</span>

              </div>



              <div

                className={`cw-draft-step ${

                  conwayPhase === "p2-pick"

                    ? "active pink"

                    : ["evolve", "summary"].includes(conwayPhase)

                      ? "done"

                      : ""

                }`}

              >

                <i>03</i>

                <span>P2 PICK</span>

              </div>



              <div

                className={`cw-draft-step ${

                  conwayPhase === "evolve"

                    ? "active gold"

                    : conwayPhase === "summary"

                      ? "done"

                      : ""

                }`}

              >

                <i>04</i>

                <span>EVOLVE</span>

              </div>

            </div>



            <div className="cw-conway-layout">

              <section

                className={[

                  "cw-board-panel",

                  "cw-board-panel-one",

                  activePicker === "p1" ? "is-picking" : "",

                  activePicker === "p2" ? "is-waiting" : "",

                ]

                  .filter(Boolean)

                  .join(" ")}

              >

                <header>

                  <div>

                    <span>{t.p1}</span>

                    <strong>BLUE MATRIX</strong>

                  </div>



                  <div>

                    <small>{t.cells}</small>

                    <b>{countAlive(board1)}</b>

                  </div>

                </header>



                {renderBoard("p1", board1)}



                <footer>

                  <span>

                    {activePicker === "p1"

                      ? `${t.placed} ${countAlive(board1)} / ${MAX_CELLS}`

                      : activePicker === "p2"

                        ? t.waiting

                        : conwayPhase === "evolve"

                          ? `${t.aliveTime} ${survival.p1}s`

                          : ""}

                  </span>



                  {activePicker === "p1" && (

                    <button type="button" onClick={nextDraftPhase}>

                      {t.confirm}

                    </button>

                  )}

                </footer>

              </section>



              <section className="cw-conway-core">

                <div className="cw-life-mark">∞</div>



                <span>B3 / S23</span>



                <strong>

                  {conwayPhase === "ready"

                    ? "PREPARE"

                    : conwayPhase === "p1-pick"

                      ? "PLAYER 1"

                      : conwayPhase === "p2-pick"

                        ? "PLAYER 2"

                        : conwayPhase === "evolve"

                          ? `GEN ${CONWAY_EVOLVE_SECONDS - conwayTime + 1}`

                          : "RESULT"}

                </strong>



                <small>{t.rule}</small>

              </section>



              <section

                className={[

                  "cw-board-panel",

                  "cw-board-panel-two",

                  activePicker === "p2" ? "is-picking" : "",

                  activePicker === "p1" ? "is-waiting" : "",

                ]

                  .filter(Boolean)

                  .join(" ")}

              >

                <header>

                  <div>

                    <span>{t.p2}</span>

                    <strong>MAGENTA MATRIX</strong>

                  </div>



                  <div>

                    <small>{t.cells}</small>

                    <b>{countAlive(board2)}</b>

                  </div>

                </header>



                {renderBoard("p2", board2)}



                <footer>

                  <span>

                    {activePicker === "p2"

                      ? `${t.placed} ${countAlive(board2)} / ${MAX_CELLS}`

                      : activePicker === "p1"

                        ? t.waiting

                        : conwayPhase === "evolve"

                          ? `${t.aliveTime} ${survival.p2}s`

                          : ""}

                  </span>



                  {activePicker === "p2" && (

                    <button type="button" onClick={nextDraftPhase}>

                      {t.confirm}

                    </button>

                  )}

                </footer>

              </section>

            </div>



            {(conwayPhase === "p1-pick" || conwayPhase === "p2-pick") && (

              <div className="cw-auto-confirm">{t.autoConfirm}</div>

            )}



            {conwayPhase === "summary" && challengeResult && (

              <div className="cw-summary-overlay">

                <section className="cw-summary-card">

                  <span className="cw-summary-kicker">CONWAY COMPLETE</span>



                  <h2>{t.challengeDone}</h2>



                  <div className="cw-summary-grid">

                    {["p1", "p2"].map((player) => {

                      const result = challengeResult[player];



                      return (

                        <article

                          key={player}

                          className={

                            player === "p1"

                              ? "cw-summary-blue"

                              : "cw-summary-pink"

                          }

                        >

                          <span>{player === "p1" ? t.p1 : t.p2}</span>



                          <div>

                            <small>{t.survival}</small>

                            <strong>{result.survival}s</strong>

                          </div>



                          <div>

                            <small>{t.finalCells}</small>

                            <strong>{result.finalCells}</strong>

                          </div>



                          <div>

                            <small>{t.bonus}</small>

                            <strong>+{result.bonus}</strong>

                          </div>



                          <footer>

                            <small>{t.gained}</small>

                            <strong>+{result.points} ✦</strong>

                          </footer>

                        </article>

                      );

                    })}

                  </div>



                  <button

                    type="button"

                    className="cw-primary-button"

                    onClick={resumeTable}

                  >

                    {t.resume}

                  </button>

                </section>

              </div>

            )}

          </section>

        )}



        {view === "end" && (

          <section className="cw-end-screen">

            <div className="cw-end-card">

              <span className="cw-summary-kicker">{t.matchOver}</span>



              <div className="cw-trophy">♔</div>



              <h1>

                {winner === "p1" ? t.p1 : t.p2} {t.wins}

              </h1>



              <p>{t.finalScore}</p>



              <div className="cw-final-score">

                <strong>{scores.p1}</strong>

                <span>:</span>

                <strong>{scores.p2}</strong>

              </div>



              <div className="cw-end-actions">

                <button

                  type="button"

                  className="cw-primary-button"

                  onClick={startMatch}

                >

                  {t.playAgain}

                </button>



                <button

                  type="button"

                  className="cw-secondary-button"

                  onClick={() => setView("entry")}

                >

                  {t.backEntrance}

                </button>

              </div>

            </div>

          </section>

        )}



        {showRules && (

          <div className="cw-overlay" onMouseDown={() => setShowRules(false)}>

            <section

              className="cw-rules-modal"

              onMouseDown={(event) => event.stopPropagation()}

            >

              <button

                type="button"

                className="cw-close-button"

                onClick={() => setShowRules(false)}

              >

                ×

              </button>



              <span className="cw-summary-kicker">{t.howTo}</span>

              <h2>{t.title}</h2>



              <div className="cw-rules-grid">

                {[

                  ["01", t.step1, t.step1Text],

                  ["02", t.step2, t.step2Text],

                  ["03", t.step3, t.step3Text],

                  ["04", t.step4, t.step4Text],

                  ["05", t.step5, t.step5Text],

                ].map(([number, title, text]) => (

                  <article key={number}>

                    <b>{number}</b>



                    <div>

                      <strong>{title}</strong>

                      <p>{text}</p>

                    </div>

                  </article>

                ))}

              </div>

            </section>

          </div>

        )}



        {showLeave && (

          <div className="cw-overlay" onMouseDown={() => setShowLeave(false)}>

            <section

              className="cw-leave-modal"

              onMouseDown={(event) => event.stopPropagation()}

            >

              <span className="cw-summary-kicker">{t.backEntrance}</span>



              <h2>{t.pauseTitle}</h2>

              <p>{t.pauseText}</p>



              <div className="cw-modal-actions">

                <button

                  type="button"

                  className="cw-secondary-button"

                  onClick={() => setShowLeave(false)}

                >

                  {t.stay}

                </button>



                <button

                  type="button"

                  className="cw-primary-button"

                  onClick={() => {

                    setShowLeave(false);

                    setView("entry");

                  }}

                >

                  {t.leave}

                </button>

              </div>

            </section>

          </div>

        )}

      </section>

    </main>

  );

}
