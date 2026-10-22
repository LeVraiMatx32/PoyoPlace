// URL de l'API de ton bot (ex: endpoint sur KataBump)
const BOT_API_URL = "HTTPS://TON-BOT-URL.kdns.fr"; 

const canvas = document.getElementById('placeCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const placeBtn = document.getElementById('placeBtn');
const cooldownDisplay = document.getElementById('cooldownTimer');
const userInfoDisplay = document.getElementById('user-info');

let selectedX = 0;
let selectedY = 0;
let currentUser = null;
let lastPlacedTime = 0;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// 1. Initialisation avec Discord SDK
async function initDiscord() {
  try {
    const discordSdk = new DiscordSDK.DiscordSDK(YOUR_DISCORD_CLIENT_ID);
    await discordSdk.ready();
    
    // Récupération automatique de l'utilisateur Discord
    currentUser = discordSdk.user; // Contient id, username, avatar, etc.
    userInfoDisplay.innerText = `Connecté en tant que : ${currentUser.username}`;
  } catch (e) {
    console.warn("Éxécuté hors de Discord ou SDK non configuré : Mode Test");
    currentUser = { id: "123456789", username: "Testeur" };
    userInfoDisplay.innerText = `Mode Test (${currentUser.username})`;
  }
}

// 2. Sélection du pixel au clic
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  selectedX = Math.floor((e.clientX - rect.left) * scaleX);
  selectedY = Math.floor((e.clientY - rect.top) * scaleY);

  console.log(`Pixel sélectionné: X=${selectedX}, Y=${selectedY}`);
});

// 3. Poser le pixel et envoyer au bot
placeBtn.addEventListener('click', async () => {
  const now = Date.now();
  if (now - lastPlacedTime < COOLDOWN_MS) {
    alert("Attends la fin du cooldown de 5 minutes !");
    return;
  }

  const payload = {
    userId: currentUser.id,
    username: currentUser.username,
    x: selectedX,
    y: selectedY,
    color: colorPicker.value
  };

  try {
    // Envoi au Bot Discord
    const response = await fetch(`${BOT_API_URL}/api/place-pixel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // Dessiner directement le pixel sur le canvas
      ctx.fillStyle = payload.color;
      ctx.fillRect(payload.x, payload.y, 1, 1);
      
      lastPlacedTime = Date.now();
      startCooldown();
    } else {
      alert("Erreur lors de l'enregistrement par le bot !");
    }
  } catch (err) {
    console.error("Erreur de connexion avec le bot :", err);
  }
});

// 4. Timer de 5 minutes
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

initDiscord();