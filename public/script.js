const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const ws = new WebSocket(`ws://${location.host}`);

let players = {};
let myId = null;
let gameTime = 30;
const speed = 5;
const NAME = prompt("Enter Your name");
ws.onopen = () => {
  ws.send(JSON.stringify({ type: "setName", NAME }));
};
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  console.log(data.type);
  switch (data.type) {
    case "init":
      myId = data.id;
      players = data.players;
      players[myId].ws = undefined;
      break;
    case "timer":
      gameTime = data.time;
      break;
    case "gameOver":
      console.log(data.result);
      alert(data.result === "Winner" ? "You Win! " : "You Lose!!!");

      gameTime = 30;
      break;
    case "newPlayer":
      players[data.id] = data.data;
      break;
    case "playerMoved":
      players[data.id] = data.data;
      break;
    case "tagUpdate":
      for (let id in players) players[id].color = "blue";
      if (players[data.taggerId]) players[data.taggerId].color = "red";
      break;
    case "playerDisconnected":
      delete players[data.id];
      break;
  }
};

document.addEventListener("keydown", (e) => {
  if (!myId || !players[myId]) return;
  const p = players[myId];

  switch (e.key) {
    case "ArrowUp":
      p.y -= speed;
      break;
    case "ArrowDown":
      p.y += speed;
      break;
    case "ArrowLeft":
      p.x -= speed;
      break;
    case "ArrowRight":
      p.x += speed;
      break;
  }

  ws.send(
    JSON.stringify({
      type: "move",
      x: p.x,
      y: p.y,
    })
  );
});

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText(`Timer ${gameTime} `, 10, 20);
  for (let id in players) {
    const p = players[id];

    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 20, 20);
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    if (id == myId) {
      ctx.fillText("Me", p.x, p.y - 5);
    } else {
      let name = p.name || "Lazy";
      ctx.fillText(name, p.x, p.y - 5);
    }
  }
}
draw();

const run = () => {
  if (gameTime != 30) {
    console.log("game alredy started");
    return;
  }

  ws.send(JSON.stringify({ type: "start" }));
};
