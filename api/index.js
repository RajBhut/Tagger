import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("public"));
app.use(cors({ origin: "*" }));
// Game state
let gameTime = 30;
let gameInterval;
let gameRunning = false;
let players = {};
let taggerId = null;
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

// Connection handler
wss.on("connection", (ws) => {
  const id = Math.random().toString(36).slice(2);

  // Initialize player
  players[id] = {
    x: Math.random() * (CANVAS_WIDTH - PLAYER_SIZE * 2) + PLAYER_SIZE,
    y: Math.random() * (CANVAS_HEIGHT - PLAYER_SIZE * 2) + PLAYER_SIZE,
    color: getRandomColor(),
    ws,
    name: "Player",
    score: 0,
  };

  // Assign tagger if none exists
  if (!taggerId) {
    taggerId = id;
    players[id].color = "#e74c3c"; // Red for tagger
  }

  // Send initial game state to the new player
  ws.send(
    JSON.stringify({
      type: "init",
      id,
      players: sanitizePlayers(players),
      taggerId,
      gameRunning,
      gameTime,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
    })
  );

  // Notify other players about the new player
  broadcast(
    {
      type: "newPlayer",
      id,
      data: sanitizePlayer(players[id]),
    },
    id
  );

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "start") {
        console.log(
          `Player requested game start. Players: ${
            Object.keys(players).length
          }, Game running: ${gameRunning}`
        );
        if (Object.keys(players).length >= 2 && !gameRunning) {
          startGame();
        } else if (gameRunning) {
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
        if (players[id]) {
          const sanitizedName = (data.name || "Player").substring(0, 15).trim();
          players[id].name = sanitizedName || "Player";
          broadcast({
            type: "playerUpdate",
            id,
            data: sanitizePlayer(players[id]),
          });
        }
        return;
      }

      // Handle player movement
      if (data.type === "move" && players[id]) {
        // Constrain player within boundaries
        players[id].x = Math.max(
          PLAYER_SIZE,
          Math.min(CANVAS_WIDTH - PLAYER_SIZE, data.x)
        );
        players[id].y = Math.max(
          PLAYER_SIZE,
          Math.min(CANVAS_HEIGHT - PLAYER_SIZE, data.y)
        );

        // Check for tag
        if (id === taggerId && gameRunning) {
          for (let pid in players) {
            if (pid !== taggerId) {
              const dx = players[pid].x - players[id].x;
              const dy = players[pid].y - players[id].y;
              const distance = Math.hypot(dx, dy);

              if (distance < PLAYER_SIZE * 1.5) {
                // Tag player
                players[taggerId].color = getRandomColor();
                players[taggerId].score += 1;
                taggerId = pid;
                players[pid].color = "#e74c3c"; // Red for tagger

                broadcast({
                  type: "tagUpdate",
                  previousTagger: id,
                  taggerId,
                  players: sanitizePlayers(players),
                });

                broadcast({
                  type: "tagged",
                  tagger: players[id].name,
                  tagged: players[pid].name,
                });

                break;
              }
            }
          }
        }

        broadcast({
          type: "playerMoved",
          id,
          data: sanitizePlayer(players[id]),
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  // Disconnect handler
  ws.on("close", () => {
    // Remove player
    delete players[id];

    // Reassign tagger if needed
    if (taggerId === id) {
      const playerIds = Object.keys(players);
      if (playerIds.length > 0) {
        taggerId = playerIds[0];
        players[taggerId].color = "#e74c3c"; // Red for tagger
        broadcast({
          type: "tagUpdate",
          previousTagger: id,
          taggerId,
          players: sanitizePlayers(players),
        });
      } else {
        taggerId = null;
        // End game if less than 2 players
        if (gameRunning) {
          endGame("Not enough players");
        }
      }
    }

    broadcast({ type: "playerDisconnected", id });

    // End game if less than 2 players
    if (gameRunning && Object.keys(players).length < 2) {
      endGame("Not enough players");
    }
  });
});

// Remove websocket references before sending to clients
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

// Broadcast message to all or all except one
function broadcast(data, excludeId = null) {
  const str = JSON.stringify(data);

  for (let id in players) {
    if (id !== excludeId) {
      try {
        players[id].ws.send(str);
      } catch (error) {
        console.error(`Error sending to player ${id}:`, error);
      }
    }
  }
}

// Start game logic
function startGame() {
  if (gameRunning) return;

  gameRunning = true;
  gameTime = GAME_DURATION;

  // Reset scores
  for (let id in players) {
    players[id].score = 0;
  }

  // Randomly select tagger
  const playerIds = Object.keys(players);
  taggerId = playerIds[Math.floor(Math.random() * playerIds.length)];

  // Update colors
  for (let id in players) {
    players[id].color = id === taggerId ? "#e74c3c" : getRandomColor();
  }

  // Broadcast game start
  broadcast({
    type: "gameStarted",
    taggerId,
    time: gameTime,
    players: sanitizePlayers(players),
  });

  // Start game timer
  gameInterval = setInterval(() => {
    gameTime--;

    // Send timer update
    broadcast({ type: "timer", time: gameTime });

    // End game when time runs out
    if (gameTime <= 0) {
      endGame("Time's up");
    }
  }, 1000);
}

// End game logic
function endGame(reason) {
  clearInterval(gameInterval);

  if (!gameRunning) return;
  gameRunning = false;

  // Calculate results
  const scores = {};
  for (let id in players) {
    scores[id] = {
      name: players[id].name,
      score: players[id].score,
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

  broadcast({
    type: "gameOver",
    reason,
    scores,
    winners,
    winnerNames: winners.map((id) => players[id]?.name || "Unknown"),
  });

  // Reset game state
  gameTime = GAME_DURATION;
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
