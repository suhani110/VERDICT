import { useState } from "react";
import { useNavigate } from "react-router-dom";

function JoinLobby() {
  const navigate = useNavigate();

  const [playerName, setPlayerName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");

  async function handleJoinLobby() {
    if (!playerName.trim() || !lobbyCode.trim()) {
      alert("Enter your name and lobby code.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/lobby/join",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playerName,
            lobbyCode: lobbyCode.toUpperCase(),
          }),
        }
      );

      const lobby = await response.json();

      if (!response.ok) {
        alert(
          lobby.message || "Unable to join lobby"
        );
        return;
      }

      // Save THIS player's ID
      const joinedPlayer =
        lobby.players[lobby.players.length - 1];

      sessionStorage.setItem(
        "playerId",
        joinedPlayer.id
      );

      navigate("/lobby", {
        state: {
          lobby,
        },
      });

    } catch (error) {
      console.error(error);

      alert("Server connection failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center px-6">

      <div className="w-full max-w-md bg-[#151210] border border-[#B88A44] rounded-lg p-8">

        <h1
          className="text-5xl text-center mb-8"
          style={{
            fontFamily: "Cormorant Garamond"
          }}
        >
          Join Lobby
        </h1>

        <div className="space-y-6">

          <input
            type="text"
            placeholder="Your Nickname"
            value={playerName}
            onChange={(e) =>
              setPlayerName(e.target.value)
            }
            className="w-full px-4 py-3 rounded bg-[#201C19] border border-[#3A3128]"
          />

          <input
            type="text"
            placeholder="Lobby Code"
            value={lobbyCode}
            onChange={(e) =>
              setLobbyCode(e.target.value)
            }
            className="w-full px-4 py-3 rounded bg-[#201C19] border border-[#3A3128] uppercase"
          />

          <button
            onClick={handleJoinLobby}
            className="w-full bg-[#B88A44] text-black py-3 rounded font-semibold hover:bg-[#9D7538]"
          >
            Join Lobby
          </button>

        </div>

      </div>

    </main>
  );
}

export default JoinLobby;