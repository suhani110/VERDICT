
A noir-inspired multiplayer social deduction game of hidden identities, deception, strategy, and survival.

# 🕯️ VERDICT
### *Trust is a liability. Silence is suspicious. Every vote has consequences.*

<p align="center">
  <strong>A Multiplayer Social Deduction Game</strong><br/>
  Deception • Strategy • Suspicion • Survival
</p>

---

## 🖤 Welcome to VERDICT

What happens when nobody can be trusted, every conversation could be a lie, and one wrong accusation can change everything?

**VERDICT** is a multiplayer, Mafia-inspired social deduction game built around hidden identities, psychological strategy, secret night actions, tense discussions, and public voting.

Step into a world inspired by the shadows and intrigue of classic noir. Read between the lines. Question everyone's motives. Protect your identity. Decide who deserves your trust—and who deserves your verdict.

Because in VERDICT, the truth isn't always what it seems.

> *Everyone has a role. Everyone has a secret. And someone is always watching.*

---

## 🎭 The Game

Players enter a shared lobby and take part in a battle of deception between opposing sides. Each round moves through phases of nighttime decisions, daytime discussion, and voting.

The objective is simple: identify the threat before it is too late—or deceive everyone long enough to win.

### 🕵️ Choose your side

| Role | Your mission |
|---|---|
| 🔪 **Mafia** | Secretly select targets during the night and avoid exposing your identity. |
| 🔎 **Detective** | Investigate players and use the information you uncover to guide your suspicions. |
| 🧑 **Citizen** | Observe, discuss, question suspicious behavior, and vote strategically to help uncover the Mafia. |

*Your role determines what you know, what you can do, and how you should play.*

---

## 🌙 How to Play

**01 — Gather your players**

Create a lobby, invite other players, and join the same game room.

**02 — Discover your role**

Each player receives a role that shapes their objectives and information.

**03 — Enter the night**

The Mafia secretly chooses a target. The Detective investigates a player.

**04 — Face the discussion**

Survivors exchange messages, challenge alibis, share suspicions, and attempt to uncover the truth.

**05 — Cast your vote**

Choose the player you suspect. Every vote matters, and a tie can leave the decision unresolved.

**06 — Reach the verdict**

The cycle continues through eliminations and new decisions until a side meets its victory condition.

---

## ✨ Features

- 🎮 **Multiplayer lobbies** — Create and join game sessions with other players.
- 🎭 **Hidden-role gameplay** — Play as Mafia, Detective, or Citizen.
- 🌑 **Night actions** — Make secret selections and investigate other players.
- 💬 **Real-time text chat** — Discuss clues, defend yourself, and question suspicious behavior.
- 🎙️ **Voice chat** — Communicate with other players using the game's voice-chat functionality.
- 🗳️ **Interactive voting** — Select suspects and participate in daytime voting.
- ⚖️ **Tie handling** — Voting ties are recognized by the game logic.
- 💀 **Player eliminations** — Night actions and game decisions affect who remains in the match.
- 🏆 **Win-condition logic** — The game tracks the state of the match and determines when a side wins.
- 🎬 **Noir-inspired presentation** — A dark, atmospheric direction designed to complement the game's mystery.

---

## 🛠️ Built With

VERDICT brings together a real-time web frontend and a multiplayer server.

| Technology | Purpose |
|---|---|
| **React** | Component-based user interface |
| **TypeScript** | Type-safe frontend development |
| **Vite** | Frontend development server and build tooling |
| **Tailwind CSS** | Utility-first styling |
| **React Router** | Client-side navigation |
| **Node.js** | Server-side JavaScript runtime |
| **Express.js** | HTTP server and backend routing |
| **Socket.IO** | Real-time communication and multiplayer game events |
| **WebRTC** | Browser-based real-time voice communication |

---

## 🏗️ Architecture

VERDICT is organized into two main applications:

```text
VERDICT/
├── client/                  # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/           # Game and application screens
│   │   ├── components/      # Reusable interface components
│   │   └── ...              # Supporting frontend modules
│   ├── package.json
│   └── vite.config.ts
│
├── server/                  # Node.js multiplayer backend
│   ├── index.js             # Server and Socket.IO entry point
│   ├── routes/              # HTTP routes
│   ├── game/                # Game and lobby logic
│   └── package.json
│
└── README.md
```

*This is a high-level overview; exact filenames and subdirectories may vary as the project evolves.*

### How the pieces work together

1. The React frontend presents the lobby, player interactions, and game interface.
2. The frontend communicates with the Node.js backend.
3. Socket.IO carries real-time multiplayer events between connected clients and the server.
4. The server manages lobby and match state, processes game actions, and communicates updates.
5. WebRTC provides the foundation for browser-to-browser voice communication, with signaling coordinated through the application.

---

## 🚀 Run VERDICT Locally

Want to run the game on your own machine? Follow these steps.

### Prerequisites

- [Node.js](https://nodejs.org/) and npm
- [Git](https://git-scm.com/) (optional, for cloning)
- A modern browser

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd VERDICT
```

Replace the placeholder with your actual GitHub repository URL.

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Start the frontend

```bash
npm run dev
```

Keep this terminal running.

### 4. Install backend dependencies

Open a second terminal from the project root:

```bash
cd server
npm install
```

### 5. Start the backend

```bash
node index.js
```

Keep the backend running while playing.

### 6. Open the game

Open the local URL printed by Vite in your browser. For multiplayer testing, use multiple browser sessions and join the same lobby.

**Note:** These instructions assume the existing frontend and backend scripts match the commands above. Additional environment variables or configuration may be required depending on your current setup.

---

## 🧪 Tested Gameplay

VERDICT has been manually tested using four separate incognito browser tabs in a multiplayer session.

The observed test covered:

- Multiple players joining the same lobby.
- Starting a match successfully.
- Mafia target selection and Detective investigations.
- Night resolution and player elimination.
- Daytime text discussion.
- Voting by multiple players.
- Tie detection and progression into a subsequent night.

This was a manual development test, not a claim of automated test coverage or production-scale load testing.

---

## 🗺️ What's Next?

VERDICT is an evolving project. The next milestones focus on making the experience more complete and accessible.

- [ ] Deploy the frontend and backend for online play.
- [ ] Refine the landing page and overall noir-inspired UI.
- [ ] Improve the voice-chat experience across all match phases.
- [ ] Strengthen reconnection and multiplayer edge-case handling.
- [ ] Test complete matches, including end-game results, across multiple sessions.
- [ ] Explore persistent storage for user accounts and game records.
- [ ] Explore Unity integration for a future expanded game experience.

These are planned improvements, not features being claimed as completed.

---

## 👤 Creator & Ownership

**Created and owned by Suhani Sadh.**

VERDICT is a personal game-development project exploring real-time web technologies, multiplayer systems, interactive interfaces, and social deduction mechanics.

Built with curiosity, persistence, and a love for games where strategy matters as much as trust.

> *The evidence is incomplete. The suspects are many. The verdict is yours.*

---

## 🤝 Contributions

Suggestions, bug reports, and constructive feedback are welcome. If you would like to contribute, open an issue or propose a change through a pull request.

Please describe the proposed change clearly and include steps to reproduce any reported bug.

---

## 📜 License

No open-source license has been selected yet. Until a license is added to this repository, all rights are reserved by the project owner. Please contact the owner before redistributing or reusing the code.

---

<p align="center">
  <strong>VERDICT</strong><br/>
  <em>Trust no one. Question everything. Decide carefully.</em>
</p>
