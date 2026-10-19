import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";
import DiscussionRoom from "../components/DiscussionRoom";

function Game() {
  const location = useLocation();
  const navigate = useNavigate();

  const lobby = location.state?.lobby;
  const role = location.state?.role;

  const playerId = sessionStorage.getItem("playerId");

  // =====================================================
  // PLAYER STATE
  // =====================================================

  const [players, setPlayers] = useState<any[]>(
    lobby?.players || []
  );

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [gameState, setGameState] = useState(
    lobby?.gameState || "NIGHT"
  );

  const [nightVictim, setNightVictim] = useState<any>(null);
  const [investigationResult, setInvestigationResult] =
    useState<any>(null);

  const [dayVoteSubmitted, setDayVoteSubmitted] = useState(false);
  const [votesSubmitted, setVotesSubmitted] = useState(0);
  const [winner, setWinner] = useState("");
  const [eliminatedPlayer, setEliminatedPlayer] =
    useState<any>(null);

  // =====================================================
  // SOCKET LISTENERS — EXISTING GAME LOGIC PRESERVED
  // =====================================================

  useEffect(() => {
    if (!lobby) {
      return;
    }

    const handleConnect = () => {
      console.log(
        "🔌 Socket (re)connected, rejoining lobby room"
      );

      socket.emit("join-lobby-room", {
        lobbyCode: lobby.code,
        playerId: playerId,
      });
    };

    socket.on("connect", handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    const handleNightResolved = (data: any) => {
      console.log("🌅 NIGHT RESOLVED:", data);

      setGameState(data?.gameState || "DAY_DISCUSSION");
      setNightVictim(data?.victim || null);

      if (data?.players) {
        setPlayers(data.players);
      } else if (data?.victim?.id) {
        setPlayers((currentPlayers) =>
          currentPlayers.map((player) =>
            player.id === data.victim.id
              ? { ...player, alive: false }
              : player
          )
        );
      }

      setActionSubmitted(false);
      setSelectedPlayer("");
      setDayVoteSubmitted(false);
      setVotesSubmitted(0);
      setInvestigationResult(null);
    };

    const handleInvestigationResult = (data: any) => {
      console.log("🔎 INVESTIGATION RESULT:", data);
      setInvestigationResult(data);
    };

    const handleVotingStarted = (data: any) => {
      console.log("🗳️ VOTING STARTED:", data);

      setGameState("DAY");
      setDayVoteSubmitted(false);
      setVotesSubmitted(0);
      setSelectedPlayer("");
    };

    const handleVoteSubmitted = (data: any) => {
      if (data?.voterId === playerId) {
        setDayVoteSubmitted(true);
      }
    };

    const handleVoteProgress = (data: any) => {
      setVotesSubmitted(data?.votesSubmitted || 0);
    };

    const handleDayVoteResolved = (data: any) => {
      console.log("🌙 NEXT NIGHT:", data);

      setEliminatedPlayer(data?.eliminated || null);

      if (data?.players) {
        setPlayers(data.players);
      } else if (data?.eliminated?.id) {
        setPlayers((currentPlayers) =>
          currentPlayers.map((player) =>
            player.id === data.eliminated.id
              ? { ...player, alive: false }
              : player
          )
        );
      }

      setGameState("NIGHT");
      setDayVoteSubmitted(false);
      setVotesSubmitted(0);
      setSelectedPlayer("");
      setActionSubmitted(false);
      setInvestigationResult(null);
      setNightVictim(null);
    };

    const handleGameOver = (data: any) => {
      console.log("🏆 GAME OVER:", data);

      setWinner(data?.winner || "");
      setEliminatedPlayer(data?.eliminated || null);
      setGameState("GAME_OVER");
    };

    const handleVoteError = (data: any) => {
      alert(data?.message || "Unable to submit vote.");
    };

    socket.on("night-resolved", handleNightResolved);
    socket.on("investigation-result", handleInvestigationResult);
    socket.on("voting-started", handleVotingStarted);
    socket.on("vote-submitted", handleVoteSubmitted);
    socket.on("vote-progress", handleVoteProgress);
    socket.on("day-vote-resolved", handleDayVoteResolved);
    socket.on("game-over", handleGameOver);
    socket.on("vote-error", handleVoteError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("night-resolved", handleNightResolved);
      socket.off("investigation-result", handleInvestigationResult);
      socket.off("voting-started", handleVotingStarted);
      socket.off("vote-submitted", handleVoteSubmitted);
      socket.off("vote-progress", handleVoteProgress);
      socket.off("day-vote-resolved", handleDayVoteResolved);
      socket.off("game-over", handleGameOver);
      socket.off("vote-error", handleVoteError);
    };
  }, [lobby, playerId]);

  // =====================================================
  // NO GAME
  // =====================================================

  if (!lobby) {
    return (
      <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-4">No Game Found</h1>

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

  // =====================================================
  // AVAILABLE PLAYERS
  // =====================================================

  const availablePlayers = players.filter(
    (player: any) =>
      player.id !== playerId &&
      player.alive !== false
  );

  const alivePlayers = players.filter(
    (player: any) => player.alive !== false
  ).length;

  // =====================================================
  // NIGHT ACTION — UNCHANGED
  // =====================================================

  function submitNightAction() {
    if (!selectedPlayer) {
      alert("Choose a player first.");
      return;
    }

    if (!socket.connected) {
      alert("Connection to the game server was lost.");
      return;
    }

    socket.emit("submit-night-action", {
      lobbyCode: lobby.code,
      targetId: selectedPlayer,
    });

    setActionSubmitted(true);
  }

  // =====================================================
  // START VOTING — UNCHANGED
  // =====================================================

  function startVoting() {
    if (!socket.connected) {
      alert("Connection to the game server was lost.");
      return;
    }

    socket.emit("start-voting", {
      lobbyCode: lobby.code,
    });
  }

  // =====================================================
  // DAY VOTE — EXISTING EVENT AND PAYLOAD UNCHANGED
  // =====================================================

  function submitDayVote() {
    if (!selectedPlayer) {
      alert("Choose a player first.");
      return;
    }

    if (!socket.connected) {
      alert("Connection to the game server was lost.");
      return;
    }

    socket.emit("submit-day-vote", {
      lobbyCode: lobby.code,
      targetId: selectedPlayer,
    });
  }

  // =====================================================
  // GAME OVER — UNCHANGED
  // =====================================================

  if (gameState === "GAME_OVER") {
    return (
      <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center px-6">
        <div className="w-full max-w-3xl bg-[#151210] border border-[#B88A44] rounded-lg p-8 text-center">
          <h1
            className="text-6xl mb-4"
            style={{ fontFamily: "Cormorant Garamond" }}
          >
            GAME OVER
          </h1>

          <p className="text-[#B88A44] text-2xl mb-8">
            {winner === "MAFIA"
              ? "The Mafia wins."
              : "The Citizens win."}
          </p>

          {eliminatedPlayer && (
            <div className="bg-[#201C19] rounded-lg p-6 mb-6">
              <p className="text-xl">
                {eliminatedPlayer.name} was eliminated.
              </p>

              <p className="mt-3 text-[#B88A44]">
                Role: {eliminatedPlayer.role}
              </p>
            </div>
          )}

          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#B88A44] text-black px-6 py-3 rounded font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // =====================================================
  // DAY DISCUSSION — UNCHANGED
  // =====================================================

  if (gameState === "DAY_DISCUSSION") {
    return (
      <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-6xl bg-[#151210] border border-[#B88A44] rounded-lg p-8">
          <div className="text-center">
            <h1
              className="text-6xl mb-4"
              style={{ fontFamily: "Cormorant Garamond" }}
            >
              DAY
            </h1>

            <p className="text-[#B88A44] text-xl mb-8">
              The night is over.
            </p>
          </div>

          {nightVictim && (
            <div className="bg-[#201C19] rounded-lg p-6 mb-6 text-center">
              <p className="text-xl">
                Someone was eliminated during the night.
              </p>

              <p className="text-4xl font-bold text-[#B88A44] mt-4">
                {nightVictim.name}
              </p>

              <p className="text-xl mt-2">was killed.</p>
            </div>
          )}

          {investigationResult && role === "DETECTIVE" && (
            <div className="bg-[#201C19] rounded-lg p-6 mb-6 text-center">
              <h2 className="text-2xl mb-4">
                Investigation Result
              </h2>

              <p className="text-3xl font-bold text-[#B88A44]">
                {investigationResult.playerName}
              </p>

              <p className="text-xl mt-2">
                {investigationResult.isMafia
                  ? "is Mafia."
                  : "is NOT Mafia."}
              </p>
            </div>
          )}

          <DiscussionRoom
            lobbyCode={lobby.code}
            playerId={playerId || ""}
            playerName={
              players.find(
                (player: any) => player.id === playerId
              )?.name || "Player"
            }
            alive={
              players.find(
                (player: any) => player.id === playerId
              )?.alive !== false
            }
            gameState={gameState}
          />

          <button
            onClick={startVoting}
            className="w-full mt-8 bg-[#B88A44] text-black py-3 rounded font-semibold hover:bg-[#D0A45B] transition-colors"
          >
            Start Voting
          </button>

          <div className="bg-[#201C19] rounded-lg p-6 mt-6 text-center">
            <p className="text-lg">
              Lobby:{" "}
              <span className="font-bold tracking-widest">
                {lobby.code}
              </span>
            </p>

            <p className="mt-3">Players: {players.length}</p>
          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // DAY VOTING — REDESIGNED UI
  // =====================================================

  if (gameState === "DAY") {
    return (
      <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] px-4 py-10 md:px-8">
        <div className="w-full max-w-5xl mx-auto">

          {/* HEADER */}

          <header className="text-center mb-10">
            <p className="text-[#B88A44] text-xs tracking-[0.45em] uppercase mb-5">
              VERDICT · DAY PHASE
            </p>

            <h1
              className="text-6xl md:text-8xl tracking-wide mb-4"
              style={{ fontFamily: "Cormorant Garamond" }}
            >
              The Accusation
            </h1>

            <div className="flex items-center justify-center gap-4 mb-5">
              <div className="h-px w-12 bg-[#6B5435]" />
              <span className="text-[#B88A44] text-xl">✦</span>
              <div className="h-px w-12 bg-[#6B5435]" />
            </div>

            <p className="text-[#B7AEA1] text-base md:text-lg">
              Discussion has ended. Someone must answer.
            </p>

            <p className="text-[#81766A] text-sm mt-2">
              Examine the living suspects and cast your vote.
            </p>
          </header>

          {/* NIGHT VICTIM */}

          {nightVictim && (
            <div className="border border-[#3A3128] bg-[#151210] p-5 md:p-6 mb-8 text-center">
              <p className="text-xs tracking-[0.25em] uppercase text-[#9B8C7A]">
                The night's victim
              </p>

              <p
                className="text-3xl md:text-4xl text-[#B88A44] mt-3"
                style={{ fontFamily: "Cormorant Garamond" }}
              >
                {nightVictim.name}
              </p>

              <p className="text-sm text-[#B7AEA1] mt-2">
                Was killed during the night.
              </p>
            </div>
          )}

          {/* DETECTIVE INVESTIGATION */}

          {investigationResult && role === "DETECTIVE" && (
            <div className="border border-[#6B5435] bg-[#151210] p-6 mb-8 text-center">
              <p className="text-xs tracking-[0.3em] uppercase text-[#B88A44] mb-3">
                Confidential · Investigation
              </p>

              <h2
                className="text-3xl mb-3"
                style={{ fontFamily: "Cormorant Garamond" }}
              >
                Investigation Result
              </h2>

              <p className="text-2xl text-[#F5F2EB]">
                {investigationResult.playerName}
              </p>

              <p className="text-[#B88A44] mt-2">
                {investigationResult.isMafia
                  ? "This player is Mafia."
                  : "This player is NOT Mafia."}
              </p>
            </div>
          )}

          {/* BALLOT AREA */}

          <section className="border border-[#393027] bg-[#151210] p-5 md:p-8">

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
              <div>
                <p className="text-[#B88A44] text-xs tracking-[0.3em] uppercase mb-2">
                  Official Ballot
                </p>

                <h2
                  className="text-3xl md:text-4xl"
                  style={{ fontFamily: "Cormorant Garamond" }}
                >
                  Who stands accused?
                </h2>
              </div>

              <div className="border border-[#393027] px-4 py-3">
                <p className="text-[#9B8C7A] text-xs tracking-widest uppercase">
                  Living players
                </p>

                <p className="text-2xl text-[#B88A44] mt-1">
                  {alivePlayers}
                </p>
              </div>
            </div>

            <div className="h-px bg-[#393027] mb-7" />

            {dayVoteSubmitted ? (
              /* SUBMITTED STATE */

              <div className="py-8 md:py-12 text-center">
                <div className="w-16 h-16 mx-auto border border-[#B88A44] rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl text-[#B88A44]">
                    ✓
                  </span>
                </div>

                <p className="text-xs tracking-[0.35em] uppercase text-[#B88A44] mb-3">
                  Ballot recorded
                </p>

                <h3
                  className="text-4xl md:text-5xl mb-4"
                  style={{ fontFamily: "Cormorant Garamond" }}
                >
                  Your vote is sealed.
                </h3>

                <p className="text-[#B7AEA1]">
                  Await the remaining ballots.
                </p>

                <div className="max-w-md mx-auto mt-8 border border-[#393027] p-5">
                  <div className="flex items-center justify-between gap-4 text-sm mb-4">
                    <span className="text-[#B7AEA1]">
                      Votes submitted
                    </span>

                    <span className="text-[#B88A44] font-semibold">
                      {votesSubmitted} / {alivePlayers}
                    </span>
                  </div>

                  <div
                    className="h-1.5 w-full bg-[#302820] overflow-hidden"
                    role="progressbar"
                    aria-label="Votes submitted"
                    aria-valuemin={0}
                    aria-valuemax={alivePlayers}
                    aria-valuenow={Math.min(
                      votesSubmitted,
                      alivePlayers
                    )}
                  >
                    <div
                      className="h-full bg-[#B88A44] transition-all duration-500"
                      style={{
                        width: `${
                          alivePlayers > 0
                            ? Math.min(
                                100,
                                (votesSubmitted / alivePlayers) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <p className="text-xs text-[#81766A] mt-4">
                    The result will be revealed when the voting
                    phase resolves.
                  </p>
                </div>
              </div>
            ) : (
              /* SUSPECT SELECTION */

              <>
                {availablePlayers.length === 0 ? (
                  <div className="py-10 text-center">
                    <p
                      className="text-3xl text-[#B88A44] mb-3"
                      style={{ fontFamily: "Cormorant Garamond" }}
                    >
                      No eligible suspects
                    </p>

                    <p className="text-[#9B8C7A] text-sm">
                      There are no other living players available
                      to vote for.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availablePlayers.map(
                      (player: any, index: number) => {
                        const isSelected =
                          selectedPlayer === player.id;

                        return (
                          <button
                            key={player.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() =>
                              setSelectedPlayer(player.id)
                            }
                            className={`group relative min-h-[172px] text-left p-5 border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B88A44] ${
                              isSelected
                                ? "border-[#B88A44] bg-[#282117]"
                                : "border-[#393027] bg-[#100E0C] hover:border-[#79603D] hover:bg-[#1B1712]"
                            }`}
                          >
                            {/* Selection marker */}

                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs tracking-[0.2em] text-[#9B8C7A]">
                                SUSPECT {String(index + 1).padStart(2, "0")}
                              </span>

                              <span
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "border-[#B88A44] bg-[#B88A44] text-[#0D0B09]"
                                    : "border-[#655747] text-transparent"
                                }`}
                              >
                                {isSelected ? (
                                  <span className="text-xs font-bold">
                                    ✓
                                  </span>
                                ) : null}
                              </span>
                            </div>

                            {/* Player identity */}

                            <div className="mt-7">
                              <p
                                className={`text-2xl md:text-3xl break-words ${
                                  isSelected
                                    ? "text-[#D9B775]"
                                    : "text-[#F5F2EB]"
                                }`}
                                style={{
                                  fontFamily: "Cormorant Garamond",
                                }}
                              >
                                {player.name}
                              </p>

                              <div className="flex items-center gap-2 mt-3">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected
                                      ? "bg-[#B88A44]"
                                      : "bg-[#81766A]"
                                  }`}
                                />

                                <span className="text-[10px] tracking-[0.2em] uppercase text-[#9B8C7A]">
                                  Living suspect
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B88A44]" />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}

                {/* SELECTED SUSPECT */}

                <div className="mt-8 border-t border-[#393027] pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                    <div>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[#9B8C7A] mb-2">
                        Selected for accusation
                      </p>

                      <p
                        className="text-2xl md:text-3xl text-[#B88A44]"
                        style={{ fontFamily: "Cormorant Garamond" }}
                      >
                        {availablePlayers.find(
                          (player: any) =>
                            player.id === selectedPlayer
                        )?.name || "No suspect selected"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={submitDayVote}
                      disabled={
                        !selectedPlayer ||
                        !availablePlayers.some(
                          (player: any) =>
                            player.id === selectedPlayer
                        )
                      }
                      className="w-full sm:w-auto min-w-[200px] px-8 py-4 bg-[#B88A44] text-[#0D0B09] font-semibold text-xs tracking-[0.2em] uppercase transition-colors hover:bg-[#D0A45B] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-[#B88A44]"
                    >
                      Cast Vote →
                    </button>
                  </div>

                  <p className="text-xs text-[#81766A] mt-5 leading-relaxed">
                    Your ballot cannot be changed after submission.
                    Choose carefully.
                  </p>
                </div>
              </>
            )}
          </section>

          {/* LOBBY INFORMATION */}

          <footer className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#393027] pt-5">
            <p className="text-xs tracking-[0.2em] text-[#9B8C7A] uppercase">
              Lobby · {lobby.code}
            </p>

            <p className="text-xs text-[#81766A]">
              {players.length} players in this game
            </p>
          </footer>

        </div>
      </main>
    );
  }

  // =====================================================
  // NIGHT — UNCHANGED
  // =====================================================

  return (
    <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center px-6">
      <div className="w-full max-w-4xl bg-[#151210] border border-[#B88A44] rounded-lg p-8 text-center">
        <h1
          className="text-6xl mb-4"
          style={{ fontFamily: "Cormorant Garamond" }}
        >
          NIGHT
        </h1>

        <p className="text-[#B88A44] text-xl mb-8">
          The city sleeps. Your move begins.
        </p>

        {/* ROLE */}

        <div className="bg-[#201C19] rounded-lg p-6 mb-6">
          <p className="text-lg mb-3">Your Role</p>

          <p className="text-4xl font-bold tracking-widest text-[#B88A44]">
            {role || "UNKNOWN"}
          </p>
        </div>

        {/* MAFIA */}

        {role === "MAFIA" && (
          <div className="bg-[#201C19] rounded-lg p-6 mb-6">
            <h2 className="text-2xl mb-4">
              Choose your target
            </h2>

            {actionSubmitted ? (
              <p className="text-[#B88A44] text-xl">
                Target submitted. Waiting for the detective...
              </p>
            ) : (
              <>
                <select
                  value={selectedPlayer}
                  onChange={(e) =>
                    setSelectedPlayer(e.target.value)
                  }
                  className="w-full px-4 py-3 rounded bg-[#0D0B09] border border-[#3A3128] text-[#F5F2EB]"
                >
                  <option value="">Select a player</option>

                  {availablePlayers.map((player: any) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={submitNightAction}
                  className="w-full mt-4 bg-[#B88A44] text-black py-3 rounded font-semibold"
                >
                  Choose Target
                </button>
              </>
            )}
          </div>
        )}

        {/* DETECTIVE */}

        {role === "DETECTIVE" && (
          <div className="bg-[#201C19] rounded-lg p-6 mb-6">
            <h2 className="text-2xl mb-4">
              Investigate a player
            </h2>

            {actionSubmitted ? (
              <p className="text-[#B88A44] text-xl">
                Investigation submitted. Waiting for the night
                to resolve...
              </p>
            ) : (
              <>
                <select
                  value={selectedPlayer}
                  onChange={(e) =>
                    setSelectedPlayer(e.target.value)
                  }
                  className="w-full px-4 py-3 rounded bg-[#0D0B09] border border-[#3A3128] text-[#F5F2EB]"
                >
                  <option value="">Select a player</option>

                  {availablePlayers.map((player: any) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={submitNightAction}
                  className="w-full mt-4 bg-[#B88A44] text-black py-3 rounded font-semibold"
                >
                  Investigate
                </button>
              </>
            )}
          </div>
        )}

        {/* CITIZEN */}

        {role === "CITIZEN" && (
          <div className="bg-[#201C19] rounded-lg p-6 mb-6">
            <p className="text-xl">
              You have no action tonight.
            </p>

            <p className="mt-2 text-[#B88A44]">
              Wait for the night to end...
            </p>
          </div>
        )}

        {/* LOBBY */}

        <div className="bg-[#201C19] rounded-lg p-6">
          <p className="text-lg">
            Lobby:{" "}
            <span className="font-bold tracking-widest">
              {lobby.code}
            </span>
          </p>

          <p className="mt-3">Players: {players.length}</p>
        </div>
      </div>
    </main>
  );
}

export default Game;