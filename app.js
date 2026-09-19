import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const $ = id => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];
const show = id => screens.forEach(s => s.classList.toggle("active", s.id === id));
const clean = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let code="", team="", playerName="", playerId="", game=null, listeners=[], clock=null;

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

onValue(ref(db,".info/connected"), s => {
  const ok = !!s.val();
  const el = $("connection");
  el.textContent = ok ? "● Connected" : "● Offline";
  el.style.background = ok ? "#2ed573" : "#ff4757";
});

function randomCode() { return Math.random().toString(36).slice(2,7).toUpperCase(); }
function gameRef() { return ref(db, `games/${code}`); }
function stop() { listeners.forEach(x => x()); listeners = []; clearInterval(clock); }

function teamsObject() {
  return {
    "Red A": { score: 0, participants: {} },
    "Red B": { score: 0, participants: {} },
    "Yellow A": { score: 0, participants: {} },
    "Yellow B": { score: 0, participants: {} },
    "Blue A": { score: 0, participants: {} },
    "Blue B": { score: 0, participants: {} }
  };
}

// Teacher Host Actions
$("createGame").onclick = async () => {
  try {
    stop(); code = randomCode();
    await set(gameRef(), { status: "lobby", level: 0, index: 0, teams: teamsObject(), createdAt: Date.now() });
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
      return `
        <div class="team-card team-${cssClass} ${players.length ? 'has-players' : ''}">
          <div class="team-card-head">
            <span class="team-name">${clean(tName)}</span>
            <span class="team-score">${tData.score || 0} pts</span>
          </div>
          <div class="team-players">
            ${players.length ? players.map(p => `<span class="player-pill">👤 ${p}</span>`).join("") : '<i>Waiting for players...</i>'}
          </div>
        </div>`;
    }).join("");

    const labels = ["Lobby", "Level 1 • MCQ Quiz", "Level 2 • Sequence Steps", "Level 3 • Robot Coding"];
    $("hostLevel").textContent = labels[game.level || 0];
    $("hostProgress").textContent = game.level ? `Question/Task ${game.index + 1}` : "Students can join now.";
    if (game.status === "finished") celebrateHost(teamEntries);
  }));
}

$("startGame").onclick = async () => update(gameRef(), { status: "playing", level: 1, index: 0 });
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

    playerId = crypto.randomUUID().replaceAll("-","").slice(0, 16);
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
    $("myScore").textContent = game.teams?.[team]?.score || 0;
    if (game.status !== "playing") {
      $("playTitle").textContent = "Waiting in Lobby...";
      $("playArea").innerHTML = "<div class='panel center'><h3>🎮 You're in!</h3><p>Look at the main screen. The teacher will start soon!</p></div>";
      return;
    }
    renderCurrentLevel();
  }));
}

function submissionKey() { return `games/${code}/submissions/${team.replace(" ","_")}_${game.level}_${game.index}/${playerId}`; }

async function awardPoints(pts) {
  const lock = ref(db, submissionKey());
  const tx = await runTransaction(lock, v => v ? undefined : { name: playerName, team, pts, at: Date.now() });
  if (!tx.committed) return false;
  await runTransaction(ref(db, `games/${code}/teams/${team}/score`), v => (v || 0) + pts);
  return true;
}

function advanceLevel() {
  const max = game.level === 1 ? MCQ.length : (game.level === 2 ? SEQ.length : ROBOT_MAPS.length);
  if (game.index < max - 1) update(gameRef(), { index: game.index + 1 });
  else if (game.level < 3) update(gameRef(), { level: game.level + 1, index: 0 });
  else update(gameRef(), { status: "finished" });
}

function renderCurrentLevel() {
  const idx = game.index;
  $("playTitle").textContent = game.level === 1 ? "Level 1 • MCQ Quiz" : game.level === 2 ? "Level 2 • Sequence Steps" : "Level 3 • Robot Coding";
  const max = game.level === 1 ? MCQ.length : (game.level === 2 ? SEQ.length : ROBOT_MAPS.length);
  $("progress").style.width = `${((idx + 1) / max) * 100}%`;
  
  if (game.level === 1) renderMCQ(idx);
  else if (game.level === 2) renderSeq(idx);
  else renderRobot(idx);
}

// 1. MCQ
function renderMCQ(idx) {
  clearInterval(clock);
  let timer = 25;
  const [q, opts, correct] = MCQ[idx];
  
  $("playArea").innerHTML = `
    <div class="panel question">
      <div class="timer-box">⏱️ <span id="timer">25</span>s</div>
      <h3>${idx + 1}. ${clean(q)}</h3>
      <div class="options-grid">
        ${opts.map((o, i) => `<button class="opt-btn" data-ans="${i}">${clean(o)}</button>`).join("")}
      </div>
    </div>`;

  clock = setInterval(() => {
    timer--;
    if ($("timer")) $("timer").textContent = timer;
    if (timer <= 0) { clearInterval(clock); handleAns(-1, correct); }
  }, 1000);

  document.querySelectorAll("[data-ans]").forEach(b => {
    b.onclick = () => { clearInterval(clock); handleAns(+b.dataset.ans, correct); };
  });

  async function handleAns(chosen, right) {
    document.querySelectorAll("[data-ans]").forEach(b => b.disabled = true);
    const isOk = chosen === right;
    await awardPoints(isOk ? 100 : 0);
    $("playMessage").textContent = isOk ? "🎉 Correct! +100 Points" : "❌ Incorrect (+0 Points)";
    setTimeout(() => { $("playMessage").textContent = ""; advanceLevel(); }, 1200);
  }
}

// 2. Sequence Game Fix
function renderSeq(idx) {
  const [title, steps] = SEQ[idx];
  let currentOrder = [...steps].sort(() => Math.random() - 0.5);

  function drawSeq() {
    $("playArea").innerHTML = `
      <div class="panel">
        <h3>${clean(title)}</h3>
        <p>Reorder the steps into the correct algorithmic order:</p>
        <div class="seq-list" id="seqList">
          ${currentOrder.map((step, i) => `
            <div class="seq-item" data-idx="${i}">
              <span><b>${i + 1}.</b>${clean(step)}</span>
              <div class="seq-controls">
                <button class="arrow-btn move-up" data-i="${i}" ${i===0?'disabled':''}>▲</button>
                <button class="arrow-btn move-down" data-i="${i}" ${i===currentOrder.length-1?'disabled':''}>▼</button>
              </div>
            </div>
          `).join("")}
        </div>
        <button id="submitSeq" class="btn btn-primary btn-full">Check Sequence</button>
      </div>`;

    document.querySelectorAll(".move-up").forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      [currentOrder[i-1], currentOrder[i]] = [currentOrder[i], currentOrder[i-1]];
      drawSeq();
    });

    document.querySelectorAll(".move-down").forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      [currentOrder[i], currentOrder[i+1]] = [currentOrder[i+1], currentOrder[i]];
      drawSeq();
    });

    $("submitSeq").onclick = async () => {
      const isCorrect = currentOrder.every((s, i) => s === steps[i]);
      $("submitSeq").disabled = true;
      await awardPoints(isCorrect ? 120 : 0);
      $("playMessage").textContent = isCorrect ? "🌟 Great Job! Correct Sequence! +120" : "❌ Sequence Incorrect (+0)";
      setTimeout(() => { $("playMessage").textContent = ""; advanceLevel(); }, 1400);
    };
  }
  drawSeq();
}

// 3. Robot Game Fix
function renderRobot(idx) {
  const map = ROBOT_MAPS[idx];
  let robotPos = [...map.start];
  let robotDir = map.dir; // 0: Up, 1: Right, 2: Down, 3: Left
  let commands = [];
  const dirs = ["⬆️", "➡️", "⬇️", "⬅️"];

  function drawGrid() {
    $("playArea").innerHTML = `
      <div class="panel robotLayout">
        <div>
          <h3>${clean(map.title)}</h3>
          <p>Guide the robot 🤖 to the target goal 🎯!</p>
          <div id="grid" class="robotGrid"></div>
        </div>
        <div>
          <h4>Program Queue</h4>
          <div id="cmdBox" class="command-box">None</div>
          <div class="control-pad">
            <button class="btn btn-primary" data-cmd="F">▲ Forward</button>
            <button class="btn btn-primary" data-cmd="L">↺ Turn L</button>
            <button class="btn btn-primary" data-cmd="R">↻ Turn R</button>
          </div>
          <button id="runRobot" class="btn btn-success btn-full">▶️ Run Code</button>
          <button id="clearRobot" class="btn back-btn btn-full" style="margin-top:6px;">Clear</button>
        </div>
      </div>`;

    renderCells();

    document.querySelectorAll("[data-cmd]").forEach(b => b.onclick = () => {
      if (commands.length < 15) { commands.push(b.dataset.cmd); updateCmdBox(); }
    });

    $("clearRobot").onclick = () => { commands = []; robotPos = [...map.start]; robotDir = map.dir; updateCmdBox(); renderCells(); };
    $("runRobot").onclick = () => executeProgram();
  }

  function updateCmdBox() {
    $("cmdBox").innerHTML = commands.map(c => `<span class="cmd-chip">${c === 'F' ? 'Forward' : c === 'L' ? 'Turn L' : 'Turn R'}</span>`).join("") || "<i>No commands added</i>";
  }

  function renderCells() {
    const gridEl = $("grid");
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
    $("runRobot").disabled = true;
    const walls = new Set(map.walls);
    let r = map.start[0], c = map.start[1], d = map.dir;
    let crashed = false;

    for (let cmd of commands) {
      await new Promise(res => setTimeout(res, 450));
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
    await awardPoints(reachedGoal ? 150 : 0);
    $("playMessage").textContent = reachedGoal ? "🎯 Mission Complete! +150 Points" : crashed ? "💥 Oh no! Robot Crashed!" : "❌ Didn't reach goal.";
    setTimeout(() => { $("playMessage").textContent = ""; advanceLevel(); }, 1500);
  }

  drawGrid();
}

function celebrateHost(teamEntries) {
  const sorted = [...teamEntries].sort((a,b) => (b[1].score||0) - (a[1].score||0));
  const maxScore = sorted[0][1].score || 0;
  const winners = sorted.filter(([_, v]) => (v.score||0) === maxScore && maxScore > 0);

  if (winners.length === 0) {
    $("winnerTitle").textContent = "Game Finished!";
    $("winnerPoints").textContent = "0 Points";
    $("winnerPlayers").textContent = "Great practice session everyone!";
  } else {
    $("winnerTitle").textContent = winners.length > 1 ? "🎉 Joint Victory!" : `🏆 ${winners[0][0]} Wins!`;
    $("winnerPoints").textContent = `${maxScore} Points`;
    $("winnerPlayers").innerHTML = winners.map(([name, data]) => 
      `<div style="font-weight:800; margin:5px;">${name}: ${Object.values(data.participants||{}).map(p=>clean(p.name)).join(", ")}</div>`
    ).join("");
  }
  $("winner").classList.remove("hidden");
}

$("closeWinner").onclick = () => { $("winner").classList.add("hidden"); show("home"); };

// 6. Individual Mode Flow
let ind = { name: "", score: 0, level: 1, index: 0 };

$("startIndividual").onclick = () => {
  ind.name = $("individualName").value.trim();
  if (!ind.name) return;
  ind.score = 0; ind.level = 1; ind.index = 0;
  $("individualStart").classList.add("hidden");
  $("individualArea").classList.remove("hidden");
  renderIndividual();
};

function renderIndividual() {
  const box = $("individualArea");
  
  if (ind.level === 1) {
    const [q, opts, correct] = MCQ[ind.index];
    box.innerHTML = `
      <div class="question">
        <small class="pill-tag">INDIVIDUAL • MCQ (${ind.index + 1}/3)</small>
        <h3>${clean(q)}</h3>
        <div class="options-grid">
          ${opts.map((o, i) => `<button class="opt-btn" data-ians="${i}">${clean(o)}</button>`).join("")}
        </div>
      </div>`;
    
    box.querySelectorAll("[data-ians]").forEach(b => b.onclick = () => {
      if (+b.dataset.ians === correct) ind.score += 100;
      ind.index++;
      if (ind.index >= 3) { ind.level = 2; ind.index = 0; }
      renderIndividual();
    });
  } 
  else if (ind.level === 2) {
    const [title, steps] = SEQ[ind.index];
    let current = [...steps].sort(() => Math.random() - 0.5);
    
    function drawIndSeq() {
      box.innerHTML = `
        <h3>${clean(title)}</h3>
        <small class="pill-tag">INDIVIDUAL • SEQUENCE (${ind.index + 1}/2)</small>
        <div class="seq-list" style="margin-top:15px;">
          ${current.map((s, i) => `
            <div class="seq-item">
              <span><b>${i+1}.</b>${clean(s)}</span>
              <div class="seq-controls">
                <button class="arrow-btn i-up" data-i="${i}" ${i===0?'disabled':''}>▲</button>
                <button class="arrow-btn i-down" data-i="${i}" ${i===current.length-1?'disabled':''}>▼</button>
              </div>
            </div>
          `).join("")}
        </div>
        <button id="indSubSeq" class="btn btn-primary btn-full">Submit Steps</button>`;

      box.querySelectorAll(".i-up").forEach(b => b.onclick = () => {
        const i = +b.dataset.i;
        [current[i-1], current[i]] = [current[i], current[i-1]];
        drawIndSeq();
      });
      box.querySelectorAll(".i-down").forEach(b => b.onclick = () => {
        const i = +b.dataset.i;
        [current[i], current[i+1]] = [current[i+1], current[i]];
        drawIndSeq();
      });

      $("indSubSeq").onclick = () => {
        if (current.every((s, i) => s === steps[i])) ind.score += 120;
        ind.index++;
        if (ind.index >= 2) { ind.level = 3; ind.index = 0; }
        renderIndividual();
      };
    }
    drawIndSeq();
  }
  else if (ind.level === 3) {
    const map = ROBOT_MAPS[ind.index];
    let robotPos = [...map.start], robotDir = map.dir, cmds = [];
    const dirs = ["⬆️", "➡️", "⬇️", "⬅️"];

    function drawIndRobot() {
      box.innerHTML = `
        <h3>${clean(map.title)}</h3>
        <small class="pill-tag">INDIVIDUAL • ROBOT (${ind.index + 1}/2)</small>
        <div id="iGrid" class="robotGrid" style="margin:15px 0;"></div>
        <div id="iCmds" class="command-box">None</div>
        <div class="control-pad">
          <button class="btn btn-primary" data-icmd="F">▲ Forward</button>
          <button class="btn btn-primary" data-icmd="L">↺ Turn L</button>
          <button class="btn btn-primary" data-icmd="R">↻ Turn R</button>
        </div>
        <button id="iRun" class="btn btn-success btn-full">Run Program</button>`;

      drawICells();

      box.querySelectorAll("[data-icmd]").forEach(b => b.onclick = () => {
        if (cmds.length < 15) { cmds.push(b.dataset.icmd); updateICmds(); }
      });

      $("iRun").onclick = async () => {
        let r = map.start[0], c = map.start[1], d = map.dir, crashed = false;
        const walls = new Set(map.walls);
        for (let cmd of cmds) {
          await new Promise(res => setTimeout(res, 350));
          if (cmd === "L") d = (d + 3) % 4;
          else if (cmd === "R") d = (d + 1) % 4;
          else if (cmd === "F") {
            const dr = [-1, 0, 1, 0][d], dc = [0, 1, 0, -1][d];
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= map.size || nc >= map.size || walls.has(`${nr},${nc}`)) { crashed = true; break; }
            r = nr; c = nc;
          }
          robotPos = [r, c]; robotDir = d;
          drawICells();
        }
        if (!crashed && r === map.goal[0] && c === map.goal[1]) ind.score += 150;
        ind.index++;
        if (ind.index >= 2) finishIndividual();
        else renderIndividual();
      };
    }

    function updateICmds() {
      $("iCmds").innerHTML = cmds.map(c => `<span class="cmd-chip">${c === 'F' ? 'Forward' : c === 'L' ? 'Turn L' : 'Turn R'}</span>`).join("") || "None";
    }

    function drawICells() {
      const g = $("iGrid"); g.innerHTML = "";
      const walls = new Set(map.walls);
      for (let r = 0; r < map.size; r++) {
        for (let c = 0; c < map.size; c++) {
          const isRobot = robotPos[0] === r && robotPos[1] === c;
          const isGoal = map.goal[0] === r && map.goal[1] === c;
          const isWall = walls.has(`${r},${c}`);
          g.insertAdjacentHTML("beforeend", `<div class="cell ${isWall?'wall':''} ${isGoal?'goal':''} ${isRobot?'robot':''}">${isRobot?dirs[robotDir]:isGoal?"🎯":isWall?"🧱":""}</div>`);
        }
      }
    }
    drawIndRobot();
  }
}

function finishIndividual() {
  $("certificateName").textContent = ind.name;
  $("certificateScore").textContent = ind.score;
  $("certificateDate").textContent = new Date().toLocaleDateString();
  show("certificate");
}
