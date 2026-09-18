export const TEAMS = ["red", "blue", "green", "yellow"];
export const TEAM_INFO = {
  red:{name:"Red",emoji:"🔴"}, blue:{name:"Blue",emoji:"🔵"},
  green:{name:"Green",emoji:"🟢"}, yellow:{name:"Yellow",emoji:"🟡"}
};

export const MCQ = [
 {q:"What is an algorithm?",options:["A random idea","A clear set of ordered steps","A computer part","A picture"],answer:1},
 {q:"Which instruction is most precise?",options:["Move over there","Go forward 2 squares","Move a bit","Go somewhere"],answer:1},
 {q:"What should you do when an algorithm does not work?",options:["Ignore it","Debug the steps","Add random steps","Give up"],answer:1},
 {q:"Which feature helps an algorithm work correctly?",options:["Clear steps in the right order","Lots of colours","Difficult words","Random actions"],answer:0},
 {q:"Why do we test an algorithm?",options:["To make it longer","To find and fix problems","To make it colourful","To avoid planning"],answer:1},
 {q:"Which is an algorithm?",options:["A recipe with steps","A photograph","A song","A keyboard"],answer:0},
 {q:"What does 'sequence' mean in an algorithm?",options:["Doing steps in order","Doing everything at once","Skipping all steps","Choosing randomly"],answer:0},
 {q:"A robot turns right. What should you give it?",options:["A clear turn instruction","A vague instruction","A question","A picture only"],answer:0},
 {q:"If a step is unclear, what is a good improvement?",options:["Make it more specific","Delete the goal","Add a random step","Do nothing"],answer:0},
 {q:"What is debugging?",options:["Decorating a program","Finding and fixing errors","Making a robot faster","Writing without testing"],answer:1}
];

export const ORDERS = [
 {title:"Make toast",steps:["Put bread in toaster","Press the lever","Wait for toast","Take toast out"]},
 {title:"Brush your teeth",steps:["Wet toothbrush","Put toothpaste on brush","Brush teeth","Rinse mouth"]},
 {title:"Send a message",steps:["Open the messaging app","Choose a contact","Type the message","Press send"]},
 {title:"Make a sandwich",steps:["Get two slices of bread","Spread the filling","Put the slices together","Cut the sandwich"]},
 {title:"Log in to a computer",steps:["Wake the computer","Enter your username","Enter your password","Press sign in"]}
];

// Robot grids use 0=top/left. Students program F/L/R. At least 5 team challenges.
export const ROBOTS = [
 {name:"Maze Runner",size:5,start:[4,0],dir:1,goal:[0,4],blocked:[[3,1],[3,2],[2,2],[1,2]]},
 {name:"Bridge Builder",size:6,start:[5,0],dir:1,goal:[0,5],blocked:[[4,1],[4,2],[3,2],[2,2],[2,4],[1,4]]},
 {name:"Laser Lane",size:7,start:[6,0],dir:1,goal:[0,6],blocked:[[5,1],[5,2],[4,2],[3,2],[3,4],[2,4],[1,4]]},
 {name:"Zigzag Factory",size:7,start:[6,0],dir:1,goal:[0,6],blocked:[[5,1],[4,1],[4,2],[3,2],[2,2],[2,4],[1,4],[1,5]]},
 {name:"Final Circuit",size:8,start:[7,0],dir:1,goal:[0,7],blocked:[[6,1],[6,2],[5,2],[4,2],[4,4],[3,4],[2,4],[2,6],[1,6]]}
];

export const IND_ROBOTS = ROBOTS.map((r,i)=>({...r, name:`Individual ${r.name}`, points:100+i*50}));
export const IND_ORDERS = ORDERS.map((q,i)=>({...q,points:100+i*25}));
export const THINK_PROMPTS = ["Get ready for school","Make a bowl of cereal","Pack for a trip","Play a simple game","Feed a pet"];
