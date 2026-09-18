export const TEAM_COLORS = { red:"#ef4444", blue:"#3b82f6", green:"#22c55e", yellow:"#eab308" };
export const TEAMS = Object.keys(TEAM_COLORS);
export const teamName = id => id.charAt(0).toUpperCase() + id.slice(1);
export const randomCode = () => Math.random().toString(36).slice(2,7).toUpperCase();
export const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const teamMCQ = [
 {q:'Which sequence is an algorithm?', options:['Do it somehow.','Wake up → brush teeth → get dressed → eat breakfast.','Breakfast → maybe get dressed.','Get ready.'], a:1, points:100},
 {q:'What makes an algorithm easier for a robot to follow?', options:['Clear and ordered steps','Long sentences','Guessing','Random steps'], a:0, points:100},
 {q:'If a robot turns too early, what should a team do?', options:['Ignore it','Debug the steps','Start shouting','Change the goal'], a:1, points:100},
 {q:'Which instruction is most precise?', options:['Move over there.','Go forward 2 squares.','Go somewhere.','Move a bit.'], a:1, points:100},
 {q:'Why do we test an algorithm?', options:['To make it longer','To find and fix problems','To avoid teamwork','To make it look fancy'], a:1, points:100}
];

export const teamOrder = [
 {title:'Make toast', steps:['Put bread in toaster','Press the lever','Wait for toast','Take toast out'], points:150},
 {title:'Brush your teeth', steps:['Put toothpaste on brush','Wet toothbrush','Brush teeth','Rinse mouth'], points:150}
];

export const teamRobots = [
 {name:'Maze Runner', size:5, start:[4,0], goal:[0,4], blocked:[[3,1],[3,2],[2,2],[1,2]], solution:'FFFRRFF'},
 {name:'Bridge Builder', size:5, start:[4,0], goal:[0,4], blocked:[[3,0],[3,1],[2,1],[1,1],[1,3]], solution:'RFFFFRFFF'},
 {name:'Laser Lane', size:6, start:[5,0], goal:[0,5], blocked:[[4,1],[4,2],[3,2],[2,2],[2,4],[1,4]], solution:'FRFFFFRFFFF'},
];

export const individualRobots = [
 {name:'Starter Bot', size:5, start:[4,0], goal:[0,4], blocked:[[3,1],[2,1]], points:100},
 {name:'Corner Bot', size:5, start:[4,0], goal:[0,4], blocked:[[3,0],[3,1],[2,1],[1,1]], points:150},
 {name:'Zigzag Bot', size:6, start:[5,0], goal:[0,5], blocked:[[4,1],[3,1],[3,2],[2,2],[2,3],[1,3]], points:200},
 {name:'Precision Bot', size:6, start:[5,0], goal:[0,5], blocked:[[4,1],[4,2],[3,2],[2,2],[2,4],[1,4]], points:250},
 {name:'Master Bot', size:7, start:[6,0], goal:[0,6], blocked:[[5,1],[5,2],[4,2],[3,2],[3,4],[2,4],[1,4]], points:300}
];

export const individualOrders = [
 {title:'Make a sandwich', steps:['Get two slices of bread','Add filling','Put the slices together','Cut the sandwich'],points:150},
 {title:'Water a plant', steps:['Fill the watering can','Carry it to the plant','Pour water onto the soil','Put the can away'],points:150},
 {title:'Pack a school bag', steps:['Check your timetable','Put in the needed books','Add your pencil case','Zip the bag'],points:200}
];

export const thinkPrompts = ['Get ready for school','Make a bowl of cereal','Cross the road safely','Play a simple game','Feed a pet'];
