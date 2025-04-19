const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const setNameBtn = document.getElementById("setNameBtn");
//const playerNameInput = document.getElementById("playerName");
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
const msgBtn = document.getElementById("sendmsg");
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
let soundEnabled = true;
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
  const savedSoundPreference = localStorage.getItem("soundEnabled");
  if (savedSoundPreference !== null) {
    soundEnabled = savedSoundPreference === "true";
    if (document.getElementById("soundToggleBtn")) {
      document.getElementById("soundToggleBtn").textContent = soundEnabled
        ? "Sound: ON"
        : "Sound: OFF";
    }
  }
  confirmKickBtn.addEventListener("click", confirmKickPlayer);
  cancelKickBtn.addEventListener("click", () => {
    kickPlayerModal.classList.add("hidden");
  });
  addCountdownCSS();
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

  kickPlayerModal.classList.remove("hidden");
}

function selectPlayerToKick(playerId) {
  selectedPlayerToKick = playerId;

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
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
function connectToServer(callback) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("Connected to server");
    if (callback) callback();
  };

  ws.onclose = () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
      showNotification(
        `Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`
      );
      setTimeout(() => {
        reconnectAttempts++;
        connectToServer(callback);
      }, delay);
    } else {
      showNotification("Connection lost. Please refresh the page.", 10000);
    }
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
      case "tagCountdown":
        if (myId === taggerId) {
          showTagCountdown(data.remainingTime);
        }
        break;
      case "roomCreated":
        currentRoom = data.roomCode;
        currentRoomCode.textContent = data.roomCode;
        isHost = data.isHost;

        // playerNameInput.value = createNameInput.value;

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
      case "playerDied":
        if (players[data.playerId]) {
          players[data.playerId].is_dead = true;
          players[data.playerId].x = -999;
          players[data.playerId].y = -999;
          players[data.playerId].frozen = false;

          showNotification(`${data.playerName} has been eliminated!`);
          playSound("death");
        }
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
        const message = `${data.tagger} tagged ${data.tagged}`;

        if (data.pointsEarned) {
          showNotification(`${message} (+${data.pointsEarned} points!)`);
        } else {
          showNotification(message);
        }

        if (myId === taggerId) {
          playSound("tagged");
        } else {
          playSound("tag");
        }
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

  // Clear any tag countdown if it exists
  const countdownElement = document.getElementById("tag-countdown");
  if (countdownElement) {
    countdownElement.remove();
  }

  // Clear any interval that's running
  if (window.tagCountdownInterval) {
    clearInterval(window.tagCountdownInterval);
    window.tagCountdownInterval = null;
  }

  if (taggerId === myId) {
    showNotification("You are now IT! Chase other players!");
    playSound("youreIt");
  }
}

function handleGameStarted(data) {
  gameRunning = true;
  for (let id in players) {
    players[id].is_dead = false;
    players[id].frozen = false;
  }
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

  const winnerElement = document.getElementById("winner");
  const statsContainer = document.getElementById("game-stats");

  // Clear previous stats
  statsContainer.innerHTML = "";

  if (data.winners.length === 1) {
    const winnerId = data.winners[0];
    const isMe = winnerId === myId;

    if (isMe) {
      winnerElement.textContent = "You won! 🏆";
      playSound("win");
    } else {
      winnerElement.textContent = `${data.winnerNames[0]} won! 🏆`;
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

  // Create stats table
  const statsTable = document.createElement("div");
  statsTable.className = "game-stats";

  // Add header
  const header = document.createElement("h3");
  header.textContent = "Final Scores";
  statsTable.appendChild(header);

  // Sort players by score
  const sortedPlayers = Object.entries(data.scores).sort(
    (a, b) => b[1].score - a[1].score
  );

  // Add each player's stats
  sortedPlayers.forEach(([playerId, playerData]) => {
    const statItem = document.createElement("div");
    statItem.className = "stat-item";

    const nameSpan = document.createElement("span");

    // Highlight winner
    if (data.winners.includes(playerId)) {
      nameSpan.className = "winner-name";
      nameSpan.textContent = `${playerData.name} 👑`;
    } else {
      nameSpan.textContent = playerData.name;
    }

    // Show if survived
    if (playerData.survived) {
      nameSpan.textContent += " (survived)";
    }

    const scoreSpan = document.createElement("span");
    scoreSpan.textContent = `${playerData.score} pts`;

    statItem.appendChild(nameSpan);
    statItem.appendChild(scoreSpan);
    statsTable.appendChild(statItem);
  });

  // Add survival bonus explanation if applicable
  if (
    data.survivalBonus &&
    data.survivingPlayers &&
    data.survivingPlayers.length > 0
  ) {
    const bonusInfo = document.createElement("div");
    bonusInfo.className = "survival-bonus";
    bonusInfo.textContent = `Surviving players got +${data.survivalBonus} bonus points!`;
    statsTable.appendChild(bonusInfo);
  }

  // Add stats to container
  statsContainer.appendChild(statsTable);

  // Show the modal
  gameOverModal.classList.remove("hidden");
}

function showTagCountdown(seconds) {
  // Remove any existing countdown
  const existingCountdown = document.getElementById("tag-countdown");
  if (existingCountdown) {
    existingCountdown.remove();
  }

  // Create countdown element
  const countdownElement = document.createElement("div");
  countdownElement.id = "tag-countdown";
  countdownElement.className = "tag-countdown";

  // Add warning text
  const warningText = document.createElement("div");
  warningText.className = "countdown-warning";
  warningText.textContent = "TAG SOMEONE!";
  countdownElement.appendChild(warningText);

  // Add timer display
  const timerDisplay = document.createElement("div");
  timerDisplay.className = "countdown-timer";
  timerDisplay.textContent = seconds;
  countdownElement.appendChild(timerDisplay);

  // Add to document
  document.body.appendChild(countdownElement);

  // Start countdown animation
  countdownElement.classList.add("show");

  // Store interval ID so we can clear it when player tags someone
  const countdownInterval = setInterval(() => {
    // Check if element still exists (might have been removed on successful tag)
    const element = document.getElementById("tag-countdown");
    if (!element) {
      clearInterval(countdownInterval);
      return;
    }

    seconds--;
    if (seconds <= 0) {
      clearInterval(countdownInterval);
      element.classList.add("times-up");
      timerDisplay.textContent = "0";
      warningText.textContent = "TIME'S UP!";

      // Remove after showing "TIME'S UP" for 2 seconds
      setTimeout(() => {
        if (element) {
          element.classList.remove("show");
          setTimeout(() => {
            if (element) element.remove();
          }, 500);
        }
      }, 2000);
    } else {
      timerDisplay.textContent = seconds;

      // Make it more urgent when time is running low
      if (seconds <= 3) {
        element.classList.add("urgent");
        playSound("warning");
      }
    }
  }, 1000);

  // Store the interval ID in a global variable so we can clear it when player tags someone
  window.tagCountdownInterval = countdownInterval;
}

// Add CSS for the improved countdown that doesn't block the view
function addCountdownCSS() {
  const style = document.createElement("style");
  style.textContent = `
    .tag-countdown {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: rgba(231, 76, 60, 0.9);
      border: 3px solid #c0392b;
      border-radius: 10px;
      padding: 10px 15px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 900;
      opacity: 0;
      transition: all 0.3s ease;
      box-shadow: 0 0 20px rgba(231, 76, 60, 0.7);
      max-width: 120px;
    }
    
    .tag-countdown.show {
      opacity: 1;
    }
    
    .countdown-warning {
      color: white;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
      text-align: center;
      text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
    }
    
    .countdown-timer {
      color: white;
      font-size: 32px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      min-width: 40px;
      text-align: center;
    }
    
    .tag-countdown.urgent {
      animation: pulse 0.5s infinite alternate;
      background-color: rgba(231, 60, 60, 0.95);
    }
    
    .tag-countdown.times-up {
      background-color: rgba(192, 57, 43, 0.95);
      animation: shake 0.5s;
    }
    
    @keyframes pulse {
      from { transform: scale(1); }
      to { transform: scale(1.05); }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    /* Game over stats styling */
    .game-stats {
      margin-top: 20px;
      padding: 15px;
      background-color: rgba(44, 62, 80, 0.9);
      border-radius: 10px;
      color: white;
    }
    
    .stat-item {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      padding: 5px 0;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    
    .winner-name {
      color: gold;
      font-weight: bold;
      text-shadow: 0 0 5px rgba(255,215,0,0.5);
    }
    
    .survival-bonus {
      color: #2ecc71;
      font-weight: bold;
    }
  `;

  document.head.appendChild(style);
}

function setupControls() {
  const gameArea = document.querySelector(".game-area");

  const controlsWrapper = document.createElement("div");
  controlsWrapper.className = "controls-wrapper";
  gameArea.appendChild(controlsWrapper);

  const controlSwitcher = document.createElement("div");
  controlSwitcher.className = "control-switcher";

  const switchButton = document.createElement("button");
  switchButton.className = "switch-button";
  switchButton.innerHTML = "🕹️ Switch Controls";
  controlSwitcher.appendChild(switchButton);

  const controlsContainer = document.createElement("div");
  controlsContainer.className = "controls-container";

  controlsWrapper.appendChild(controlsContainer);
  controlsWrapper.appendChild(controlSwitcher);
  let currentControlType = localStorage.getItem("controlType") || "joystick";

  const joystickEl = createJoystickElement(controlsContainer);
  const dPadEl = createDPadElement(controlsContainer);

  function updateControlVisibility() {
    if (currentControlType === "joystick") {
      joystickEl.style.display = "flex";
      dPadEl.style.display = "none";
      switchButton.innerHTML = "➕ Switch to D-Pad";
    } else {
      joystickEl.style.display = "none";
      dPadEl.style.display = "flex";
      switchButton.innerHTML = "🕹️ Switch to Joystick";
    }
  }

  switchButton.addEventListener("click", () => {
    currentControlType =
      currentControlType === "joystick" ? "dpad" : "joystick";
    localStorage.setItem("controlType", currentControlType);
    updateControlVisibility();
    showNotification(
      `Switched to ${
        currentControlType === "joystick" ? "Joystick" : "D-Pad"
      } controls`
    );
  });

  updateControlVisibility();
  addControlsCSS();
}

function addControlsCSS() {
  const style = document.createElement("style");
  style.textContent = `
    .controls-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 10px;
      margin-bottom: 15px;
      width: 100%;
    }
    
    .control-switcher {
      margin-bottom: 15px;
      z-index: 10;
    }
    
    .switch-button {
      background: #3498db;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.2s;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    
    .switch-button:hover {
      background: #2980b9;
    }
    
    .controls-container {
      width: 200px;
      height: 200px;
      position: relative;
    }
    
    /* Joystick styles - updated for lighter palette */
    .joystick-container {
      width: 120px;
      height: 120px;
      margin: 0 auto;
      background-color: rgba(225, 240, 255, 0.3);
      border: 2px solid rgba(52, 152, 219, 0.6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
      user-select: none;
      z-index: 100;
      box-shadow: 0 3px 10px rgba(52, 152, 219, 0.2);
    }
    
    .joystick {
      width: 60px;
      height: 60px;
      background: radial-gradient(circle, #5dade2, #3498db);
      box-shadow: 0 3px 6px rgba(52, 152, 219, 0.4);
      border-radius: 50%;
      touch-action: none;
      user-select: none;
    }
    
    /* D-pad styles - updated for lighter palette */
    .d-pad {
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 150px;
      touch-action: none;
      user-select: none;
      z-index: 100;
    }
    
    .middle-row {
      display: flex;
      width: 100%;
      align-items: center;
    }
    
    .control-btn {
      width: 50px;
      height: 50px;
      background-color: rgba(52, 152, 219, 0.8);
      color: white;
      border: 1px solid rgba(41, 128, 185, 0.7);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      user-select: none;
      touch-action: none;
      transition: background-color 0.15s, transform 0.15s;
      box-shadow: 0 3px 6px rgba(52, 152, 219, 0.3);
    }
    
    .control-btn:active {
      background-color: rgba(41, 128, 185, 0.9);
      transform: translateY(2px);
      box-shadow: 0 1px 3px rgba(52, 152, 219, 0.3);
    }
    
    .up-btn, .down-btn {
      margin: 5px 0;
    }
    
    .left-btn, .right-btn {
      margin: 0 5px;
    }
    
    .center-btn {
      width: 40px;
      height: 40px;
      background-color: rgba(85, 172, 238, 0.3);
      border-radius: 10px;
      border: 1px solid rgba(52, 152, 219, 0.4);
    }
    
   
    @media screen and (max-width: 600px) {
      .controls-container {
        width: 180px;
        height: 180px;
      }
      
      .joystick-container {
        width: 110px;
        height: 110px;
      }
      
      .joystick {
        width: 55px;
        height: 55px;
      }
      
      .d-pad {
        width: 140px;
      }
      
      .control-btn {
        width: 45px;
        height: 45px;
      }
    }
    
    @media screen and (max-width: 400px) {
      .controls-container {
        width: 160px;
        height: 160px;
      }
      
      .joystick-container {
        width: 100px;
        height: 100px;
      }
      
      .joystick {
        width: 50px;
        height: 50px;
      }
      
      .d-pad {
        width: 130px;
      }
      
      .control-btn {
        width: 40px;
        height: 40px;
      }
    }
  `;
  document.head.appendChild(style);
}

function createJoystickElement(parent) {
  const joystickContainer = document.createElement("div");
  joystickContainer.className = "joystick-container";
  const joystick = document.createElement("div");
  joystick.className = "joystick";
  joystickContainer.appendChild(joystick);
  parent.appendChild(joystickContainer);

  let dragging = false;
  let center = { x: 0, y: 0 };
  let containerRect = null;

  joystickContainer.addEventListener("touchstart", (e) => {
    e.preventDefault();
    dragging = true;
    containerRect = joystickContainer.getBoundingClientRect();
    const touch = e.touches[0];

    center = {
      x: containerRect.left + containerRect.width / 2,
      y: containerRect.top + containerRect.height / 2,
    };

    const dx = touch.clientX - center.x;
    const dy = touch.clientY - center.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 50;

    let limitedDx = dx;
    let limitedDy = dy;
    if (distance > maxRadius) {
      limitedDx = (dx / distance) * maxRadius;
      limitedDy = (dy / distance) * maxRadius;
    }

    joystick.style.transform = `translate(${limitedDx}px, ${limitedDy}px)`;

    directionPressed.up = dy < -20;
    directionPressed.down = dy > 20;
    directionPressed.left = dx < -20;
    directionPressed.right = dx > 20;
  });

  joystickContainer.addEventListener("touchmove", (e) => {
    e.preventDefault(); // Prevent scrolling
    if (!dragging || !containerRect) return;

    const touch = e.touches[0];
    const dx = touch.clientX - center.x;
    const dy = touch.clientY - center.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 50;

    let limitedDx = dx;
    let limitedDy = dy;
    if (distance > maxRadius) {
      limitedDx = (dx / distance) * maxRadius;
      limitedDy = (dy / distance) * maxRadius;
    }

    joystick.style.transform = `translate(${limitedDx}px, ${limitedDy}px)`;

    directionPressed.up = dy < -20;
    directionPressed.down = dy > 20;
    directionPressed.left = dx < -20;
    directionPressed.right = dx > 20;
  });

  joystickContainer.addEventListener("touchend", endTouch);
  joystickContainer.addEventListener("touchcancel", endTouch);

  function endTouch() {
    if (dragging) {
      dragging = false;
      joystick.style.transform = `translate(0px, 0px)`;
      directionPressed.up = false;
      directionPressed.down = false;
      directionPressed.left = false;
      directionPressed.right = false;
      containerRect = null;
    }
  }

  return joystickContainer;
}
function createDPadElement(parent) {
  const dPad = document.createElement("div");
  dPad.className = "d-pad";

  const upBtn = document.createElement("button");
  upBtn.className = "control-btn up-btn";
  upBtn.innerHTML = "&#9650;"; // Up triangle

  const middleRow = document.createElement("div");
  middleRow.className = "middle-row";

  const leftBtn = document.createElement("button");
  leftBtn.className = "control-btn left-btn";
  leftBtn.innerHTML = "&#9668;"; // Left triangle

  const centerBtn = document.createElement("div");
  centerBtn.className = "center-btn";

  const rightBtn = document.createElement("button");
  rightBtn.className = "control-btn right-btn";
  rightBtn.innerHTML = "&#9658;"; // Right triangle

  const downBtn = document.createElement("button");
  downBtn.className = "control-btn down-btn";
  downBtn.innerHTML = "&#9660;"; // Down triangle

  middleRow.appendChild(leftBtn);
  middleRow.appendChild(centerBtn);
  middleRow.appendChild(rightBtn);

  dPad.appendChild(upBtn);
  dPad.appendChild(middleRow);
  dPad.appendChild(downBtn);

  parent.appendChild(dPad);

  // Touch/mouse events for all buttons
  const addButtonEvents = (btn, direction) => {
    // Touch events
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      directionPressed[direction] = true;
    });
    btn.addEventListener("touchend", () => {
      directionPressed[direction] = false;
    });

    // Mouse events
    btn.addEventListener("mousedown", () => {
      directionPressed[direction] = true;
    });
    btn.addEventListener("mouseup", () => {
      directionPressed[direction] = false;
    });
    btn.addEventListener("mouseleave", () => {
      directionPressed[direction] = false;
    });
  };

  addButtonEvents(upBtn, "up");
  addButtonEvents(downBtn, "down");
  addButtonEvents(leftBtn, "left");
  addButtonEvents(rightBtn, "right");

  return dPad;
}

function setupEventListeners() {
  window.addEventListener("keydown", function (e) {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
        e.code
      )
    ) {
      e.preventDefault();
    }
  });

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
  });

  document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });
  document.getElementById("soundToggleBtn").addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    document.getElementById("soundToggleBtn").textContent = soundEnabled
      ? "Sound: ON"
      : "Sound: OFF";

    localStorage.setItem("soundEnabled", soundEnabled.toString());

    showNotification(`Sound ${soundEnabled ? "enabled" : "disabled"}`);
  });

  startBtn.addEventListener("click", () => {
    if (!gameRunning && isHost) {
      ws.send(JSON.stringify({ type: "start" }));
    } else if (!isHost) {
      showNotification("Only the host can start the game");
    }
  });

  // If you still want to keep this, you need a reference to playerNameInput
  // Otherwise, remove this section if you're using createName and joinName fields
  // if (playerNameInput) {
  //   setNameBtn.addEventListener("click", () => {
  //     const name = playerNameInput.value.trim();
  //     if (name) {
  //       setPlayerName(name);
  //     }
  //   });

  //   playerNameInput.addEventListener("keypress", (e) => {
  //     if (e.key === "Enter") {
  //       const name = playerNameInput.value.trim();
  //       if (name) {
  //         setPlayerName(name);
  //       }
  //     }
  //   });
  // }

  msgBtn.addEventListener("click", () => {
    const msg = msginput.value.trim();
    sendmsg(msg);
  });

  msginput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const msg = msginput.value.trim();
      if (msg) {
        sendmsg(msg);
      }
    }
  });
  document.getElementById("kickBtn").addEventListener("click", () => {
    if (isHost) {
      openKickPlayerModal();
    } else {
      showNotification("Only the host can kick players");
    }
  });
  closeModalBtn.addEventListener("click", () => {
    gameOverModal.classList.add("hidden");

    if (isHost) {
      startBtn.disabled = false;
      statusMessage.textContent = "Ready to start a new game";
    } else {
      statusMessage.textContent = "Waiting for host to start a new game";
    }
  });

  // Add event listener for Play Again button
  document.getElementById("playAgainBtn").addEventListener("click", () => {
    gameOverModal.classList.add("hidden");
    if (isHost) {
      ws.send(JSON.stringify({ type: "start" }));
    }
  });

  // Add event listener for Share Score button
  document.getElementById("shareScoreBtn").addEventListener("click", () => {
    // Create a share message
    const winnerText = document.getElementById("winner").textContent;
    const shareText = `I just played Tagger! ${winnerText} Check it out at [your-game-url]`;

    // Try to use Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: "Tagger - Multiplayer Tag Game",
          text: shareText,
        })
        .catch((err) => {
          console.error("Error sharing:", err);
          // Fallback to clipboard
          copyToClipboard(shareText);
          showNotification("Score copied to clipboard!");
        });
    } else {
      copyToClipboard(shareText);
      showNotification("Score copied to clipboard!");
    }
  });

  setupControls();
  window.addEventListener("resize", adjustCanvasSize);
}
function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
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

// function updatePlayersList() {
//   playersList.innerHTML = "";

//   for (const id in players) {
//     const player = players[id];
//     const isMe = id === myId;
//     const isTagger = id === taggerId;
//     const isPlayerHost = player.isHost;

//     const playerElement = document.createElement("div");
//     playerElement.className = `player-item ${isMe ? "you" : ""} ${
//       isTagger ? "tagger" : ""
//     }`;

//     const colorElement = document.createElement("div");
//     colorElement.className = "player-color";
//     colorElement.style.backgroundColor = player.color;

//     const nameElement = document.createElement("div");
//     nameElement.className = "player-name";
//     nameElement.textContent = `${player.name}${isMe ? " (You)" : ""}${
//       isTagger ? " (IT)" : ""
//     }${isPlayerHost ? " (Host)" : ""}`;

//     const scoreElement = document.createElement("div");
//     scoreElement.className = "player-score";
//     scoreElement.textContent = player.score !== undefined ? player.score : 0;

//     if (isHost && !isMe) {
//       const kickBtn = document.createElement("button");
//       kickBtn.className = "kick-btn";
//       kickBtn.textContent = "×";
//       kickBtn.title = "Remove player";
//       kickBtn.addEventListener("click", () => {
//         selectedPlayerToKick = id;
//         confirmKickPlayer();
//       });
//       playerElement.appendChild(kickBtn);
//     }

//     playerElement.appendChild(colorElement);
//     playerElement.appendChild(nameElement);
//     playerElement.appendChild(scoreElement);

//     playersList.appendChild(playerElement);
//   }

//   startBtn.style.display = isHost ? "block" : "none";
// }
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
      kickBtn.addEventListener("click", (e) => {
        // Stop event bubbling
        e.stopPropagation();

        // Select the player and open modal
        selectedPlayerToKick = id;
        openKickPlayerModal();

        // Pre-select this player in the modal
        const playerItems = document.querySelectorAll(".kick-player-item");
        playerItems.forEach((item) => {
          if (item.dataset.playerId === id) {
            item.classList.add("selected");
          } else {
            item.classList.remove("selected");
          }
        });
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
let lastSendTime = 0;
const SEND_INTERVAL = 50;
function update() {
  if (!gameRunning || !myId || !players[myId]) return;

  let moved = false;
  let newX = players[myId].x;
  let newY = players[myId].y;

  if (
    (boostedPlayers[myId] && boostedPlayers[myId].type === "frozen") ||
    players[myId].frozen ||
    players[myId].is_dead
  ) {
    return;
  }

  let speed = movementSpeed;
  if (boostedPlayers[myId] && boostedPlayers[myId].type === "speed") {
    const speedMultiplier = Math.min(players[myId].sm || 1.5, 2);
    speed = movementSpeed * speedMultiplier;
  } else if (players[myId].speedboosted) {
    const speedMultiplier = Math.min(players[myId].sm || 1.5, 2);
    speed = movementSpeed * speedMultiplier;
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

  const movementThreshold = 0.1;
  const hasSignificantMove =
    Math.abs(newX - players[myId].x) > movementThreshold ||
    Math.abs(newY - players[myId].y) > movementThreshold;

  if (moved && hasSignificantMove) {
    players[myId].x = newX;
    players[myId].y = newY;

    const now = Date.now();
    if (now - lastSendTime > SEND_INTERVAL) {
      ws.send(
        JSON.stringify({
          type: "move",
          x: players[myId].x,
          y: players[myId].y,
        })
      );
      lastSendTime = now;
    }
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
    if (players[id].is_dead) continue;

    const player = players[id];
    if (
      player.x < -PLAYER_SIZE * 2 ||
      player.x > canvasWidth + PLAYER_SIZE * 2 ||
      player.y < -PLAYER_SIZE * 2 ||
      player.y > canvasHeight + PLAYER_SIZE * 2
    ) {
      continue;
    }
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
  if (!soundEnabled) return;
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
      bottom: 40px;
      right: 40px;
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
  msginput.value = "";
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
