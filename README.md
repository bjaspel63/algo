# Algorithm Quest — Real-Time Classroom A (Clean Build)

## What this version does
- Teacher creates a live game and receives a 5-character code.
- Students join from separate devices.
- Teacher controls Level 1 MCQ, Level 2 In Order, and Level 3 Robot Game.
- Scores are stored in Firebase Realtime Database and displayed live on the teacher screen.
- Each team can submit only once per question, preventing duplicate scoring by multiple students.
- Robot movement supports forward, left, and right turns and blocks obstacles.

## Firebase setup
1. Create a Firebase project and Web App.
2. Enable Realtime Database.
3. Copy the Web App configuration into `firebase-config.js`.
4. Serve the folder from HTTPS hosting (Firebase Hosting, Netlify, Vercel, etc.). Do not open with `file://`.
5. For a classroom prototype, database test rules can be used temporarily. Before wider use, add authentication and stricter rules.

## Classroom flow
Teacher: open `teacher.html` → Create Game → display code → Start Level → use Next Question.
Students: open `student.html` → enter code/name/team → answer on their devices.
