import { Console } from "console";
import express from "express";
import http from "http";
import { json } from "stream/consumers";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("public"));
let gameTime = 30;
let gameInterval;
let gameRunning = false;
let players = {};
let taggerId = null;

wss.on("connection", (ws) => {
  const id = Math.random().toString(36).slice(2);
  players[id] = {
    x: Math.random() * 400,
    y: Math.random() * 400,
    color: "blue",
    ws,
    name: "Lazzy",
  };

  if (!taggerId) {
    taggerId = id;
    players[id].color = "red";
  }

  ws.send(JSON.stringify({ type: "init", id, players, taggerId }));

  broadcast(
    {
      type: "newPlayer",
      id,
      data: players[id],
    },
    id
  );

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    if (data.type === "start") {
      console.log(
        "player presed start button with plyers are " +
          Object.keys(players).length +
          "and game is Running is equal to " +
          gameRunning
      );
      if (Object.keys(players).length >= 2 && !gameRunning) {
        startgame(id);
      }
    }

    if (data.type === "setName") {
      if (players[id]) {
        console.log(data);
        players[id].name = data.NAME || "Lazy";
      }
      return;
    }

    if (data.type === "move" && Object.keys(players).length > 0) {
      players[id].x = data.x;
      players[id].y = data.y;

      if (id === taggerId) {
        for (let pid in players) {
          if (pid !== taggerId) {
            const dx = players[pid].x - players[id].x;
            const dy = players[pid].y - players[id].y;
            if (Math.hypot(dx, dy) < 25) {
              players[pid].color = "red";
              players[taggerId].color = "blue";
              taggerId = pid;
              broadcast({ type: "tagUpdate", taggerId });
              break;
            }
          }
        }
      }

      broadcast({ type: "playerMoved", id, data: players[id] });
    }
  });

  ws.on("close", () => {
    delete players[id];
    if (taggerId === id) {
      taggerId = Object.keys(players)[0] || null;
      if (taggerId) players[taggerId].color = "red";
    }
    broadcast({ type: "playerDisconnected", id });
  });
});

function broadcast(data, excludeId) {
  const str = JSON.stringify(data);

  for (let id in players) {
    if (id !== excludeId) {
      players[id].ws.send(str);
    }
  }
}

function startgame() {
  gameRunning = true;
  gameTime = 5;
  gameInterval = setInterval(() => {
    gameTime--;

    broadcast({ type: "timer", time: gameTime }, null);
    if (gameTime <= 0 || Object.keys(players).length <= 1) {
      clearInterval(gameInterval);
      gameRunning = false;

      let LoserId = Object.keys(players).filter(
        (id) => players[id].color == "red"
      );

      for (let d in players) {
        let msg =
          d == LoserId
            ? { type: "gameOver", result: "Loser" }
            : { type: "gameOver", result: "Winner" };

        players[d].ws.send(JSON.stringify(msg));
      }
    }
  }, 1000);
}

server.listen(3000, () => console.log("Listening on http://localhost:3000"));
