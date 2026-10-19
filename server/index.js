const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const lobbyRoutes = require("./routes/lobby");

const { getLobby } = require("./game/lobbyStore");
const { startGame } = require("./game/gameEngine");

const app = express();
const server = http.createServer(app);


const clientUrl =
  process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: clientUrl }));
app.use(express.json());


app.use("/api/lobby", lobbyRoutes);

// =====================================================
// HELPERS
// =====================================================

function getPlayerById(lobby, playerId) {
  return lobby.players.find(
    (player) => player.id === playerId
  );
}

function getPlayerBySocket(lobby, socket) {
  return lobby.players.find(
    (player) =>
      player.id === socket.id ||
      player.socketId === socket.id
  );
}

function getAlivePlayers(lobby) {
  return lobby.players.filter(
    (player) => player.alive !== false
  );
}

function getAliveMafia(lobby) {
  return getAlivePlayers(lobby).filter(
    (player) => player.role === "MAFIA"
  );
}

function getAliveNonMafia(lobby) {
  return getAlivePlayers(lobby).filter(
    (player) => player.role !== "MAFIA"
  );
}

// =====================================================
// WIN CONDITION
// =====================================================

function checkWinCondition(lobby) {
  const aliveMafia = getAliveMafia(lobby);
  const aliveNonMafia = getAliveNonMafia(lobby);

  // No mafia left
  if (aliveMafia.length === 0) {
    return "CITIZENS";
  }

  // Mafia equal or outnumber everyone else
  if (aliveMafia.length >= aliveNonMafia.length) {
    return "MAFIA";
  }

  return null;
}

// =====================================================
// SOCKET.IO
// =====================================================

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // ===================================================
  // JOIN LOBBY ROOM
  // ===================================================

  socket.on("join-lobby-room", (data) => {
    /*
      Your frontend sends:

      {
        lobbyCode: "HO0Y5S",
        playerId: "..."
      }
    */

    const lobbyCode = data?.lobbyCode;
    const playerId = data?.playerId;

    if (!lobbyCode) {
      console.log(
        "Could not find lobbyCode in join-lobby-room data:",
        data
      );
      return;
    }

    const lobby = getLobby(lobbyCode);

    if (!lobby) {
      console.log(
        `Lobby ${lobbyCode} not found`
      );
      return;
    }

    // Store socket ID on the player
    if (playerId) {
      const player = getPlayerById(
        lobby,
        playerId
      );

      if (player) {
        player.socketId = socket.id;
      }
    }

    socket.join(lobbyCode);

    console.log(
      `${socket.id} joined lobby ${lobbyCode}`
    );

    io.to(lobbyCode).emit(
      "lobby-update",
      lobby
    );
  });

  // ===================================================
  // START GAME
  // ===================================================

  socket.on(
    "start-game",
    ({ lobbyCode }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        console.log(
          `Lobby ${lobbyCode} not found when starting game`
        );
        return;
      }

      const player = getPlayerBySocket(
        lobby,
        socket
      );

      if (!player) {
        console.log(
          `Player ${socket.id} not found in lobby ${lobbyCode}`
        );
        return;
      }

      // Only host can start
      if (
        !player.isHost &&
        player.id !== lobby.hostId
      ) {
        socket.emit(
          "game-start-error",
          {
            message:
              "Only the host can start the game.",
          }
        );

        return;
      }

      // Prevent starting twice
      if (
        lobby.gameState &&
        lobby.gameState !== "WAITING"
      ) {
        return;
      }

      startGame(lobby);

      // Everyone starts alive
      lobby.players.forEach(
        (player) => {
          player.alive = true;
        }
      );

      // Fresh game state
      lobby.nightActions = {
        mafiaTarget: null,
        detectiveTarget: null,
      };

      lobby.votes = {};
      lobby.dayVotes = {};
      lobby.eliminatedPlayers = [];

      console.log(
        `Game started in lobby ${lobbyCode}`
      );

      // Send each player their own secret role
      lobby.players.forEach(
        (player) => {
          if (player.socketId) {
            io.to(player.socketId).emit(
              "game-started",
              {
                lobby: {
                  ...lobby,
                  players:
                    lobby.players.map(
                      (p) => ({
                        id: p.id,
                        name: p.name,
                        alive:
                          p.alive !== false,
                      })
                    ),
                },

                role: player.role,

                gameState:
                  lobby.gameState,
              }
            );
          }
        }
      );

      // Update lobby
      io.to(lobbyCode).emit(
        "lobby-update",
        lobby
      );
    }
  );

  // ===================================================
  // NIGHT ACTION
  // ===================================================

  socket.on(
    "submit-night-action",
    ({ lobbyCode, targetId }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      if (
        lobby.gameState !== "NIGHT"
      ) {
        return;
      }

      const player =
        getPlayerBySocket(
          lobby,
          socket
        );

      if (!player) {
        return;
      }

      if (player.alive === false) {
        return;
      }

      const target =
        lobby.players.find(
          (p) =>
            p.id === targetId &&
            p.alive !== false
        );

      if (!target) {
        socket.emit(
          "night-action-error",
          {
            message:
              "Invalid target.",
          }
        );

        return;
      }

      // -------------------------------
      // MAFIA ACTION
      // -------------------------------

      if (player.role === "MAFIA") {
        lobby.nightActions.mafiaTarget =
          targetId;

        console.log(
          `Mafia selected ${target.name} in lobby ${lobbyCode}`
        );
      }

      // -------------------------------
      // DETECTIVE ACTION
      // -------------------------------

      if (
        player.role === "DETECTIVE"
      ) {
        lobby.nightActions.detectiveTarget =
          targetId;

        console.log(
          `Detective investigated ${target.name} in lobby ${lobbyCode}`
        );

        // IMPORTANT:
        // Only detective receives this.
        socket.emit(
          "investigation-result",
          {
            playerName:
              target.name,

            playerId:
              target.id,

            isMafia:
              target.role === "MAFIA",
          }
        );
      }

      // -------------------------------
      // CHECK WHETHER NIGHT IS COMPLETE
      // -------------------------------

      const aliveMafia =
        getAliveMafia(lobby);

      const aliveDetective =
        getAlivePlayers(
          lobby
        ).find(
          (p) =>
            p.role ===
            "DETECTIVE"
        );

      const mafiaDone =
        aliveMafia.length === 0 ||
        !!lobby.nightActions
          .mafiaTarget;

      const detectiveDone =
        !aliveDetective ||
        !!lobby.nightActions
          .detectiveTarget;

      if (
        mafiaDone &&
        detectiveDone
      ) {
        resolveNight(
          lobbyCode
        );
      }
    }
  );

  // ===================================================
  // START VOTING
  // ===================================================

  socket.on(
    "start-voting",
    ({ lobbyCode }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      if (
        lobby.gameState !==
        "DAY_DISCUSSION"
      ) {
        socket.emit(
          "vote-error",
          {
            message:
              "Voting cannot be started right now.",
          }
        );

        return;
      }

      const player =
        getPlayerBySocket(
          lobby,
          socket
        );

      if (!player) {
        return;
      }

      if (player.alive === false) {
        return;
      }

      lobby.gameState = "DAY";

      lobby.dayVotes = {};

      console.log(
        `Voting started in lobby ${lobbyCode}`
      );

      io.to(lobbyCode).emit(
        "voting-started",
        {
          gameState: "DAY",
        }
      );
    }
  );

  // ===================================================
  // DAY VOTE
  // ===================================================

  socket.on(
    "submit-day-vote",
    ({ lobbyCode, targetId }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      if (
        lobby.gameState !==
        "DAY"
      ) {
        socket.emit(
          "vote-error",
          {
            message:
              "Voting is not active.",
          }
        );

        return;
      }

      const voter =
        getPlayerBySocket(
          lobby,
          socket
        );

      if (!voter) {
        return;
      }

      if (voter.alive === false) {
        socket.emit(
          "vote-error",
          {
            message:
              "Eliminated players cannot vote.",
          }
        );

        return;
      }

      const target =
        lobby.players.find(
          (player) =>
            player.id === targetId &&
            player.alive !== false &&
            player.id !== voter.id
        );

      if (!target) {
        socket.emit(
          "vote-error",
          {
            message:
              "Invalid voting target.",
          }
        );

        return;
      }

      // Prevent duplicate vote
      if (
        lobby.dayVotes[
          voter.id
        ]
      ) {
        socket.emit(
          "vote-error",
          {
            message:
              "You have already voted.",
          }
        );

        return;
      }

      lobby.dayVotes[
        voter.id
      ] = targetId;

      console.log(
        `${voter.name} voted for ${target.name} in lobby ${lobbyCode}`
      );

      socket.emit(
        "vote-submitted",
        {
          voterId: voter.id,
        }
      );

      const votesSubmitted =
        Object.keys(
          lobby.dayVotes
        ).length;

      const alivePlayers =
        getAlivePlayers(
          lobby
        );

      io.to(lobbyCode).emit(
        "vote-progress",
        {
          votesSubmitted,

          totalAlivePlayers:
            alivePlayers.length,
        }
      );

      // Everyone voted
      if (
        votesSubmitted >=
        alivePlayers.length
      ) {
        resolveDayVote(
          lobbyCode
        );
      }
    }
  );

  // ===================================================
  // CHAT MESSAGE
  // ===================================================

  socket.on(
    "send-chat-message",
    ({ lobbyCode, message }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      // Chat is only for the discussion / voting
      // phases — not during the night.
      if (
        lobby.gameState !== "DAY_DISCUSSION" &&
        lobby.gameState !== "DAY"
      ) {
        return;
      }

      const player = getPlayerBySocket(
        lobby,
        socket
      );

      if (!player) {
        return;
      }

      // Dead players can see discussion,
      // but they cannot send messages.
      if (player.alive === false) {
        return;
      }

      const trimmedMessage = (
        message || ""
      )
        .toString()
        .trim();

      if (!trimmedMessage) {
        return;
      }

      // Basic length guard against spam/abuse
      if (trimmedMessage.length > 300) {
        return;
      }

      console.log(
        `[chat] ${player.name} (${lobbyCode}): ${trimmedMessage}`
      );

      io.to(lobbyCode).emit(
        "chat-message",
        {
          playerId: player.id,
          playerName: player.name,
          message: trimmedMessage,
          alive: player.alive !== false,
          timestamp: Date.now(),
        }
      );
    }
  );

  // ===================================================
  // VOICE CHAT / WEBRTC SIGNALING
  // ===================================================

  socket.on(
    "voice-join",
    ({ lobbyCode, playerId }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      if (lobby.gameState !== "DAY_DISCUSSION") {
        return;
      }

      const player = getPlayerById(
        lobby,
        playerId
      );

      if (!player) {
        return;
      }

      // Dead players cannot join voice
      if (player.alive === false) {
        return;
      }

      // Make sure the socket belongs to this player
      if (
        player.socketId !== socket.id &&
        player.id !== socket.id
      ) {
        return;
      }

      socket.join(`${lobbyCode}-voice`);

      console.log(
        `[voice] ${player.name} joined voice in lobby ${lobbyCode}`
      );

      // Tell existing voice participants
      socket.to(`${lobbyCode}-voice`).emit(
        "voice-joined",
        {
          playerId: player.id,
        }
      );

      // Get all current voice participants
      const voiceRoom =
        io.sockets.adapter.rooms.get(
          `${lobbyCode}-voice`
        );

      const participants = voiceRoom
        ? Array.from(voiceRoom)
            .map((socketId) => {
              const participantSocket =
                io.sockets.sockets.get(
                  socketId
                );

              if (!participantSocket) {
                return null;
              }

              const participant =
                getPlayerBySocket(
                  lobby,
                  participantSocket
                );

              if (!participant) {
                return null;
              }

              if (participant.alive === false) {
                return null;
              }

              return participant.id;
            })
            .filter(Boolean)
        : [];

      socket.emit(
        "voice-participants",
        participants
      );
    }
  );

  // ===================================================
  // VOICE LEAVE
  // ===================================================

  socket.on(
    "voice-leave",
    ({ lobbyCode, playerId }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      const player = getPlayerById(
        lobby,
        playerId
      );

      socket.leave(`${lobbyCode}-voice`);

      console.log(
        `[voice] ${
          player?.name || playerId
        } left voice in lobby ${lobbyCode}`
      );

      socket
        .to(`${lobbyCode}-voice`)
        .emit(
          "voice-left",
          {
            playerId,
          }
        );
    }
  );

  // ===================================================
  // WEBRTC OFFER
  // ===================================================

  socket.on(
    "voice-offer",
    ({
      lobbyCode,
      targetPlayerId,
      fromPlayerId,
      offer,
    }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      if (lobby.gameState !== "DAY_DISCUSSION") {
        return;
      }

      const sender = getPlayerBySocket(
        lobby,
        socket
      );

      if (
        !sender ||
        sender.alive === false
      ) {
        return;
      }

      if (sender.id !== fromPlayerId) {
        return;
      }

      const targetPlayer =
        getPlayerById(
          lobby,
          targetPlayerId
        );

      if (!targetPlayer) {
        return;
      }

      if (targetPlayer.alive === false) {
        return;
      }

      if (
        !offer ||
        !targetPlayer.socketId
      ) {
        return;
      }

      io.to(
        targetPlayer.socketId
      ).emit(
        "voice-offer",
        {
          fromPlayerId,
          offer,
        }
      );
    }
  );

  // ===================================================
  // WEBRTC ANSWER
  // ===================================================

  socket.on(
    "voice-answer",
    ({
      lobbyCode,
      targetPlayerId,
      fromPlayerId,
      answer,
    }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      if (lobby.gameState !== "DAY_DISCUSSION") {
        return;
      }

      const sender = getPlayerBySocket(
        lobby,
        socket
      );

      if (
        !sender ||
        sender.alive === false
      ) {
        return;
      }

      if (sender.id !== fromPlayerId) {
        return;
      }

      const targetPlayer =
        getPlayerById(
          lobby,
          targetPlayerId
        );

      if (!targetPlayer) {
        return;
      }

      if (targetPlayer.alive === false) {
        return;
      }

      if (
        !answer ||
        !targetPlayer.socketId
      ) {
        return;
      }

      io.to(
        targetPlayer.socketId
      ).emit(
        "voice-answer",
        {
          fromPlayerId,
          answer,
        }
      );
    }
  );

  // ===================================================
  // WEBRTC ICE CANDIDATE
  // ===================================================

  socket.on(
    "voice-ice-candidate",
    ({
      lobbyCode,
      targetPlayerId,
      fromPlayerId,
      candidate,
    }) => {
      const lobby = getLobby(lobbyCode);

      if (!lobby) {
        return;
      }

      if (lobby.gameState !== "DAY_DISCUSSION") {
        return;
      }

      const sender = getPlayerBySocket(
        lobby,
        socket
      );

      if (
        !sender ||
        sender.alive === false
      ) {
        return;
      }

      if (sender.id !== fromPlayerId) {
        return;
      }

      const targetPlayer =
        getPlayerById(
          lobby,
          targetPlayerId
        );

      if (!targetPlayer) {
        return;
      }

      if (targetPlayer.alive === false) {
        return;
      }

      if (
        !candidate ||
        !targetPlayer.socketId
      ) {
        return;
      }

      io.to(
        targetPlayer.socketId
      ).emit(
        "voice-ice-candidate",
        {
          fromPlayerId,
          candidate,
        }
      );
    }
  );

  // ===================================================
  // DISCONNECT
  // ===================================================

  socket.on(
    "disconnect",
    () => {
      console.log(
        `Player disconnected: ${socket.id}`
      );
    }
  );
});

// =====================================================
// RESOLVE NIGHT
// =====================================================

function resolveNight(lobbyCode) {
  const lobby = getLobby(lobbyCode);

  if (!lobby) {
    return;
  }

  if (
    lobby.gameState !== "NIGHT"
  ) {
    return;
  }

  const mafiaTargetId =
    lobby.nightActions
      .mafiaTarget;

  let victim = null;

  // -------------------------------
  // MAFIA KILLS
  // -------------------------------

  if (mafiaTargetId) {
    victim =
      lobby.players.find(
        (player) =>
          player.id ===
            mafiaTargetId &&
          player.alive !== false
      );

    if (victim) {
      victim.alive = false;

      lobby.eliminatedPlayers.push(
        victim.id
      );

      console.log(
        `${victim.name} was eliminated during the night`
      );
    }
  }

  console.log(
    `Night resolved in lobby ${lobbyCode}`
  );

  // -------------------------------
  // CHECK WIN
  // -------------------------------

  const winner =
    checkWinCondition(
      lobby
    );

  if (winner) {
    lobby.gameState =
      "GAME_OVER";

    io.to(lobbyCode).emit(
      "game-over",
      {
        winner,

        eliminated:
          victim
            ? {
                id:
                  victim.id,

                name:
                  victim.name,

                role:
                  victim.role,
              }
            : null,
      }
    );

    return;
  }

  // -------------------------------
  // MOVE TO DAY DISCUSSION
  // -------------------------------

  lobby.gameState =
    "DAY_DISCUSSION";

  const safePlayers =
    lobby.players.map(
      (player) => ({
        id: player.id,

        name:
          player.name,

        alive:
          player.alive !== false,
      })
    );

  io.to(lobbyCode).emit(
    "night-resolved",
    {
      gameState:
        "DAY_DISCUSSION",

      victim:
        victim
          ? {
              id:
                victim.id,

              name:
                victim.name,
            }
          : null,

      players:
        safePlayers,
    }
  );

  // Reset night actions
  lobby.nightActions = {
    mafiaTarget: null,
    detectiveTarget: null,
  };
}

// =====================================================
// RESOLVE DAY VOTE
// =====================================================

function resolveDayVote(
  lobbyCode
) {
  const lobby =
    getLobby(lobbyCode);

  if (!lobby) {
    return;
  }

  if (
    lobby.gameState !==
    "DAY"
  ) {
    return;
  }

  const votes =
    lobby.dayVotes || {};

  const voteCounts = {};

  Object.values(
    votes
  ).forEach(
    (targetId) => {
      if (
        !voteCounts[
          targetId
        ]
      ) {
        voteCounts[
          targetId
        ] = 0;
      }

      voteCounts[
        targetId
      ]++;
    }
  );

  let highestVotes = 0;
  let eliminatedId = null;
  let tie = false;

  Object.entries(
    voteCounts
  ).forEach(
    ([playerId, count]) => {
      if (
        count >
        highestVotes
      ) {
        highestVotes =
          count;

        eliminatedId =
          playerId;

        tie = false;
      } else if (
        count ===
          highestVotes &&
        count > 0
      ) {
        tie = true;
      }
    }
  );

  let eliminated = null;

  // -------------------------------
  // ELIMINATE PLAYER
  // -------------------------------

  if (
    eliminatedId &&
    !tie
  ) {
    eliminated =
      lobby.players.find(
        (player) =>
          player.id ===
          eliminatedId
      );

    if (eliminated) {
      eliminated.alive =
        false;

      lobby.eliminatedPlayers.push(
        eliminated.id
      );

      console.log(
        `${eliminated.name} was voted out in lobby ${lobbyCode}`
      );
    }
  }

  if (tie) {
    console.log(
      `Vote ended in a tie in lobby ${lobbyCode}`
    );
  }

  console.log(
    `Day vote resolved in lobby ${lobbyCode}`
  );

  // -------------------------------
  // CHECK WIN
  // -------------------------------

  const winner =
    checkWinCondition(
      lobby
    );

  if (winner) {
    lobby.gameState =
      "GAME_OVER";

    io.to(lobbyCode).emit(
      "game-over",
      {
        winner,

        eliminated:
          eliminated
            ? {
                id:
                  eliminated.id,

                name:
                  eliminated.name,

                role:
                  eliminated.role,
              }
            : null,
      }
    );

    return;
  }

  // -------------------------------
  // START NEXT NIGHT
  // -------------------------------

  lobby.gameState =
    "NIGHT";

  lobby.nightActions = {
    mafiaTarget: null,
    detectiveTarget: null,
  };

  lobby.dayVotes = {};

  const safePlayers =
    lobby.players.map(
      (player) => ({
        id:
          player.id,

        name:
          player.name,

        alive:
          player.alive !== false,
      })
    );

  io.to(lobbyCode).emit(
    "day-vote-resolved",
    {
      gameState:
        "NIGHT",

      eliminated:
        eliminated
          ? {
              id:
                eliminated.id,

              name:
                eliminated.name,

              role:
                eliminated.role,
            }
          : null,

      players:
        safePlayers,
    }
  );
}

// =====================================================
// SERVER
// =====================================================

const PORT =
  process.env.PORT ||
  5000;

server.listen(
  PORT,
  () => {
    console.log(
      `🚀 VERDICT server running on port ${PORT}`
    );
  }
);