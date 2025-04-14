// const canvas = document.getElementById("gameCanvas");
// const ctx = canvas.getContext("2d");
// const startBtn = document.getElementById("startBtn");
// const setNameBtn = document.getElementById("setNameBtn");
// const playerNameInput = document.getElementById("playerName");
// const timerValue = document.getElementById("timer-value");
// const statusMessage = document.getElementById("status-message");
// const playersList = document.getElementById("players-list");
// const notificationElement = document.getElementById("notification");
// const gameOverModal = document.getElementById("gameOver");
// const gameOverReason = document.getElementById("gameOverReason");
// const gameOverScores = document.getElementById("gameOverScores");
// const winnerElement = document.getElementById("winner");
// const closeModalBtn = document.getElementById("closeModal");

// let ws;
// let players = {};
// let myId = null;
// let taggerId = null;
// let gameRunning = false;
// let gameTime = 60;
// let canvasWidth = 800;
// let canvasHeight = 600;
// let keys = {};
// let lastUpdateTime = 0;
// const PLAYER_SIZE = 30;
// const FRAME_RATE = 60;
// const UPDATE_INTERVAL = 1000 / FRAME_RATE;
// const movementSpeed = 5;

// // Initialize the game
// function initGame() {
//   // Set canvas size
//   canvas.width = canvasWidth;
//   canvas.height = canvasHeight;

//   connectToServer();

//   setupEventListeners();

//   gameLoop();
// }

// // Connect to WebSocket server
// function connectToServer() {
//   const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
//   const wsUrl = `${protocol}//${window.location.host}`;

//   ws = new WebSocket(wsUrl);

//   ws.onopen = () => {
//     console.log("Connected to server");
//     // Get player name from local storage or prompt
//     const savedName = localStorage.getItem("playerName");
//     if (savedName) {
//       playerNameInput.value = savedName;
//       setPlayerName(savedName);
//     }
//   };

//   ws.onclose = () => {
//     showNotification("Connection lost. Reconnecting...");
//     setTimeout(connectToServer, 3000);
//   };

//   ws.onerror = (error) => {
//     console.error("WebSocket error:", error);
//     showNotification("Connection error. Please refresh the page.");
//   };

//   ws.onmessage = handleMessage;
// }

// // Handle incoming WebSocket messages
// function handleMessage(msg) {
//   try {
//     const data = JSON.parse(msg.data);

//     switch (data.type) {
//       case "init":
//         handleInitMessage(data);
//         break;

//       case "newPlayer":
//         players[data.id] = data.data;
//         updatePlayersList();
//         break;

//       case "playerMoved":
//         if (players[data.id]) {
//           players[data.id] = data.data;
//         }
//         break;

//       case "playerUpdate":
//         if (players[data.id]) {
//           players[data.id] = data.data;
//           updatePlayersList();
//         }
//         break;

//       case "tagUpdate":
//         handleTagUpdate(data);
//         break;

//       case "tagged":
//         showNotification(`${data.tagger} tagged ${data.tagged}!`);
//         playSound("tag");
//         break;

//       case "playerDisconnected":
//         delete players[data.id];
//         updatePlayersList();
//         break;

//       case "timer":
//         gameTime = data.time;
//         timerValue.textContent = data.time;
//         break;

//       case "gameStarted":
//         handleGameStarted(data);
//         break;

//       case "gameOver":
//         handleGameOver(data);
//         break;

//       case "notification":
//         showNotification(data.message);
//         break;
//     }
//   } catch (error) {
//     console.error("Error processing message:", error);
//   }
// }

// // Handle initial connection data
// function handleInitMessage(data) {
//   myId = data.id;
//   players = data.players;
//   taggerId = data.taggerId;
//   gameRunning = data.gameRunning;
//   gameTime = data.gameTime;
//   canvasWidth = data.canvasWidth;
//   canvasHeight = data.canvasHeight;

//   // Update canvas dimensions
//   canvas.width = canvasWidth;
//   canvas.height = canvasHeight;

//   // Update UI
//   timerValue.textContent = gameTime;
//   updatePlayersList();

//   if (gameRunning) {
//     startBtn.disabled = true;
//     statusMessage.textContent = "Game in progress";
//   }
// }

// // Handle tag update
// function handleTagUpdate(data) {
//   taggerId = data.taggerId;

//   if (data.players) {
//     players = data.players;
//   } else {
//     // Just update colors if full player data not provided
//     for (let id in players) {
//       players[id].color = id === taggerId ? "#e74c3c" : players[id].color;
//     }
//   }

//   // Update UI
//   updatePlayersList();

//   // Play sound and show notification if I'm the new tagger
//   if (taggerId === myId) {
//     showNotification("You are now IT! Chase other players!");
//     playSound("youreIt");
//   }
// }

// // Handle game started message
// function handleGameStarted(data) {
//   gameRunning = true;
//   gameTime = data.time;
//   taggerId = data.taggerId;
//   players = data.players;

//   // Update UI
//   timerValue.textContent = gameTime;
//   statusMessage.textContent = "Game in progress";
//   startBtn.disabled = true;
//   updatePlayersList();

//   // Show tagger notification
//   if (taggerId === myId) {
//     showNotification("You are IT! Chase other players!");
//     playSound("gameStart");
//   } else {
//     showNotification("Game started! Run from the tagger!");
//     playSound("gameStart");
//   }
// }

// // Handle game over message
// function handleGameOver(data) {
//   gameRunning = false;
//   startBtn.disabled = false;
//   statusMessage.textContent = "Game over - Ready to start";

//   // Update modal content
//   gameOverReason.textContent = data.reason;

//   // Display scores
//   let scoresHtml =
//     "<table class='score-table'><tr><th>Player</th><th>Score</th></tr>";

//   // Sort players by score
//   const sortedPlayers = Object.entries(data.scores).sort(
//     (a, b) => b[1].score - a[1].score
//   );

//   sortedPlayers.forEach(([id, player]) => {
//     const isWinner = data.winners.includes(id);
//     const isMe = id === myId;

//     scoresHtml += `<tr class="${isWinner ? "winner-row" : ""} ${
//       isMe ? "me-row" : ""
//     }">
//       <td>${player.name}${isMe ? " (You)" : ""}</td>
//       <td>${player.score}</td>
//     </tr>`;
//   });

//   scoresHtml += "</table>";
//   gameOverScores.innerHTML = scoresHtml;

//   // Display winner message
//   if (data.winners.length === 1) {
//     const winnerId = data.winners[0];
//     const isMe = winnerId === myId;

//     if (isMe) {
//       winnerElement.textContent = "You win! 🏆";
//       playSound("win");
//     } else {
//       winnerElement.textContent = `${data.winnerNames[0]} wins! 🏆`;
//       playSound("lose");
//     }
//   } else if (data.winners.length > 1) {
//     winnerElement.textContent = `It's a tie between ${data.winnerNames.join(
//       ", "
//     )}! 🏆`;
//     playSound("win");
//   } else {
//     winnerElement.textContent = "No winners this time!";
//   }

//   // Show modal
//   gameOverModal.classList.remove("hidden");
// }

// // Set up event listeners
// function setupEventListeners() {
//   // Keyboard controls
//   document.addEventListener("keydown", (e) => {
//     keys[e.key] = true;
//   });

//   document.addEventListener("keyup", (e) => {
//     keys[e.key] = false;
//   });

//   // Button handlers
//   startBtn.addEventListener("click", () => {
//     if (!gameRunning) {
//       ws.send(JSON.stringify({ type: "start" }));
//     }
//   });

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

//   // Modal close button
//   closeModalBtn.addEventListener("click", () => {
//     gameOverModal.classList.add("hidden");
//   });

//   // Touch controls for mobile
//   let touchStartX = 0;
//   let touchStartY = 0;

//   canvas.addEventListener("touchstart", (e) => {
//     if (!gameRunning || !myId) return;

//     const touch = e.touches[0];
//     touchStartX = touch.clientX;
//     touchStartY = touch.clientY;
//     e.preventDefault();
//   });

//   canvas.addEventListener("touchmove", (e) => {
//     if (!gameRunning || !myId) return;

//     const touch = e.touches[0];
//     const rect = canvas.getBoundingClientRect();

//     const x = touch.clientX - rect.left;
//     const y = touch.clientY - rect.top;

//     if (players[myId]) {
//       players[myId].x = Math.max(
//         PLAYER_SIZE,
//         Math.min(canvasWidth - PLAYER_SIZE, x)
//       );
//       players[myId].y = Math.max(
//         PLAYER_SIZE,
//         Math.min(canvasHeight - PLAYER_SIZE, y)
//       );

//       ws.send(
//         JSON.stringify({
//           type: "move",
//           x: players[myId].x,
//           y: players[myId].y,
//         })
//       );
//     }

//     e.preventDefault();
//   });

//   // Window resize handler
//   window.addEventListener("resize", adjustCanvasSize);
// }

// // Set player name
// function setPlayerName(name) {
//   if (name && ws.readyState === WebSocket.OPEN) {
//     ws.send(
//       JSON.stringify({
//         type: "setName",
//         name: name,
//       })
//     );

//     localStorage.setItem("playerName", name);
//     showNotification("Name set successfully!");
//   }
// }

// // Update the players list in the UI
// function updatePlayersList() {
//   playersList.innerHTML = "";

//   for (const id in players) {
//     const player = players[id];
//     const isMe = id === myId;
//     const isTagger = id === taggerId;

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
//     }`;

//     const scoreElement = document.createElement("div");
//     scoreElement.className = "player-score";
//     scoreElement.textContent = player.score !== undefined ? player.score : 0;

//     playerElement.appendChild(colorElement);
//     playerElement.appendChild(nameElement);
//     playerElement.appendChild(scoreElement);

//     playersList.appendChild(playerElement);
//   }
// }

// // Game loop
// function gameLoop(timestamp) {
//   if (!lastUpdateTime) lastUpdateTime = timestamp;
//   const deltaTime = timestamp - lastUpdateTime;

//   if (deltaTime >= UPDATE_INTERVAL) {
//     update();
//     render();
//     lastUpdateTime = timestamp;
//   }

//   requestAnimationFrame(gameLoop);
// }

// // Update game state
// function update() {
//   if (!gameRunning || !myId || !players[myId]) return;

//   let moved = false;
//   let newX = players[myId].x;
//   let newY = players[myId].y;

//   // Handle keyboard movement
//   if (keys["ArrowUp"] || keys["w"]) {
//     newY -= movementSpeed;
//     moved = true;
//   }
//   if (keys["ArrowDown"] || keys["s"]) {
//     newY += movementSpeed;
//     moved = true;
//   }
//   if (keys["ArrowLeft"] || keys["a"]) {
//     newX -= movementSpeed;
//     moved = true;
//   }
//   if (keys["ArrowRight"] || keys["d"]) {
//     newX += movementSpeed;
//     moved = true;
//   }

//   // Apply boundary constraints
//   newX = Math.max(PLAYER_SIZE, Math.min(canvasWidth - PLAYER_SIZE, newX));
//   newY = Math.max(PLAYER_SIZE, Math.min(canvasHeight - PLAYER_SIZE, newY));

//   // Send movement to server if position changed
//   if (moved && (newX !== players[myId].x || newY !== players[myId].y)) {
//     players[myId].x = newX;
//     players[myId].y = newY;

//     ws.send(
//       JSON.stringify({
//         type: "move",
//         x: players[myId].x,
//         y: players[myId].y,
//       })
//     );
//   }
// }

// // Render game state
// function render() {
//   // Clear canvas
//   ctx.clearRect(0, 0, canvas.width, canvas.height);

//   // Draw background grid
//   drawGrid();

//   // Draw players
//   for (const id in players) {
//     const player = players[id];

//     // Player shadow
//     ctx.beginPath();
//     ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
//     ctx.ellipse(
//       player.x,
//       player.y + PLAYER_SIZE - 5,
//       PLAYER_SIZE - 5,
//       10,
//       0,
//       0,
//       Math.PI * 2
//     );
//     ctx.fill();

//     // Player body
//     ctx.beginPath();
//     ctx.fillStyle = player.color;
//     ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.lineWidth = 2;
//     ctx.strokeStyle = id === myId ? "#2c3e50" : "#7f8c8d";
//     ctx.stroke();

//     // Player name
//     ctx.fillStyle = "#fff";
//     ctx.font = "bold 12px Arial";
//     ctx.textAlign = "center";
//     ctx.fillText(player.name, player.x, player.y + 4);

//     // Tagger indicator
//     if (id === taggerId) {
//       ctx.font = "bold 16px Arial";
//       ctx.fillText("IT", player.x, player.y - PLAYER_SIZE - 5);
//     }

//     // "You" indicator
//     if (id === myId) {
//       drawPlayerHighlight(player);
//     }
//   }

//   // Draw game status
//   if (!gameRunning) {
//     ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     ctx.font = "bold 32px Arial";
//     ctx.fillStyle = "#fff";
//     ctx.textAlign = "center";
//     ctx.fillText("Ready to Play", canvas.width / 2, canvas.height / 2);

//     if (Object.keys(players).length < 2) {
//       ctx.font = "20px Arial";
//       ctx.fillText(
//         "Waiting for more players...",
//         canvas.width / 2,
//         canvas.height / 2 + 40
//       );
//     } else {
//       ctx.font = "20px Arial";
//       ctx.fillText(
//         "Press START to begin!",
//         canvas.width / 2,
//         canvas.height / 2 + 40
//       );
//     }
//   }
// }

// // Draw grid background
// function drawGrid() {
//   const gridSize = 40;
//   ctx.strokeStyle = "#e5e7eb";
//   ctx.lineWidth = 1;

//   // Vertical lines
//   for (let x = 0; x <= canvas.width; x += gridSize) {
//     ctx.beginPath();
//     ctx.moveTo(x, 0);
//     ctx.lineTo(x, canvas.height);
//     ctx.stroke();
//   }

//   // Horizontal lines
//   for (let y = 0; y <= canvas.height; y += gridSize) {
//     ctx.beginPath();
//     ctx.moveTo(0, y);
//     ctx.lineTo(canvas.width, y);
//     ctx.stroke();
//   }
// }

// // Draw highlight around player
// function drawPlayerHighlight(player) {
//   ctx.beginPath();
//   ctx.strokeStyle = "#3498db";
//   ctx.lineWidth = 2;
//   ctx.setLineDash([5, 5]);
//   ctx.arc(player.x, player.y, PLAYER_SIZE + 8, 0, Math.PI * 2);
//   ctx.stroke();
//   ctx.setLineDash([]);
// }

// // Adjust canvas size based on window size
// function adjustCanvasSize() {
//   const container = canvas.parentElement;
//   const containerWidth = container.clientWidth;

//   // Keep aspect ratio
//   if (containerWidth < canvasWidth) {
//     const scale = containerWidth / canvasWidth;
//     canvas.style.width = `${containerWidth}px`;
//     canvas.style.height = `${canvasHeight * scale}px`;
//   } else {
//     canvas.style.width = `${canvasWidth}px`;
//     canvas.style.height = `${canvasHeight}px`;
//   }
// }

// // Show notification
// function showNotification(message, duration = 3000) {
//   notificationElement.textContent = message;
//   notificationElement.classList.remove("hidden");
//   notificationElement.classList.add("show");

//   setTimeout(() => {
//     notificationElement.classList.remove("show");
//     setTimeout(() => {
//       notificationElement.classList.add("hidden");
//     }, 300);
//   }, duration);
// }

// function playSound(type) {
//   const sounds = {
//     tag: "data:audio/wav;base64,UklGRiQDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQADAACBhYqFbF1fdJKrqYhyeJGTZ0ZQh7TQtH5cT3avn2peaZG2x72SZ0lvenNYY4OhudC/n3ZkbX11WVJkd6XF1ap4TnOVh1hKa5aovZFxXWF5gWBYYn2UprCwoXdpa3+AalpddYmdr7CkhGhrdH9xXltugo2aqJ2KcnN8gHtpW1tzhZqopJB6aXCAdWhYWXKHnKyolntpbHp4aV5hfJCfrqeSeGdwe4BsXVlre5SepZJ6Z3J8fWhbXWt+lKKmjXlucHZ1aWFoc4qYoKKNdGhzgm9nXGF5jZyjl4BtcHpwZ19nfI+Zn5J6cH6BdWNaXG6KlZuVh3R6gXFeXWZ3iJSdmYN6gIF4Z1tcaX6KmJmMiJKbkW1XW2p6hYuUkouBe3+BdFRNXnmMm5y7tbBtYG2EhW9gXXuMkZjHqGpthZCIaDIaMVzE2MCVa3GFi2ouKUdni5yfr5iJcXGQi2cqFyEhXLPUwqKAdXdpQjMyPU1hf5CinpmvqW0uLkF0Z3mSiq6qVlaArKWIXUVKTF9rd5mgn3RpcJ2TVVJigVplZ5Cnn4+WhWlYTmR/eIKKkZKMdm2CgGtQU2JybYObrauYgmpyh3tYPEdhX2qGnqGXjG5gYoF7ZVp3jouKjZiOhYFybWNadX16gIuSlpCDfWlpbm1jXmx4g4yWmZCCeXl+d2lgaoCVrL2umXUyNWlsdXR/gIGEhYF3cXFvbnt/fHx8d0QxQGt9eGhlXl9gX2FkaWZlanSFo6GJgn56fXJpbW53dXJ3en+ChIaGioiJfG9zdnRycrCxsLlwMTE+QUlPl4dxZmZjVkpMUl5iZXJ9h4mJk6imfWRwcmtjYGmDiX94fnlvdnFCYZGOc5KYFhFQhK2TVFWUY15cXV9dXmBcWXONjZqzrYBiY2hcP0RUgaiiUVZ8d2RnTk9UWGRuho6Uk4qFfHp9gYJ6bGRiZ3l/gomFfXhxaWuCfWtgYGNrdIOPlJOLgX57fn5xYFRPVmh4gpOZnJ2YhHdtbjsnLDo+Yk9FTVVNN0M+",
//     gameStart:
//       "data:audio/wav;base64,UklGRmQEAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YUAEAABsbGxsbGxsbGxsbGxsbGx2dnZ2dnZ2dnZ2dnZ2dnaCgoKCgoKCgoKCgoKCgoKNjY2NjY2NjY2NjY2NjY2YmJiYmJiYmJiYmJiYmJijo6Ojo6Ojo6Ojo6Ojo6Ourq6urq6urq6urq6urq65ubm5ubm5ubm5ubm5ubm5xMTExMTExMTExMTExMTExcXFxcXFxcXFxcXFxcXFxcXFwcHBwcHBwcHBwcHBwcHBvb29vb29vb29vb29vb29uLi4uLi4uLi4uLi4uLi4s7Ozs7Ozs7Ozs7Ozs7Ozrq6urq6urq6urq6urq6uqqqqqqqqqqqqqqqqqqqqqqurq6urq6urq6urq6urq6utra2tra2tra2tra2tra2tra2tra2tra2tra2tra2trK2trKysrKysrKysrKysrKuqqqqqqqqqqqqqqqqqqqmpqampqampqampqampqaioqKioqKioqKioqKioqKhoaGhoaGhoaGhoaGhoaGfn5+fn5+fn5+fn5+fn5+dnZ2dnZ2dnZ2dnZ2dnZ2cnJycnJycnJycnJycnJyampqampqampqampqampqampqampqampqampqampqa////////////////////xcXFxcXFxcXFxcXFxcXFxdXV1dXV1dXV1dXV1dXV1eLi4uLi4uLi4uLi4uLi4urq6urq6urq6urq6urq6ur29vb29vb29vb29vb29vYCAgICAgICAgICAgICAgIKCgoKCgoKCgoKCgoKCgoKDg4ODg4ODg4ODg4ODg4OFhYWFhYWFhYWFhYWFhYWEhISEhISEhISEhISEhISCgoKCgoKCgoKCgoKCgoKBgYGBgYGBgYGBgYGBgYF/f39/f39/f39/f39/f39+fn5+fn5+fn5+fn5+fn58fHx8fHx8fHx8fHx8fHx7e3t7e3t7e3t7e3t7e3t5eXl5eXl5eXl5eXl5eXl4eHh4eHh4eHh4eHh4eHh2dnZ2dnZ2dnZ2dnZ2dnZ1dXV1dXV1dXV1dXV1dXV0dHR0dHR0dHR0dHR0dHRzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N0dHR0dHR0dHR0dHR0dHR1dXV1dXV1dXV1dXV1dXV2dnZ2dnZ2dnZ2dnZ2dnZ4eHh4eHh4eHh4eHh4eHh6enp6enp6enp6enp6enp8fHx8fHx8fHx8fHx8fHx+fn5+fn5+fn5+fn5+fn6AgICAgICAgICAgICAgICCgoKCgoKCgoKCgoKCgoKEhISEhISEhISEhISEhISGhoaGhoaGhoaGhoaGhoaIiIiIiIiIiIiIiIiIiIiKioqKioqKioqKioqKioqMjIyMjIyMjIyMjIyMjIyOjo6Ojo6Ojo6Ojo6Ojo6QkJCQkJCQkJCQkJCQkJCSkpKSkpKSkpKSkpKSkpKUlJSUlJSUlJSUlJSUlJSWlpaWlpaWlpaWlpaWlpaYmJiYmJiYmJiYmJiYmJiZmZmZmZmZmZmZmZmZmZmampqampqampqampqampqampqampqampqampqampqZmZmZmZmZmZmZmZmZmZk=",
//     win: "data:audio/wav;base64,UklGRvQDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YdADAABQUFdpZVpXaXVzaWJkdHptZHB2b2p4c29ydGtzb3lyf3RmcpCBYG+VgWN7jH9sjXtpiot/cYV6doOEdHR3fYSAcnmXg1Rfi6hyaWRoWDlYhJVZMWSRmYd6aFRYoIkpKnWMi2UkO4SZiU5Pc4R4XkVwfUkzartTM7JzQXWGOUahWUZBpLhIDoKHZE1oYWdtdFlPbXVPVW94XmJpb2NcZWJ0fl9RanKTjVBaiZh9bGZmYYKAP0mRhltee4GBcFRlko5RTJ9fO4iYgIeOPTXIkiE8pIpcNWODcGVKRJRvdJhgNmGemTZFpHtVfZRjNGSahmdvWlBZVFp6eGNsZUxjbGKAjXhTcnZrd6WqiEZvmpFjYoRnQHKHjIVXPIKiiWM8XYWhiUhsqGk1hqWJZYcZSnusZ0ZrihJu55tTJ5WnKnLEjUNdfWoyZLSWNlV+hG93Uyg60r1eHXuxVZG4ZQ2bw3AmR3eSY11kYERZZoOJcEFVnmdgxLBAF7V9EFfJgFx7XzFC03g7lZtXJLlsFT+5Yjd4oVkcwcFLH7SabyaIUkqIb0xdxJZfJ8CXMEWleDhehXo5WIFfOohvfG9cLn3+vUkQ9WkWrKsyJZ5oPo5oQGxYUmBVTUpSZ3NvUi5IXIWGbk9xgnlvk4RkKlZrYpCXdTU2SlVle3RlUkVLXoGDYztFXWp6g3NRMU1wko50QE6BgF9SZEY0TmuFglVFXXJoX2hhPjhJZXuDZj5HZYeFcVI7TXSah2o/RlBWWWRcQjI+V3N/aDtAWWxygntjOjpkl5ZtMzNbanl4ZEU0RGqJimw/TFlfYmheSjg/SnJ8Zz5GWmZxf31xUTo+Z5iZbTEuWHeCfmo9Lk96mYZcLjhXY2ptXD8uQF97f2EzQF1ufYmGfUsvQ4OkkVkiL1t0h4BtQiFAeJuOYy4nS2p3cFw8KD5eeoRiMjpZb4GKioJrQTZYkJ6OXSstVXKMi3lUJyd1r6dTHSdWfoREYH9hWWhvRUo7GmOpuFU1",
//     lose: "data:audio/wav;base64,UklGRvQCAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YdACAAB3fn2DgnNyd3yCiop8dXaDhIiIfnV3f4OIgnx2eIGEiId8dXiChYmIfHV3goSIh3x1d4GEiIZ7dHaCg4eGe3R2gYOGhXp0dYCChYV6c3WAgoWFenN1f4KFhHlydX+ChYR5cnV/goWDeHF0foGEg3dxdH2Bg4J3cHN9gYOCdnBzfICCgXVvc36AgYF1b3J9gIGBdG5yfYCBgHRucX1/gIBzbXF8f4B/cm1wfH+AfnJtcHt/f35xbG98fn99cGxufH5/fXBrbXt+fn1va2x7fX59bmtren19fG5qa3p9fXxtaWp6fHx7bWlqeXx8e21panhzTjc4UWqIpLitjGBMQEJciZ2Rd1ZMUWNXSWR5b2BpZFBBcIN2SFFfTVF+lXRCTnOLh2lkfIJvXFeIpm4rQXJzWmSDfmVZZ1U1V3yre0pIU01mjIlpWF9xbVljn61sOVSDe1ZtlH1XVnBcQ2WOlm5EX3lkU2Rxc2Beakt1oKBnNlyNh2NbhJdpTWdnWWRvYlpigolubpKTamJ+lnVccohwU3GXhl1Zh353XW6BUUW13ZosPrzETiOo33svWNGkOzNIH1nJpGI8Mz9GlYdUKEZsaYNXMDN4W0LLvF0EYaleDFCNXRg8e2w9f+OzQg6Lz3saSbeMOC5ccFwqS5BpP1xtVj1doGw3b7SMRj5wg1w2YZ+PV0WEk2hMcYBhP46qbCpYmnNAU4RzWU5dUXGMjW9jfWtaf4Z1Y2xXb4qYg16Ab3iEemxxZ2iGi316Z3BzfH57dXJyd36Be3p3c3N6fX16d3V0d3t9e3h2dnZ5fHx6d3Z2eHt8enl3d3d5e3t6eHd3eHp7enl3d3h6e3p5eHh4enp6eXh4eHl6enl4eHh5enp5eHd4eXl6eXh3d3l5enl4d3d5eXp5eHd3eXl6eXh3d3l5enl4eHh5eXp5eHh4eXl6eXl4eHl5enl5eHh5eXp5eXl5eXl6",
//     youreIt:
//       "data:audio/wav;base64,UklGRrQCAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YZACAABMTExMTExMTExMTExMUFBQUFBQUFBQUFBQUFBUVFRUVFRUVFRUVFRUVFRYWFhYWFhYWFhYWFhYWFxcXFxcXFxcXFxcXFxcYGBgYGBgYGBgYGBgYGBkZGRkZGRkZGRkZGRkZGRoaGhoaGhoaGhoaGhoaGxsbGxsbGxsbGxsbGxsbHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwbGxsbGxsbGxsbGxsbGxoaGhoaGhoaGhoaGhoaGRkZGRkZGRkZGRkZGRkYGBgYGBgYGBgYGBgYGBcXFxcXFxcXFxcXFxcXFhYWFhYWFhYWFhYWFhYVFRUVFRUVFRUVFRUVFRQUFBQUFBQUFBQUFBQUExMTExMTExMTExMTExMTExMTExMTExMTExMTExMVFRUVFRUVFRUVFRUVFRcXFxcXFxcXFxcXFxcXFxkZGRkZGRkZGRkZGRkZGRsbGxsbGxsbGxsbGxsbGx0dHR0dHR0dHR0dHR0dHR8fHx8fHx8fHx8fHx8fISEhISEhISEhISEhISEhIiIiIiIiIiIiIiIiIiIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyLi4uLi4uLi4uLi4uLi4uIiIiIiIiIiIiIiIiIiIeHh4eHh4eHh4eHh4eHh4ODg4ODg4ODg4ODg4ODg3t7e3t7e3t7e3t7e3t7enp6enp6enp6enp6enp6eHh4eHh4eHh4eHh4eHh4enp6enp6enp6enp6enp6",
//   };

//   const sound = sounds[type];
//   if (sound) {
//     const audio = new Audio(sound);
//     audio.play().catch((err) => console.log("Audio play error:", err));
//   }
// }

// // Create audio context for custom sounds (optional, for future use)
// let audioContext;
// function initAudio() {
//   try {
//     audioContext = new (window.AudioContext || window.webkitAudioContext)();
//   } catch (e) {
//     console.log("Web Audio API not supported in this browser");
//   }
// }

// // Function to create custom sound effects (optional, for future use)
// function createCustomSound(type) {
//   if (!audioContext) return;

//   const oscillator = audioContext.createOscillator();
//   const gainNode = audioContext.createGain();

//   oscillator.connect(gainNode);
//   gainNode.connect(audioContext.destination);

//   switch (type) {
//     case "powerup":
//       oscillator.type = "sine";
//       oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
//       oscillator.frequency.exponentialRampToValueAtTime(
//         1200,
//         audioContext.currentTime + 0.5
//       );
//       gainNode.gain.setValueAtTime(1, audioContext.currentTime);
//       gainNode.gain.exponentialRampToValueAtTime(
//         0.01,
//         audioContext.currentTime + 0.5
//       );
//       oscillator.start();
//       oscillator.stop(audioContext.currentTime + 0.5);
//       break;

//     case "error":
//       oscillator.type = "square";
//       oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
//       oscillator.frequency.exponentialRampToValueAtTime(
//         100,
//         audioContext.currentTime + 0.3
//       );
//       gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
//       gainNode.gain.exponentialRampToValueAtTime(
//         0.01,
//         audioContext.currentTime + 0.3
//       );
//       oscillator.start();
//       oscillator.stop(audioContext.currentTime + 0.3);
//       break;
//   }
// }

// document.addEventListener("DOMContentLoaded", () => {
//   initAudio();

//   // Initialize the game
//   initGame();

//   // Adjust canvas size on window load
//   adjustCanvasSize();
// });

// // Handle visibility change to pause/resume game
// document.addEventListener("visibilitychange", () => {
//   if (document.hidden) {
//     // Pause game or reduce updates when tab is not visible
//     console.log("Game paused - tab not visible");
//   } else {
//     // Resume game when tab is visible again
//     console.log("Game resumed - tab visible");
//     adjustCanvasSize();
//   }
// });
// Line 1
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

// Line 16
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
const PLAYER_SIZE = 30;
const FRAME_RATE = 60;
const UPDATE_INTERVAL = 1000 / FRAME_RATE;
const movementSpeed = 5;

// Add the directionPressed state object
// Line 31
const directionPressed = {
  up: false,
  down: false,
  left: false,
  right: false,
};

// Line 38
// Initialize the game
function initGame() {
  // Set canvas size
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  connectToServer();

  setupEventListeners();

  gameLoop();
}

// Line 49
// Connect to WebSocket server
function connectToServer() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("Connected to server");
    // Get player name from local storage or prompt
    const savedName = localStorage.getItem("playerName");
    if (savedName) {
      playerNameInput.value = savedName;
      setPlayerName(savedName);
    }
  };

  ws.onclose = () => {
    showNotification("Connection lost. Reconnecting...");
    setTimeout(connectToServer, 3000);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    showNotification("Connection error. Please refresh the page.");
  };

  ws.onmessage = handleMessage;
}

// Line 76
// Handle incoming WebSocket messages
function handleMessage(msg) {
  try {
    const data = JSON.parse(msg.data);

    switch (data.type) {
      case "init":
        handleInitMessage(data);
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
        playSound("tag");
        break;

      case "playerDisconnected":
        delete players[data.id];
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

// Line 135
// Handle initial connection data
function handleInitMessage(data) {
  myId = data.id;
  players = data.players;
  taggerId = data.taggerId;
  gameRunning = data.gameRunning;
  gameTime = data.gameTime;
  canvasWidth = data.canvasWidth;
  canvasHeight = data.canvasHeight;

  // Update canvas dimensions
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Update UI
  timerValue.textContent = gameTime;
  updatePlayersList();

  if (gameRunning) {
    startBtn.disabled = true;
    statusMessage.textContent = "Game in progress";
  }
}

// Line 156
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

// Line 178
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

// Line 199
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

  // Display winner message
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

// Line 253
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
    if (!gameRunning) {
      ws.send(JSON.stringify({ type: "start" }));
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

// Line 293 - ADD THIS NEW FUNCTION
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
    }`;

    const scoreElement = document.createElement("div");
    scoreElement.className = "player-score";
    scoreElement.textContent = player.score !== undefined ? player.score : 0;

    playerElement.appendChild(colorElement);
    playerElement.appendChild(nameElement);
    playerElement.appendChild(scoreElement);

    playersList.appendChild(playerElement);
  }
}

// Line 432
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

// Line 445
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

// Line 482
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
      ctx.fillText(
        "Press START to begin!",
        canvas.width / 2,
        canvas.height / 2 + 40
      );
    }
  }
}

// Line 551
// Draw grid background
function drawGrid() {
  const gridSize = 40;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Line 571
// Draw highlight around player
function drawPlayerHighlight(player) {
  ctx.beginPath();
  ctx.strokeStyle = "#3498db";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.arc(player.x, player.y, PLAYER_SIZE + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Line 581
// Adjust canvas size based on window size
function adjustCanvasSize() {
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;

  // Keep aspect ratio
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

// Line 609
function playSound(type) {
  const sounds = {
    tag: "data:audio/wav;base64,UklGRiQDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQADAACBhYqFbF1fdJKrqYhyeJGTZ0ZQh7TQtH5cT3avn2peaZG2x72SZ0lvenNYY4OhudC/n3ZkbX11WVJkd6XF1ap4TnOVh1hKa5aovZFxXWF5gWBYYn2UprCwoXdpa3+AalpddYmdr7CkhGhrdH9xXltugo2aqJ2KcnN8gHtpW1tzhZqopJB6aXCAdWhYWXKHnKyolntpbHp4aV5hfJCfrqeSeGdwe4BsXVlre5SepZJ6Z3J8fWhbXWt+lKKmjXlucHZ1aWFoc4qYoKKNdGhzgm9nXGF5jZyjl4BtcHpwZ19nfI+Zn5J6cH6BdWNaXG6KlZuVh3R6gXFeXWZ3iJSdmYN6gIF4Z1tcaX6KmJmMiJKbkW1XW2p6hYuUkouBe3+BdFRNXnmMm5y7tbBtYG2EhW9gXXuMkZjHqGpthZCIaDIaMVzE2MCVa3GFi2ouKUdni5yfr5iJcXGQi2cqFyEhXLPUwqKAdXdpQjMyPU1hf5CinpmvqW0uLkF0Z3mSiq6qVlaArKWIXUVKTF9rd5mgn3RpcJ2TVVJigVplZ5Cnn4+WhWlYTmR/eIKKkZKMdm2CgGtQU2JybYObrauYgmpyh3tYPEdhX2qGnqGXjG5gYoF7ZVp3jouKjZiOhYFybWNadX16gIuSlpCDfWlpbm1jXmx4g4yWmZCCeXl+d2lgaoCVrL2umXUyNWlsdXR/gIGEhYF3cXFvbnt/fHx8d0QxQGt9eGhlXl9gX2FkaWZlanSFo6GJgn56fXJpbW53dXJ3en+ChIaGioiJfG9zdnRycrCxsLlwMTE+QUlPl4dxZmZjVkpMUl5iZXJ9h4mJk6imfWRwcmtjYGmDiX94fnlvdnFCYZGOc5KYFhFQhK2TVFWUY15cXV9dXmBcWXONjZqzrYBiY2hcP0RUgaiiUVZ8d2RnTk9UWGRuho6Uk4qFfHp9gYJ6bGRiZ3l/gomFfXhxaWuCfWtgYGNrdIOPlJOLgX57fn5xYFRPVmh4gpOZnJ2YhHdtbjsnLDo+Yk9FTVVNN0M+",
    gameStart:
      "data:audio/wav;base64,UklGRmQEAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YUAEAABsbGxsbGxsbGxsbGxsbGx2dnZ2dnZ2dnZ2dnZ2dnaCgoKCgoKCgoKCgoKCgoKNjY2NjY2NjY2NjY2NjY2YmJiYmJiYmJiYmJiYmJijo6Ojo6Ojo6Ojo6Ojo6Ourq6urq6urq6urq6urq65ubm5ubm5ubm5ubm5ubm5xMTExMTExMTExMTExMTExcXFxcXFxcXFxcXFxcXFxcXFwcHBwcHBwcHBwcHBwcHBvb29vb29vb29vb29vb29uLi4uLi4uLi4uLi4uLi4s7Ozs7Ozs7Ozs7Ozs7Ozrq6urq6urq6urq6urq6uqqqqqqqqqqqqqqqqqqqqqqurq6urq6urq6urq6urq6utra2tra2tra2tra2tra2tra2tra2tra2tra2tra2trK2trKysrKysrKysrKysrKuqqqqqqqqqqqqqqqqqqqmpqampqampqampqampqaioqKioqKioqKioqKioqKhoaGhoaGhoaGhoaGhoaGfn5+fn5+fn5+fn5+fn5+dnZ2dnZ2dnZ2dnZ2dnZ2cnJycnJycnJycnJycnJyampqampqampqampqampqampqampqampqampqampqa////////////////////xcXFxcXFxcXFxcXFxcXFxdXV1dXV1dXV1dXV1dXV1eLi4uLi4uLi4uLi4uLi4urq6urq6urq6urq6urq6ur29vb29vb29vb29vb29vYCAgICAgICAgICAgICAgIKCgoKCgoKCgoKCgoKCgoKDg4ODg4ODg4ODg4ODg4OFhYWFhYWFhYWFhYWFhYWEhISEhISEhISEhISEhISCgoKCgoKCgoKCgoKCgoKBgYGBgYGBgYGBgYGBgYF/f39/f39/f39/f39/f39+fn5+fn5+fn5+fn5+fn58fHx8fHx8fHx8fHx8fHx7e3t7e3t7e3t7e3t7e3t5eXl5eXl5eXl5eXl5eXl4eHh4eHh4eHh4eHh4eHh2dnZ2dnZ2dnZ2dnZ2dnZ1dXV1dXV1dXV1dXV1dXV0dHR0dHR0dHR0dHR0dHRzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N0dHR0dHR0dHR0dHR0dHR1dXV1dXV1dXV1dXV1dXV2dnZ2dnZ2dnZ2dnZ2dnZ4eHh4eHh4eHh4eHh4eHh6enp6enp6enp6enp6enp8fHx8fHx8fHx8fHx8fHx+fn5+fn5+fn5+fn5+fn6AgICAgICAgICAgICAgICCgoKCgoKCgoKCgoKCgoKEhISEhISEhISEhISEhISGhoaGhoaGhoaGhoaGhoaIiIiIiIiIiIiIiIiIiIiKioqKioqKioqKioqKioqMjIyMjIyMjIyMjIyMjIyOjo6Ojo6Ojo6Ojo6Ojo6QkJCQkJCQkJCQkJCQkJCSkpKSkpKSkpKSkpKSkpKUlJSUlJSUlJSUlJSUlJSWlpaWlpaWlpaWlpaWlpaYmJiYmJiYmJiYmJiYmJiZmZmZmZmZmZmZmZmZmZmampqampqampqampqampqampqampqampqampqampqZmZmZmZmZmZmZmZmZmZk=",
    win: "data:audio/wav;base64,UklGRvQDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YdADAABQUFdpZVpXaXVzaWJkdHptZHB2b2p4c29ydGtzb3lyf3RmcpCBYG+VgWN7jH9sjXtpiot/cYV6doOEdHR3fYSAcnmXg1Rfi6hyaWRoWDlYhJVZMWSRmYd6aFRYoIkpKnWMi2UkO4SZiU5Pc4R4XkVwfUkzartTM7JzQXWGOUahWUZBpLhIDoKHZE1oYWdtdFlPbXVPVW94XmJpb2NcZWJ0fl9RanKTjVBaiZh9bGZmYYKAP0mRhltee4GBcFRlko5RTJ9fO4iYgIeOPTXIkiE8pIpcNWODcGVKRJRvdJhgNmGemTZFpHtVfZRjNGSahmdvWlBZVFp6eGNsZUxjbGKAjXhTcnZrd6WqiEZvmpFjYoRnQHKHjIVXPIKiiWM8XYWhiUhsqGk1hqWJZYcZSnusZ0ZrihJu55tTJ5WnKnLEjUNdfWoyZLSWNlV+hG93Uyg60r1eHXuxVZG4ZQ2bw3AmR3eSY11kYERZZoOJcEFVnmdgxLBAF7V9EFfJgFx7XzFC03g7lZtXJLlsFT+5Yjd4oVkcwcFLH7SabyaIUkqIb0xdxJZfJ8CXMEWleDhehXo5WIFfOohvfG9cLn3+vUkQ9WkWrKsyJZ5oPo5oQGxYUmBVTUpSZ3NvUi5IXIWGbk9xgnlvk4RkKlZrYpCXdTU2SlVle3RlUkVLXoGDYztFXWp6g3NRMU1wko50QE6BgF9SZEY0TmuFglVFXXJoX2hhPjhJZXuDZj5HZYeFcVI7TXSah2o/RlBWWWRcQjI+V3N/aDtAWWxygntjOjpkl5ZtMzNbanl4ZEU0RGqJimw/TFlfYmheSjg/SnJ8Zz5GWmZxf31xUTo+Z5iZbTEuWHeCfmo9Lk96mYZcLjhXY2ptXD8uQF97f2EzQF1ufYmGfUsvQ4OkkVkiL1t0h4BtQiFAeJuOYy4nS2p3cFw8KD5eeoRiMjpZb4GKioJrQTZYkJ6OXSstVXKMi3lUJyd1r6dTHSdWfoREYH9hWWhvRUo7GmOpuFU1",
    lose: "data:audio/wav;base64,UklGRvQCAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YdACAAB3fn2DgnNyd3yCiop8dXaDhIiIfnV3f4OIgnx2eIGEiId8dXiChYmIfHV3goSIh3x1d4GEiIZ7dHaCg4eGe3R2gYOGhXp0dYCChYV6c3WAgoWFenN1f4KFhHlydX+ChYR5cnV/goWDeHF0foGEg3dxdH2Bg4J3cHN9gYOCdnBzfICCgXVvc36AgYF1b3J9gIGBdG5yfYCBgHRucX1/gIBzbXF8f4B/cm1wfH+AfnJtcHt/f35xbG98fn99cGxufH5/fXBrbXt+fn1va2x7fX59bmtren19fG5qa3p9fXxtaWp6fHx7bWlqeXx8e21panhzTjc4UWqIpLitjGBMQEJciZ2Rd1ZMUWNXSWR5b2BpZFBBcIN2SFFfTVF+lXRCTnOLh2lkfIJvXFeIpm4rQXJzWmSDfmVZZ1U1V3yre0pIU01mjIlpWF9xbVljn61sOVSDe1ZtlH1XVnBcQ2WOlm5EX3lkU2Rxc2Beakt1oKBnNlyNh2NbhJdpTWdnWWRvYlpigolubpKTamJ+lnVccohwU3GXhl1Zh353XW6BUUW13ZosPrzETiOo33svWNGkOzNIH1nJpGI8Mz9GlYdUKEZsaYNXMDN4W0LLvF0EYaleDFCNXRg8e2w9f+OzQg6Lz3saSbeMOC5ccFwqS5BpP1xtVj1doGw3b7SMRj5wg1w2YZ+PV0WEk2hMcYBhP46qbCpYmnNAU4RzWU5dUXGMjW9jfWtaf4Z1Y2xXb4qYg16Ab3iEemxxZ2iGi316Z3BzfH57dXJyd36Be3p3c3N6fX16d3V0d3t9e3h2dnZ5fHx6d3Z2eHt8enl3d3d5e3t6eHd3eHp7enl3d3h6e3p5eHh4enp6eXh4eHl6enl4eHh5enp5eHd4eXl6eXh3d3l5enl4d3d5eXp5eHd3eXl6eXh3d3l5enl4eHh5eXp5eHh4eXl6eXl4eHl5enl5eHh5eXp5eXl5eXl6",
    youreIt:
      "data:audio/wav;base64,UklGRrQCAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YZACAABMTExMTExMTExMTExMUFBQUFBQUFBQUFBQUFBUVFRUVFRUVFRUVFRUVFRYWFhYWFhYWFhYWFhYWFxcXFxcXFxcXFxcXFxcYGBgYGBgYGBgYGBgYGBkZGRkZGRkZGRkZGRkZGRoaGhoaGhoaGhoaGhoaGxsbGxsbGxsbGxsbGxsbHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwbGxsbGxsbGxsbGxsbGxoaGhoaGhoaGhoaGhoaGRkZGRkZGRkZGRkZGRkYGBgYGBgYGBgYGBgYGBcXFxcXFxcXFxcXFxcXFhYWFhYWFhYWFhYWFhYVFRUVFRUVFRUVFRUVFRQUFBQUFBQUFBQUFBQUExMTExMTExMTExMTExMTExMTExMTExMTExMTExMVFRUVFRUVFRUVFRUVFRcXFxcXFxcXFxcXFxcXFxkZGRkZGRkZGRkZGRkZGRsbGxsbGxsbGxsbGxsbGx0dHR0dHR0dHR0dHR0dHR8fHx8fHx8fHx8fHx8fISEhISEhISEhISEhISEhIiIiIiIiIiIiIiIiIiIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyLi4uLi4uLi4uLi4uLi4uIiIiIiIiIiIiIiIiIiIeHh4eHh4eHh4eHh4eHh4ODg4ODg4ODg4ODg4ODg3t7e3t7e3t7e3t7e3t7enp6enp6enp6enp6enp6eHh4eHh4eHh4eHh4eHh4enp6enp6enp6enp6enp6",
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

// Line 717
document.addEventListener("DOMContentLoaded", () => {
  initAudio();

  // Initialize the game
  initGame();

  // Adjust canvas size on window load
  adjustCanvasSize();
});

// Line 726
// Handle visibility change to pause/resume game
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Pause game or reduce updates when tab is not visible
    console.log("Game paused - tab not visible");
  } else {
    // Resume game when tab is visible again
    console.log("Game resumed - tab visible");
    adjustCanvasSize();
  }
});
