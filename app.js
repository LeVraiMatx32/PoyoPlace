const BOT_API_URL = "HTTPS://TON-BOT-URL.kdns.fr"; 

const container = document.getElementById('canvasContainer');
const canvas = document.getElementById('placeCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const placeBtn = document.getElementById('placeBtn');
const cooldownDisplay = document.getElementById('cooldownTimer');
const userInfoDisplay = document.getElementById('user-info');
const coordsDisplay = document.getElementById('coordsDisplay');

const GRID_SIZE = 500;
canvas.width = GRID_SIZE;
canvas.height = GRID_SIZE;

// Matrice pour stocker les couleurs de chaque pixel (blanc par défaut "#FFFFFF")
let pixelData = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill("#FFFFFF"));

let scale = 1;
let panX = 0;
let panY = 0;

let selectedX = null;
let selectedY = null;
let currentUser = null;
let lastPlacedTime = 0;
const COOLDOWN_MS = 3 * 60 * 1000; // Changé à 3 minutes

let isDragging = false;
let startX = 0;
let startY = 0;
let touchStartDist = 0;
let initialScale = 1;

// Redessiner tout le canvas (pixels + quadrillage + sélection)
function drawCanvas() {
  ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);

  // 1. Dessiner les pixels
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (pixelData[y][x] !== "#FFFFFF") {
        ctx.fillStyle = pixelData[y][x];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // 2. Dessiner un quadrillage très fin (visible seulement si on zoome assez)
  if (scale > 4) {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 0.05; // Ligne ultra-fine
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, GRID_SIZE);
      ctx.moveTo(0, i);
      ctx.lineTo(GRID_SIZE, i);
    }
    ctx.stroke();
  }

  // 3. Contour doré scintillant pour la case sélectionnée
  if (selectedX !== null && selectedY !== null) {
    // Effet scintillant basé sur le temps (oscillation alpha)
    const pulse = (Math.sin(Date.now() / 150) + 1) / 2; // Entre 0 et 1
    const glowAlpha = 0.4 + pulse * 0.6;

    ctx.strokeStyle = `rgba(255, 215, 0, ${glowAlpha})`; // Or (Gold)
    ctx.lineWidth = 0.15;
    ctx.strokeRect(selectedX, selectedY, 1, 1);
  }
}

// Boucle d'animation pour faire vivre le scintillement doré en continu
function animLoop() {
  drawCanvas();
  requestAnimationFrame(animLoop);
}

function centerCanvas() {
  const rect = container.getBoundingClientRect();
  scale = Math.min(rect.width, rect.height) / GRID_SIZE * 0.9;
  panX = (rect.width - GRID_SIZE * scale) / 2;
  panY = (rect.height - GRID_SIZE * scale) / 2;
  updateTransform();
}

function updateTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  canvas.style.transformOrigin = '0 0';
}

// Zoom molette
container.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const newScale = Math.min(Math.max(0.5, scale * zoomFactor), 60);

  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  panX = mouseX - (mouseX - panX) * (newScale / scale);
  panY = mouseY - (mouseY - panY) * (newScale / scale);
  scale = newScale;

  updateTransform();
}, { passive: false });

// Déplacement souris
container.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
  }
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// Tactile
container.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    startX = e.touches[0].clientX - panX;
    startY = e.touches[0].clientY - panY;
  } else if (e.touches.length === 2) {
    isDragging = false;
    touchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    initialScale = scale;
  }
});

container.addEventListener('touchmove', (e) => {
  if (isDragging && e.touches.length === 1) {
    panX = e.touches[0].clientX - startX;
    panY = e.touches[0].clientY - startY;
    updateTransform();
  } else if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );

    if (touchStartDist > 0) {
      const zoomFactor = dist / touchStartDist;
      const newScale = Math.min(Math.max(0.5, initialScale * zoomFactor), 60);
      
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      panX = midX - (midX - panX) * (newScale / scale);
      panY = midY - (midY - panY) * (newScale / scale);
      scale = newScale;

      updateTransform();
    }
  }
});

container.addEventListener('touchend', () => {
  isDragging = false;
  touchStartDist = 0;
});

// Sélection d'une case au clic
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  selectedX = Math.floor(clickX / scale);
  selectedY = Math.floor(clickY / scale);

  selectedX = Math.max(0, Math.min(GRID_SIZE - 1, selectedX));
  selectedY = Math.max(0, Math.min(GRID_SIZE - 1, selectedY));

  coordsDisplay.innerText = `X: ${selectedX}, Y: ${selectedY}`;
});

// Poser le pixel
placeBtn.addEventListener('click', async () => {
  if (selectedX === null || selectedY === null) {
    alert("Sélectionne d'abord une case sur la grille !");
    return;
  }

  const now = Date.now();
  if (now - lastPlacedTime < COOLDOWN_MS) {
    alert("Attends la fin du cooldown de 3 minutes !");
    return;
  }

  const payload = {
    userId: currentUser ? currentUser.id : "12345",
    username: currentUser ? currentUser.username : "Testeur",
    x: selectedX,
    y: selectedY,
    color: colorPicker.value
  };

  try {
    // Appliquer localement le pixel dans la matrice
    pixelData[selectedY][selectedX] = payload.color;
    
    lastPlacedTime = Date.now();
    startCooldown();
  } catch (err) {
    console.error("Erreur :", err);
  }
});

// Timer de 3 minutes
function startCooldown() {
  placeBtn.disabled = true;
  const interval = setInterval(() => {
    const remaining = COOLDOWN_MS - (Date.now() - lastPlacedTime);
    if (remaining <= 0) {
      clearInterval(interval);
      placeBtn.disabled = false;
      cooldownDisplay.innerText = "Prêt !";
    } else {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      cooldownDisplay.innerText = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }
  }, 1000);
}

window.addEventListener('resize', centerCanvas);
centerCanvas();
requestAnimationFrame(animLoop); // Lancement de l'animation en continu
