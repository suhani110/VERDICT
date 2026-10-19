import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center px-6">
      <div className="w-full max-w-4xl">
        <h1
          className="text-6xl text-center mb-12"
          style={{ fontFamily: "Cormorant Garamond" }}
        >
          Headquarters
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          <button
            onClick={() => navigate("/create-lobby")}
            className="border border-[#B88A44] bg-[#151210] p-8 rounded-lg hover:bg-[#1F1A17] transition"
          >
            <h2 className="text-3xl mb-2">🎮 Create Lobby</h2>
            <p>Create a new game and invite your friends.</p>
          </button>

          <button
            onClick={() => navigate("/join-lobby")}
            className="border border-[#B88A44] bg-[#151210] p-8 rounded-lg hover:bg-[#1F1A17] transition"
          >
            <h2 className="text-3xl mb-2">🔑 Join Lobby</h2>
            <p>Join an existing lobby using a room code.</p>
          </button>

          <button
            onClick={() => navigate("/profile")}
            className="border border-[#B88A44] bg-[#151210] p-8 rounded-lg hover:bg-[#1F1A17] transition"
          >
            <h2 className="text-3xl mb-2">👤 Profile</h2>
            <p>View your statistics and achievements.</p>
          </button>

          <button
            onClick={() => navigate("/")}
            className="border border-red-700 bg-[#151210] p-8 rounded-lg hover:bg-[#1F1A17] transition"
          >
            <h2 className="text-3xl mb-2">🚪 Logout</h2>
            <p>Return to the main menu.</p>
          </button>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;