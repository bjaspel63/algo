# Algorithm Quest — Real-Time Classroom Version (A)

This version uses Firebase Realtime Database so multiple student devices can update a shared game session and the teacher dashboard sees changes live.

## 1. Create Firebase project
1. Open Firebase Console: https://console.firebase.google.com/
2. Create a project.
3. Add a **Web App** and copy its config.
4. In Firebase Console → Build → Realtime Database, create a database.
5. For a P4 classroom prototype, you can start in test mode. Before using it beyond a classroom prototype, tighten the database rules and/or add authentication.

## 2. Add the config
Open `firebase-config.js` and replace every `YOUR_...` value with your Firebase Web App config.

Important: use the Realtime Database URL shown by Firebase. Depending on the project, it may end in `.firebaseio.com` or another Firebase-provided domain.

## 3. Host the folder
Because the app uses ES modules and Firebase, open it through a web server/hosting service rather than `file://`.

Easy options:
- Firebase Hosting
- GitHub Pages (after configuration)
- Netlify / Vercel

## 4. Classroom flow
1. Teacher opens `teacher.html`.
2. Teacher clicks **Create Game**.
3. A 5-character code appears.
4. Students open `student.html`, enter the code, their name, and team.
5. Teacher starts Level 1, 2, then 3.
6. Student submissions update the shared Firebase database.
7. Teacher scoreboard updates automatically.

## Important prototype note
The scoring logic is intentionally simple for the first classroom version. For a production version, move authoritative scoring to trusted server-side logic and use Firebase Authentication/stronger database rules so students cannot manipulate their own scores.
