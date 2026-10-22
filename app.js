const BOT_API_URL = "HTTPS://TON-BOT-URL.kdns.fr"; 

const container = document.getElementById('canvasContainer');
const canvas = document.getElementById('placeCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const placeBtn = document.getElementById('placeBtn');
const cooldownDisplay = document.getElementById('cooldownTimer');
const userInfoDisplay = document.getElementById('user-info');
const coordsDisplay = document.getElementById('coordsDisplay');

// Dimensions du canvas
const GRID_SIZE = 500;
canvas.width = GRID_SIZE;
canvas.height = GRID_SIZE;

// Remplir le canvas en blanc par défaut
ctx.fillStyle = '#FFFFFF';
ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

// Variables de caméra / zoom
let scale = 1;
let panX = 0;
let panY = 0;

let selectedX = 0;
let selectedY = 0;
let currentUser = null;
let lastPlacedTime = 0;
const COOLDOWN_MS = 5 * 60 * 1000;

// Variables pour les contrôles (Souris & Tactile)
let isDragging = false;
let startX = 0;
let startY = 0;
let touchStartDist = 0;
let initialScale = 1;

// Centrer le canvas au chargement
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

// 1. Zoom à la molette (Souris)
container.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const newScale = Math.min(Math.max(0.5, scale * zoomFactor), 50);

  // Zoom ciblé sur la position de la souris
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  panX = mouseX - (mouseX - panX) * (newScale / scale);
  panY = mouseY - (mouseY - panY) * (newScale / scale);
  scale = newScale;

  updateTransform();
}, { passive: false });

// 2. Déplacement à la souris
container.addEventListener('mousedown', (e) => {
  if (e.button === 0) { // Clic gauche
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

// 3. Gestion Tactile (Zoom à deux doigts & déplacement)
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
      const newScale = Math.min(Math.max(0.5, initialScale * zoomFactor), 50);
      
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

// 4. Sélection du pixel
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  selectedX = Math.floor(clickX / scale);
  selectedY = Math.floor(clickY / scale);

  // Limiter les coordonnées à la grille 500x500
  selectedX = Math.max(0, Math.min(GRID_SIZE - 1, selectedX));
  selectedY = Math.max(0, Math.min(GRID_SIZE - 1, selectedY));

  coordsDisplay.innerText = `X: ${selectedX}, Y: ${selectedY}`;
});

// 5. Poser le pixel
placeBtn.addEventListener('click', async () => {
  const now = Date.now();
  if (now - lastPlacedTime < COOLDOWN_MS) {
    alert("Attends la fin du cooldown de 5 minutes !");
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
    // Application locale immédiate pour le test
    ctx.fillStyle = payload.color;
    ctx.fillRect(payload.x, payload.y, 1, 1);
    
    lastPlacedTime = Date.now();
    startCooldown();

    /* Quand ton bot sera prêt, décommente ceci :
    const response = await fetch(`${BOT_API_URL}/api/place-pixel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    */
  } catch (err) {
    console.error("Erreur de connexion :", err);
  }
});

// 6. Timer de 5 minutes
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

// Initialisation au démarrage
window.addEventListener('resize', centerCanvas);
centerCanvas();
