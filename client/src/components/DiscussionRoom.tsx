import { useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";

interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  alive: boolean;
  timestamp: number;
}

interface DiscussionRoomProps {
  lobbyCode: string;
  playerId: string;
  playerName: string;
  alive: boolean;
  gameState: string;
}

const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

function DiscussionRoom({
  lobbyCode,
  playerId,
  playerName,
  alive,
  gameState,
}: DiscussionRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");

  const [inVoice, setInVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voicePlayers, setVoicePlayers] = useState<string[]>([]);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const peerConnectionsRef = useRef<
    Record<string, RTCPeerConnection>
  >({});

  const audioElementsRef = useRef<
    Record<string, HTMLAudioElement>
  >({});

  const isAlive = alive;

  // =========================================================
  // TEXT CHAT
  // =========================================================

  useEffect(() => {
    const handleChatMessage = (
      chatMessage: ChatMessage
    ) => {
      setMessages((previous) => [
        ...previous,
        chatMessage,
      ]);
    };

    socket.on(
      "chat-message",
      handleChatMessage
    );

    return () => {
      socket.off(
        "chat-message",
        handleChatMessage
      );
    };
  }, []);

  function sendMessage() {
    const trimmed = message.trim();

    if (!trimmed) return;
    if (!isAlive) return;
    if (gameState !== "DAY_DISCUSSION") return;

    socket.emit("send-chat-message", {
      lobbyCode,
      message: trimmed,
    });

    setMessage("");
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }

  // =========================================================
  // VOICE SIGNALING
  // =========================================================

  useEffect(() => {
    const handleVoiceParticipants = (
      playerIds: string[]
    ) => {
      setVoicePlayers(playerIds);
    };

    const handleVoiceJoined = async ({
      playerId: joinedPlayerId,
    }: {
      playerId: string;
    }) => {
      if (!localStreamRef.current) return;
      if (joinedPlayerId === playerId) return;

      await createOffer(joinedPlayerId);
    };

    const handleVoiceOffer = async ({
      fromPlayerId,
      offer,
    }: {
      fromPlayerId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      if (!localStreamRef.current) return;
      if (fromPlayerId === playerId) return;

      const peerConnection =
        createPeerConnection(fromPlayerId);

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer =
        await peerConnection.createAnswer();

      await peerConnection.setLocalDescription(
        answer
      );

      socket.emit("voice-answer", {
        lobbyCode,
        targetPlayerId: fromPlayerId,
        fromPlayerId: playerId,
        answer,
      });
    };

    const handleVoiceAnswer = async ({
      fromPlayerId,
      answer,
    }: {
      fromPlayerId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const peerConnection =
        peerConnectionsRef.current[
          fromPlayerId
        ];

      if (!peerConnection) return;

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    };

    const handleVoiceIceCandidate = async ({
      fromPlayerId,
      candidate,
    }: {
      fromPlayerId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const peerConnection =
        peerConnectionsRef.current[
          fromPlayerId
        ];

      if (!peerConnection) return;

      try {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error(
          "Failed to add ICE candidate:",
          error
        );
      }
    };

    const handleVoiceLeft = ({
      playerId: leftPlayerId,
    }: {
      playerId: string;
    }) => {
      closePeerConnection(leftPlayerId);

      setVoicePlayers((previous) =>
        previous.filter(
          (id) => id !== leftPlayerId
        )
      );
    };

    socket.on(
      "voice-participants",
      handleVoiceParticipants
    );

    socket.on(
      "voice-joined",
      handleVoiceJoined
    );

    socket.on(
      "voice-offer",
      handleVoiceOffer
    );

    socket.on(
      "voice-answer",
      handleVoiceAnswer
    );

    socket.on(
      "voice-ice-candidate",
      handleVoiceIceCandidate
    );

    socket.on(
      "voice-left",
      handleVoiceLeft
    );

    return () => {
      socket.off(
        "voice-participants",
        handleVoiceParticipants
      );

      socket.off(
        "voice-joined",
        handleVoiceJoined
      );

      socket.off(
        "voice-offer",
        handleVoiceOffer
      );

      socket.off(
        "voice-answer",
        handleVoiceAnswer
      );

      socket.off(
        "voice-ice-candidate",
        handleVoiceIceCandidate
      );

      socket.off(
        "voice-left",
        handleVoiceLeft
      );
    };
  }, [
    lobbyCode,
    playerId,
    gameState,
  ]);

  // =========================================================
  // CREATE PEER CONNECTION
  // =========================================================

  function createPeerConnection(
    remotePlayerId: string
  ) {
    const existing =
      peerConnectionsRef.current[
        remotePlayerId
      ];

    if (existing) {
      return existing;
    }

    const peerConnection =
      new RTCPeerConnection(ICE_SERVERS);

    peerConnectionsRef.current[
      remotePlayerId
    ] = peerConnection;

    // Send local microphone tracks
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          peerConnection.addTrack(
            track,
            localStreamRef.current!
          );
        });
    }

    // Receive remote audio
    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];

      if (!stream) return;

      let audio =
        audioElementsRef.current[
          remotePlayerId
        ];

      if (!audio) {
        audio =
          document.createElement("audio");

        audio.autoplay = true;

        audioElementsRef.current[
          remotePlayerId
        ] = audio;

        document.body.appendChild(audio);
      }

      audio.srcObject = stream;

      audio.play().catch((error) => {
        console.error(
          "Could not play remote audio:",
          error
        );
      });
    };

    // ICE candidate exchange
    peerConnection.onicecandidate = (
      event
    ) => {
      if (!event.candidate) return;

      socket.emit(
        "voice-ice-candidate",
        {
          lobbyCode,
          targetPlayerId:
            remotePlayerId,
          fromPlayerId: playerId,
          candidate: event.candidate,
        }
      );
    };

    peerConnection.onconnectionstatechange =
      () => {
        if (
          peerConnection.connectionState ===
            "failed" ||
          peerConnection.connectionState ===
            "disconnected" ||
          peerConnection.connectionState ===
            "closed"
        ) {
          closePeerConnection(
            remotePlayerId
          );
        }
      };

    return peerConnection;
  }

  // =========================================================
  // CREATE OFFER
  // =========================================================

  async function createOffer(
    remotePlayerId: string
  ) {
    if (!localStreamRef.current) return;

    const peerConnection =
      createPeerConnection(
        remotePlayerId
      );

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    socket.emit("voice-offer", {
      lobbyCode,
      targetPlayerId:
        remotePlayerId,
      fromPlayerId: playerId,
      offer,
    });
  }

  // =========================================================
  // JOIN VOICE
  // =========================================================

  async function joinVoice() {
    if (!isAlive) return;

    if (gameState !== "DAY_DISCUSSION") {
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      localStreamRef.current = stream;

      setInVoice(true);
      setMuted(false);

      socket.emit("voice-join", {
        lobbyCode,
        playerId,
      });
    } catch (error) {
      console.error(
        "Could not access microphone:",
        error
      );

      alert(
        "Microphone access was denied or unavailable."
      );
    }
  }

  // =========================================================
  // LEAVE VOICE
  // =========================================================

  function leaveVoice() {
    socket.emit("voice-leave", {
      lobbyCode,
      playerId,
    });

    localStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    localStreamRef.current = null;

    Object.keys(
      peerConnectionsRef.current
    ).forEach((remotePlayerId) => {
      closePeerConnection(
        remotePlayerId
      );
    });

    setInVoice(false);
    setMuted(false);
    setVoicePlayers([]);
  }

  // =========================================================
  // MUTE / UNMUTE
  // =========================================================

  function toggleMute() {
    if (!localStreamRef.current) return;

    const audioTracks =
      localStreamRef.current.getAudioTracks();

    const newMutedState = !muted;

    audioTracks.forEach((track) => {
      track.enabled = !newMutedState;
    });

    setMuted(newMutedState);
  }

  // =========================================================
  // CLOSE PEER
  // =========================================================

  function closePeerConnection(
    remotePlayerId: string
  ) {
    const peerConnection =
      peerConnectionsRef.current[
        remotePlayerId
      ];

    if (peerConnection) {
      peerConnection.close();

      delete peerConnectionsRef.current[
        remotePlayerId
      ];
    }

    const audio =
      audioElementsRef.current[
        remotePlayerId
      ];

    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();

      delete audioElementsRef.current[
        remotePlayerId
      ];
    }
  }

  // =========================================================
  // AUTOMATIC CLEANUP
  // =========================================================

  useEffect(() => {
    if (
      gameState !== "DAY_DISCUSSION" &&
      inVoice
    ) {
      leaveVoice();
    }
  }, [gameState]);

  useEffect(() => {
    return () => {
      localStreamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop()
        );

      Object.keys(
        peerConnectionsRef.current
      ).forEach((remotePlayerId) => {
        closePeerConnection(
          remotePlayerId
        );
      });
    };
  }, []);

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      style={{
        marginTop: "30px",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid #333",
        background: "#111",
      }}
    >
      <h2>💬 Discussion Room</h2>

      <p
        style={{
          color: "#aaa",
          marginBottom: "20px",
        }}
      >
        Discuss with the other alive players
        before voting begins.
      </p>

      {/* ================================================= */}
      {/* CHAT */}
      {/* ================================================= */}

      <div
        style={{
          height: "250px",
          overflowY: "auto",
          padding: "12px",
          marginBottom: "12px",
          border: "1px solid #333",
          borderRadius: "8px",
          background: "#080808",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#666" }}>
            No messages yet. Start the
            discussion!
          </p>
        ) : (
          messages.map(
            (chatMessage, index) => (
              <div
                key={`${chatMessage.timestamp}-${index}`}
                style={{
                  marginBottom: "10px",
                }}
              >
                <strong
                  style={{
                    color:
                      chatMessage.playerId ===
                      playerId
                        ? "#fff"
                        : "#aaa",
                  }}
                >
                  {chatMessage.playerName}
                </strong>

                {!chatMessage.alive && (
                  <span
                    style={{
                      marginLeft: "6px",
                      color: "#777",
                      fontSize: "12px",
                    }}
                  >
                    [DEAD]
                  </span>
                )}

                <div>
                  {chatMessage.message}
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* CHAT INPUT */}

      <div
        style={{
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          value={message}
          onChange={(event) =>
            setMessage(event.target.value)
          }
          onKeyDown={handleKeyDown}
          disabled={
            !isAlive ||
            gameState !==
              "DAY_DISCUSSION"
          }
          placeholder={
            isAlive
              ? "Type your message..."
              : "Dead players cannot speak"
          }
          maxLength={300}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #444",
            background: "#1a1a1a",
            color: "#fff",
          }}
        />

        <button
          onClick={sendMessage}
          disabled={
            !isAlive ||
            gameState !==
              "DAY_DISCUSSION" ||
            !message.trim()
          }
        >
          Send
        </button>
      </div>

      {/* ================================================= */}
      {/* VOICE */}
      {/* ================================================= */}

      <div
        style={{
          marginTop: "25px",
          paddingTop: "20px",
          borderTop: "1px solid #333",
        }}
      >
        <h3>🎤 Live Voice</h3>

        {!inVoice ? (
          <button
            onClick={joinVoice}
            disabled={
              !isAlive ||
              gameState !==
                "DAY_DISCUSSION"
            }
          >
            🎤 Join Voice
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={toggleMute}
            >
              {muted
                ? "🔇 Unmute"
                : "🎤 Mute"}
            </button>

            <button
              onClick={leaveVoice}
            >
              📞 Leave Voice
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: "15px",
          }}
        >
          <strong>
            Players in voice:
          </strong>

          {voicePlayers.length === 0 ? (
            <p style={{ color: "#666" }}>
              Nobody is in voice yet.
            </p>
          ) : (
            <ul>
              {voicePlayers.map(
                (voicePlayerId) => (
                  <li
                    key={voicePlayerId}
                  >
                    {voicePlayerId ===
                    playerId
                      ? `${playerName} (You)`
                      : `Player ${voicePlayerId.slice(
                          0,
                          5
                        )}`}
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiscussionRoom;