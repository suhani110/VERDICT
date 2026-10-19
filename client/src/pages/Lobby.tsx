import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";

function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState(location.state?.lobby);

  const playerId = sessionStorage.getItem("playerId");

  useEffect(() => {
    if (!lobby) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join-lobby-room", {
      lobbyCode: lobby.code,
      playerId: playerId,
    });

    const handleLobbyUpdate = (updatedLobby: any) => {
      setLobby(updatedLobby);
    };

    const handleGameStarted = (gameData: any) => {
      navigate("/game", {
        state: {
          lobby: gameData.lobby,
          role: gameData.role,
        },
      });
    };

    socket.on("lobby-update", handleLobbyUpdate);
    socket.on("game-started", handleGameStarted);

    return () => {
      socket.off("lobby-update", handleLobbyUpdate);
      socket.off("game-started", handleGameStarted);
    };
  }, [lobby?.code, navigate, playerId]);

  if (!lobby) {
    return (
      <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">
            No Lobby Found
          </h1>

          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#B88A44] text-black px-6 py-3 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const currentPlayer = lobby.players.find(
    (player: any) => player.id === playerId
  );

  const isHost = currentPlayer?.isHost;

  function startGame() {
    socket.emit("start-game", {
      lobbyCode: lobby.code,
      playerId: playerId,
    });
  }

  return (
    <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center px-6">
      <div className="w-full max-w-2xl bg-[#151210] border border-[#B88A44] rounded-lg p-8">

        <h1
          className="text-5xl text-center mb-8"
          style={{
            fontFamily: "Cormorant Garamond",
          }}
        >
          Lobby
        </h1>

        <div className="space-y-6">

          <div>
            <h2 className="text-xl text-[#B88A44]">
              Lobby Code
            </h2>

            <p className="text-3xl font-bold tracking-widest">
              {lobby.code}
            </p>
          </div>

          <div>
            <h2 className="text-xl text-[#B88A44]">
              Host
            </h2>

            <p>{lobby.host}</p>
          </div>

          <div>
            <h2 className="text-xl text-[#B88A44] mb-3">
              Players
            </h2>

            {lobby.players.map((player: any) => (
              <div
                key={player.id}
                className="flex justify-between bg-[#201C19] rounded p-3 mb-2"
              >
                <span>{player.name}</span>

                {player.isHost && (
                  <span>👑 Host</span>
                )}
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              className="w-full bg-[#B88A44] text-black py-3 rounded font-semibold hover:bg-[#9D7538]"
            >
              Start Game
            </button>
          ) : (
            <div className="text-center text-[#B88A44]">
              Waiting for host to start...
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

export default Lobby;