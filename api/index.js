import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.static("public"));
app.use(cors({ origin: "*" }));

const rooms = {};

const GAME_DURATION = 60;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 30;
const BOOSTER_SIZE = 20;
const BOOSTER_DURATION = 5;
const BOOSTER_SPAWN_INTERVAL = 15;
function getRandomColor() {
  const colors = [
    "#3498db",
    "#2ecc71",
    "#9b59b6",
    "#f1c40f",
    "#e67e22",
    "#1abc9c",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on("connection", (ws) => {
  const playerId = Math.random().toString(36).slice(2);
  let playerRoom = null;

  ws.send(
    JSON.stringify({
      type: "welcome",
      playerId,
    })
  );

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "createRoom") {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
          players: {},
          taggerId: null,
          gameRunning: false,
          gameTime: GAME_DURATION,
          tagcooldown: false,
          hostId: playerId,
          gameInterval: null,
        };

        playerRoom = roomCode;

        rooms[roomCode].players[playerId] = {
          x: Math.random() * (CANVAS_WIDTH - PLAYER_SIZE * 2) + PLAYER_SIZE,
          y: Math.random() * (CANVAS_HEIGHT - PLAYER_SIZE * 2) + PLAYER_SIZE,
          color: getRandomColor(),
          ws,
          name: data.name || "Host",
          score: 0,
          isHost: true,
          sm: 1.5,
          speedboosted: false,
        };

        ws.send(
          JSON.stringify({
            type: "roomCreated",
            roomCode,
            isHost: true,
          })
        );

        return;
      }

      if (data.type === "joinRoom") {
        const roomCode = data.roomCode;

        if (!rooms[roomCode]) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room not found",
            })
          );
          return;
        }

        if (rooms[roomCode].gameRunning) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Game already in progress",
            })
          );
          return;
        }

        playerRoom = roomCode;

        rooms[roomCode].players[playerId] = {
          x: Math.random() * (CANVAS_WIDTH - PLAYER_SIZE * 2) + PLAYER_SIZE,
          y: Math.random() * (CANVAS_HEIGHT - PLAYER_SIZE * 2) + PLAYER_SIZE,
          color: getRandomColor(),
          ws,
          name: data.name || "Player",
          score: 0,
          isHost: false,
        };

        if (!rooms[roomCode].taggerId) {
          rooms[roomCode].taggerId = playerId;
          rooms[roomCode].players[playerId].color = "#e74c3c";
        }

        ws.send(
          JSON.stringify({
            type: "init",
            id: playerId,
            roomCode,
            players: sanitizePlayers(rooms[roomCode].players),
            taggerId: rooms[roomCode].taggerId,
            gameRunning: rooms[roomCode].gameRunning,
            gameTime: rooms[roomCode].gameTime,
            canvasWidth: CANVAS_WIDTH,
            canvasHeight: CANVAS_HEIGHT,
            isHost: false,
            hostId: rooms[roomCode].hostId,
          })
        );

        broadcastToRoom(
          roomCode,
          {
            type: "newPlayer",
            id: playerId,
            data: sanitizePlayer(rooms[roomCode].players[playerId]),
          },
          playerId
        );

        return;
      }

      if (data.type === "kickPlayer") {
        if (!playerRoom || !rooms[playerRoom]) return;

        if (playerId !== rooms[playerRoom].hostId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Only the host can kick players",
            })
          );
          return;
        }

        const targetId = data.playerId;

        if (targetId === playerId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "You can't kick yourself",
            })
          );
          return;
        }

        if (!rooms[playerRoom].players[targetId]) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Player not found",
            })
          );
          return;
        }

        try {
          rooms[playerRoom].players[targetId].ws.send(
            JSON.stringify({
              type: "kicked",
              message: "You've been removed from the game by the host",
            })
          );

          rooms[playerRoom].players[targetId].ws.close();
        } catch (error) {
          console.log("Error notifying kicked player", error);
        }

        if (rooms[playerRoom].taggerId === targetId) {
          handlePlayerLeaving(targetId, playerRoom);
        } else {
          delete rooms[playerRoom].players[targetId];

          broadcastToRoom(playerRoom, {
            type: "playerKicked",
            id: targetId,
          });
        }

        return;
      }

      if (!playerRoom || !rooms[playerRoom]) return;

      if (data.type === "start") {
        if (playerId !== rooms[playerRoom].hostId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Only the host can start the game",
            })
          );
          return;
        }

        if (
          Object.keys(rooms[playerRoom].players).length >= 2 &&
          !rooms[playerRoom].gameRunning
        ) {
          startGame(playerRoom);
        } else if (rooms[playerRoom].gameRunning) {
          ws.send(
            JSON.stringify({
              type: "notification",
              message: "Game is already in progress",
            })
          );
        } else {
          ws.send(
            JSON.stringify({
              type: "notification",
              message: "Need at least 2 players to start",
            })
          );
        }
        return;
      }

      if (data.type === "setName") {
        if (rooms[playerRoom].players[playerId]) {
          const sanitizedName = (data.name || "Player").substring(0, 15).trim();
          rooms[playerRoom].players[playerId].name = sanitizedName || "Player";

          broadcastToRoom(playerRoom, {
            type: "playerUpdate",
            id: playerId,
            data: sanitizePlayer(rooms[playerRoom].players[playerId]),
          });
        }
        return;
      }
      if (data.type === "sound") {
        if (rooms[playerRoom].players[playerId]) {
          broadcastToRoom(playerRoom, { type: "sound", id: data.id }, playerId);
        }
        return;
      }
      if (data.type === "msg") {
        if (rooms[playerRoom].players[playerId]) {
          broadcastToRoom(playerRoom, {
            type: "msg",
            data: `${rooms[playerRoom].players[playerId].name} : ${data.data}`,
          });
        }
      }

      if (data.type === "move" && rooms[playerRoom].players[playerId]) {
        rooms[playerRoom].players[playerId].x = Math.max(
          PLAYER_SIZE,
          Math.min(CANVAS_WIDTH - PLAYER_SIZE, data.x)
        );
        rooms[playerRoom].players[playerId].y = Math.max(
          PLAYER_SIZE,
          Math.min(CANVAS_HEIGHT - PLAYER_SIZE, data.y)
        );
        if (rooms[playerRoom].currentBooster) {
          const dx =
            rooms[playerRoom].players[playerId].x -
            rooms[playerRoom].currentBooster.x;
          const dy =
            rooms[playerRoom].players[playerId].y -
            rooms[playerRoom].currentBooster.y;
          const distance = Math.hypot(dx, dy);

          if (distance < PLAYER_SIZE + BOOSTER_SIZE) {
            const booster = rooms[playerRoom].currentBooster;

            if (rooms[playerRoom].boosterTimeout) {
              clearTimeout(rooms[playerRoom].boosterTimeout);
            }

            applyBoosterEffect(playerRoom, playerId, booster);

            delete rooms[playerRoom].currentBooster;

            broadcastToRoom(playerRoom, {
              type: "boosterCollected",
              playerId: playerId,
              playerName: rooms[playerRoom].players[playerId].name,
              boosterType: booster.type,
            });

            scheduleNextBooster(playerRoom);
          }
        }

        if (
          playerId === rooms[playerRoom].taggerId &&
          rooms[playerRoom].gameRunning &&
          !rooms[playerRoom].players[playerId].frozen
        ) {
          for (let pid in rooms[playerRoom].players) {
            if (pid !== rooms[playerRoom].taggerId) {
              const dx =
                rooms[playerRoom].players[pid].x -
                rooms[playerRoom].players[playerId].x;
              const dy =
                rooms[playerRoom].players[pid].y -
                rooms[playerRoom].players[playerId].y;
              const distance = Math.hypot(dx, dy);

              if (
                distance < PLAYER_SIZE * 1.5 &&
                !rooms[playerRoom].tagcooldown &&
                !rooms[playerRoom].players[pid].shielded &&
                !rooms[playerRoom].players[pid].frozen
              ) {
                rooms[playerRoom].players[rooms[playerRoom].taggerId].color =
                  getRandomColor();
                rooms[playerRoom].players[
                  rooms[playerRoom].taggerId
                ].score += 1;
                rooms[playerRoom].taggerId = pid;
                rooms[playerRoom].players[pid].color = "#e74c3c";

                broadcastToRoom(playerRoom, {
                  type: "tagUpdate",
                  previousTagger: playerId,
                  taggerId: rooms[playerRoom].taggerId,
                  players: sanitizePlayers(rooms[playerRoom].players),
                });

                broadcastToRoom(playerRoom, {
                  type: "tagged",
                  tagger: rooms[playerRoom].players[playerId].name,
                  tagged: rooms[playerRoom].players[pid].name,
                });

                rooms[playerRoom].tagcooldown = true;

                setTimeout(() => {
                  if (rooms[playerRoom]) {
                    rooms[playerRoom].tagcooldown = false;
                  }
                }, 1000);
                break;
              }
            }
          }
        }

        broadcastToRoom(playerRoom, {
          type: "playerMoved",
          id: playerId,
          data: sanitizePlayer(rooms[playerRoom].players[playerId]),
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    if (playerRoom && rooms[playerRoom]) {
      handlePlayerLeaving(playerId, playerRoom);
    }
  });
});
function applyBoosterEffect(roomCode, playerId, booster) {
  if (!rooms[roomCode] || !rooms[roomCode].players[playerId]) return;

  const player = rooms[roomCode].players[playerId];

  switch (booster.type) {
    case "speed":
      player.speedboosted = true;
      player.speedMultiplier = booster.multiplier || 1.5;

      broadcastToRoom(roomCode, {
        type: "playerBoosted",
        playerId: playerId,
        boosterType: "speed",
        duration: BOOSTER_DURATION,
      });

      setTimeout(() => {
        if (rooms[roomCode] && rooms[roomCode].players[playerId]) {
          rooms[roomCode].players[playerId].speedboosted = false;
          rooms[roomCode].players[playerId].speedMultiplier = 1;

          broadcastToRoom(roomCode, {
            type: "boostEnded",
            playerId: playerId,
            boosterType: "speed",
          });
        }
      }, BOOSTER_DURATION * 1000);
      break;

    case "shield":
      player.shielded = true;

      const originalColor = player.color;
      player.color = "#8e44ad";

      broadcastToRoom(roomCode, {
        type: "playerBoosted",
        playerId: playerId,
        boosterType: "shield",
        duration: booster.duration,
      });

      setTimeout(() => {
        if (rooms[roomCode] && rooms[roomCode].players[playerId]) {
          rooms[roomCode].players[playerId].shielded = false;

          if (rooms[roomCode].taggerId !== playerId) {
            rooms[roomCode].players[playerId].color = originalColor;
          }

          broadcastToRoom(roomCode, {
            type: "boostEnded",
            playerId: playerId,
            boosterType: "shield",
          });
        }
      }, booster.duration * 1000);
      break;

    case "freeze":
      if (playerId === rooms[roomCode].taggerId) {
        for (let id in rooms[roomCode].players) {
          if (id !== playerId) {
            rooms[roomCode].players[id].frozen = true;

            const playerOriginalColor = rooms[roomCode].players[id].color;
            rooms[roomCode].players[id].color = "#00ffff"; // Icy blue

            setTimeout(() => {
              if (rooms[roomCode] && rooms[roomCode].players[id]) {
                rooms[roomCode].players[id].frozen = false;

                if (rooms[roomCode].taggerId !== id) {
                  rooms[roomCode].players[id].color = playerOriginalColor;
                }
              }
            }, booster.duration * 1000);
          }
        }

        broadcastToRoom(roomCode, {
          type: "massFreeze",
          initiator: playerId,
          duration: booster.duration,
        });
      } else {
        // Non-tagger got the freeze power - freeze only the tagger
        const taggerId = rooms[roomCode].taggerId;
        if (taggerId && rooms[roomCode].players[taggerId]) {
          rooms[roomCode].players[taggerId].frozen = true;

          broadcastToRoom(roomCode, {
            type: "playerBoosted",
            playerId: taggerId,
            boosterType: "frozen",
            duration: booster.duration,
          });

          setTimeout(() => {
            if (rooms[roomCode] && rooms[roomCode].players[taggerId]) {
              rooms[roomCode].players[taggerId].frozen = false;

              broadcastToRoom(roomCode, {
                type: "boostEnded",
                playerId: taggerId,
                boosterType: "frozen",
              });
            }
          }, booster.duration * 1000);
        }
      }
      break;
  }
}
function handlePlayerLeaving(playerId, roomCode) {
  if (!rooms[roomCode] || !rooms[roomCode].players[playerId]) return;

  if (playerId === rooms[roomCode].hostId) {
    const remainingPlayers = Object.keys(rooms[roomCode].players).filter(
      (id) => id !== playerId
    );

    if (remainingPlayers.length > 0) {
      const newHostId = remainingPlayers[0];
      rooms[roomCode].hostId = newHostId;
      rooms[roomCode].players[newHostId].isHost = true;

      broadcastToRoom(roomCode, {
        type: "newHost",
        id: newHostId,
        name: rooms[roomCode].players[newHostId].name,
      });
    } else {
      if (rooms[roomCode].gameInterval) {
        clearInterval(rooms[roomCode].gameInterval);
      }
      delete rooms[roomCode];
      return;
    }
  }

  if (rooms[roomCode].taggerId === playerId) {
    const playerIds = Object.keys(rooms[roomCode].players).filter(
      (id) => id !== playerId
    );

    if (playerIds.length > 0) {
      rooms[roomCode].taggerId = playerIds[0];
      rooms[roomCode].players[playerIds[0]].color = "#e74c3c";

      broadcastToRoom(roomCode, {
        type: "tagUpdate",
        previousTagger: playerId,
        taggerId: rooms[roomCode].taggerId,
        players: sanitizePlayers(rooms[roomCode].players),
      });
    } else {
      rooms[roomCode].taggerId = null;

      if (rooms[roomCode].gameRunning) {
        endGame(roomCode, "Not enough players");
      }
    }
  }

  delete rooms[roomCode].players[playerId];

  broadcastToRoom(roomCode, {
    type: "playerDisconnected",
    id: playerId,
  });

  if (
    rooms[roomCode].gameRunning &&
    Object.keys(rooms[roomCode].players).length < 2
  ) {
    endGame(roomCode, "Not enough players");
  }

  // Clean up empty rooms
  if (Object.keys(rooms[roomCode].players).length === 0) {
    if (rooms[roomCode].gameInterval) {
      clearInterval(rooms[roomCode].gameInterval);
    }
    delete rooms[roomCode];
  }
}
function createBooster(roomCode) {
  if (!rooms[roomCode] || !rooms[roomCode].gameRunning) return;

  const boosterTypes = [
    { type: "speed", color: "#00ff00", multiplier: 1.5 },
    { type: "shield", color: "#0000ff", duration: 3 },
    { type: "freeze", color: "#00ffff", duration: 2 },
  ];

  const selectedBooster =
    boosterTypes[Math.floor(Math.random() * boosterTypes.length)];

  rooms[roomCode].currentBooster = {
    x: Math.random() * (CANVAS_WIDTH - BOOSTER_SIZE * 2) + BOOSTER_SIZE,
    y: Math.random() * (CANVAS_HEIGHT - BOOSTER_SIZE * 2) + BOOSTER_SIZE,
    type: selectedBooster.type,
    color: selectedBooster.color,
    ...selectedBooster,
  };

  broadcastToRoom(roomCode, {
    type: "boosterSpawned",
    booster: rooms[roomCode].currentBooster,
  });

  rooms[roomCode].boosterTimeout = setTimeout(() => {
    if (rooms[roomCode] && rooms[roomCode].currentBooster) {
      delete rooms[roomCode].currentBooster;
      broadcastToRoom(roomCode, { type: "boosterRemoved" });
    }
  }, 10000);
}
function sanitizePlayer(player) {
  const { ws, ...cleanPlayer } = player;
  return cleanPlayer;
}

function sanitizePlayers(players) {
  const cleanPlayers = {};
  for (const id in players) {
    cleanPlayers[id] = sanitizePlayer(players[id]);
  }
  return cleanPlayers;
}

function broadcastToRoom(roomCode, data, excludeId = null) {
  if (!rooms[roomCode]) return;

  const str = JSON.stringify(data);

  for (let id in rooms[roomCode].players) {
    if (id !== excludeId) {
      try {
        rooms[roomCode].players[id].ws.send(str);
      } catch (error) {
        console.error(`Error sending to player ${id}:`, error);
      }
    }
  }
}
function scheduleNextBooster(roomCode) {
  if (!rooms[roomCode] || !rooms[roomCode].gameRunning) return;

  if (rooms[roomCode].boosterTimer) {
    clearTimeout(rooms[roomCode].boosterTimer);
  }

  const nextBoosterDelay =
    Math.random() * 10000 + BOOSTER_SPAWN_INTERVAL * 1000;
  rooms[roomCode].boosterTimer = setTimeout(() => {
    createBooster(roomCode);
    scheduleNextBooster(roomCode);
  }, nextBoosterDelay);
}
function startGame(roomCode) {
  if (!rooms[roomCode] || rooms[roomCode].gameRunning) return;

  rooms[roomCode].gameRunning = true;
  rooms[roomCode].gameTime = GAME_DURATION;

  for (let id in rooms[roomCode].players) {
    rooms[roomCode].players[id].score = 0;
    rooms[roomCode].players[id].speedboosted = false;
  }

  const playerIds = Object.keys(rooms[roomCode].players);
  rooms[roomCode].taggerId =
    playerIds[Math.floor(Math.random() * playerIds.length)];

  for (let id in rooms[roomCode].players) {
    rooms[roomCode].players[id].color =
      id === rooms[roomCode].taggerId ? "#e74c3c" : getRandomColor();
  }
  const initialBoosterDelay = Math.random() * 5000 + 5000;
  rooms[roomCode].boosterTimer = setTimeout(() => {
    createBooster(roomCode);
    scheduleNextBooster(roomCode);
  }, initialBoosterDelay);

  broadcastToRoom(roomCode, {
    type: "gameStarted",
    taggerId: rooms[roomCode].taggerId,
    time: rooms[roomCode].gameTime,
    players: sanitizePlayers(rooms[roomCode].players),
  });

  rooms[roomCode].gameInterval = setInterval(() => {
    if (!rooms[roomCode]) {
      clearInterval(rooms[roomCode].gameInterval);
      return;
    }

    rooms[roomCode].gameTime--;

    broadcastToRoom(roomCode, {
      type: "timer",
      time: rooms[roomCode].gameTime,
    });

    if (rooms[roomCode].gameTime <= 0) {
      endGame(roomCode, "Time's up");
    }
  }, 1000);
}

function endGame(roomCode, reason) {
  if (!rooms[roomCode] || !rooms[roomCode].gameRunning) return;

  clearInterval(rooms[roomCode].gameInterval);

  if (rooms[roomCode].boosterTimer) {
    clearTimeout(rooms[roomCode].boosterTimer);
  }

  if (rooms[roomCode].boosterTimeout) {
    clearTimeout(rooms[roomCode].boosterTimeout);
  }

  if (rooms[roomCode].currentBooster) {
    delete rooms[roomCode].currentBooster;
  }
  rooms[roomCode].gameRunning = false;

  const scores = {};
  for (let id in rooms[roomCode].players) {
    scores[id] = {
      name: rooms[roomCode].players[id].name,
      score: rooms[roomCode].players[id].score,
    };
  }

  let highestScore = -1;
  let winners = [];

  for (let id in scores) {
    if (scores[id].score > highestScore) {
      highestScore = scores[id].score;
      winners = [id];
    } else if (scores[id].score === highestScore) {
      winners.push(id);
    }
  }

  broadcastToRoom(roomCode, {
    type: "gameOver",
    reason,
    scores,
    winners,
    winnerNames: winners.map(
      (id) => rooms[roomCode].players[id]?.name || "Unknown"
    ),
  });

  rooms[roomCode].gameTime = GAME_DURATION;
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
