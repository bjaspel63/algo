import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const $ = id => document.getElementById(id);
const screens=[...document.querySelectorAll(".screen")];
const show=id=>screens.forEach(s=>s.classList.toggle("active",s.id===id));
const clean=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let code="",team="",playerName="",playerId="",game=null,listeners=[],clock=null;
const TEAM_NAMES=["Red","Blue","Green","Yellow","Orange","Purple","Pink","Teal","Gold","Silver"];

// Team MCQ: exactly 10 questions, 30 seconds each, maximum 5 minutes for the level.
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

// Every robot mission is deterministic and has a guaranteed route.
// Directions: 0=N, 1=E, 2=S, 3=W. Robot starts facing East.
const ROBOT=[
{title:"Mission 1",start:[0,0],goal:[2,2],walls:[[0,3],[1,0],[1,1],[3,2],[4,4]],solution:["F","F","R","F","F"]},
{title:"Mission 2",start:[0,0],goal:[2,3],walls:[[0,3],[1,1],[2,1],[3,3],[4,0]],solution:["F","R","F","F","L","F"]},
{title:"Mission 3",start:[0,0],goal:[3,3],walls:[[0,4],[1,0],[1,2],[2,2],[3,1],[4,4]],solution:["F","F","F","R","F","F","F"]},
{title:"Mission 4",start:[0,0],goal:[4,3],walls:[[0,2],[1,1],[2,1],[2,4],[3,2],[4,1]],solution:["R","F","F","F","F","F","L","F","F","F","L","F"]},
{title:"Mission 5",start:[0,0],goal:[4,4],walls:[[0,3],[1,0],[1,2],[2,2],[3,1],[3,4]],solution:["F","R","F","F","R","F","L","F","F","L","F","F","F","F"]}
];

function randomCode(){return Math.random().toString(36).slice(2,7).toUpperCase()}
function gameRef(){return ref(db,`games/${code}`)}
function stop(){listeners.forEach(x=>x());listeners=[];clearInterval(clock);clock=null}
function initTeams(){const t={};TEAM_NAMES.forEach(n=>t[n]={score:0,participants:{},progress:{level:0,index:0,status:"waiting",levelStartedAt:null,questionStartedAt:null}});return t}
function teamHasPlayers(v){return v && Object.keys(v.participants||{}).length>0}
function currentMax(level){return level===1?10:5}

TEAM_NAMES.forEach(n=>{const o=document.createElement("option");o.value=n;o.textContent=n+" Team";$("team").appendChild(o)});

onValue(ref(db,".info/connected"),s=>{
 const ok=!!s.val();$("connection").textContent=ok?"● Connected":"● Offline";$("connection").style.background=ok?"#195b3a":"#5b2630";
});

// ---------------- Teacher ----------------
$("createGame").onclick=async()=>{
 try{
  stop();code=randomCode();
  await set(gameRef(),{status:"lobby",level:0,index:0,teams:initTeams(),createdAt:Date.now()});
  $("gameCode").textContent=code;$("hostMessage").textContent="Game created. Share the 5-character code with students.";
  $("startGame").disabled=false;$("finishGame").disabled=false;watchHost();
 }catch(e){$("hostMessage").textContent="Firebase error: "+e.message}
};

function watchHost(){
 listeners.push(onValue(gameRef(),s=>{
  game=s.val();if(!game)return;
  const rows=TEAM_NAMES.map(t=>({t,...(game.teams?.[t]||{})}));
  const joined=rows.filter(teamHasPlayers);
  $("teamCount").textContent=`${joined.length}/10 teams`;
  $("leaderboard").innerHTML=rows.map((x,i)=>{
   const players=Object.values(x.participants||{}).map(p=>clean(p.name)).join(" • ");
   const p=x.progress||{};const level=p.level?`L${p.level} • ${p.status==="done"?"Complete":`Q${p.index+1}`}`:"Waiting";
   return `<div class="teamrow"><b>${i+1}. ${clean(x.t)}</b><div><b>${x.score||0} pts</b><div class="players">${players||"No students yet"} • ${level}</div></div><span>${p.status==="done"?"✅":""}</span></div>`;
  }).join("");
  $("hostLevel").textContent=game.status==="lobby"?"Lobby":game.status==="finished"?"Finished":"Live • Team paced";
  $("hostProgress").textContent=game.status==="lobby"?"Students may join.":"No teacher Next button — teams advance themselves.";
  if(game.status==="finished")celebrate(rows);
 }));
}

$("startGame").onclick=async()=>{
 const snap=await get(gameRef());if(!snap.exists())return;
 const g=snap.val(),now=Date.now(),updates={status:"playing",level:1,index:0};
 TEAM_NAMES.forEach(t=>{
  const v=g.teams?.[t]; if(teamHasPlayers(v)){
   updates[`teams/${t}/progress`]={level:1,index:0,status:"playing",levelStartedAt:now,questionStartedAt:now};
  }
 });
 await update(gameRef(),updates);
};

$("finishGame").onclick=async()=>update(gameRef(),{status:"finished"});

// ---------------- Student join ----------------
$("joinGame").onclick=async()=>{
 try{
  stop();code=$("joinCode").value.trim().toUpperCase();playerName=$("studentName").value.trim();team=$("team").value;
  if(!/^[A-Z0-9]{5}$/.test(code))throw Error("Game code must be 5 characters.");
  if(!playerName)throw Error("Enter your name.");
  if(!team)throw Error("Choose a team.");
  const snap=await get(gameRef());if(!snap.exists())throw Error("Game not found. Check the code.");
  const g=snap.val();if(g.status==="finished")throw Error("That game has finished.");
  if(!g.teams?.[team])throw Error("That team is not available.");
  playerId=(crypto.randomUUID?crypto.randomUUID():Date.now()+"_"+Math.random()).replaceAll("-","").slice(0,18);
  await set(ref(db,`games/${code}/teams/${team}/participants/${playerId}`),{name:playerName,joinedAt:Date.now()});
  $("joinMessage").textContent="Joined! Waiting for the teacher…";$("myTeam").textContent=team+" Team";show("play");watchStudent();
 }catch(e){$("joinMessage").textContent=e.message}
};

function watchStudent(){
 listeners.push(onValue(gameRef(),s=>{
  game=s.val();if(!game)return;
  $("myScore").textContent=game.teams?.[team]?.score||0;
  if(game.status==="finished"){celebrate(TEAM_NAMES.map(t=>({t,...(game.teams?.[t]||{})})));return}
  if(game.status!=="playing"){$("playTitle").textContent="Waiting for the teacher…";$("playArea").innerHTML="<div class='panel center'><h3>You're in!</h3><p>Stay with your team. The challenge will start soon.</p></div>";return}
  renderCurrent();
 }));
}

function teamProgress(){return game?.teams?.[team]?.progress||{}}
function renderCurrent(){
 const p=teamProgress();if(!p.level)return;
 $("playTitle").textContent=p.level===1?"Level 1 • MCQ":p.level===2?"Level 2 • In Order":"Level 3 • Robot Game";
 $("progress").style.width=((p.index+1)/currentMax(p.level)*100)+"%";
 if(p.level===1)renderMCQ(p.index,p);else if(p.level===2)renderSeq(p.index);else renderRobot(p.index);
}

// Atomic team submission: first submission for a team/question wins,
// so multiple students cannot score twice or advance the team twice.
async function teamSubmit(points,meta,forceLevelEnd=false){
 const p=teamProgress(),level=p.level,index=p.index;
 if(!level)return false;
 const expired=level===1 && Date.now()-(p.levelStartedAt||Date.now())>=300000;
 if(expired){points=0;forceLevelEnd=true;meta="5-minute-limit"}
 const teamRef=ref(db,`games/${code}/teams/${team}`);
 const result=await runTransaction(teamRef,current=>{
  if(!current)return;
  const key=`${level}_${index}`;
  current.answers=current.answers||{};
  if(current.answers[key])return;
  current.answers[key]={by:playerId,name:playerName,points,meta:meta||"",at:Date.now()};
  current.score=(current.score||0)+points;
  const max=currentMax(level);
  if(forceLevelEnd && level<3){current.progress.level=level+1;current.progress.index=0;current.progress.levelStartedAt=Date.now();current.progress.questionStartedAt=Date.now()}
  else if(index<max-1){current.progress.index=index+1;current.progress.questionStartedAt=Date.now()}
  else if(level<3){current.progress.level=level+1;current.progress.index=0;current.progress.levelStartedAt=Date.now();current.progress.questionStartedAt=Date.now()}
  else current.progress.status="done";
  return current;
 });
 if(result.committed)checkAllFinished();
 return result.committed;
}
async function checkAllFinished(){
 const s=await get(gameRef());if(!s.exists())return;
 const g=s.val(),active=TEAM_NAMES.map(t=>g.teams?.[t]).filter(teamHasPlayers);
 if(active.length && active.every(v=>v.progress?.status==="done"))await update(gameRef(),{status:"finished"});
}

function renderMCQ(i,p){
 clearInterval(clock);const [q,opts,correct]=MCQ[i];
 $("playArea").innerHTML=`<div class="panel question"><div class="timer" id="timer">30</div><h3>${i+1}. ${clean(q)}</h3><div class="options">${opts.map((o,n)=>`<button data-answer="${n}">${clean(o)}</button>`).join("")}</div><p class="hint">30 seconds per question • Level limit: 5 minutes</p></div>`;
 let left=Math.max(0,30-Math.floor((Date.now()-(p.questionStartedAt||Date.now()))/1000));
 $("timer").textContent=left;
 clock=setInterval(async()=>{
  const pp=teamProgress();left=Math.max(0,30-Math.floor((Date.now()-(pp.questionStartedAt||Date.now()))/1000));
  if($("timer"))$("timer").textContent=left;
  const levelElapsed=Date.now()-(pp.levelStartedAt||Date.now());
  if(levelElapsed>=300000){clearInterval(clock);await teamSubmit(0,"timeout",true)} else if(left<=0){clearInterval(clock);await teamSubmit(0,"timeout")}
 },500);
 document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=async()=>{
  clearInterval(clock);document.querySelectorAll("[data-answer]").forEach(x=>x.disabled=true);
  const ok=+b.dataset.answer===correct;await teamSubmit(ok?100:0,ok?"correct":"wrong");
  $("playMessage").textContent=ok?"Correct! +100":"Submitted • 0 points";
 });
}

function renderSeq(i){
 const [title,steps]=SEQ[i],items=[...steps].sort((a,b)=>a.localeCompare(b)); // fixed deterministic presentation
 $("playArea").innerHTML=`<div class="panel"><h3>${clean(title)}</h3><p>Drag the steps into the correct order. Wrong answers score 0, then your team continues.</p><div id="sequence" class="sequence">${items.map(x=>`<div class="seq" draggable="true">${clean(x)}</div>`).join("")}</div><button id="submitSeq">Submit Order</button></div>`;
 const box=$("sequence");let drag=null;
 box.querySelectorAll(".seq").forEach(e=>{e.ondragstart=()=>drag=e;e.ondragover=x=>x.preventDefault();e.ondrop=x=>{x.preventDefault();if(drag!==e)box.insertBefore(drag,e)}});
 $("submitSeq").onclick=async()=>{
  const answer=[...box.children].map(x=>x.textContent),ok=answer.every((x,n)=>x===steps[n]);
  $("submitSeq").disabled=true;await teamSubmit(ok?100:0,ok?"correct":"wrong");$("playMessage").textContent=ok?"Correct! +100":"Submitted • 0 points";
 };
}

// Robot is now fixed/deterministic: every device sees the exact same walls.
function renderRobot(i){
 const m=ROBOT[i],size=7,walls=new Set(m.walls.map(p=>p.join(",")));
 let r=m.start[0],c=m.start[1],dir=1,cmd=[];
 $("playArea").innerHTML=`<div class="panel robotLayout"><div><h3>${clean(m.title)}</h3><p>Reach 🎯 without hitting a wall. Maximum 25 commands.</p><div id="robotGrid" class="robotGrid"></div></div><div><b>Your program</b><p id="commands">None</p><div class="controls"><button data-cmd="F">▲</button><button data-cmd="L">◀</button><button data-cmd="R">▶</button></div><button id="testRobot">Test Program</button><button id="clearRobot" class="back">Clear</button></div></div>`;
 function draw(){const g=$("robotGrid");g.innerHTML="";for(let rr=0;rr<size;rr++)for(let cc=0;cc<size;cc++){let cl="cell";if(walls.has(`${rr},${cc}`))cl+=" wall";if(rr===m.goal[0]&&cc===m.goal[1])cl+=" goal";if(rr===r&&cc===c)cl+=" robot";g.insertAdjacentHTML("beforeend",`<div class="${cl}">${rr===r&&cc===c?"🤖":rr===m.goal[0]&&cc===m.goal[1]?"🎯":""}</div>`)}$("commands").textContent=cmd.join(" → ")||"None"}
 document.querySelectorAll("[data-cmd]").forEach(b=>b.onclick=()=>{if(cmd.length<25){cmd.push(b.dataset.cmd);draw()}});
 $("clearRobot").onclick=()=>{cmd=[];r=m.start[0];c=m.start[1];dir=1;draw()};
 $("testRobot").onclick=async()=>{
  let rr=m.start[0],cc=m.start[1],dd=1,ok=false;
  for(const x of cmd){
   if(x==="L")dd=(dd+3)%4;
   else if(x==="R")dd=(dd+1)%4;
   else if(x==="F"){
    const dr=[-1,0,1,0][dd],dc=[0,1,0,-1][dd],nr=rr+dr,nc=cc+dc;
    if(nr<0||nc<0||nr>=size||nc>=size||walls.has(`${nr},${nc}`))break;
    rr=nr;cc=nc;if(rr===m.goal[0]&&cc===m.goal[1]){ok=true;break}
   }
  }
  r=rr;c=cc;dir=dd;draw();
  if(ok){$("testRobot").disabled=true;await teamSubmit(150,"robot-complete");$("playMessage").textContent="Mission complete! +150";}
  else $("playMessage").textContent="Not there yet — edit your program and test again. 0 points.";
 };
 draw();
}

// ---------------- Winner ----------------
let celebratedCode="";
function celebrate(rows){
 if(celebratedCode===code)return;celebratedCode=code;
 const active=rows.filter(teamHasPlayers),max=Math.max(...active.map(x=>x.score||0),0),win=active.filter(x=>(x.score||0)===max);
 $("winnerTitle").textContent=win.length>1?"Joint Winners!":`${win[0]?.t||"No"} Team Wins!`;
 $("winnerPoints").textContent=`${max} points`;
 $("winnerPlayers").innerHTML=win.flatMap(w=>Object.values(w.participants||{}).map(p=>`<div class="winnerPlayer">🎉 ${clean(p.name)}</div>`)).join("");
 $("winner").classList.remove("hidden");
 for(let i=0;i<45;i++){const e=document.createElement("span");e.textContent=i%2?"🎉":"⭐";e.style.cssText=`position:fixed;left:${Math.random()*100}vw;top:-20px;font-size:20px;z-index:20;animation:fall ${1+Math.random()*2}s linear forwards`;document.body.appendChild(e);setTimeout(()=>e.remove(),3200)}
}
$("closeWinner").onclick=()=>{$("winner").classList.add("hidden");celebratedCode="";show("home")};

// ---------------- Individual: 10 MCQ + 5 Robot + 5 In Order ----------------
let individual={name:"",score:0,stage:"mcq",index:0,answers:[],commands:[]};

$("startIndividual").onclick=()=>{
 individual.name=$("individualName").value.trim();if(!individual.name)return;
 individual.score=0;individual.stage="mcq";individual.index=0;individual.answers=[];individual.commands=[];
 $("individualStart").classList.add("hidden");$("individualArea").classList.remove("hidden");renderIndividual();
};

function renderIndividual(){
 const box=$("individualArea");
 if(individual.stage==="mcq"){renderIndividualMCQ(box);return}
 if(individual.stage==="robot"){renderIndividualRobot(box);return}
 if(individual.stage==="seq"){renderIndividualSeq(box);return}
 $("certificateName").textContent=individual.name;$("certificateScore").textContent=individual.score;$("certificateDate").textContent=new Date().toLocaleDateString();show("certificate");
}
function nextIndividual(){
 if(individual.stage==="mcq"){if(individual.index<9)individual.index++;else{individual.stage="robot";individual.index=0}}
 else if(individual.stage==="robot"){if(individual.index<4)individual.index++;else{individual.stage="seq";individual.index=0}}
 else if(individual.stage==="seq"){if(individual.index<4)individual.index++;else individual.stage="done"}
 renderIndividual();
}
function renderIndividualMCQ(box){
 const [q,opts,correct]=MCQ[individual.index];
 box.innerHTML=`<small>INDIVIDUAL • MCQ ${individual.index+1}/10</small><h3>${clean(q)}</h3><div class="options">${opts.map((o,n)=>`<button data-imcq="${n}">${clean(o)}</button>`).join("")}</div>`;
 document.querySelectorAll("[data-imcq]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-imcq]").forEach(x=>x.disabled=true);if(+b.dataset.imcq===correct)individual.score+=100;setTimeout(nextIndividual,250)});
}
function renderIndividualRobot(box){
 const m=ROBOT[individual.index],size=7,walls=new Set(m.walls.map(p=>p.join(",")));
 let r=m.start[0],c=m.start[1],dir=1,cmd=[];
 box.innerHTML=`<small>INDIVIDUAL • ROBOT ${individual.index+1}/5</small><h3>${clean(m.title)}</h3><div class="robotLayout"><div><div id="irobotGrid" class="robotGrid"></div></div><div><p id="icmd">None</p><div class="controls"><button data-icmd="F">▲</button><button data-icmd="L">◀</button><button data-icmd="R">▶</button></div><button id="itest">Test Program</button><button id="iclear" class="back">Clear</button></div></div>`;
 function draw(){const g=$("irobotGrid");g.innerHTML="";for(let rr=0;rr<size;rr++)for(let cc=0;cc<size;cc++){let cl="cell";if(walls.has(`${rr},${cc}`))cl+=" wall";if(rr===m.goal[0]&&cc===m.goal[1])cl+=" goal";if(rr===r&&cc===c)cl+=" robot";g.insertAdjacentHTML("beforeend",`<div class="${cl}">${rr===r&&cc===c?"🤖":rr===m.goal[0]&&cc===m.goal[1]?"🎯":""}</div>`)}$("icmd").textContent=cmd.join(" → ")||"None"}
 document.querySelectorAll("[data-icmd]").forEach(b=>b.onclick=()=>{if(cmd.length<25){cmd.push(b.dataset.icmd);draw()}});
 $("iclear").onclick=()=>{cmd=[];r=m.start[0];c=m.start[1];dir=1;draw()};
 $("itest").onclick=()=>{let rr=m.start[0],cc=m.start[1],dd=1,ok=false;for(const x of cmd){if(x==="L")dd=(dd+3)%4;else if(x==="R")dd=(dd+1)%4;else{const nr=rr+[-1,0,1,0][dd],nc=cc+[0,1,0,-1][dd];if(nr<0||nc<0||nr>=size||nc>=size||walls.has(`${nr},${nc}`))break;rr=nr;cc=nc;if(rr===m.goal[0]&&cc===m.goal[1]){ok=true;break}}}if(ok){individual.score+=150;nextIndividual()}else{$("icmd").textContent="Try again — the robot did not reach the goal."}};
 draw();
}
function renderIndividualSeq(box){
 const [title,steps]=SEQ[individual.index],items=[...steps].sort((a,b)=>a.localeCompare(b));
 box.innerHTML=`<small>INDIVIDUAL • IN ORDER ${individual.index+1}/5</small><h3>${clean(title)}</h3><div id="iseq" class="sequence">${items.map(x=>`<div class="seq" draggable="true">${clean(x)}</div>`).join("")}</div><button id="isub">Submit Order</button>`;
 const s=$("iseq");let d;s.querySelectorAll(".seq").forEach(e=>{e.ondragstart=()=>d=e;e.ondragover=x=>x.preventDefault();e.ondrop=x=>{x.preventDefault();if(d!==e)s.insertBefore(d,e)}});
 $("isub").onclick=()=>{const ok=[...s.children].map(x=>x.textContent).every((x,n)=>x===steps[n]);if(ok)individual.score+=100;setTimeout(nextIndividual,250)};
}
