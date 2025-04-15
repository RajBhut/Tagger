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

  // Force room code input to uppercase
  roomCodeInput.addEventListener("input", () => {
    roomCodeInput.value = roomCodeInput.value.toUpperCase();
  });
}

// Create a new game room
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

// Join an existing room
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

// Initialize the game
function initGame() {
  // Set canvas size
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Show game screen, hide welcome screen
  welcomeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  setupEventListeners();
  gameLoop();
}

// Handle incoming WebSocket messages
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

        // Pre-fill name field in game
        playerNameInput.value = createNameInput.value;

        // Initialize game after room creation
        initGame();
        break;

      case "error":
        showNotification(data.message);
        break;
      case "msg":
        showNotification(data.data);

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

// Handle tag update
function handleTagUpdate(data) {
  taggerId = data.taggerId;

  if (data.players) {
    players = data.players;
  } else {
    // Just update colors if full player data not provided
    for (let id in players) {
      players[id].color = id === taggerId ? "#e74c3c" : players[id].color;
    }
  }

  // Update UI
  updatePlayersList();

  // Play sound and show notification if I'm the new tagger
  if (taggerId === myId) {
    showNotification("You are now IT! Chase other players!");
    playSound("youreIt");
  }
}

// Handle game started message
function handleGameStarted(data) {
  gameRunning = true;
  gameTime = data.time;
  taggerId = data.taggerId;
  players = data.players;

  // Update UI
  timerValue.textContent = gameTime;
  statusMessage.textContent = "Game in progress";
  startBtn.disabled = true;
  updatePlayersList();

  // Show tagger notification
  if (taggerId === myId) {
    showNotification("You are IT! Chase other players!");
    playSound("gameStart");
  } else {
    showNotification("Game started! Run from the tagger!");
    playSound("gameStart");
  }
}

// Handle game over message
function handleGameOver(data) {
  gameRunning = false;
  startBtn.disabled = false;
  statusMessage.textContent = "Game over - Ready to start";

  // Update modal content
  gameOverReason.textContent = data.reason;

  // Display scores
  let scoresHtml =
    "<table class='score-table'><tr><th>Player</th><th>Score</th></tr>";

  // Sort players by score
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

  // Show modal
  gameOverModal.classList.remove("hidden");
}

// Set up event listeners
function setupEventListeners() {
  // Keyboard controls
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

  // Modal close button
  closeModalBtn.addEventListener("click", () => {
    gameOverModal.classList.add("hidden");
  });

  // Create mobile control buttons dynamically
  createMobileControls();

  // Window resize handler
  window.addEventListener("resize", adjustCanvasSize);
}

// Create mobile control buttons
function createMobileControls() {
  // Create the mobile controls container
  const mobileControls = document.createElement("div");
  mobileControls.className = "mobile-controls";

  // Create the d-pad
  const dPad = document.createElement("div");
  dPad.className = "d-pad";

  // Create up button
  const upBtn = document.createElement("button");
  upBtn.id = "up-btn";
  upBtn.className = "control-btn up-btn";
  upBtn.textContent = "↑";

  // Create middle row for left and right buttons
  const middleRow = document.createElement("div");
  middleRow.className = "middle-row";

  // Create left button
  const leftBtn = document.createElement("button");
  leftBtn.id = "left-btn";
  leftBtn.className = "control-btn left-btn";
  leftBtn.textContent = "←";

  // Create right button
  const rightBtn = document.createElement("button");
  rightBtn.id = "right-btn";
  rightBtn.className = "control-btn right-btn";
  rightBtn.textContent = "→";

  // Create down button
  const downBtn = document.createElement("button");
  downBtn.id = "down-btn";
  downBtn.className = "control-btn down-btn";
  downBtn.textContent = "↓";

  // Assemble the d-pad
  middleRow.appendChild(leftBtn);
  middleRow.appendChild(rightBtn);
  dPad.appendChild(upBtn);
  dPad.appendChild(middleRow);
  dPad.appendChild(downBtn);
  mobileControls.appendChild(dPad);

  // Add the controls to the game area
  const gameArea = document.querySelector(".game-area");
  gameArea.appendChild(mobileControls);

  // Add event listeners for the buttons
  // Up button
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

  // Left button
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

  // Right button
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

// Set player name
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

// Update the players list in the UI
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

    // Add kick button if I'm the host and this isn't me
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

  // Show or hide the start button based on host status
  startBtn.style.display = isHost ? "block" : "none";
}

// Game loop
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

// Update game state
function update() {
  if (!gameRunning || !myId || !players[myId]) return;

  let moved = false;
  let newX = players[myId].x;
  let newY = players[myId].y;

  // Handle keyboard movement
  if (keys["ArrowUp"] || keys["w"] || directionPressed.up) {
    newY -= movementSpeed;
    moved = true;
  }
  if (keys["ArrowDown"] || keys["s"] || directionPressed.down) {
    newY += movementSpeed;
    moved = true;
  }
  if (keys["ArrowLeft"] || keys["a"] || directionPressed.left) {
    newX -= movementSpeed;
    moved = true;
  }
  if (keys["ArrowRight"] || keys["d"] || directionPressed.right) {
    newX += movementSpeed;
    moved = true;
  }

  // Apply boundary constraints
  newX = Math.max(PLAYER_SIZE, Math.min(canvasWidth - PLAYER_SIZE, newX));
  newY = Math.max(PLAYER_SIZE, Math.min(canvasHeight - PLAYER_SIZE, newY));

  // Send movement to server if position changed
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

// Render game state
function render() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background grid
  drawGrid();

  // Draw players
  for (const id in players) {
    const player = players[id];

    // Player shadow
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

    // Player body
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = id === myId ? "#2c3e50" : "#7f8c8d";
    ctx.stroke();

    // Player name
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(player.name, player.x, player.y + 4);

    // Tagger indicator
    if (id === taggerId) {
      ctx.font = "bold 16px Arial";
      ctx.fillText("IT", player.x, player.y - PLAYER_SIZE - 5);
    }

    // Host crown for host player
    if (player.isHost) {
      ctx.font = "16px Arial";
      ctx.fillText(
        "👑",
        player.x,
        player.y - PLAYER_SIZE - (id === taggerId ? 25 : 5)
      );
    }

    // "You" indicator
    if (id === myId) {
      drawPlayerHighlight(player);
    }
  }

  // Draw game status
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

// Adjust canvas size based on window size
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
