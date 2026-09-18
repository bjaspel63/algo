# Algorithm Quest v2

## Changes
- Improved classroom UI/UX.
- Maximum 10 teams: Red, Blue, Green, Yellow, Orange, Purple, Pink, Teal, Gold, Silver.
- Team Challenge: 10 MCQ, 30 seconds per question, hard 5-minute cap for the MCQ level; when the cap is reached, that team moves to In Order automatically.
- Teams progress independently; there is no teacher Next Question button.
- Team In Order: 5 challenges.
- Team Robot: 5 fixed/deterministic missions. Every device sees the same walls and each mission has a guaranteed route.
- Individual: 10 MCQ + 5 Robot missions + 5 In Order challenges.
- Individual certificate shows name and total score.
- Team submissions use a Firebase transaction so two students cannot score/advance the same team/question twice.

## Run
Use Firebase Hosting or another web server such as VS Code Live Server. Do not open index.html directly with file://.

## Firebase
Enable Realtime Database for the project. For classroom testing, the database rules must allow the app to read/write. A temporary test configuration is:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

For a public deployment, replace this with authenticated/restricted rules.
