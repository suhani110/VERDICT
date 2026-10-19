function getMafiaCount(playerCount) {
  if (playerCount <= 7) {
    return 1;
  }

  if (playerCount <= 10) {
    return 2;
  }

  return 3;
}


function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}


function assignRoles(lobby) {
  const playerCount = lobby.players.length;

  const mafiaCount = getMafiaCount(playerCount);

  const roles = [];

  // Add Mafia roles
  for (let i = 0; i < mafiaCount; i++) {
    roles.push("MAFIA");
  }

  // Add one Detective
  roles.push("DETECTIVE");

  // Everyone else is a Citizen
  while (roles.length < playerCount) {
    roles.push("CITIZEN");
  }

  const shuffledRoles = shuffle(roles);

  lobby.players.forEach((player, index) => {
    player.role = shuffledRoles[index];
  });

  return lobby;
}


function startGame(lobby) {

  // Assign secret roles
  assignRoles(lobby);

  // Start first night
  lobby.gameState = "NIGHT";

  // Night actions
  lobby.nightActions = {
    mafiaTarget: null,
    detectiveTarget: null,
  };

  // Voting storage
  lobby.votes = {};

  // Track eliminated players
  lobby.eliminatedPlayers = [];

  return lobby;
}


module.exports = {
  startGame,
  assignRoles,
};