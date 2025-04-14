// import express from "express";
// import http from "http";
// import { WebSocketServer } from "ws";
// import cors from "cors";
// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// let tagcooldown = false;
// app.use(express.static("public"));
// app.use(cors({ origin: "*" }));
// // Game state
// let gameTime = 30;
// let gameInterval;
// let gameRunning = false;
// let players = {};
// let taggerId = null;
// const GAME_DURATION = 60;
// const CANVAS_WIDTH = 800;
// const CANVAS_HEIGHT = 600;
// const PLAYER_SIZE = 30;

// function getRandomColor() {
//   const colors = [
//     "#3498db",
//     "#2ecc71",
//     "#9b59b6",
//     "#f1c40f",
//     "#e67e22",
//     "#1abc9c",
//   ];
//   return colors[Math.floor(Math.random() * colors.length)];
// }

// wss.on("connection", (ws) => {
//   const id = Math.random().toString(36).slice(2);

//   players[id] = {
//     x: Math.random() * (CANVAS_WIDTH - PLAYER_SIZE * 2) + PLAYER_SIZE,
//     y: Math.random() * (CANVAS_HEIGHT - PLAYER_SIZE * 2) + PLAYER_SIZE,
//     color: getRandomColor(),
//     ws,
//     name: "Player",
//     score: 0,
//   };

//   if (!taggerId) {
//     taggerId = id;
//     players[id].color = "#e74c3c";
//   }

//   ws.send(
//     JSON.stringify({
//       type: "init",
//       id,
//       players: sanitizePlayers(players),
//       taggerId,
//       gameRunning,
//       gameTime,
//       canvasWidth: CANVAS_WIDTH,
//       canvasHeight: CANVAS_HEIGHT,
//     })
//   );

//   broadcast(
//     {
//       type: "newPlayer",
//       id,
//       data: sanitizePlayer(players[id]),
//     },
//     id
//   );

//   ws.on("message", (msg) => {
//     try {
//       const data = JSON.parse(msg);

//       if (data.type === "start") {
//         console.log(
//           `Player requested game start. Players: ${
//             Object.keys(players).length
//           }, Game running: ${gameRunning}`
//         );
//         if (Object.keys(players).length >= 2 && !gameRunning) {
//           startGame();
//         } else if (gameRunning) {
//           ws.send(
//             JSON.stringify({
//               type: "notification",
//               message: "Game is already in progress",
//             })
//           );
//         } else {
//           ws.send(
//             JSON.stringify({
//               type: "notification",
//               message: "Need at least 2 players to start",
//             })
//           );
//         }
//         return;
//       }

//       if (data.type === "setName") {
//         if (players[id]) {
//           const sanitizedName = (data.name || "Player").substring(0, 15).trim();
//           players[id].name = sanitizedName || "Player";
//           broadcast({
//             type: "playerUpdate",
//             id,
//             data: sanitizePlayer(players[id]),
//           });
//         }
//         return;
//       }

//       if (data.type === "move" && players[id]) {
//         players[id].x = Math.max(
//           PLAYER_SIZE,
//           Math.min(CANVAS_WIDTH - PLAYER_SIZE, data.x)
//         );
//         players[id].y = Math.max(
//           PLAYER_SIZE,
//           Math.min(CANVAS_HEIGHT - PLAYER_SIZE, data.y)
//         );

//         if (id === taggerId && gameRunning) {
//           for (let pid in players) {
//             if (pid !== taggerId) {
//               const dx = players[pid].x - players[id].x;
//               const dy = players[pid].y - players[id].y;
//               const distance = Math.hypot(dx, dy);

//               if (distance < PLAYER_SIZE * 1.5 && !tagcooldown) {
//                 players[taggerId].color = getRandomColor();
//                 players[taggerId].score += 1;
//                 taggerId = pid;
//                 players[pid].color = "#e74c3c";

//                 broadcast({
//                   type: "tagUpdate",
//                   previousTagger: id,
//                   taggerId,
//                   players: sanitizePlayers(players),
//                 });

//                 broadcast({
//                   type: "tagged",
//                   tagger: players[id].name,
//                   tagged: players[pid].name,
//                 });
//                 tagcooldown = true;

//                 setTimeout(() => {
//                   tagcooldown = false;
//                 }, 10000);
//                 break;
//               }
//             }
//           }
//         }

//         broadcast({
//           type: "playerMoved",
//           id,
//           data: sanitizePlayer(players[id]),
//         });
//       }
//     } catch (error) {
//       console.error("Error processing message:", error);
//     }
//   });

//   ws.on("close", () => {
//     delete players[id];

//     if (taggerId === id) {
//       const playerIds = Object.keys(players);
//       if (playerIds.length > 0) {
//         taggerId = playerIds[0];
//         players[taggerId].color = "#e74c3c";
//         broadcast({
//           type: "tagUpdate",
//           previousTagger: id,
//           taggerId,
//           players: sanitizePlayers(players),
//         });
//       } else {
//         taggerId = null;

//         if (gameRunning) {
//           endGame("Not enough players");
//         }
//       }
//     }

//     broadcast({ type: "playerDisconnected", id });

//     // End game if less than 2 players
//     if (gameRunning && Object.keys(players).length < 2) {
//       endGame("Not enough players");
//     }
//   });
// });

// function sanitizePlayer(player) {
//   const { ws, ...cleanPlayer } = player;
//   return cleanPlayer;
// }

// function sanitizePlayers(players) {
//   const cleanPlayers = {};
//   for (const id in players) {
//     cleanPlayers[id] = sanitizePlayer(players[id]);
//   }
//   return cleanPlayers;
// }

// function broadcast(data, excludeId = null) {
//   const str = JSON.stringify(data);

//   for (let id in players) {
//     if (id !== excludeId) {
//       try {
//         players[id].ws.send(str);
//       } catch (error) {
//         console.error(`Error sending to player ${id}:`, error);
//       }
//     }
//   }
// }

// function startGame() {
//   if (gameRunning) return;

//   gameRunning = true;
//   gameTime = GAME_DURATION;

//   for (let id in players) {
//     players[id].score = 0;
//   }

//   const playerIds = Object.keys(players);
//   taggerId = playerIds[Math.floor(Math.random() * playerIds.length)];

//   for (let id in players) {
//     players[id].color = id === taggerId ? "#e74c3c" : getRandomColor();
//   }

//   broadcast({
//     type: "gameStarted",
//     taggerId,
//     time: gameTime,
//     players: sanitizePlayers(players),
//   });

//   gameInterval = setInterval(() => {
//     gameTime--;

//     broadcast({ type: "timer", time: gameTime });

//     if (gameTime <= 0) {
//       endGame("Time's up");
//     }
//   }, 1000);
// }

// function endGame(reason) {
//   clearInterval(gameInterval);

//   if (!gameRunning) return;
//   gameRunning = false;

//   const scores = {};
//   for (let id in players) {
//     scores[id] = {
//       name: players[id].name,
//       score: players[id].score,
//     };
//   }

//   let highestScore = -1;
//   let winners = [];

//   for (let id in scores) {
//     if (scores[id].score > highestScore) {
//       highestScore = scores[id].score;
//       winners = [id];
//     } else if (scores[id].score === highestScore) {
//       winners.push(id);
//     }
//   }

//   broadcast({
//     type: "gameOver",
//     reason,
//     scores,
//     winners,
//     winnerNames: winners.map((id) => players[id]?.name || "Unknown"),
//   });

//   gameTime = GAME_DURATION;
// }

// // Start the server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () =>
//   console.log(`Server running on http://localhost:${PORT}`)
// );

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.static("public"));
app.use(cors({ origin: "*" }));

// Game state - organized by rooms
const rooms = {};

// Constants
const GAME_DURATION = 60;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 30;

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

// Generate a random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on("connection", (ws) => {
  const playerId = Math.random().toString(36).slice(2);
  let playerRoom = null;

  // Initialize the connection
  ws.send(
    JSON.stringify({
      type: "welcome",
      playerId,
    })
  );

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // Handle room creation
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

        // Add the player to the room as host
        rooms[roomCode].players[playerId] = {
          x: Math.random() * (CANVAS_WIDTH - PLAYER_SIZE * 2) + PLAYER_SIZE,
          y: Math.random() * (CANVAS_HEIGHT - PLAYER_SIZE * 2) + PLAYER_SIZE,
          color: getRandomColor(),
          ws,
          name: data.name || "Host",
          score: 0,
          isHost: true,
        };

        // Confirm room creation to client
        ws.send(
          JSON.stringify({
            type: "roomCreated",
            roomCode,
            isHost: true,
          })
        );

        return;
      }

      // Handle room joining
      if (data.type === "joinRoom") {
        const roomCode = data.roomCode;

        // Check if room exists
        if (!rooms[roomCode]) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room not found",
            })
          );
          return;
        }

        // Check if game is in progress
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

        // Add player to room
        rooms[roomCode].players[playerId] = {
          x: Math.random() * (CANVAS_WIDTH - PLAYER_SIZE * 2) + PLAYER_SIZE,
          y: Math.random() * (CANVAS_HEIGHT - PLAYER_SIZE * 2) + PLAYER_SIZE,
          color: getRandomColor(),
          ws,
          name: data.name || "Player",
          score: 0,
          isHost: false,
        };

        // Set tagger if this is first player
        if (!rooms[roomCode].taggerId) {
          rooms[roomCode].taggerId = playerId;
          rooms[roomCode].players[playerId].color = "#e74c3c";
        }

        // Send room state to the new player
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

        // Notify other players about the new player
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

      // Handle kick player (host only)
      if (data.type === "kickPlayer") {
        if (!playerRoom || !rooms[playerRoom]) return;

        // Verify sender is host
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

        // Can't kick yourself
        if (targetId === playerId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "You can't kick yourself",
            })
          );
          return;
        }

        // Check if target exists
        if (!rooms[playerRoom].players[targetId]) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Player not found",
            })
          );
          return;
        }

        // Notify the player they've been kicked
        try {
          rooms[playerRoom].players[targetId].ws.send(
            JSON.stringify({
              type: "kicked",
              message: "You've been removed from the game by the host",
            })
          );

          // Close their connection
          rooms[playerRoom].players[targetId].ws.close();
        } catch (error) {
          console.log("Error notifying kicked player", error);
        }

        // Handle tagger reassignment if needed
        if (rooms[playerRoom].taggerId === targetId) {
          handlePlayerLeaving(targetId, playerRoom);
        } else {
          // Remove player from room
          delete rooms[playerRoom].players[targetId];

          // Notify remaining players
          broadcastToRoom(playerRoom, {
            type: "playerKicked",
            id: targetId,
          });
        }

        return;
      }

      // Ensure player is in a room for all other requests
      if (!playerRoom || !rooms[playerRoom]) return;

      // Handle game start
      if (data.type === "start") {
        // Only host can start the game
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

      // Handle name setting
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

      // Handle player movement
      if (data.type === "move" && rooms[playerRoom].players[playerId]) {
        // Update position
        rooms[playerRoom].players[playerId].x = Math.max(
          PLAYER_SIZE,
          Math.min(CANVAS_WIDTH - PLAYER_SIZE, data.x)
        );
        rooms[playerRoom].players[playerId].y = Math.max(
          PLAYER_SIZE,
          Math.min(CANVAS_HEIGHT - PLAYER_SIZE, data.y)
        );

        // Handle tagging
        if (
          playerId === rooms[playerRoom].taggerId &&
          rooms[playerRoom].gameRunning
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
                !rooms[playerRoom].tagcooldown
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
                    // Check if room still exists
                    rooms[playerRoom].tagcooldown = false;
                  }
                }, 1000); // 1 second cooldown
                break;
              }
            }
          }
        }

        // Broadcast movement
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

// Handle player leaving game
function handlePlayerLeaving(playerId, roomCode) {
  if (!rooms[roomCode] || !rooms[roomCode].players[playerId]) return;

  // If player was host, assign a new host or close room
  if (playerId === rooms[roomCode].hostId) {
    const remainingPlayers = Object.keys(rooms[roomCode].players).filter(
      (id) => id !== playerId
    );

    if (remainingPlayers.length > 0) {
      // Assign new host
      const newHostId = remainingPlayers[0];
      rooms[roomCode].hostId = newHostId;
      rooms[roomCode].players[newHostId].isHost = true;

      // Notify players about new host
      broadcastToRoom(roomCode, {
        type: "newHost",
        id: newHostId,
        name: rooms[roomCode].players[newHostId].name,
      });
    } else {
      // No players left, clean up the room
      if (rooms[roomCode].gameInterval) {
        clearInterval(rooms[roomCode].gameInterval);
      }
      delete rooms[roomCode];
      return;
    }
  }

  // If player was the tagger, assign a new tagger
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

  // Remove player from room
  delete rooms[roomCode].players[playerId];

  // Notify other players
  broadcastToRoom(roomCode, {
    type: "playerDisconnected",
    id: playerId,
  });

  // End game if less than 2 players
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

function startGame(roomCode) {
  if (!rooms[roomCode] || rooms[roomCode].gameRunning) return;

  rooms[roomCode].gameRunning = true;
  rooms[roomCode].gameTime = GAME_DURATION;

  // Reset scores
  for (let id in rooms[roomCode].players) {
    rooms[roomCode].players[id].score = 0;
  }

  // Choose random tagger
  const playerIds = Object.keys(rooms[roomCode].players);
  rooms[roomCode].taggerId =
    playerIds[Math.floor(Math.random() * playerIds.length)];

  // Set colors
  for (let id in rooms[roomCode].players) {
    rooms[roomCode].players[id].color =
      id === rooms[roomCode].taggerId ? "#e74c3c" : getRandomColor();
  }

  broadcastToRoom(roomCode, {
    type: "gameStarted",
    taggerId: rooms[roomCode].taggerId,
    time: rooms[roomCode].gameTime,
    players: sanitizePlayers(rooms[roomCode].players),
  });

  // Start game timer
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
  rooms[roomCode].gameRunning = false;

  // Calculate scores
  const scores = {};
  for (let id in rooms[roomCode].players) {
    scores[id] = {
      name: rooms[roomCode].players[id].name,
      score: rooms[roomCode].players[id].score,
    };
  }

  // Find winner(s)
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
