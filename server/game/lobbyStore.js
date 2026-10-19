const crypto = require("crypto");

const lobbies = {};

function generateLobbyCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}


function createLobby(hostName, maxPlayers) {
  const lobbyCode = generateLobbyCode();

  lobbies[lobbyCode] = {
    code: lobbyCode,
    host: hostName,
    maxPlayers,

    gameState: "WAITING",

    nightActions: {
      mafiaTarget: null,
      detectiveTarget: null,
    },

    players: [
      {
        id: crypto.randomUUID(),
        name: hostName,
        isHost: true,
        alive: true,
      },
    ],
  };

  return lobbies[lobbyCode];
}


function joinLobby(lobbyCode, playerName) {
  const lobby = lobbies[lobbyCode];

  if (!lobby) {
    return null;
  }

  if (lobby.players.length >= lobby.maxPlayers) {
    return null;
  }

  lobby.players.push({
    id: crypto.randomUUID(),
    name: playerName,
    isHost: false,
    alive: true,
  });

  return lobby;
}


function getLobby(lobbyCode) {
  return lobbies[lobbyCode];
}


module.exports = {
  createLobby,
  joinLobby,
  getLobby,
};