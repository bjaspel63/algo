export const TEAMS = ["red", "blue", "green", "yellow"];
export const TEAM_INFO = { red:{name:"Red",emoji:"🔴"}, blue:{name:"Blue",emoji:"🔵"}, green:{name:"Green",emoji:"🟢"}, yellow:{name:"Yellow",emoji:"🟡"} };

export const MCQ = [
 {q:"What is an algorithm?", options:["A random idea","A clear set of ordered steps","A computer part","A picture"], answer:1, points:100},
 {q:"Which instruction is most precise?", options:["Move over there","Go forward 2 squares","Move a bit","Go somewhere"], answer:1, points:100},
 {q:"What should you do if an algorithm does not work?", options:["Ignore it","Debug the steps","Add random steps","Give up"], answer:1, points:100},
 {q:"Which should an algorithm have?", options:["Clear steps and a goal","Only pictures","Random steps","Very difficult words"], answer:0, points:100},
 {q:"Why do we test an algorithm?", options:["To make it longer","To find and fix problems","To make it colourful","To avoid planning"], answer:1, points:100}
];

export const ORDERS = [
 {title:"Make toast", steps:["Put bread in toaster","Press the lever","Wait for toast","Take toast out"], points:150},
 {title:"Brush your teeth", steps:["Put toothpaste on brush","Wet toothbrush","Brush teeth","Rinse mouth"], points:150},
 {title:"Send a message", steps:["Open the messaging app","Choose a contact","Type the message","Press send"], points:150}
];

export const ROBOTS = [
 {name:"Maze Runner", size:5, start:[4,0], goal:[0,4], blocked:[[3,1],[3,2],[2,2],[1,2]], points:250},
 {name:"Bridge Builder", size:6, start:[5,0], goal:[0,5], blocked:[[4,1],[4,2],[3,2],[2,2],[2,4],[1,4]], points:300},
 {name:"Laser Lane", size:7, start:[6,0], goal:[0,6], blocked:[[5,1],[5,2],[4,2],[3,2],[3,4],[2,4],[1,4]], points:350}
];

export const IND_ROBOTS = [
 {name:"Starter Bot", size:5, start:[4,0], goal:[0,4], blocked:[[3,1],[2,1]], points:100},
 {name:"Corner Bot", size:5, start:[4,0], goal:[0,4], blocked:[[3,0],[3,1],[2,1],[1,1]], points:150},
 {name:"Zigzag Bot", size:6, start:[5,0], goal:[0,5], blocked:[[4,1],[3,1],[3,2],[2,2],[2,3],[1,3]], points:200},
 {name:"Precision Bot", size:6, start:[5,0], goal:[0,5], blocked:[[4,1],[4,2],[3,2],[2,2],[2,4],[1,4]], points:250},
 {name:"Master Bot", size:7, start:[6,0], goal:[0,6], blocked:[[5,1],[5,2],[4,2],[3,2],[3,4],[2,4],[1,4]], points:300}
];

export const IND_ORDERS = [
 {title:"Wash your hands", steps:["Turn on water","Wet hands","Add soap","Scrub hands","Rinse hands","Dry hands"], points:150},
 {title:"Plant a seed", steps:["Make a small hole","Put seed in soil","Cover seed","Water it","Place in sunlight"], points:175},
 {title:"Pack your school bag", steps:["Check timetable","Collect books","Put books in bag","Add pencil case","Zip the bag"], points:200}
];

export const THINK_PROMPTS = ["Get ready for school","Make a bowl of cereal","Pack for a trip","Play a simple game","Feed a pet"];
