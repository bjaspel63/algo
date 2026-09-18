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

const MCQ=[
["What is an algorithm?",["A step-by-step plan","A computer","A password","A colour"],0],
["Which makes an algorithm easy to follow?",["Clear steps","Random steps","Hidden steps","Missing steps"],0],
["What should an algorithm have?",["A goal","Only pictures","No order","A secret"],0],
["Which is an algorithm?",["A recipe","A chair","A colour","A number"],0],
["Why is order important?",["Steps happen correctly","It looks nicer","It is longer","It is harder"],0],
["What is debugging?",["Finding and fixing errors","Deleting work","Drawing","Guessing"],0],
["Which instruction is precise?",["Move forward 2 spaces","Go somewhere","Move a bit","Do something"],0],
["What should you do if a step is unclear?",["Make it specific","Ignore it","Skip the goal","Guess"],0],
["How should you test an algorithm?",["Follow the steps exactly","Skip steps","Change the goal","Guess"],0],
["What can a wrong order cause?",["The result may be wrong","Nothing","More points","A new game"],0]
];
const SEQ=[
["Make toast",["Get bread","Put bread in toaster","Press lever","Wait","Take out toast"]],
["Brush teeth",["Get toothbrush","Put toothpaste on brush","Brush teeth","Rinse","Put toothbrush away"]],
["Make a sandwich",["Get bread","Add filling","Put second slice on top","Cut sandwich","Eat"]],
["Log in",["Turn on computer","Wait for login screen","Type username","Type password","Click sign in"]],
["Plant a seed",["Get a pot","Add soil","Place seed","Cover seed","Water it"]]
];
const ROBOT=[
["Mission 1",[[0,0],[0,1],[0,2],[1,2],[2,2]]],
["Mission 2",[[0,0],[1,0],[1,1],[1,2],[2,2],[2,3]]],
["Mission 3",[[0,0],[0,1],[1,1],[2,1],[2,2],[3,2],[3,3]]],
["Mission 4",[[0,0],[1,0],[1,1],[1,2],[2,2],[2,3],[3,3],[4,3]]],
["Mission 5",[[0,0],[0,1],[1,1],[2,1],[2,2],[2,3],[3,3],[4,3],[4,4]]]
];

document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>show(b.dataset.screen));
onValue(ref(db,".info/connected"),s=>{const ok=!!s.val();$("connection").textContent=ok?"● Connected":"● Offline";$("connection").style.background=ok?"#195b3a":"#5b2630"});

function randomCode(){return Math.random().toString(36).slice(2,7).toUpperCase()}
function gameRef(){return ref(db,`games/${code}`)}
function stop(){listeners.forEach(x=>x());listeners=[];clearInterval(clock)}
function teamsObject(){return {Red:{score:0,participants:{}},Blue:{score:0,participants:{}},Green:{score:0,participants:{}},Yellow:{score:0,participants:{}}}}

$("createGame").onclick=async()=>{
 try{
  stop();code=randomCode();
  await set(gameRef(),{status:"lobby",level:0,index:0,teams:teamsObject(),createdAt:Date.now()});
  $("gameCode").textContent=code;$("hostMessage").textContent="Students can now join using this code.";
  $("startGame").disabled=false;$("finishGame").disabled=false;watchHost();
 }catch(e){$("hostMessage").textContent="Firebase error: "+e.message}
};

function watchHost(){
 listeners.push(onValue(gameRef(),s=>{
  game=s.val();if(!game)return;
  const rows=Object.entries(game.teams||{}).map(([t,v])=>({t,...v})).sort((a,b)=>(b.score||0)-(a.score||0));
  const joined=rows.filter(x=>Object.keys(x.participants||{}).length);
  $("teamCount").textContent=joined.length+" teams";
  $("leaderboard").innerHTML=rows.map((x,i)=>`<div class="teamrow"><b>${i+1}. ${clean(x.t)}</b><div><b>${x.score||0} pts</b><div class="players">${Object.values(x.participants||{}).map(p=>clean(p.name)).join(" • ")||"Waiting"}</div></div><span>${i===0&&x.score>0?"🏆":""}</span></div>`).join("");
  const labels=["Lobby","Level 1 • MCQ","Level 2 • In Order","Level 3 • Robot"];
  $("hostLevel").textContent=labels[game.level||0];
  $("hostProgress").textContent=game.level?`Question ${game.index+1} • Team paced`:"Students may join.";
  if(game.status==="finished") celebrate(rows);
 }));
}
$("startGame").onclick=async()=>update(gameRef(),{status:"playing",level:1,index:0});
$("finishGame").onclick=async()=>update(gameRef(),{status:"finished"});

$("joinGame").onclick=async()=>{
 try{
  stop();code=$("joinCode").value.trim().toUpperCase();playerName=$("studentName").value.trim();team=$("team").value;
  if(!/^[A-Z0-9]{5}$/.test(code))throw Error("Game code must be 5 characters.");
  if(!playerName)throw Error("Enter your name.");if(!team)throw Error("Choose a team.");
  const snap=await get(gameRef());if(!snap.exists())throw Error("Game not found. Check the code.");
  if(snap.val().status==="finished")throw Error("That game has finished.");
  playerId=crypto.randomUUID().replaceAll("-","").slice(0,16);
  await set(ref(db,`games/${code}/teams/${team}/participants/${playerId}`),{name:playerName,joinedAt:Date.now()});
  $("joinMessage").textContent="Joined! Waiting for the teacher…";$("myTeam").textContent=team+" Team";show("play");watchStudent();
 }catch(e){$("joinMessage").textContent=e.message}
};

function watchStudent(){
 listeners.push(onValue(gameRef(),s=>{game=s.val();if(!game)return;
  $("myScore").textContent=game.teams?.[team]?.score||0;
  if(game.status!=="playing"){$("playTitle").textContent="Waiting for the teacher…";$("playArea").innerHTML="<div class='panel'>You are in the game. Get ready!</div>";return}
  renderCurrent();
 }));
}
function submissionKey(){return `games/${code}/submissions/${team}_${game.level}_${game.index}/${playerId}`}
async function award(points){
 const lock=ref(db,submissionKey());
 const tx=await runTransaction(lock,v=>v?undefined:{name:playerName,team,points,at:Date.now()});
 if(!tx.committed)return false;
 await runTransaction(ref(db,`games/${code}/teams/${team}/score`),v=>(v||0)+points);
 return true;
}
function advance(){
 const max=game.level===1?10:5;
 if(game.index<max-1)update(gameRef(),{index:game.index+1});
 else if(game.level<3)update(gameRef(),{level:game.level+1,index:0});
 else update(gameRef(),{status:"finished"});
}
function renderCurrent(){
 const i=game.index;
 $("playTitle").textContent=game.level===1?"Level 1 • MCQ":game.level===2?"Level 2 • In Order":"Level 3 • Robot Game";
 $("progress").style.width=((i+1)/(game.level===1?10:5)*100)+"%";
 if(game.level===1)renderMCQ(i);else if(game.level===2)renderSeq(i);else renderRobot(i);
}
function renderMCQ(i){
 clearInterval(clock);let left=30;const [q,opts,correct]=MCQ[i];
 $("playArea").innerHTML=`<div class="panel question"><div class="timer" id="timer">30</div><h3>${i+1}. ${clean(q)}</h3><div class="options">${opts.map((o,n)=>`<button data-answer="${n}">${clean(o)}</button>`).join("")}</div></div>`;
 clock=setInterval(()=>{left--;if($("timer"))$("timer").textContent=left;if(left<=0){clearInterval(clock);submit(null,0)}},1000);
 document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>{clearInterval(clock);submit(+b.dataset.answer,correct)});
 async function submit(answer,correctIndex){document.querySelectorAll("[data-answer]").forEach(b=>b.disabled=true);const ok=answer===correctIndex;await award(ok?100:0);$("playMessage").textContent=ok?"Correct! +100":"Submitted. 0 points";setTimeout(advance,450)}
}
function renderSeq(i){
 const [title,steps]=SEQ[i],items=[...steps].sort(()=>Math.random()-.5);
 $("playArea").innerHTML=`<div class="panel"><h3>${clean(title)}</h3><p>Drag the steps into the correct order. You may submit a wrong answer.</p><div id="sequence" class="sequence">${items.map(x=>`<div class="seq" draggable="true">${clean(x)}</div>`).join("")}</div><button id="submitSeq">Submit Order</button></div>`;
 const box=$("sequence");let drag=null;box.querySelectorAll(".seq").forEach(e=>{e.ondragstart=()=>drag=e;e.ondragover=x=>x.preventDefault();e.ondrop=x=>{x.preventDefault();if(drag!==e)box.insertBefore(drag,e)}});
 $("submitSeq").onclick=async()=>{const answer=[...box.children].map(x=>x.textContent),ok=answer.every((x,n)=>x===steps[n]);$("submitSeq").disabled=true;await award(ok?100:0);$("playMessage").textContent=ok?"Correct! +100":"Submitted. 0 points";setTimeout(advance,450)}
}
function renderRobot(i){
 const path=ROBOT[i][1],start=path[0],goal=path[path.length-1],size=7;
 const walls=new Set();for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(!path.some(p=>p[0]===r&&p[1]===c)&&Math.random()<.16)walls.add(`${r},${c}`);
 let r=start[0],c=start[1],dir=1,cmd=[];
 $("playArea").innerHTML=`<div class="panel robotLayout"><div><h3>${clean(ROBOT[i][0])}</h3><p>Program the robot to reach the goal.</p><div id="robotGrid" class="robotGrid"></div></div><div><b>Commands</b><p id="commands">None</p><div class="controls"><button data-cmd="F">▲</button><button data-cmd="L">◀</button><button data-cmd="R">▶</button></div><button id="testRobot">Test</button><button id="clearRobot" class="back">Clear</button></div></div>`;
 function draw(){let g=$("robotGrid");g.innerHTML="";for(let rr=0;rr<size;rr++)for(let cc=0;cc<size;cc++){let cl="cell";if(walls.has(`${rr},${cc}`))cl+=" wall";if(rr===goal[0]&&cc===goal[1])cl+=" goal";if(rr===r&&cc===c)cl+=" robot";g.insertAdjacentHTML("beforeend",`<div class="${cl}">${rr===r&&cc===c?"🤖":rr===goal[0]&&cc===goal[1]?"🎯":""}</div>`)}$("commands").textContent=cmd.join(" → ")||"None"}
 document.querySelectorAll("[data-cmd]").forEach(b=>b.onclick=()=>{if(cmd.length<25){cmd.push(b.dataset.cmd);draw()}});
 $("clearRobot").onclick=()=>{cmd=[];r=start[0];c=start[1];dir=1;draw()};
 $("testRobot").onclick=async()=>{let rr=start[0],cc=start[1],dd=1,ok=false;for(const x of cmd){if(x==="L")dd=(dd+3)%4;if(x==="R")dd=(dd+1)%4;if(x==="F"){const dr=[-1,0,1,0][dd],dc=[0,1,0,-1][dd],nr=rr+dr,nc=cc+dc;if(nr<0||nc<0||nr>=size||nc>=size||walls.has(`${nr},${nc}`))break;rr=nr;cc=nc;if(rr===goal[0]&&cc===goal[1]){ok=true;break}}}r=rr;c=cc;dir=dd;draw();$("testRobot").disabled=true;await award(ok?150:0);$("playMessage").textContent=ok?"Mission complete! +150":"Program failed. 0 points";setTimeout(advance,550)};
 draw();
}
function celebrate(rows){
 const max=Math.max(...rows.map(x=>x.score||0),0),win=rows.filter(x=>(x.score||0)===max&&max>0);
 $("winnerTitle").textContent=win.length>1?"Joint Winners!":`${win[0]?.t||"No"} Team Wins!`;
 $("winnerPoints").textContent=`${max} points`;
 $("winnerPlayers").innerHTML=win.flatMap(w=>Object.values(w.participants||{}).map(p=>`<div class="winnerPlayer">🎉 ${clean(p.name)}</div>`)).join("");
 $("winner").classList.remove("hidden");
 for(let i=0;i<45;i++){const e=document.createElement("span");e.textContent="🎉";e.style.cssText=`position:fixed;left:${Math.random()*100}vw;top:-20px;font-size:20px;z-index:20;animation:fall ${1+Math.random()*2}s linear forwards`;document.body.appendChild(e);setTimeout(()=>e.remove(),3200)}
}
$("closeWinner").onclick=()=>{$("winner").classList.add("hidden");show("home")};

// Individual
let individual={name:"",score:0,game:0};
$("startIndividual").onclick=()=>{individual.name=$("individualName").value.trim();if(!individual.name)return;individual.score=0;individual.game=0;$("individualStart").classList.add("hidden");$("individualArea").classList.remove("hidden");renderIndividual()};
function renderIndividual(){
 const box=$("individualArea");
 if(individual.game===0){box.innerHTML="<h3>🤖 Robot</h3><p>Use the sequence F F R F F to reach the goal.</p><div class='controls'><button data-i='F'>▲</button><button data-i='L'>◀</button><button data-i='R'>▶</button></div><p id='ic'>None</p><button id='it'>Test</button>";let c=[];document.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{c.push(b.dataset.i);$("ic").textContent=c.join(" → ")});$("it").onclick=()=>{if(c.join("")==="FFRFF"){individual.score+=150;individual.game++;renderIndividual()}else $("ic").textContent="Not correct — try again."}}
 else if(individual.game===1){const correct=["Get shoes","Choose shoes","Put shoes on","Tie laces"];box.innerHTML=`<h3>🔢 In Order</h3><div id="is" class="sequence">${[...correct].sort(()=>Math.random()-.5).map(x=>`<div class="seq" draggable="true">${x}</div>`).join("")}</div><button id="isub">Submit</button>`;const s=$("is");let d;s.querySelectorAll(".seq").forEach(e=>{e.ondragstart=()=>d=e;e.ondragover=x=>x.preventDefault();e.ondrop=x=>{x.preventDefault();if(d!==e)s.insertBefore(d,e)}});$("isub").onclick=()=>{if([...s.children].map(x=>x.textContent).join("|")===correct.join("|")){individual.score+=100;individual.game++;renderIndividual()}else $("isub").textContent="0 points — try again"}}
 else {box.innerHTML="<h3>💡 Think of Any</h3><p>Write at least 3 clear steps for an everyday task.</p><textarea id='idea' rows='7' placeholder='1. ...\\n2. ...\\n3. ...'></textarea><button id='finishIndividual'>Finish & Certificate</button>";$("finishIndividual").onclick=()=>{const lines=$("idea").value.split(/\\n/).filter(x=>x.trim());if(lines.length>=3)individual.score+=100;$("certificateName").textContent=individual.name;$("certificateScore").textContent=individual.score;$("certificateDate").textContent=new Date().toLocaleDateString();show("certificate")}}
}
