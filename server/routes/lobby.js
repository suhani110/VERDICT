const express = require("express");

const router = express.Router();

const {
  createLobby,
  joinLobby,
} = require("../game/lobbyStore");


// Create Lobby
router.post("/create", (req, res) => {
  const { hostName, maxPlayers } = req.body;

  if (!hostName) {
    return res.status(400).json({
      message: "Host name is required",
    });
  }

  const lobby = createLobby(
    hostName,
    maxPlayers
  );

  res.json(lobby);
});


// Join Lobby
router.post("/join", (req, res) => {
  const { lobbyCode, playerName } = req.body;

  const lobby = joinLobby(
    lobbyCode,
    playerName
  );

  if (!lobby) {
    return res.status(400).json({
      message: "Unable to join lobby",
    });
  }

  res.json(lobby);
});


module.exports = router;