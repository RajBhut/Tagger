const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const setNameBtn = document.getElementById("setNameBtn");
const playerNameInput = document.getElementById("playerName");
const timerValue = document.getElementById("timer-value");
const statusMessage = document.getElementById("status-message");
const playersList = document.getElementById("players-list");
const notificationElement = document.getElementById("notification");
const gameOverModal = document.getElementById("gameOver");
const gameOverReason = document.getElementById("gameOverReason");
const gameOverScores = document.getElementById("gameOverScores");
const winnerElement = document.getElementById("winner");
const closeModalBtn = document.getElementById("closeModal");

const welcomeScreen = document.getElementById("welcome-screen");
const gameScreen = document.getElementById("game-screen");
const createNameInput = document.getElementById("createName");
const joinNameInput = document.getElementById("joinName");
const roomCodeInput = document.getElementById("roomCode");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const currentRoomCode = document.getElementById("current-room-code");
const copyCodeBtn = document.getElementById("copy-code-btn");

const kickPlayerModal = document.getElementById("kickPlayerModal");
const kickPlayersList = document.getElementById("kickPlayersList");
const confirmKickBtn = document.getElementById("confirmKickBtn");
const cancelKickBtn = document.getElementById("cancelKickBtn");
const msginput = document.getElementById("msg");

let ws;
let players = {};
let myId = null;
let taggerId = null;
let gameRunning = false;
let gameTime = 60;
let canvasWidth = 800;
let canvasHeight = 600;
let keys = {};
let lastUpdateTime = 0;
let isHost = false;
let currentRoom = null;
let selectedPlayerToKick = null;
let chatcool = false;
let currentBooster = null;
let boostedPlayers = {};
const BOOSTER_SIZE = 20;
const PLAYER_SIZE = 30;
const FRAME_RATE = 60;
const UPDATE_INTERVAL = 1000 / FRAME_RATE;
const movementSpeed = 5;

const directionPressed = {
  up: false,
  down: false,
  left: false,
  right: false,
};

function initApp() {
  createRoomBtn.addEventListener("click", createRoom);
  joinRoomBtn.addEventListener("click", joinRoom);
  copyCodeBtn.addEventListener("click", copyRoomCodeToClipboard);

  confirmKickBtn.addEventListener("click", confirmKickPlayer);
  cancelKickBtn.addEventListener("click", () => {
    kickPlayerModal.classList.add("hidden");
  });

  welcomeScreen.classList.remove("hidden");

  gameScreen.classList.add("hidden");
  createSoundPanel();
  createNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && createNameInput.value.trim()) {
      createRoom();
    }
  });

  joinNameInput.addEventListener("keypress", (e) => {
    if (
      e.key === "Enter" &&
      joinNameInput.value.trim() &&
      roomCodeInput.value.trim()
    ) {
      joinRoom();
    }
  });

  roomCodeInput.addEventListener("keypress", (e) => {
    if (
      e.key === "Enter" &&
      joinNameInput.value.trim() &&
      roomCodeInput.value.trim()
    ) {
      joinRoom();
    }
  });

  roomCodeInput.addEventListener("input", () => {
    roomCodeInput.value = roomCodeInput.value.toUpperCase();
  });
}

function createRoom() {
  const name = createNameInput.value.trim();
  if (!name) {
    showNotification("Please enter your name");
    return;
  }

  connectToServer(() => {
    ws.send(
      JSON.stringify({
        type: "createRoom",
        name,
      })
    );
  });
}

function joinRoom() {
  const name = joinNameInput.value.trim();
  const roomCode = roomCodeInput.value.trim();

  if (!name) {
    showNotification("Please enter your name");
    return;
  }

  if (!roomCode) {
    showNotification("Please enter a room code");
    return;
  }

  connectToServer(() => {
    ws.send(
      JSON.stringify({
        type: "joinRoom",
        name,
        roomCode,
      })
    );
  });
}

// Copy room code to clipboard
function copyRoomCodeToClipboard() {
  if (!currentRoom) return;

  navigator.clipboard
    .writeText(currentRoom)
    .then(() => {
      showNotification("Room code copied to clipboard!");
    })
    .catch((err) => {
      showNotification("Failed to copy room code");
      console.error("Could not copy text: ", err);
    });
}

function openKickPlayerModal() {
  if (!isHost) return;

  kickPlayersList.innerHTML = "";

  for (let id in players) {
    if (id !== myId) {
      const player = players[id];
      const playerElement = document.createElement("div");
      playerElement.className = "kick-player-item";
      playerElement.dataset.playerId = id;

      const colorBox = document.createElement("div");
      colorBox.className = "player-color";
      colorBox.style.backgroundColor = player.color;

      const nameElement = document.createElement("div");
      nameElement.className = "player-name";
      nameElement.textContent = player.name;

      const kickButton = document.createElement("button");
      kickButton.className = "kick-btn";
      kickButton.textContent = "×";
      kickButton.onclick = () => selectPlayerToKick(id);

      playerElement.appendChild(colorBox);
      playerElement.appendChild(nameElement);
      playerElement.appendChild(kickButton);

      kickPlayersList.appendChild(playerElement);
    }
  }

  // Show modal
  kickPlayerModal.classList.remove("hidden");
}

// Select player to kick
function selectPlayerToKick(playerId) {
  selectedPlayerToKick = playerId;

  // Highlight selected player
  const playerItems = document.querySelectorAll(".kick-player-item");
  playerItems.forEach((item) => {
    if (item.dataset.playerId === playerId) {
      item.classList.add("selected");
    } else {
      item.classList.remove("selected");
    }
  });
}

function confirmKickPlayer() {
  if (!selectedPlayerToKick || !isHost) return;

  ws.send(
    JSON.stringify({
      type: "kickPlayer",
      playerId: selectedPlayerToKick,
    })
  );

  kickPlayerModal.classList.add("hidden");
  selectedPlayerToKick = null;
}

function connectToServer(callback) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("Connected to server");
    if (callback) callback();
  };

  ws.onclose = () => {
    showNotification("Connection lost. Reconnecting...");
    setTimeout(() => connectToServer(callback), 3000);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    showNotification("Connection error. Please refresh the page.");
  };

  ws.onmessage = handleMessage;
}

function initGame() {
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  welcomeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  setupEventListeners();
  gameLoop();
}

function handleMessage(msg) {
  try {
    const data = JSON.parse(msg.data);

    switch (data.type) {
      case "welcome":
        myId = data.playerId;
        break;

      case "roomCreated":
        currentRoom = data.roomCode;
        currentRoomCode.textContent = data.roomCode;
        isHost = data.isHost;

        playerNameInput.value = createNameInput.value;

        initGame();
        break;

      case "error":
        showNotification(data.message);
        break;
      case "msg":
        showNotification(data.data);
        break;
      case "boosterSpawned":
        currentBooster = data.booster;

        playSound("powerup");
        break;

      case "boosterCollected":
        currentBooster = null;
        showNotification(
          `${data.playerName} collected a ${data.boosterType} booster!`
        );
        playSound("powerup");
        break;

      case "boosterRemoved":
        currentBooster = null;
        break;

      case "playerBoosted":
        boostedPlayers[data.playerId] = {
          type: data.boosterType,
          endTime: Date.now() + data.duration * 1000,
        };

        if (data.playerId === myId) {
          if (data.boosterType === "speed") {
            showNotification(`Speed boost activated! (${data.duration}s)`);
          } else if (data.boosterType === "shield") {
            showNotification(`Shield activated! (${data.duration}s)`);
          } else if (data.boosterType === "frozen") {
            showNotification(`You've been frozen! (${data.duration}s)`);
          }
        }

        break;

      case "boostEnded":
        delete boostedPlayers[data.playerId];

        if (data.playerId === myId) {
          if (data.boosterType === "speed") {
            showNotification("Speed boost ended");
          } else if (data.boosterType === "shield") {
            showNotification("Shield deactivated");
          } else if (data.boosterType === "frozen") {
            showNotification("You're unfrozen");
          }
        }
        break;

      case "massFreeze":
        if (data.initiator !== myId && myId !== taggerId) {
          showNotification(
            `${players[data.initiator].name} froze everyone! (${
              data.duration
            }s)`
          );
        } else if (data.initiator === myId) {
          showNotification(`You froze all players! (${data.duration}s)`);
        }
        break;

      case "init":
        myId = data.id;
        players = data.players;
        taggerId = data.taggerId;
        gameRunning = data.gameRunning;
        gameTime = data.gameTime;
        canvasWidth = data.canvasWidth;
        canvasHeight = data.canvasHeight;
        isHost = data.isHost;
        currentRoom = data.roomCode;
        currentRoomCode.textContent = data.roomCode;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        timerValue.textContent = gameTime;
        updatePlayersList();

        initGame();

        if (gameRunning) {
          startBtn.disabled = true;
          statusMessage.textContent = "Game in progress";
        }
        break;

      case "newPlayer":
        players[data.id] = data.data;
        updatePlayersList();
        break;

      case "playerMoved":
        if (players[data.id]) {
          players[data.id] = data.data;
        }
        break;

      case "sound":
        playSound(data.id);
        break;

      case "playerUpdate":
        if (players[data.id]) {
          players[data.id] = data.data;
          updatePlayersList();
        }
        break;

      case "tagUpdate":
        handleTagUpdate(data);
        break;

      case "tagged":
        showNotification(`${data.tagger} tagged ${data.tagged}!`);

        break;

      case "playerDisconnected":
        delete players[data.id];
        updatePlayersList();
        break;

      case "playerKicked":
        delete players[data.id];
        updatePlayersList();
        showNotification(
          `${players[data.id]?.name || "A player"} was removed from the game`
        );
        break;

      case "kicked":
        showNotification(data.message);
        // Reset and show welcome screen after delay
        setTimeout(() => {
          players = {};
          myId = null;
          taggerId = null;
          gameRunning = false;
          currentRoom = null;
          welcomeScreen.classList.remove("hidden");
          gameScreen.classList.add("hidden");
        }, 3000);
        break;

      case "newHost":
        showNotification(`${players[data.id]?.name} is now the host`);
        if (data.id === myId) {
          isHost = true;
          showNotification("You are now the host");
        }
        updatePlayersList();
        break;

      case "timer":
        gameTime = data.time;
        timerValue.textContent = data.time;
        break;

      case "gameStarted":
        handleGameStarted(data);
        break;

      case "gameOver":
        handleGameOver(data);
        break;

      case "notification":
        showNotification(data.message);
        break;
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
}

function handleTagUpdate(data) {
  taggerId = data.taggerId;

  if (data.players) {
    players = data.players;
  } else {
    for (let id in players) {
      players[id].color = id === taggerId ? "#e74c3c" : players[id].color;
    }
  }

  updatePlayersList();

  if (taggerId === myId) {
    showNotification("You are now IT! Chase other players!");
    playSound("youreIt");
  }
}

function handleGameStarted(data) {
  gameRunning = true;
  gameTime = data.time;
  taggerId = data.taggerId;
  players = data.players;

  timerValue.textContent = gameTime;
  statusMessage.textContent = "Game in progress";
  startBtn.disabled = true;
  updatePlayersList();

  if (taggerId === myId) {
    showNotification("You are IT! Chase other players!");
    playSound("gameStart");
  } else {
    showNotification("Game started! Run from the tagger!");
    playSound("gameStart");
  }
}

function handleGameOver(data) {
  gameRunning = false;
  startBtn.disabled = false;
  statusMessage.textContent = "Game over - Ready to start";

  gameOverReason.textContent = data.reason;

  let scoresHtml =
    "<table class='score-table'><tr><th>Player</th><th>Score</th></tr>";

  const sortedPlayers = Object.entries(data.scores).sort(
    (a, b) => b[1].score - a[1].score
  );

  sortedPlayers.forEach(([id, player]) => {
    const isWinner = data.winners.includes(id);
    const isMe = id === myId;

    scoresHtml += `<tr class="${isWinner ? "winner-row" : ""} ${
      isMe ? "me-row" : ""
    }">
      <td>${player.name}${isMe ? " (You)" : ""}</td>
      <td>${player.score}</td>
    </tr>`;
  });

  scoresHtml += "</table>";
  gameOverScores.innerHTML = scoresHtml;

  if (data.winners.length === 1) {
    const winnerId = data.winners[0];
    const isMe = winnerId === myId;

    if (isMe) {
      winnerElement.textContent = "You win! 🏆";
      playSound("win");
    } else {
      winnerElement.textContent = `${data.winnerNames[0]} wins! 🏆`;
      playSound("lose");
    }
  } else if (data.winners.length > 1) {
    winnerElement.textContent = `It's a tie between ${data.winnerNames.join(
      ", "
    )}! 🏆`;
    playSound("win");
  } else {
    winnerElement.textContent = "No winners this time!";
  }

  gameOverModal.classList.remove("hidden");
}

function setupEventListeners() {
  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
  });

  document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  // Button handlers
  startBtn.addEventListener("click", () => {
    if (!gameRunning && isHost) {
      ws.send(JSON.stringify({ type: "start" }));
    } else if (!isHost) {
      showNotification("Only the host can start the game");
    }
  });

  setNameBtn.addEventListener("click", () => {
    const name = playerNameInput.value.trim();
    if (name) {
      setPlayerName(name);
    }
  });

  playerNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const name = playerNameInput.value.trim();
      if (name) {
        setPlayerName(name);
      }
    }
  });

  closeModalBtn.addEventListener("click", () => {
    gameOverModal.classList.add("hidden");
  });

  createMobileControls();

  window.addEventListener("resize", adjustCanvasSize);
}

function createMobileControls() {
  const mobileControls = document.createElement("div");
  mobileControls.className = "mobile-controls";

  const dPad = document.createElement("div");
  dPad.className = "d-pad";

  const upBtn = document.createElement("button");
  upBtn.id = "up-btn";
  upBtn.className = "control-btn up-btn";
  upBtn.textContent = "↑";

  const middleRow = document.createElement("div");
  middleRow.className = "middle-row";

  const leftBtn = document.createElement("button");
  leftBtn.id = "left-btn";
  leftBtn.className = "control-btn left-btn";
  leftBtn.textContent = "←";

  const rightBtn = document.createElement("button");
  rightBtn.id = "right-btn";
  rightBtn.className = "control-btn right-btn";
  rightBtn.textContent = "→";

  const downBtn = document.createElement("button");
  downBtn.id = "down-btn";
  downBtn.className = "control-btn down-btn";
  downBtn.textContent = "↓";

  middleRow.appendChild(leftBtn);
  middleRow.appendChild(rightBtn);
  dPad.appendChild(upBtn);
  dPad.appendChild(middleRow);
  dPad.appendChild(downBtn);
  mobileControls.appendChild(dPad);

  const gameArea = document.querySelector(".game-area");
  gameArea.appendChild(mobileControls);

  upBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    directionPressed.up = true;
  });
  upBtn.addEventListener("touchend", () => {
    directionPressed.up = false;
  });
  upBtn.addEventListener("mousedown", () => {
    directionPressed.up = true;
  });
  upBtn.addEventListener("mouseup", () => {
    directionPressed.up = false;
  });
  upBtn.addEventListener("mouseleave", () => {
    directionPressed.up = false;
  });

  // Down button
  downBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    directionPressed.down = true;
  });
  downBtn.addEventListener("touchend", () => {
    directionPressed.down = false;
  });
  downBtn.addEventListener("mousedown", () => {
    directionPressed.down = true;
  });
  downBtn.addEventListener("mouseup", () => {
    directionPressed.down = false;
  });
  downBtn.addEventListener("mouseleave", () => {
    directionPressed.down = false;
  });

  leftBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    directionPressed.left = true;
  });
  leftBtn.addEventListener("touchend", () => {
    directionPressed.left = false;
  });
  leftBtn.addEventListener("mousedown", () => {
    directionPressed.left = true;
  });
  leftBtn.addEventListener("mouseup", () => {
    directionPressed.left = false;
  });
  leftBtn.addEventListener("mouseleave", () => {
    directionPressed.left = false;
  });

  rightBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    directionPressed.right = true;
  });
  rightBtn.addEventListener("touchend", () => {
    directionPressed.right = false;
  });
  rightBtn.addEventListener("mousedown", () => {
    directionPressed.right = true;
  });
  rightBtn.addEventListener("mouseup", () => {
    directionPressed.right = false;
  });
  rightBtn.addEventListener("mouseleave", () => {
    directionPressed.right = false;
  });
}

function setPlayerName(name) {
  if (name && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "setName",
        name: name,
      })
    );

    localStorage.setItem("playerName", name);
    showNotification("Name set successfully!");
  }
}

function updatePlayersList() {
  playersList.innerHTML = "";

  for (const id in players) {
    const player = players[id];
    const isMe = id === myId;
    const isTagger = id === taggerId;
    const isPlayerHost = player.isHost;

    const playerElement = document.createElement("div");
    playerElement.className = `player-item ${isMe ? "you" : ""} ${
      isTagger ? "tagger" : ""
    }`;

    const colorElement = document.createElement("div");
    colorElement.className = "player-color";
    colorElement.style.backgroundColor = player.color;

    const nameElement = document.createElement("div");
    nameElement.className = "player-name";
    nameElement.textContent = `${player.name}${isMe ? " (You)" : ""}${
      isTagger ? " (IT)" : ""
    }${isPlayerHost ? " (Host)" : ""}`;

    const scoreElement = document.createElement("div");
    scoreElement.className = "player-score";
    scoreElement.textContent = player.score !== undefined ? player.score : 0;

    if (isHost && !isMe) {
      const kickBtn = document.createElement("button");
      kickBtn.className = "kick-btn";
      kickBtn.textContent = "×";
      kickBtn.title = "Remove player";
      kickBtn.addEventListener("click", () => {
        selectedPlayerToKick = id;
        confirmKickPlayer();
      });
      playerElement.appendChild(kickBtn);
    }

    playerElement.appendChild(colorElement);
    playerElement.appendChild(nameElement);
    playerElement.appendChild(scoreElement);

    playersList.appendChild(playerElement);
  }

  startBtn.style.display = isHost ? "block" : "none";
}

function gameLoop(timestamp) {
  if (!lastUpdateTime) lastUpdateTime = timestamp;
  const deltaTime = timestamp - lastUpdateTime;

  if (deltaTime >= UPDATE_INTERVAL) {
    update();
    render();
    lastUpdateTime = timestamp;
  }

  requestAnimationFrame(gameLoop);
}

function update() {
  if (!gameRunning || !myId || !players[myId]) return;

  let moved = false;
  let newX = players[myId].x;
  let newY = players[myId].y;
  if (boostedPlayers[myId] && boostedPlayers[myId].type === "frozen") {
    return;
  }
  let speed = movementSpeed;
  if (
    players[myId].speedboosted ||
    (boostedPlayers[myId] && boostedPlayers[myId].type === "speed")
  ) {
    speed = movementSpeed * players[myId].sm;
  }

  if (keys["ArrowUp"] || keys["w"] || directionPressed.up) {
    newY -= speed;
    moved = true;
  }
  if (keys["ArrowDown"] || keys["s"] || directionPressed.down) {
    newY += speed;
    moved = true;
  }
  if (keys["ArrowLeft"] || keys["a"] || directionPressed.left) {
    newX -= speed;
    moved = true;
  }
  if (keys["ArrowRight"] || keys["d"] || directionPressed.right) {
    newX += speed;
    moved = true;
  }

  newX = Math.max(PLAYER_SIZE, Math.min(canvasWidth - PLAYER_SIZE, newX));
  newY = Math.max(PLAYER_SIZE, Math.min(canvasHeight - PLAYER_SIZE, newY));

  if (moved && (newX !== players[myId].x || newY !== players[myId].y)) {
    players[myId].x = newX;
    players[myId].y = newY;

    ws.send(
      JSON.stringify({
        type: "move",
        x: players[myId].x,
        y: players[myId].y,
      })
    );
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  if (currentBooster) {
    ctx.beginPath();
    ctx.fillStyle = currentBooster.color;
    ctx.arc(currentBooster.x, currentBooster.y, BOOSTER_SIZE, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";

    let iconText = "?";
    if (currentBooster.type === "speed") iconText = "⚡";
    else if (currentBooster.type === "shield") iconText = "🛡️";
    else if (currentBooster.type === "freeze") iconText = "❄️";

    ctx.fillText(iconText, currentBooster.x, currentBooster.y + 5);

    const pulseSize = 5 * Math.sin(Date.now() / 200) + BOOSTER_SIZE + 5;
    ctx.beginPath();
    ctx.strokeStyle = currentBooster.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.arc(currentBooster.x, currentBooster.y, pulseSize, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const id in players) {
    const player = players[id];

    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.ellipse(
      player.x,
      player.y + PLAYER_SIZE - 5,
      PLAYER_SIZE - 5,
      10,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();

    if (boostedPlayers[id]) {
      const boostType = boostedPlayers[id].type;
      if (boostType === "shield") {
        ctx.beginPath();
        ctx.strokeStyle = "#8e44ad";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.arc(player.x, player.y, PLAYER_SIZE + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (boostType === "frozen") {
        ctx.beginPath();
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 3;
        ctx.arc(player.x, player.y, PLAYER_SIZE + 3, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI / 2) * i;
          ctx.beginPath();
          ctx.fillStyle = "#00ffff";
          ctx.moveTo(
            player.x + Math.cos(angle) * (PLAYER_SIZE + 5),
            player.y + Math.sin(angle) * (PLAYER_SIZE + 5)
          );
          ctx.lineTo(
            player.x + Math.cos(angle + 0.2) * (PLAYER_SIZE + 15),
            player.y + Math.sin(angle + 0.2) * (PLAYER_SIZE + 15)
          );
          ctx.lineTo(
            player.x + Math.cos(angle - 0.2) * (PLAYER_SIZE + 15),
            player.y + Math.sin(angle - 0.2) * (PLAYER_SIZE + 15)
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = id === myId ? "#2c3e50" : "#7f8c8d";
    ctx.stroke();

    // Player name
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.name, player.x, player.y + 4);

    if (id === taggerId) {
      ctx.font = "bold 16px Arial";
      ctx.fillText("IT", player.x, player.y - PLAYER_SIZE - 5);
    }

    if (player.isHost) {
      ctx.font = "16px Arial";
      ctx.fillText(
        "👑",
        player.x,
        player.y - PLAYER_SIZE - (id === taggerId ? 25 : 5)
      );
    }

    if (id === myId) {
      drawPlayerHighlight(player);
    }
  }

  if (!gameRunning) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Ready to Play", canvas.width / 2, canvas.height / 2);

    if (Object.keys(players).length < 2) {
      ctx.font = "20px Arial";
      ctx.fillText(
        "Waiting for more players...",
        canvas.width / 2,
        canvas.height / 2 + 40
      );
    } else {
      ctx.font = "20px Arial";
      if (isHost) {
        ctx.fillText(
          "Press START to begin!",
          canvas.width / 2,
          canvas.height / 2 + 40
        );
      } else {
        ctx.fillText(
          "Waiting for host to start...",
          canvas.width / 2,
          canvas.height / 2 + 40
        );
      }
    }
  }
}

function drawGrid() {
  const gridSize = 40;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayerHighlight(player) {
  ctx.beginPath();
  ctx.strokeStyle = "#3498db";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.arc(player.x, player.y, PLAYER_SIZE + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSpeedboostHighliter(player) {
  ctx.beginPath();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.arc(player.x, player.y, PLAYER_SIZE + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function adjustCanvasSize() {
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;

  if (containerWidth < canvasWidth) {
    const scale = containerWidth / canvasWidth;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${canvasHeight * scale}px`;
  } else {
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
  }
}

function showNotification(message, duration = 3000) {
  notificationElement.textContent = message;
  notificationElement.classList.remove("hidden");
  notificationElement.classList.add("show");

  setTimeout(() => {
    notificationElement.classList.remove("show");
    setTimeout(() => {
      notificationElement.classList.add("hidden");
    }, 300);
  }, duration);
}

function playSound(type) {
  const sounds = {
    tag: "/sounds/spongbob.mp3",
    gameStart: "/sounds/amongus.mp3",
    win: "/sounds/onepiece.mp3",

    youreIt: "/sounds/imposter.mp3",
    tung: "/sounds/tung.mp3",
    bombardi: "/sounds/bombardi.mp3",
    tolate: "/sounds/itsnottolate.mp3",
    lose: "/sounds/lose.mp3",
    omg: "/sounds/omg.mp3",
    getout: "/sounds/getout.mp3",
    bb: "/sounds/bb.mp3",
  };
  const sound = sounds[type];

  if (sound) {
    const audio = new Audio(sound);
    audio.play().catch((err) => console.log("Audio play error:", err));
  }
}

let audioContext;
function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.log("Web Audio API not supported in this browser");
  }
}
function createSoundPanel() {
  const soundPanel = document.createElement("div");
  soundPanel.className = "sound-panel";
  soundPanel.innerHTML = '<div class="sound-panel-header">Sounds</div>';

  const soundsContainer = document.createElement("div");
  soundsContainer.className = "sounds-container";

  const availableSounds = [
    { id: "tung", name: "TungTung", file: "/sounds/tung.mp3" },
    { id: "bombardi", name: "Bombardi", file: "/sounds/bombardi.mp3" },
    { id: "tolate", name: "its late", file: "/sounds/itsnottolate.mp3" },
    { id: "bb", name: "BB", file: "/sounds/bb.mp3" },
    { id: "omg", name: "OMG", file: "/sounds/omg.mp3" },
    { id: "getout", name: "Get out", file: "/sounds/getout.mp3" },
  ];

  availableSounds.forEach((sound) => {
    const soundButton = document.createElement("button");
    soundButton.className = "sound-button";
    soundButton.textContent = sound.name;
    soundButton.dataset.sound = sound.id;

    soundButton.addEventListener("click", () => {
      if (!chatcool) {
        if (ws) {
          ws.send(
            JSON.stringify({
              type: "sound",
              id: sound.id,
            })
          );
        }

        playSound(sound.id);
        chatcool = true;
        setTimeout(() => {
          chatcool = false;
        }, 5000);
      }
    });

    soundsContainer.appendChild(soundButton);
  });

  const toggleButton = document.createElement("button");
  toggleButton.className = "sound-panel-toggle";
  toggleButton.textContent = "🔊";
  toggleButton.title = "Toggle Sound Panel";
  toggleButton.addEventListener("click", () => {
    soundPanel.classList.toggle("expanded");
  });

  soundPanel.appendChild(soundsContainer);
  document.body.appendChild(soundPanel);
  document.body.appendChild(toggleButton);

  const style = document.createElement("style");
  style.textContent = `
    .sound-panel {
      position: fixed;
      bottom: 20px;
      right: -200px;
      width: 180px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 10px 0 0 10px;
      color: white;
      padding: 10px;
      transition: right 0.3s;
      z-index: 1000;
    }
    
    .sound-panel.expanded {
      right: 0;
    }
    
    .sound-panel-header {
      font-weight: bold;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .sounds-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .sound-button {
      background: #3498db;
      border: none;
      color: white;
      padding: 8px;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .sound-button:hover {
      background: #2980b9;
    }
    
    .sound-panel-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3498db;
      color: white;
      border: none;
      font-size: 18px;
      cursor: pointer;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);
}
function sendmsg() {
  if (!chatcool) {
    ws.send(JSON.stringify({ type: "msg", data: msginput.value.trim() }));
    chatcool = true;
    setTimeout(() => {
      chatcool = false;
    }, 3000);
  }
}
function createCustomSound(type) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (type) {
    case "powerup":
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        1200,
        audioContext.currentTime + 0.5
      );
      gainNode.gain.setValueAtTime(1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      break;

    case "error":
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        100,
        audioContext.currentTime + 0.3
      );
      gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAudio();

  initApp();

  adjustCanvasSize();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("Game paused - tab not visible");
  } else {
    console.log("Game resumed - tab visible");
    adjustCanvasSize();
  }
});
