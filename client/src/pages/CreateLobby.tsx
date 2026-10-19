import { useState } from "react";
import { useNavigate } from "react-router-dom";

function CreateLobby() {
  const navigate = useNavigate();

  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);

  async function handleCreateLobby() {
    if (!hostName.trim()) {
      alert("Please enter your nickname.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/lobby/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostName,
          maxPlayers,
        }),
      });

      const lobby = await response.json();

      // Save the host player's ID
      sessionStorage.setItem(
        "playerId",
        lobby.players[0].id
      );

      navigate("/lobby", {
        state: {
          lobby,
        },
      });
    } catch (error) {
      console.error(error);
      alert("Could not create lobby.");
    }
  }

  return (
    <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-[#151210] border border-[#B88A44] rounded-lg p-8">

        <h1
          className="text-5xl text-center mb-8"
          style={{ fontFamily: "Cormorant Garamond" }}
        >
          Create Lobby
        </h1>

        <div className="space-y-6">

          <input
            type="text"
            placeholder="Host Nickname"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="w-full px-4 py-3 rounded bg-[#201C19] border border-[#3A3128]"
          />

          <div>

            <label className="block mb-2">
              Maximum Players
            </label>

            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full px-4 py-3 rounded bg-[#201C19] border border-[#3A3128]"
            >
              {[6, 7, 8, 9, 10, 11, 12].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

          </div>

          <button
            onClick={handleCreateLobby}
            className="w-full bg-[#B88A44] text-black py-3 rounded font-semibold hover:bg-[#9D7538]"
          >
            Create Lobby
          </button>

        </div>

      </div>
    </main>
  );
}

export default CreateLobby;