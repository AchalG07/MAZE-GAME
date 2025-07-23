let mazeContainer = document.getElementById("maze-container");
let sizeInput = document.getElementById("size");
let generateButton = document.getElementById("generate");
let solveButton = document.getElementById("solve");
let size = parseInt(sizeInput.value);
let maze = generateMaze(size);
let playerPosition = { x: 0, y: 0 };
let previousPosition = { x: 0, y: 0 };
let visited = {}; // This 'visited' is not directly used for player path, but for maze gen/solve
let previousPositions = []; // Used for player's visual path
let PlayerCanMove = true;

renderMaze(maze); // Initial render of the maze

generateButton.addEventListener("click", () => {
  size = parseInt(sizeInput.value);
  // Ensure size is odd for proper maze generation (common practice for perfect mazes)
  if (size % 2 === 0) {
    size += 1; // Increment if even
    sizeInput.value = size; // Update input field
  }
  maze = generateMaze(size);
  playerPosition = { x: 0, y: 0 };
  previousPositions = []; // Reset player path
  PlayerCanMove = true;

  renderMaze(maze);
});

solveButton.addEventListener("click", () => {
  PlayerCanMove = false; // Disable player movement when solution is shown
  const solution = solveMaze(maze, size);
  animateSolution(solution);
});

document.addEventListener("keydown", movePlayer);

function generateMaze(size) {
  // Initialize maze with all walls (15 = 1+2+4+8 for left, top, right, bottom)
  const maze = Array.from({ length: size }, () => Array(size).fill(15));
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const walls = []; // List of walls to be "knocked down"

  // Function to add walls around a given cell (x, y)
  function addWalls(x, y) {
    // Check left neighbor
    if (x > 0 && !visited[y][x - 1]) walls.push({ x, y, direction: "left" });
    // Check right neighbor
    if (x < size - 1 && !visited[y][x + 1])
      walls.push({ x, y, direction: "right" });
    // Check top neighbor
    if (y > 0 && !visited[y - 1][x]) walls.push({ x, y, direction: "up" });
    // Check bottom neighbor
    if (y < size - 1 && !visited[y + 1][x])
      walls.push({ x, y, direction: "down" });
  }

  // Start generation from a random cell
  let x = Math.floor(Math.random() * size);
  let y = Math.floor(Math.random() * size);
  visited[y][x] = true; // Mark as visited
  addWalls(x, y); // Add walls around the starting cell

  // Prim's algorithm-like approach: while there are walls to process
  while (walls.length > 0) {
    // Pick a random wall from the list
    const { x, y, direction } = walls.splice(
      Math.floor(Math.random() * walls.length),
      1
    )[0];

    let nx = x,
      ny = y; // Coordinates of the neighbor cell

    // Determine neighbor's coordinates based on direction
    if (direction === "left") nx--;
    else if (direction === "right") nx++;
    else if (direction === "up") ny--;
    else if (direction === "down") ny++;

    // If the neighbor is within bounds and not yet visited
    if (nx >= 0 && ny >= 0 && nx < size && ny < size && !visited[ny][nx]) {
      visited[ny][nx] = true; // Mark neighbor as visited

      // Remove walls between current cell (x,y) and neighbor (nx,ny)
      if (direction === "left") {
        maze[y][x] &= ~1; // Remove left wall of current cell
        maze[ny][nx] &= ~4; // Remove right wall of neighbor
      } else if (direction === "right") {
        maze[y][x] &= ~4; // Remove right wall of current cell
        maze[ny][nx] &= ~1; // Remove left wall of neighbor
      } else if (direction === "up") {
        maze[y][x] &= ~2; // Remove top wall of current cell
        maze[ny][nx] &= ~8; // Remove bottom wall of neighbor
      } else if (direction === "down") {
        maze[y][x] &= ~8; // Remove bottom wall of current cell
        maze[ny][nx] &= ~2; // Remove top wall of neighbor
      }

      // Add walls around the newly visited neighbor
      addWalls(nx, ny);
    }
  }

  return maze;
}

// Function to shuffle an array (not directly used in current maze generation, but good utility)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function renderMaze(maze, solution = []) {
  mazeContainer.style.gridTemplateColumns = `repeat(${size}, var(--cell-size))`;
  mazeContainer.style.gridTemplateRows = `repeat(${size}, var(--cell-size))`;
  mazeContainer.innerHTML = ""; // Clear existing maze

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x; // Store x coordinate as data attribute
      cell.dataset.y = y; // Store y coordinate as data attribute

      if (x === 0 && y === 0) cell.classList.add("start"); // Start cell
      if (x === size - 1 && y === size - 1) cell.classList.add("end"); // End cell

      // Add 'solution' class if the cell is part of the solution path
      if (solution.some((pos) => pos.x === x && pos.y === y)) {
        cell.classList.add("solution");
      }

      addWallsToCell(cell, maze[y][x]); // Add visual walls based on maze data
      mazeContainer.appendChild(cell);
    }
  }

  // Position the player
  const playerCell = document.querySelector(
    `.cell[data-x="${playerPosition.x}"][data-y="${playerPosition.y}"]`
  );
  if (playerCell) { // Check if playerCell exists to prevent errors
    playerCell.classList.add("player");
  }
}

// Renamed from addWalls to avoid conflict with maze generation function
function addWallsToCell(cell, value) {
  if (value & 1) cell.classList.add("left"); // Left wall exists if 1st bit is set
  if (value & 2) cell.classList.add("top"); // Top wall exists if 2nd bit is set
  if (value & 4) cell.classList.add("right"); // Right wall exists if 3rd bit is set
  if (value & 8) cell.classList.add("bottom"); // Bottom wall exists if 4th bit is set
}

function solveMaze(maze, size) {
  // Define possible directions (dx, dy)
  const directions = [
    { x: 1, y: 0 }, // Right
    { x: -1, y: 0 }, // Left
    { x: 0, y: 1 }, // Down
    { x: 0, y: -1 }  // Up
  ];
  const start = { x: 0, y: 0 };
  const end = { x: size - 1, y: size - 1 };

  // Queue for BFS, storing paths to each visited cell
  const queue = [[start]]; // Start with a path containing only the start cell
  // Keep track of visited cells to avoid cycles and redundant checks
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  visited[0][0] = true; // Mark start cell as visited

  while (queue.length) {
    const path = queue.shift(); // Get the first path from the queue
    const { x, y } = path[path.length - 1]; // Current cell is the last one in the path

    // If we reached the end, return the path
    if (x === end.x && y === end.y) {
      return path;
    }

    // Explore all possible directions from the current cell
    for (const { x: dx, y: dy } of directions) {
      const nx = x + dx; // New x coordinate
      const ny = y + dy; // New y coordinate

      // Check if the new cell is within bounds, not visited, and move is possible (no wall)
      if (
        nx >= 0 &&
        ny >= 0 &&
        nx < size &&
        ny < size &&
        !visited[ny][nx] &&
        canMove(maze[y][x], dx, dy)
      ) {
        visited[ny][nx] = true; // Mark new cell as visited
        queue.push([...path, { x: nx, y: ny }]); // Add new path to the queue
      }
    }
  }
  return []; // No solution found
}

// Checks if a move is possible from cell (based on its wall value) in a given direction (dx, dy)
function canMove(cellValue, dx, dy) {
  // Check if moving right and right wall is not present (bit 4 not set)
  if (dx === 1 && !(cellValue & 4)) return true;
  // Check if moving left and left wall is not present (bit 1 not set)
  if (dx === -1 && !(cellValue & 1)) return true;
  // Check if moving down and bottom wall is not present (bit 8 not set)
  if (dy === 1 && !(cellValue & 8)) return true;
  // Check if moving up and top wall is not present (bit 2 not set)
  if (dy === -1 && !(cellValue & 2)) return true;
  return false;
}

function animateSolution(solution) {
  let index = 0;

  const interval = setInterval(() => {
    if (index >= solution.length) {
      clearInterval(interval); // Stop animation when done
      // Optionally re-enable player movement or other actions here
      PlayerCanMove = true;
      return;
    }

    const { x, y } = solution[index];
    const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) {
      cell.classList.add("solution"); // Highlight solution path
    }
    index++;
  }, 100); // Animation speed (100ms per cell)
}

function movePlayer(event) {
  // Map arrow keys to direction changes (dx, dy)
  const directionMap = {
    ArrowUp: { dx: 0, dy: -1 },
    ArrowDown: { dx: 0, dy: 1 },
    ArrowLeft: { dx: -1, dy: 0 },
    ArrowRight: { dx: 1, dy: 0 }
  };

  if (PlayerCanMove) {
    if (directionMap[event.key]) {
      const { dx, dy } = directionMap[event.key];
      const newX = playerPosition.x + dx;
      const newY = playerPosition.y + dy;

      // Check if new position is valid (within bounds and no wall)
      if (
        newX >= 0 &&
        newY >= 0 &&
        newX < size &&
        newY < size &&
        canMove(maze[playerPosition.y][playerPosition.x], dx, dy)
      ) {
        previousPosition = { ...playerPosition }; // Store current position as previous
        playerPosition.x = newX;
        playerPosition.y = newY;
        updatePlayerPosition(dx, dy); // Update visual player position and path
      }

      // Check for win condition after every valid move
      if (playerPosition.x === size - 1 && playerPosition.y === size - 1) {
        setTimeout(() => { // Use setTimeout to ensure visual update happens first
          alert('Congratulations! You reached the goal!');
          PlayerCanMove = false; // Disable movement after winning
        }, 50);
      }
    }
  }
}

function updatePlayerPosition(dx, dy) {
  const oldCell = document.querySelector(
    `.cell[data-x="${previousPosition.x}"][data-y="${previousPosition.y}"]`
  );
  const newCell = document.querySelector(
    `.cell[data-x="${playerPosition.x}"][data-y="${playerPosition.y}"]`
  );

  if (oldCell) {
    oldCell.classList.remove("player"); // Remove player class from old cell
  }
  if (newCell) {
    newCell.classList.add("player"); // Add player class to new cell
  }

  let oldSpan = oldCell ? oldCell.querySelector("span") : null;
  let newSpan = newCell ? newCell.querySelector("span") : null;

  if (!oldSpan && oldCell) { // Create span if it doesn't exist
    oldSpan = document.createElement("span");
    oldCell.appendChild(oldSpan);
  }
  if (!newSpan && newCell) { // Create span if it doesn't exist
    newSpan = document.createElement("span");
    newCell.appendChild(newSpan);
  }

  // Logic for visual path (leaving a trail)
  // Check if the player is moving back along the previous path
  if (
    previousPositions.length > 0 &&
    previousPositions[previousPositions.length - 1].x === playerPosition.x &&
    previousPositions[previousPositions.length - 1].y === playerPosition.y
  ) {
    previousPositions.pop(); // Remove the last position from the trail
    if (oldSpan) {
      oldSpan.className = ""; // Clear class for the cell being "backtracked" from
    }

    // Remove the "hand" class from the new position if moving back
    if (dx === 1 && newSpan) { // Moved right, so remove to-left from newSpan
      newSpan.classList.remove("to-left");
    } else if (dx === -1 && newSpan) { // Moved left, so remove to-right from newSpan
      newSpan.classList.remove("to-right");
    } else if (dy === 1 && newSpan) { // Moved down, so remove to-top from newSpan
      newSpan.classList.remove("to-top");
    } else if (dy === -1 && newSpan) { // Moved up, so remove to-bottom from newSpan
      newSpan.classList.remove("to-bottom");
    }
  } else {
    // If moving forward, add appropriate "to" and "hand" classes
    if (oldSpan) { // Make sure oldSpan exists
      if (dx === 1) { // Moving right
        oldSpan.classList.add("to-right");
      } else if (dx === -1) { // Moving left
        oldSpan.classList.add("to-left");
      } else if (dy === 1) { // Moving down
        oldSpan.classList.add("to-bottom");
      } else if (dy === -1) { // Moving up
        oldSpan.classList.add("to-top");
      }
    }
    if (newSpan) { // Make sure newSpan exists
      if (dx === 1) { // Player just moved right, so new cell has "left-hand"
        newSpan.classList.add("left-hand");
      } else if (dx === -1) { // Player just moved left, so new cell has "right-hand"
        newSpan.classList.add("right-hand");
      } else if (dy === 1) { // Player just moved down, so new cell has "top-hand"
        newSpan.classList.add("top-hand");
      } else if (dy === -1) { // Player just moved up, so new cell has "bottom-hand"
        newSpan.classList.add("bottom-hand");
      }
    }
    previousPositions.push({ ...previousPosition }); // Add current position to history
  }
}