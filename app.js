import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const $ = id => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];
const show = id => screens.forEach(s => s.classList.toggle("active", s.id === id));
const clean = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let code = "", team = "", playerName = "", playerId = "", game = null, listeners = [], clock = null;

// Question & Level Banks
const MCQ = [
  ["What is an algorithm?", ["A step-by-step set of instructions", "A type of computer screen", "A secret password", "A colorful picture"], 0],
  ["Which makes an algorithm easy to follow?", ["Clear and exact steps", "Randomly skipped steps", "Secret instructions", "Missing steps"], 0],
  ["What should every good algorithm have?", ["A clear goal", "Only photos", "No specific order", "A mystery"], 0],
  ["Which of these is a real-life algorithm?", ["A cooking recipe", "A wooden chair", "The color green", "A digital clock"], 0],
  ["Why is step order important in algorithms?", ["So actions happen correctly", "It makes the paper prettier", "It makes it take longer", "It confuses computers"], 0],
  ["What does 'debugging' mean?", ["Finding and fixing errors", "Deleting all your work", "Drawing pictures", "Guessing answers"], 0],
  ["Which instruction is precise?", ["Move forward 2 steps", "Go somewhere nearby", "Move a tiny bit", "Do something fun"], 0],
  ["What should you do if an instruction is unclear?", ["Make it specific and clear", "Ignore it completely", "Skip the whole goal", "Guess randomly"], 0],
  ["How do you test an algorithm?", ["Follow each step exactly", "Skip every second step", "Change the main goal", "Guess the result"], 0],
  ["What happens if steps are in the wrong order?", ["The final result may be wrong", "Nothing changes", "You gain bonus points", "The game restarts"], 0]
];

const SEQ = [
  ["Make Toast 🍞", ["Get a slice of bread", "Put bread in toaster", "Push lever down", "Wait for it to toast", "Take out warm toast"]],
  ["Brush Teeth 🪥", ["Get toothbrush and toothpaste", "Put toothpaste on brush", "Brush teeth thoroughly", "Rinse mouth with water", "Put toothbrush away"]],
  ["Make a Sandwich 🥪", ["Get two slices of bread", "Spread butter or filling", "Put second slice on top", "Cut sandwich in half", "Enjoy your sandwich"]],
  ["Plant a Seed 🪴", ["Get a plant pot", "Fill pot with soil", "Place seed in soil", "Cover seed gently", "Water it regularly"]]
];

const ROBOT_MAPS = [
  { title: "Mission 1: Straight Ahead 🚀", size: 6, start: [0,0], dir: 1, goal: [0,4], walls: ["1,1", "1,2", "2,1"] },
  { title: "Mission 2: Turn the Corner ↪️", size: 6, start: [0,0], dir: 1, goal: [3,3], walls: ["0,2", "1,2", "2,0", "2,2"] },
  { title: "Mission 3: Obstacle Course 🧩", size: 6, start: [5,0], dir: 0, goal: [1,4], walls: ["4,1", "3,1", "3,3", "2,3", "1,2"] }
];

document.querySelectorAll("[data-screen]").forEach(b => b.onclick = () => show(b.dataset.screen));

onValue(ref(db, ".info/connected"), s => {
  const ok = !!s.val();
  const el = $("connection");
  el.textContent = ok ? "● Connected" : "● Offline";
  el.style.background = ok ? "#2ed573" : "#ff4757";
});

function randomCode() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }
function gameRef() { return ref(db, `games/${code}`); }
function stop() { listeners.forEach(x => x()); listeners = []; clearInterval(clock); }

function teamsObject() {
  return {
    "Red A": { score: 0, level: 1, index: 0, participants: {} },
    "Red B": { score: 0, level: 1, index: 0, participants: {} },
    "Yellow A": { score: 0, level: 1, index: 0, participants: {} },
    "Yellow B": { score: 0, level: 1, index: 0, participants: {} },
    "Blue A": { score: 0, level: 1, index: 0, participants: {} },
    "Blue B": { score: 0, level: 1, index: 0, participants: {} }
  };
}

// Teacher Host
$("createGame").onclick = async () => {
  try {
    stop(); code = randomCode();
    await set(gameRef(), { status: "lobby", teams: teamsObject(), createdAt: Date.now() });
    $("gameCode").textContent = code;
    $("hostMessage").textContent = "Students can now join using this code!";
    $("startGame").disabled = false;
    $("finishGame").disabled = false;
    watchHost();
  } catch (e) { $("hostMessage").textContent = "Error: " + e.message; }
};

function watchHost() {
  listeners.push(onValue(gameRef(), s => {
    game = s.val(); if (!game) return;
    const teamEntries = Object.entries(game.teams || {});
    const activeCount = teamEntries.filter(([_, v]) => Object.keys(v.participants || {}).length > 0).length;
    $("teamCount").textContent = `${activeCount} / 6 Active`;

    $("leaderboard").innerHTML = teamEntries.map(([tName, tData]) => {
      const players = Object.values(tData.participants || {}).map(p => clean(p.name));
      const cssClass = tName.replace(" ", "-");
      const lvlStr = tData.finished ? "Finished 🏁" : `Lvl ${tData.level || 1} • Q${(tData.index || 0) + 1}`;
      return `
        <div class="team-card team-${cssClass} ${players.length ? 'has-players' : ''}">
          <div class="team-card-head">
            <div>
              <span class="team-name">${clean(tName)}</span>
              <div style="font-size:12px; color:#64748b; font-weight:800; margin-top:2px;">${lvlStr}</div>
            </div>
            <span class="team-score">${tData.score || 0} pts</span>
          </div>
          <div class="team-players">
            ${players.length ? players.map(p => `<span class="player-pill">👤 ${p}</span>`).join("") : '<i>Waiting for players...</i>'}
          </div>
        </div>`;
    }).join("");

    $("hostLevel").textContent = game.status === "playing" ? "Game in Progress" : "Lobby";
    $("hostProgress").textContent = game.status === "playing" ? "Teams are progressing independently." : "Students may join now.";
    if (game.status === "finished") celebrateHost(teamEntries);
  }));
}

$("startGame").onclick = async () => update(gameRef(), { status: "playing" });
$("finishGame").onclick = async () => update(gameRef(), { status: "finished" });

// Student Join
$("joinGame").onclick = async () => {
  try {
    stop();
    code = $("joinCode").value.trim().toUpperCase();
    playerName = $("studentName").value.trim();
    team = $("team").value;
    if (!/^[A-Z0-9]{5}$/.test(code)) throw Error("Enter a valid 5-character code.");
    if (!playerName) throw Error("Please enter your name.");
    if (!team) throw Error("Please choose a team.");

    const snap = await get(gameRef());
    if (!snap.exists()) throw Error("Game not found. Double check code.");
    if (snap.val().status === "finished") throw Error("This game has ended.");

    playerId = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
    await set(ref(db, `games/${code}/teams/${team}/participants/${playerId}`), { name: playerName, joinedAt: Date.now() });

    $("myTeam").textContent = team;
    $("joinMessage").textContent = "";
    show("play");
    watchStudent();
  } catch (e) { $("joinMessage").textContent = e.message; }
};

function watchStudent() {
  listeners.push(onValue(gameRef(), s => {
    game = s.val(); if (!game) return;
    const teamData = game.teams?.[team] || {};
    $("myScore").textContent = teamData.score || 0;

    if (game.status !== "playing") {
      $("playTitle").textContent = "Waiting in Lobby...";
      $("playArea").innerHTML = "<div class='panel center'><h3>🎮 You're in!</h3><p>Look at the main screen. The teacher will start soon!</p></div>";
      return;
    }

    if (teamData.finished) {
      $("playTitle").textContent = "Quest Completed!";
      $("playArea").innerHTML = "<div class='panel center'><h3>🎉 Team Challenge Complete!</h3><p>Waiting for the teacher to reveal final scores...</p></div>";
      return;
    }

    renderTeamLevel(teamData.level || 1, teamData.index || 0);
  }));
}

function submissionKey(curLevel, curIndex) {
  return `games/${code}/submissions/${team.replace(" ", "_")}_${curLevel}_${curIndex}/${playerId}`;
}

async function awardPoints(pts, curLevel, curIndex) {
  const lock = ref(db, submissionKey(curLevel, curIndex));
  const tx = await runTransaction(lock, v => v ? undefined : { name: playerName, team, pts, at: Date.now() });
  if (!tx.committed) return false;
  await runTransaction(ref(db, `games/${code}/teams/${team}/score`), v => (v || 0) + pts);
  return true;
}

async function advanceTeamLevel(curLevel, curIndex) {
  const max = curLevel === 1 ? MCQ.length : (curLevel === 2 ? SEQ.length : ROBOT_MAPS.length);
  if (curIndex < max - 1) {
    await update(ref(db, `games/${code}/teams/${team}`), { index: curIndex + 1 });
  } else if (curLevel < 3) {
    await update(ref(db, `games/${code}/teams/${team}`), { level: curLevel + 1, index: 0 });
  } else {
    await update(ref(db, `games/${code}/teams/${team}`), { finished: true });
    showFinishPrompt("Awesome team effort! Your team completed all challenges!");
  }
}

let activeRenderKey = "";
function renderTeamLevel(curLevel, curIndex) {
  const key = `${curLevel}_${curIndex}`;
  if (activeRenderKey === key) return;
  activeRenderKey = key;

  $("playTitle").textContent = curLevel === 1 ? "Level 1 • MCQ Quiz" : curLevel === 2 ? "Level 2 • Sequence Steps" : "Level 3 • Robot Coding";
  const max = curLevel === 1 ? MCQ.length : (curLevel === 2 ? SEQ.length : ROBOT_MAPS.length);
  $("progress").style.width = `${((curIndex + 1) / max) * 100}%`;

  if (curLevel === 1) renderMCQ(curIndex, curLevel);
  else if (curLevel === 2) renderSeq(curIndex, curLevel);
  else renderRobot(curIndex, curLevel);
}

// 1. MCQ (Time-based score + Shuffled choices)
function renderMCQ(idx, level, isIndividual = false, onIndComplete = null) {
  clearInterval(clock);
  let timeLeft = 30;
  const [qText, originalOpts, correctOrigIdx] = MCQ[idx];
  const correctText = originalOpts[correctOrigIdx];

  // Jumble choices dynamically
  const shuffledOpts = originalOpts.map(opt => ({ opt, isCorrect: opt === correctText }))
    .sort(() => Math.random() - 0.5);

  const container = isIndividual ? $("individualArea") : $("playArea");

  container.innerHTML = `
    <div class="panel question">
      <div class="timer-box">⏱️ <span id="mcqTimer">30</span>s</div>
      <h3>${idx + 1}. ${clean(qText)}</h3>
      <div class="options-grid">
        ${shuffledOpts.map((o, i) => `<button class="opt-btn" data-ans="${i}">${clean(o.opt)}</button>`).join("")}
      </div>
    </div>`;

  clock = setInterval(() => {
    timeLeft--;
    const tEl = $("mcqTimer");
    if (tEl) tEl.textContent = timeLeft;
    if (timeLeft <= 0) { clearInterval(clock); handleAnswer(-1); }
  }, 1000);

  container.querySelectorAll("[data-ans]").forEach(b => {
    b.onclick = () => { clearInterval(clock); handleAnswer(+b.dataset.ans); };
  });

  async function handleAnswer(chosenIdx) {
    container.querySelectorAll("[data-ans]").forEach(b => b.disabled = true);
    const isCorrect = chosenIdx >= 0 && shuffledOpts[chosenIdx].isCorrect;

    // Time-based scoring: 50 base points + up to 100 speed bonus
    const pointsEarned = isCorrect ? (50 + Math.round((timeLeft / 30) * 100)) : 0;

    if (isIndividual) {
      if (isCorrect) ind.score += pointsEarned;
      onIndComplete();
    } else {
      await awardPoints(pointsEarned, level, idx);
      $("playMessage").textContent = isCorrect ? `🎉 Correct! +${pointsEarned} pts` : "❌ Incorrect (+0 pts)";
      setTimeout(() => {
        $("playMessage").textContent = "";
        activeRenderKey = "";
        advanceTeamLevel(level, idx);
      }, 1200);
    }
  }
}

// 2. Sequencing Game (Draggable + Auto-advance on Drop)
function renderSeq(idx, level, isIndividual = false, onIndComplete = null) {
  clearInterval(clock);
  let timeLeft = 45;
  const [title, steps] = SEQ[idx];
  let currentOrder = [...steps].sort(() => Math.random() - 0.5);

  const container = isIndividual ? $("individualArea") : $("playArea");

  function drawSeqUI() {
    container.innerHTML = `
      <div class="panel">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3>${clean(title)}</h3>
          <div class="timer-box" style="font-size:22px; margin:0;">⏱️ <span id="seqTimer">45</span>s</div>
        </div>
        <p>Drag the steps into the correct algorithmic order:</p>
        <div class="seq-list" id="seqList">
          ${currentOrder.map((step, i) => `
            <div class="seq-item" draggable="true" data-idx="${i}">
              <span class="drag-handle">☰</span>
              <span style="flex-grow:1;"><b>${i + 1}.</b>${clean(step)}</span>
            </div>
          `).join("")}
        </div>
      </div>`;

    bindDragEvents();
  }

  function bindDragEvents() {
    const list = container.querySelector("#seqList");
    let dragSrcIndex = null;

    list.querySelectorAll(".seq-item").forEach(item => {
      item.addEventListener("dragstart", e => {
        dragSrcIndex = +item.dataset.idx;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      item.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      item.addEventListener("drop", e => {
        e.preventDefault();
        const targetIndex = +item.dataset.idx;
        if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
          const movedItem = currentOrder.splice(dragSrcIndex, 1)[0];
          currentOrder.splice(targetIndex, 0, movedItem);
          drawSeqUI();
          checkAutoSequence();
        }
      });

      item.addEventListener("dragend", () => item.classList.remove("dragging"));
    });
  }

  async function checkAutoSequence() {
    const isCorrect = currentOrder.every((s, i) => s === steps[i]);
    if (isCorrect) {
      clearInterval(clock);
      const items = container.querySelectorAll(".seq-item");
      items.forEach(it => it.classList.add("success-flash"));

      const points = 100 + Math.round((timeLeft / 45) * 50);

      if (isIndividual) {
        ind.score += points;
        setTimeout(onIndComplete, 1000);
      } else {
        await awardPoints(points, level, idx);
        $("playMessage").textContent = `🌟 Correct Sequence! +${points} pts`;
        setTimeout(() => {
          $("playMessage").textContent = "";
          activeRenderKey = "";
          advanceTeamLevel(level, idx);
        }, 1200);
      }
    }
  }

  drawSeqUI();

  clock = setInterval(() => {
    timeLeft--;
    const tEl = $("seqTimer");
    if (tEl) tEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(clock);
      if (isIndividual) onIndComplete();
      else {
        awardPoints(0, level, idx);
        activeRenderKey = "";
        advanceTeamLevel(level, idx);
      }
    }
  }, 1000);
}

// 3. Robot Game (Arrow Avatar + Reorderable/Deletable Commands)
function renderRobot(idx, level, isIndividual = false, onIndComplete = null) {
  const map = ROBOT_MAPS[idx];
  let robotPos = [...map.start];
  let robotDir = map.dir; // 0: Up, 1: Right, 2: Down, 3: Left
  let commands = [];
  const dirs = ["⬆️", "➡️", "⬇️", "⬅️"];

  const container = isIndividual ? $("individualArea") : $("playArea");

  function drawGridUI() {
    container.innerHTML = `
      <div class="panel robotLayout">
        <div>
          <h3>${clean(map.title)}</h3>
          <p>Guide the robot arrow target to goal 🎯!</p>
          <div id="grid" class="robotGrid"></div>
        </div>
        <div>
          <h4>Program Queue</h4>
          <p class="sub-text">Drag chips to reorder, click ✖ to remove.</p>
          <div id="cmdBox" class="command-box"></div>
          <div class="control-pad">
            <button class="btn btn-primary" data-cmd="F">▲ Forward</button>
            <button class="btn btn-primary" data-cmd="L">↺ Turn L</button>
            <button class="btn btn-primary" data-cmd="R">↻ Turn R</button>
          </div>
          <button id="runRobot" class="btn btn-success btn-full">▶️ Run Code</button>
          <button id="clearRobot" class="btn back-btn btn-full" style="margin-top:6px;">Clear Queue</button>
        </div>
      </div>`;

    renderCells();
    renderCmdQueue();

    container.querySelectorAll("[data-cmd]").forEach(b => b.onclick = () => {
      if (commands.length < 15) {
        commands.push(b.dataset.cmd);
        renderCmdQueue();
      }
    });

    container.querySelector("#clearRobot").onclick = () => {
      commands = [];
      robotPos = [...map.start];
      robotDir = map.dir;
      renderCmdQueue();
      renderCells();
    };

    container.querySelector("#runRobot").onclick = () => executeProgram();
  }

  function renderCmdQueue() {
    const cmdBox = container.querySelector("#cmdBox");
    if (!commands.length) {
      cmdBox.innerHTML = "<i>No commands added yet</i>";
      return;
    }

    cmdBox.innerHTML = commands.map((c, i) => `
      <div class="cmd-chip" draggable="true" data-cidx="${i}">
        <span>${c === 'F' ? 'Forward ▲' : c === 'L' ? 'Turn L ↺' : 'Turn R ↻'}</span>
        <button class="cmd-del-btn" data-del="${i}">✖</button>
      </div>
    `).join("");

    cmdBox.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        commands.splice(+b.dataset.del, 1);
        renderCmdQueue();
      };
    });

    // Reorder command chips via drag & drop
    let dragCmdIdx = null;
    cmdBox.querySelectorAll(".cmd-chip").forEach(chip => {
      chip.addEventListener("dragstart", e => {
        dragCmdIdx = +chip.dataset.cidx;
        chip.classList.add("dragging");
      });
      chip.addEventListener("dragover", e => e.preventDefault());
      chip.addEventListener("drop", e => {
        e.preventDefault();
        const targetIdx = +chip.dataset.cidx;
        if (dragCmdIdx !== null && dragCmdIdx !== targetIdx) {
          const moved = commands.splice(dragCmdIdx, 1)[0];
          commands.splice(targetIdx, 0, moved);
          renderCmdQueue();
        }
      });
      chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
    });
  }

  function renderCells() {
    const gridEl = container.querySelector("#grid");
    if (!gridEl) return;
    gridEl.innerHTML = "";
    const walls = new Set(map.walls);

    for (let r = 0; r < map.size; r++) {
      for (let c = 0; c < map.size; c++) {
        const isRobot = robotPos[0] === r && robotPos[1] === c;
        const isGoal = map.goal[0] === r && map.goal[1] === c;
        const isWall = walls.has(`${r},${c}`);

        let cellClass = "cell";
        if (isWall) cellClass += " wall";
        if (isGoal) cellClass += " goal";
        if (isRobot) cellClass += " robot";

        gridEl.insertAdjacentHTML("beforeend", `
          <div class="${cellClass}">
            ${isRobot ? dirs[robotDir] : isGoal ? "🎯" : isWall ? "🧱" : ""}
          </div>`);
      }
    }
  }

  async function executeProgram() {
    container.querySelector("#runRobot").disabled = true;
    const walls = new Set(map.walls);
    let r = map.start[0], c = map.start[1], d = map.dir;
    let crashed = false;

    for (let cmd of commands) {
      await new Promise(res => setTimeout(res, 400));
      if (cmd === "L") d = (d + 3) % 4;
      else if (cmd === "R") d = (d + 1) % 4;
      else if (cmd === "F") {
        const dr = [-1, 0, 1, 0][d];
        const dc = [0, 1, 0, -1][d];
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= map.size || nc >= map.size || walls.has(`${nr},${nc}`)) {
          crashed = true;
          break;
        }
        r = nr; c = nc;
      }
      robotPos = [r, c]; robotDir = d;
      renderCells();
    }

    const reachedGoal = !crashed && r === map.goal[0] && c === map.goal[1];

    if (isIndividual) {
      if (reachedGoal) ind.score += 150;
      setTimeout(onIndComplete, 1200);
    } else {
      await awardPoints(reachedGoal ? 150 : 0, level, idx);
      $("playMessage").textContent = reachedGoal ? "🎯 Mission Complete! +150 pts" : crashed ? "💥 Robot Crashed!" : "❌ Didn't reach goal.";
      setTimeout(() => {
        $("playMessage").textContent = "";
        activeRenderKey = "";
        advanceTeamLevel(level, idx);
      }, 1400);
    }
  }

  drawGridUI();
}

// Finish Prompts
function showFinishPrompt(msg) {
  $("finishPromptMessage").textContent = msg;
  $("finishPrompt").classList.remove("hidden");
}
$("closeFinishPrompt").onclick = () => $("finishPrompt").classList.add("hidden");

function celebrateHost(teamEntries) {
  const sorted = [...teamEntries].sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
  const maxScore = sorted[0]?.[1]?.score || 0;
  const winners = sorted.filter(([_, v]) => (v.score || 0) === maxScore && maxScore > 0);

  if (winners.length === 0) {
    $("winnerTitle").textContent = "Game Finished!";
    $("winnerPoints").textContent = "0 Points";
    $("winnerPlayers").textContent = "Great practice session everyone!";
  } else {
    $("winnerTitle").textContent = winners.length > 1 ? "🎉 Joint Victory!" : `🏆 ${winners[0][0]} Wins!`;
    $("winnerPoints").textContent = `${maxScore} Points`;
    $("winnerPlayers").innerHTML = winners.map(([name, data]) =>
      `<div style="font-weight:800; margin:5px;">${name}: ${Object.values(data.participants || {}).map(p => clean(p.name)).join(", ")}</div>`
    ).join("");
  }
  $("winner").classList.remove("hidden");
}

$("closeWinner").onclick = () => { $("winner").classList.add("hidden"); show("home"); };

// 6. Synchronized Individual Mode
let ind = { name: "", score: 0, level: 1, index: 0 };

$("startIndividual").onclick = () => {
  ind.name = $("individualName").value.trim();
  if (!ind.name) return;
  ind.score = 0; ind.level = 1; ind.index = 0;
  $("individualStart").classList.add("hidden");
  $("individualArea").classList.remove("hidden");
  renderIndividualStep();
};

function renderIndividualStep() {
  if (ind.level === 1) {
    renderMCQ(ind.index, 1, true, () => {
      ind.index++;
      if (ind.index >= 3) { ind.level = 2; ind.index = 0; }
      renderIndividualStep();
    });
  } else if (ind.level === 2) {
    renderSeq(ind.index, 2, true, () => {
      ind.index++;
      if (ind.index >= 2) { ind.level = 3; ind.index = 0; }
      renderIndividualStep();
    });
  } else if (ind.level === 3) {
    renderRobot(ind.index, 3, true, () => {
      ind.index++;
      if (ind.index >= 2) finishIndividual();
      else renderIndividualStep();
    });
  }
}

function finishIndividual() {
  $("certificateName").textContent = ind.name;
  $("certificateScore").textContent = ind.score;
  $("certificateDate").textContent = new Date().toLocaleDateString();
  showFinishPrompt("Solo Quest completed! View your certificate below.");
  show("certificate");
}
