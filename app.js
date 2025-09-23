const STORAGE_KEY = "catagotchi-state-v2";
const MIN_STAT = 0;
const MAX_STAT = 100;
const catNameInput = document.getElementById("catName");
const levelLabel = document.getElementById("level-label");
const dayEmoji = document.getElementById("dayEmoji");
const dayLabel = document.getElementById("dayLabel");
const catScene = document.getElementById("catScene");
const catWanderer = document.getElementById("catWanderer");
const cat = document.getElementById("cat");
const identityAvatar = document.getElementById("identityAvatar");
const catSpriteCanvas = document.getElementById("catSpriteCanvas");
const catAccessoryOverlay = document.getElementById("accessory");
const catSpriteController = createCatSpriteController(catSpriteCanvas);
const hungerBar = document.getElementById("hungerBar");
const hungerValue = document.getElementById("hungerValue");
const energyBar = document.getElementById("energyBar");
const energyValue = document.getElementById("energyValue");
const funBar = document.getElementById("funBar");
const funValue = document.getElementById("funValue");
const xpBar = document.getElementById("xpBar");
const moodLabel = document.getElementById("moodLabel");
const toast = document.getElementById("toast");
const toastEmoji = document.getElementById("toastEmoji");
const toastMessage = document.getElementById("toastMessage");
const log = document.getElementById("log");
const logEntryTemplate = document.getElementById("logEntryTemplate");
const installButton = document.getElementById("installButton");
const notificationsButton = document.getElementById("notificationsButton");

const motionPreference =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

const REMINDER_DELAY_MS = 1000 * 60 * 90;
const MIN_REMINDER_DELAY_MS = 1000 * 30;

let deferredInstallPrompt = null;
let hasWarnedStructuredCloneFallback = false;
let reminderTimeoutId = null;

function deepClone(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (error) {
      if (!hasWarnedStructuredCloneFallback) {
        console.warn("structuredClone no disponible, usando copia alternativa", error);
        hasWarnedStructuredCloneFallback = true;
      }
    }
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }
  const clone = {};
  Object.keys(value).forEach((key) => {
    clone[key] = deepClone(value[key]);
  });
  return clone;
}

let currentSkinIndex = 0;
let lastMoodKey = null;
let lastMoodLabel = "";
const statSnapshot = { hunger: null, energy: null, fun: null, xp: null };
let lastLevelDisplayed = null;
let lastTitleRendered = "";
let lastCatPresentationKey = "";

const catSkins = [
  {
    id: "sakura",
    name: "Sakura",
    emoji: "🌸",
    pattern: "sakura",
    colors: {
      furMain: "#fbd6e8",
      furSecondary: "#f6adc9",
      furAccent: "#ffeef7",
      belly: "#fff8fb",
      earInner: "#ffb8d6",
      cheek: "#ff9ac4",
      outline: "#602041",
      paw: "#fff1f8",
      collar: "#ffdff2",
      collarStroke: "#ff9acc",
      nose: "#ff86b6",
      pupil: "#2d1428",
      tailTip: "#ffe9f4",
      iris: "#8ff0ff",
      patternMask: "#ffe2f2",
      patternDetail: "#ff9bcf",
    },
  },
  {
    id: "galaxia",
    name: "Luna",
    emoji: "🌙",
    pattern: "galaxia",
    colors: {
      furMain: "#dfe4ff",
      furSecondary: "#b8c0ff",
      furAccent: "#f5f7ff",
      belly: "#f9fbff",
      earInner: "#d6c4ff",
      cheek: "#ffb7f4",
      outline: "#2c2f6c",
      paw: "#eef2ff",
      collar: "#99f0ff",
      collarStroke: "#52c8f2",
      nose: "#ff89d2",
      pupil: "#221b46",
      tailTip: "#f0f3ff",
      iris: "#9cf6ff",
      patternMask: "#cfd6ff",
      patternDetail: "#96a2ff",
    },
  },
  {
    id: "crema",
    name: "Dulce",
    emoji: "🍮",
    pattern: "crema",
    colors: {
      furMain: "#fbe2b8",
      furSecondary: "#f3c585",
      furAccent: "#ffe9c6",
      belly: "#fff6e7",
      earInner: "#ffbfa4",
      cheek: "#ff9c84",
      outline: "#6b3a1f",
      paw: "#ffe9d0",
      collar: "#ffe27d",
      collarStroke: "#f2b83a",
      nose: "#ff8f6a",
      pupil: "#3a1a0e",
      tailTip: "#ffe0b0",
      iris: "#8bf8ff",
      patternMask: "#f4d19a",
      patternDetail: "#e8a963",
    },
  },
];

const defaultProgressBySkin = catSkins.reduce((acc, skin) => {
  acc[skin.id] = { level: 1, xp: 0 };
  return acc;
}, {});

function getName() {
  const fallbackSkin = catSkins[currentSkinIndex] ?? catSkins[0];
  if (typeof state.name === "string" && state.name.trim() !== "") {
    return state.name.trim();
  }
  return fallbackSkin?.name || "Pixel";
}

const defaultState = {
  name: catSkins[0].name,
  hunger: 82,
  energy: 82,
  fun: 82,
  xp: 0,
  level: 1,
  lastTick: Date.now(),
  lastInteraction: Date.now(),
  remindersEnabled: false,
  history: [],
  accessoriesUnlocked: false,
  dayMode: "day",
  skin: catSkins[0].id,
  progressBySkin: deepClone(defaultProgressBySkin),
};

const state = loadState();

state.dayMode = getAutomaticDayMode();

if (!Number.isFinite(state.lastInteraction)) {
  state.lastInteraction = Date.now();
}
if (typeof state.remindersEnabled !== "boolean") {
  state.remindersEnabled = false;
}

if (!state.skin || !catSkins.some((skin) => skin.id === state.skin)) {
  state.skin = catSkins[0].id;
}

currentSkinIndex = catSkins.findIndex((skin) => skin.id === state.skin);
if (currentSkinIndex === -1) {
  currentSkinIndex = 0;
  state.skin = catSkins[0].id;
}

if (!state.name || state.name === "Pixel") {
  state.name = catSkins[currentSkinIndex].name;
}

loadSkinProgress(state.skin);

const catActions = {
  feed: {
    emoji: "🍓",
    text: () => `${getName()} saborea un pastelito de flores y crema batida.`,
    effects: { hunger: +26, fun: +8, energy: -3 },
    xp: 14,
  },
  play: {
    emoji: "🪄",
    text: () => `${getName()} persigue destellos estelares por todo el salón.`,
    effects: { fun: +26, energy: -12, hunger: -8 },
    xp: 18,
  },
  nap: {
    emoji: "💤",
    text: () => `${getName()} se acurruca en una nube tibia de vainilla y ronronea.`,
    effects: { energy: +34, hunger: -8, fun: -4 },
    xp: 11,
  },
};

const samplePlayer = createSamplePlayer();
const soundEngine = createSoundEngine();

function createMeowPattern({ base = 460, stretch = 1, volume = 0.5 } = {}) {
  const sustain = 0.18 * stretch;
  return [
    {
      freq: base,
      duration: sustain,
      type: "triangle",
      volume,
      slide: 160,
    },
    {
      freq: base + 160,
      duration: 0.22 * stretch,
      type: "triangle",
      volume: volume * 0.9,
      delay: 0.04,
      slide: -240,
    },
    {
      freq: base - 40,
      duration: 0.2 * stretch,
      type: "sine",
      volume: volume * 0.75,
      delay: 0.02,
    },
  ];
}

function createPurrPattern({ base = 90, cycles = 6, volume = 0.3 } = {}) {
  return Array.from({ length: cycles }, (_, index) => {
    const offset = index % 2 === 0 ? -8 : 8;
    return {
      freq: base + offset,
      duration: 0.18,
      type: "sine",
      volume: volume * (index === 0 ? 1 : 0.85),
      delay: index === 0 ? 0 : 0.06,
      slide: offset > 0 ? -14 : 14,
    };
  });
}

const soundPatterns = {
  feed: () => createMeowPattern({ base: 400, stretch: 1.15, volume: 0.48 }),
  play: () => [
    ...createMeowPattern({ base: 540, stretch: 0.9, volume: 0.52 }),
    { freq: 720, duration: 0.12, type: "triangle", volume: 0.3, delay: 0.04, slide: -200 },
  ],
  nap: () => [
    { freq: 220, duration: 0.24, type: "sine", volume: 0.22, slide: -80 },
    ...createPurrPattern({ base: 86, cycles: 6, volume: 0.26 }),
  ],
  meow: () => createMeowPattern({ base: 460, stretch: 1, volume: 0.52 }),
  purr: () => createPurrPattern({ base: 88, cycles: 8, volume: 0.28 }),
};

function playSoundEffect(effectKey) {
  if (samplePlayer) {
    const playback = samplePlayer.play(effectKey);
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => playSynthEffect(effectKey));
      return;
    }
    if (playback) {
      return;
    }
  }
  playSynthEffect(effectKey);
}

function playSynthEffect(effectKey) {
  if (!soundEngine) return;
  const generator = soundPatterns[effectKey];
  if (!generator) return;
  const pattern = typeof generator === "function" ? generator() : generator;
  if (!Array.isArray(pattern) || pattern.length === 0) return;
  soundEngine.playPattern(pattern);
}

function playActionSound(actionKey) {
  switch (actionKey) {
  case "feed":
    playSoundEffect("feed");
    playSoundEffect("purr");
    break;
  case "nap":
    playSoundEffect("nap");
    playSoundEffect("purr");
    break;
  case "play":
    playSoundEffect("play");
    playSoundEffect("meow");
    break;
  default:
    playSoundEffect("meow");
  }
}

function playMoodSound(moodKey) {
  if (moodKey === "feliz") {
    playSoundEffect("purr");
  } else if (moodKey === "triste" || moodKey === "enfadado") {
    playSoundEffect("meow");
  }
}

const baseDegradeRates = {
  hunger: -2.4,
  energy: -2,
  fun: -2.2,
};

let degradeRates = { ...baseDegradeRates };
const DAY_MODE_CHECK_INTERVAL = 60 * 1000;
let dayModeIntervalId;
const tickInterval = 2500;
let tickIntervalId = null;
const WANDER_DELAY = 4200;
let catWanderTimeoutId;
let activityTimeout;
let motionTimeout;
const WALK_MOTION_DURATION = 2200;
const catMotion = { x: 0, y: 0 };
const SAVE_THROTTLE_MS = 5000;
let pendingSaveTimeoutId = null;
let lastSavedAt = Date.now();

function shouldReduceMotion() {
  return !!(motionPreference && motionPreference.matches);
}

function isDocumentHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function shouldAnimateCat() {
  return !shouldReduceMotion() && !isDocumentHidden();
}

function applyMotionPreferenceClass() {
  if (document.body) {
    document.body.classList.toggle("reduce-motion", shouldReduceMotion());
  }
}

function clearCatWander() {
  if (catWanderTimeoutId) {
    clearTimeout(catWanderTimeoutId);
    catWanderTimeoutId = null;
  }
}

function refreshMotionSystems() {
  applyMotionPreferenceClass();
  if (shouldReduceMotion() || isDocumentHidden()) {
    clearCatWander();
    wanderCat(true);
    if (typeof catSpriteController?.pause === "function") {
      catSpriteController.pause();
    }
    return;
  }
  if (typeof catSpriteController?.resume === "function") {
    catSpriteController.resume();
  }
  startCatWander();
}

function attachMotionPreferenceListener() {
  if (!motionPreference) {
    return;
  }
  const handler = () => {
    refreshMotionSystems();
  };
  if (typeof motionPreference.addEventListener === "function") {
    motionPreference.addEventListener("change", handler);
  } else if (typeof motionPreference.addListener === "function") {
    motionPreference.addListener(handler);
  }
}

function setupInstallPromptHandlers() {
  if (installButton) {
    installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        showToast("ℹ️", "Pulsa compartir en tu navegador para instalar Catagotchi.");
        return;
      }
      installButton.disabled = true;
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          showToast("📲", "Catagotchi se añadirá a tu pantalla de inicio.");
          installButton.hidden = true;
        } else {
          showToast("ℹ️", "Puedes intentar instalar Catagotchi más tarde.");
          installButton.hidden = false;
        }
      } catch (error) {
        console.error("Instalación PWA interrumpida", error);
      } finally {
        installButton.disabled = false;
        deferredInstallPrompt = null;
      }
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) {
      installButton.hidden = false;
      installButton.disabled = false;
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (installButton) {
      installButton.hidden = true;
      installButton.disabled = false;
    }
    showToast("📲", "Catagotchi está en tu pantalla de inicio.");
    refreshNotificationAvailability();
  });
}

function canUseNotifications() {
  return typeof window !== "undefined" && typeof Notification === "function";
}

function isStandaloneExperience() {
  if (typeof window === "undefined") {
    return false;
  }
  if (typeof window.matchMedia === "function") {
    try {
      if (window.matchMedia("(display-mode: standalone)")?.matches) {
        return true;
      }
      if (window.matchMedia("(display-mode: window-controls-overlay)")?.matches) {
        return true;
      }
    } catch (error) {
      // Ignorado: algunos navegadores lanzan al consultar display-mode.
    }
  }
  if (typeof window.navigator !== "undefined" && window.navigator.standalone) {
    return true;
  }
  return false;
}

function refreshNotificationAvailability() {
  if (!notificationsButton) {
    return;
  }
  const supported = canUseNotifications();
  const permission = supported ? Notification.permission : "denied";
  const installed = isStandaloneExperience();
  const shouldShow = supported && permission !== "denied" && (installed || permission === "granted");
  if (!shouldShow) {
    notificationsButton.hidden = true;
    notificationsButton.disabled = true;
    notificationsButton.dataset.state = "off";
    notificationsButton.setAttribute("aria-pressed", "false");
    if (state.remindersEnabled) {
      state.remindersEnabled = false;
      cancelReminder();
      scheduleStateSave();
    }
    return;
  }

  notificationsButton.hidden = false;
  notificationsButton.disabled = false;
  const active = Boolean(state.remindersEnabled && permission === "granted");
  notificationsButton.dataset.state = active ? "on" : "off";
  notificationsButton.setAttribute("aria-pressed", active ? "true" : "false");
  notificationsButton.textContent = active ? "🔕 Pausar aviso" : "🔔 Recordatorio";
  notificationsButton.setAttribute(
    "aria-label",
    active ? "Desactivar recordatorios" : "Activar recordatorios"
  );
  notificationsButton.title = active
    ? "Pausa los avisos de mimos"
    : "Activa un recordatorio para que no se te olvide jugar";

  if (active) {
    scheduleReminder();
  } else {
    cancelReminder();
  }
}

async function enableReminders() {
  if (!canUseNotifications()) {
    showToast("ℹ️", "Tu navegador no admite notificaciones en este dispositivo.");
    return;
  }
  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch (error) {
      console.error("No se pudo solicitar permiso de notificaciones", error);
      permission = Notification.permission;
    }
  }
  if (permission !== "granted") {
    state.remindersEnabled = false;
    showToast("ℹ️", "Activa las notificaciones desde los ajustes del navegador.");
    refreshNotificationAvailability();
    scheduleStateSave();
    return;
  }
  state.remindersEnabled = true;
  state.lastInteraction = Date.now();
  showToast("🔔", `${getName()} te avisará cuando necesite mimos.`);
  scheduleReminder({ reset: true });
  refreshNotificationAvailability();
  scheduleStateSave();
}

function disableReminders({ silent = false } = {}) {
  if (!state.remindersEnabled) {
    return;
  }
  state.remindersEnabled = false;
  cancelReminder();
  if (!silent) {
    showToast("🔕", "Recordatorios en pausa.");
  }
  refreshNotificationAvailability();
  scheduleStateSave();
}

function canSendReminder() {
  return (
    typeof window !== "undefined" &&
    typeof window.setTimeout === "function" &&
    state.remindersEnabled &&
    canUseNotifications() &&
    Notification.permission === "granted"
  );
}

function cancelReminder() {
  if (reminderTimeoutId !== null) {
    clearTimeout(reminderTimeoutId);
    reminderTimeoutId = null;
  }
}

function scheduleReminder({ reset = false } = {}) {
  cancelReminder();
  if (!canSendReminder()) {
    return;
  }
  const now = Date.now();
  if (reset) {
    state.lastInteraction = now;
  }
  const lastInteraction = Number(state.lastInteraction) || now;
  const elapsed = now - lastInteraction;
  const delay = Math.max(MIN_REMINDER_DELAY_MS, REMINDER_DELAY_MS - elapsed);
  reminderTimeoutId = window.setTimeout(() => {
    reminderTimeoutId = null;
    triggerReminderNotification();
  }, delay);
}

async function triggerReminderNotification() {
  if (!canSendReminder()) {
    return;
  }
  const name = getName();
  const title = `¡${name} te echa de menos!`;
  const body = `${name} quiere que vuelvas a jugar un ratito.`;
  const options = {
    body,
    icon: "icons/icon-192.svg",
    badge: "icons/icon-192.svg",
    tag: "catagotchi-recordatorio",
    renotify: true,
    data: { url: typeof window !== "undefined" ? window.location.href : "./" },
  };
  try {
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
      } else if (typeof Notification === "function") {
        new Notification(title, options);
      }
    } else if (typeof Notification === "function") {
      new Notification(title, options);
    }
  } catch (error) {
    console.error("No se pudo mostrar el recordatorio", error);
  } finally {
    state.lastInteraction = Date.now();
    scheduleStateSave();
    scheduleReminder();
  }
}

function markInteractionForReminder() {
  state.lastInteraction = Date.now();
  if (state.remindersEnabled) {
    scheduleReminder({ reset: true });
  }
}

function setupNotificationReminders() {
  if (!notificationsButton) {
    return;
  }
  notificationsButton.addEventListener("click", async () => {
    if (state.remindersEnabled) {
      disableReminders();
    } else {
      await enableReminders();
    }
  });

  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const queries = ["(display-mode: standalone)", "(display-mode: window-controls-overlay)"];
    queries.forEach((query) => {
      const media = window.matchMedia(query);
      if (!media) return;
      const listener = () => refreshNotificationAvailability();
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", listener);
      } else if (typeof media.addListener === "function") {
        media.addListener(listener);
      }
    });
  }

  refreshNotificationAvailability();

  if (canSendReminder()) {
    scheduleReminder();
  }
}

function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((error) => console.error("No se pudo registrar el service worker", error));
  });
}

initialize();
startTickLoop();

function applyCatSkinVisuals(skin) {
  if (!skin) return;
  const palette = skin.colors || {};
  const variableMap = {
    furMain: "--fur-main",
    furSecondary: "--fur-secondary",
    furAccent: "--fur-accent",
    belly: "--belly",
    earInner: "--ear-inner",
    cheek: "--cheek",
    outline: "--outline",
    paw: "--paw",
    collar: "--collar",
    collarStroke: "--collar-stroke",
    nose: "--nose",
    pupil: "--pupil",
    tailTip: "--tail-tip",
    iris: "--iris",
    patternMask: "--pattern-mask",
    patternDetail: "--pattern-detail",
  };
  Object.entries(variableMap).forEach(([key, cssVar]) => {
    if (palette[key]) {
      cat.style.setProperty(cssVar, palette[key]);
    }
  });
  catSpriteController?.setPalette({
    outline: palette.outline,
    furMain: palette.furMain,
    furSecondary: palette.furSecondary,
    furAccent: palette.furAccent,
    belly: palette.belly,
    earInner: palette.earInner,
    cheek: palette.cheek,
    paw: palette.paw,
    nose: palette.nose,
    pupil: palette.pupil,
    tailTip: palette.tailTip,
    iris: palette.iris,
    patternMask: palette.patternMask,
    patternDetail: palette.patternDetail,
    pattern: skin.pattern,
  });
  if (identityAvatar) {
    identityAvatar.textContent = skin.emoji;
    identityAvatar.setAttribute("aria-label", `Cambiar estilo del gato (actual: ${skin.name})`);
    identityAvatar.setAttribute("title", `${skin.name} · Toca para cambiar de estilo`);
  }
  cat.dataset.skin = skin.id;
  if (catNameInput) {
    catNameInput.setAttribute("placeholder", skin.name.toUpperCase());
  }
}

function getCurrentSkinId() {
  return catSkins[currentSkinIndex]?.id || state.skin;
}

function ensureSkinProgress(skinId) {
  if (!skinId) return { level: 1, xp: 0 };
  if (!state.progressBySkin) {
    state.progressBySkin = deepClone(defaultProgressBySkin);
  }
  if (!state.progressBySkin[skinId]) {
    state.progressBySkin[skinId] = { level: 1, xp: 0 };
  }
  return state.progressBySkin[skinId];
}

function loadSkinProgress(skinId) {
  const progress = ensureSkinProgress(skinId);
  state.level = Math.max(1, Math.floor(Number(progress.level) || 1));
  state.xp = Math.max(0, Number(progress.xp) || 0);
}

function persistSkinProgress(skinId = getCurrentSkinId()) {
  if (!skinId) return;
  ensureSkinProgress(skinId);
  state.progressBySkin[skinId] = {
    level: state.level,
    xp: state.xp,
  };
}

  function setSkin(index, options = {}) {
    const { preserveName = false, announce = false } = options;
    if (catSkins.length === 0) return;
    const previousSkinId = getCurrentSkinId();
    if (previousSkinId) {
      persistSkinProgress(previousSkinId);
    }
    currentSkinIndex = ((index % catSkins.length) + catSkins.length) % catSkins.length;
    const skin = catSkins[currentSkinIndex];
    state.skin = skin.id;
    loadSkinProgress(state.skin);
    applyCatSkinVisuals(skin);
    if (!preserveName) {
      state.name = skin.name;
      catNameInput.value = skin.name;
    } else if (catNameInput && catNameInput.value.trim() === "") {
      catNameInput.value = state.name;
    }
    updateUI();
    if (announce) {
      pushLog(`${skin.name} estrena un nuevo pelaje.`, "😺", state);
      showToast("😺", `Ahora cuidas a ${skin.name}.`);
    }
    scheduleStateSave();
  }

  function syncSpriteState({ moodKey } = {}) {
    if (!catSpriteController) return;
    const activity = cat?.dataset?.activity || "idle";
    const motionState = cat?.dataset?.motion || "idle";
    const moodState = moodKey || cat?.dataset?.mood || getMood(state).key;
    catSpriteController.setState({ mood: moodState, activity, motion: motionState });
  }

  function cycleCatSkin() {
    const nextIndex = (currentSkinIndex + 1) % catSkins.length;
    setSkin(nextIndex, { announce: true });
  }

  function setMotion(motion, options = {}) {
    if (!cat) return;
    const { duration = 0 } = options;
    if (motionTimeout) {
      clearTimeout(motionTimeout);
      motionTimeout = null;
    }
    cat.dataset.motion = motion;
    if (duration > 0) {
      motionTimeout = setTimeout(() => {
        if (!cat) {
          motionTimeout = null;
          return;
        }
        if (cat.dataset.activity === "idle") {
          cat.dataset.motion = "idle";
        }
        motionTimeout = null;
        syncSpriteState();
      }, duration);
    }
    syncSpriteState();
  }

  function initialize() {
    setSkin(currentSkinIndex, { preserveName: true });
    if (catNameInput) {
      catNameInput.value = state.name;
      catNameInput.placeholder = (catSkins[currentSkinIndex]?.name || "Merengue").toUpperCase();
      catNameInput.readOnly = false;
      catNameInput.addEventListener("change", () => {
        const fallbackName = catSkins[currentSkinIndex]?.name ?? catSkins[0].name;
        state.name = catNameInput.value.trim() || fallbackName;
        markInteractionForReminder();
        scheduleStateSave();
        pushLog(`Ahora se llama ${state.name}.`, "✨");
        updateUI();
      });
    }

    document.querySelectorAll(".device-button").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn.dataset.action));
    });

    if (identityAvatar) {
      identityAvatar.addEventListener("click", () => {
        cycleCatSkin();
        markInteractionForReminder();
      });
    }

    if (state.history.length === 0) {
      pushLog(`Comienza una nueva aventura con ${getName()}.`, "🚀");
    }

    if (cat) {
      if (!cat.dataset.activity) {
        cat.dataset.activity = "idle";
      }
      setMotion(cat.dataset.motion || "idle");
    }

    renderLog();
    updateUI();
    startDayModeWatcher();
    refreshMotionSystems();
    attachMotionPreferenceListener();
  }

    function loadState() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return deepClone(defaultState);
        const parsed = JSON.parse(stored);
        const merged = { ...deepClone(defaultState), ...parsed };
        const { clean, health, vetCooldown, ...safeState } = merged;
        const baseProgress = deepClone(defaultProgressBySkin);
        const storedProgress = parsed?.progressBySkin || merged.progressBySkin || {};
        const fallbackLevel = Math.max(1, Math.floor(Number(parsed?.level ?? merged.level ?? 1)));
        const fallbackXp = Math.max(0, Number(parsed?.xp ?? merged.xp ?? 0));
        Object.entries(storedProgress || {}).forEach(([skinId, progress]) => {
          if (!progress) return;
          const level = Math.max(1, Math.floor(Number(progress.level) || 1));
          const xp = Math.max(0, Number(progress.xp) || 0);
          baseProgress[skinId] = { level, xp };
        });
        catSkins.forEach((skin) => {
          if (!baseProgress[skin.id]) {
            baseProgress[skin.id] = { level: 1, xp: 0 };
          }
        });
        safeState.progressBySkin = baseProgress;
        const desiredSkinId = safeState.skin && baseProgress[safeState.skin] ? safeState.skin : catSkins[0].id;
        if (!storedProgress || !storedProgress[desiredSkinId]) {
          baseProgress[desiredSkinId] = {
            level: fallbackLevel,
            xp: fallbackXp,
          };
        }
        const activeSkinId = desiredSkinId;
        safeState.skin = activeSkinId;
        safeState.level = baseProgress[activeSkinId].level;
        safeState.xp = baseProgress[activeSkinId].xp;
        return safeState;
      } catch (error) {
        console.error("Error cargando estado", error);
        return deepClone(defaultState);
      }
    }

    function saveState() {
      try {
        persistSkinProgress();
        const copy = {
          ...state,
          history: (state.history || []).slice(-25),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
        lastSavedAt = Date.now();
      } catch (error) {
        console.error("Error guardando estado", error);
      }
    }

    function scheduleStateSave(options = {}) {
      const { immediate = false } = options;
      if (immediate || typeof setTimeout !== "function") {
        flushStateSave();
        return;
      }
      const now = Date.now();
      const elapsed = now - lastSavedAt;
      if (elapsed >= SAVE_THROTTLE_MS) {
        flushStateSave();
        return;
      }
      if (pendingSaveTimeoutId !== null) {
        return;
      }
      const delay = Math.max(250, SAVE_THROTTLE_MS - elapsed);
      pendingSaveTimeoutId = setTimeout(() => {
        pendingSaveTimeoutId = null;
        flushStateSave();
      }, delay);
    }

    function flushStateSave() {
      if (pendingSaveTimeoutId !== null) {
        clearTimeout(pendingSaveTimeoutId);
        pendingSaveTimeoutId = null;
      }
      lastSavedAt = Date.now();
      saveState();
    }

function startTickLoop() {
  if (tickIntervalId !== null) {
    return;
  }
  tickIntervalId = window.setInterval(() => {
    if (!isDocumentHidden()) {
      tick();
    }
  }, tickInterval);
}

function stopTickLoop() {
  if (tickIntervalId === null) {
    return;
  }
  clearInterval(tickIntervalId);
  tickIntervalId = null;
}

function tick() {
  tickProfile(state, degradeRates);
  updateUI();
  scheduleStateSave();
}

function tickProfile(profile, rates) {
  if (!profile) return;
  const now = Date.now();
  const lastTick = Number(profile.lastTick) || now;
  const delta = (now - lastTick) / 1000;
  profile.lastTick = now;

  Object.entries(rates).forEach(([stat, rate]) => {
    modifyStat(stat, rate * delta, profile);
  });

  if ((profile.hunger ?? 0) < 30) {
    modifyStat("fun", -1.2 * delta, profile);
  }
  if ((profile.energy ?? 0) < 25) {
    modifyStat("fun", -0.9 * delta, profile);
  }
  if ((profile.fun ?? 0) < 25) {
    modifyStat("energy", -0.7 * delta, profile);
  }

  return delta;
}

    function modifyStat(stat, amount, profile = state) {
      if (!profile) return;
      const current = Number(profile[stat] ?? 0);
      profile[stat] = clamp(current + amount, MIN_STAT, MAX_STAT);
    }

    function handleAction(actionKey) {
      handleCatAction(actionKey);
    }

    function handleCatAction(actionKey) {
      const action = catActions[actionKey];
      if (!action) return;

      let effects = action.effects;
      if (typeof effects === "function") {
        effects = effects();
      }

      Object.entries(effects).forEach(([stat, value]) => modifyStat(stat, value, state));
      playActionSound(actionKey);
      gainXp(action.xp, state);
      const narration = action.text();
      recordLog({ emoji: action.emoji, message: narration, timestamp: Date.now() });

      if (!state.accessoriesUnlocked && state.level >= 3) {
        state.accessoriesUnlocked = true;
        toggleAccessory(true);
        pushLog(`${getName()} desbloquea su primer accesorio exclusivo.`, "🌟");
      }

      setCatActivity(actionKey);
      const mood = getMood(state);
      cat.dataset.mood = mood.key;
      showToast(action.emoji, narration);
      updateUI();
      markInteractionForReminder();
      scheduleStateSave();
      wanderCat(true);
    }

  function setCatActivity(activityKey) {
    if (!cat) return;
    if (activityTimeout) {
      clearTimeout(activityTimeout);
      activityTimeout = null;
    }

    const isAnimatedAction = activityKey === "feed" || activityKey === "play" || activityKey === "nap";
    const nextActivity = isAnimatedAction ? activityKey : "idle";
    cat.dataset.activity = nextActivity;
    setMotion("idle");
    syncSpriteState({ moodKey: getMood(state).key });

    if (!isAnimatedAction) {
      updateCatFace(getMood(state).key);
      return;
    }

      const duration = nextActivity === "nap" ? 5200 : 2800;
      activityTimeout = setTimeout(() => {
        cat.dataset.activity = "idle";
        activityTimeout = null;
        setMotion("idle");
        syncSpriteState({ moodKey: getMood(state).key });
        updateCatFace(getMood(state).key);
      }, duration);
    }

    function gainXp(amount, profile = state) {
      if (!profile || Number.isNaN(amount)) return;
      const currentLevel = Math.max(1, Math.floor(Number(profile.level) || 1));
      profile.level = currentLevel;
      profile.xp = Math.max(0, Number(profile.xp) || 0) + amount;
      const levelThreshold = currentLevel * 120;
      if (profile.xp >= levelThreshold) {
        profile.xp -= levelThreshold;
        profile.level = currentLevel + 1;
        const name = getName();
        pushLog(`${name} sube al nivel ${profile.level}.`, "🏅");
        showToast("🏅", `${name} alcanza el nivel ${profile.level}.`);
      }
      if (profile === state) {
        persistSkinProgress();
      }
    }

    function getMood(profile = state) {
      const hunger = Number(profile?.hunger ?? 0);
      const energy = Number(profile?.energy ?? 0);
      const fun = Number(profile?.fun ?? 0);
      const avg = (hunger + energy + fun) / 3;
      if (avg > 80) return { key: "feliz", label: "✨ Feliz" };
      if (avg > 60) return { key: "contento", label: "😺 Contento" };
      if (avg > 40) return { key: "neutro", label: "😐 Pensativo" };
      if (avg > 20) return { key: "triste", label: "🥺 Tristón" };
      return { key: "enfadado", label: "😾 Enfadado" };
    }

    function updateUI() {
      updateStat("hunger", hungerBar, hungerValue, state.hunger ?? 0);
      updateStat("energy", energyBar, energyValue, state.energy ?? 0);
      updateStat("fun", funBar, funValue, state.fun ?? 0);
      updateXP(state);

      const mood = getMood(state);
      if (lastMoodLabel !== mood.label) {
        moodLabel.textContent = mood.label;
        lastMoodLabel = mood.label;
      }
      if (cat && cat.dataset.mood !== mood.key) {
        cat.dataset.mood = mood.key;
      }
      if (lastMoodKey && lastMoodKey !== mood.key) {
        playMoodSound(mood.key);
      }
      lastMoodKey = mood.key;
      updateCatFace(mood.key);

      const levelValue = String(Math.max(1, Math.floor(Number(state.level) || 1)));
      if (lastLevelDisplayed !== levelValue) {
        levelLabel.textContent = levelValue;
        lastLevelDisplayed = levelValue;
      }

      const nextTitle = `${getName()} · Nivel ${levelValue} | Catagotchi`;
      if (lastTitleRendered !== nextTitle) {
        document.title = nextTitle;
        lastTitleRendered = nextTitle;
      }
    }

    function updateStat(statKey, bar, valueLabel, statValue) {
      if (!bar || !valueLabel) return;
      const numericValue = Number(statValue);
      const normalized = Math.min(
        MAX_STAT,
        Math.max(MIN_STAT, Number.isFinite(numericValue) ? numericValue : 0)
      );
      const previous = statSnapshot[statKey];
      if (previous !== null && Math.abs(previous - normalized) < 0.35) {
        return;
      }
      statSnapshot[statKey] = normalized;
      const width = `${normalized}%`;
      if (bar.style.width !== width) {
        bar.style.width = width;
      }
      if (bar.style.getPropertyValue("--value") !== width) {
        bar.style.setProperty("--value", width);
      }
      const rounded = Math.round(normalized);
      const displayValue = `${rounded}%`;
      if (valueLabel.textContent !== displayValue) {
        valueLabel.textContent = displayValue;
      }
      let color = "inherit";
      if (normalized < 30) {
        color = "#ff4770";
      } else if (normalized > 70) {
        color = "#2eab6f";
      }
      if (valueLabel.style.color !== color) {
        valueLabel.style.color = color;
      }
    }

    function updateXP(profile = state) {
      if (!xpBar) return;
      const levelValue = Math.max(1, Math.floor(Number(profile.level) || 1));
      const levelThreshold = levelValue * 120;
      const baseXp = Number(profile.xp);
      const safeXp = Number.isFinite(baseXp) ? baseXp : 0;
      const rawPercent = levelThreshold > 0 ? (safeXp / levelThreshold) * 100 : 0;
      const xpPercent = Math.min(100, Math.max(0, rawPercent));
      const previous = statSnapshot.xp;
      if (previous !== null && Math.abs(previous - xpPercent) < 0.35) {
        return;
      }
      statSnapshot.xp = xpPercent;
      const width = `${xpPercent}%`;
      if (xpBar.style.width !== width) {
        xpBar.style.width = width;
      }
      if (xpBar.style.getPropertyValue("--value") !== width) {
        xpBar.style.setProperty("--value", width);
      }
    }

    function updateCatFace(moodKey) {
      if (!cat || !catWanderer) {
        syncSpriteState({ moodKey });
        return;
      }
      const activity = cat.dataset?.activity || "idle";
      const presentationKey = `${activity}|${moodKey}`;
      if (presentationKey === lastCatPresentationKey) {
        syncSpriteState({ moodKey });
        return;
      }
      lastCatPresentationKey = presentationKey;

      const setPresentation = ({ bobSpeed, shadow, shadowScale = "1" }) => {
        catWanderer.style.setProperty("--bob-speed", bobSpeed);
        catWanderer.style.setProperty("--shadow-opacity", shadow);
        catWanderer.style.setProperty("--shadow-scale", shadowScale);
      };

      syncSpriteState({ moodKey });

      if (activity === "nap") {
        setPresentation({ bobSpeed: "4.6s", shadow: "0.32", shadowScale: "0.88" });
        return;
      }

      if (activity === "feed") {
        setPresentation({ bobSpeed: "2.1s", shadow: "0.52", shadowScale: "1.04" });
        return;
      }

      if (activity === "play") {
        setPresentation({ bobSpeed: "2s", shadow: "0.55", shadowScale: "1.06" });
        return;
      }

      switch (moodKey) {
      case "feliz":
        setPresentation({ bobSpeed: "2.4s", shadow: "0.5", shadowScale: "1" });
        break;
      case "contento":
        setPresentation({ bobSpeed: "2.8s", shadow: "0.46", shadowScale: "0.98" });
        break;
      case "neutro":
        setPresentation({ bobSpeed: "3.1s", shadow: "0.42", shadowScale: "0.96" });
        break;
      case "triste":
        setPresentation({ bobSpeed: "3.4s", shadow: "0.38", shadowScale: "0.94" });
        break;
      default:
        setPresentation({ bobSpeed: "3.6s", shadow: "0.34", shadowScale: "0.92" });
      }
    }

      function createLogElement(entry) {
        const templateRoot = logEntryTemplate?.content?.firstElementChild;
        const element = templateRoot ? templateRoot.cloneNode(true) : document.createElement("article");
        element.classList.add("log-entry");
        const timeElement = element.querySelector(".log-time") || element.appendChild(document.createElement("div"));
        const textElement = element.querySelector(".log-text") || element.appendChild(document.createElement("div"));
        const date = new Date(entry.timestamp || Date.now());
        const time = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
        timeElement.textContent = `${entry.emoji || "✨"} ${time}`;
        timeElement.classList.add("log-time");
        textElement.textContent = entry.message || "";
        textElement.classList.add("log-text");
        return element;
      }

      function renderLog() {
        if (!log) return;
        log.innerHTML = "";
        const history = Array.isArray(state.history) ? state.history : [];
        history
          .slice()
          .reverse()
          .forEach((entry) => {
            log.appendChild(createLogElement(entry));
          });
      }

      function recordLog(entry) {
        const normalized = {
          emoji: entry?.emoji || "✨",
          message: entry?.message || "",
          timestamp: entry?.timestamp || Date.now(),
        };
        if (!Array.isArray(state.history)) {
          state.history = [];
        }
        state.history.push(normalized);
        state.history = state.history.slice(-40);
        if (log) {
          log.prepend(createLogElement(normalized));
          while (log.children.length > 40) {
            log.removeChild(log.lastElementChild);
          }
        }
      }

      function pushLog(message, emoji = "✨") {
        recordLog({ emoji, message, timestamp: Date.now() });
        scheduleStateSave();
      }

      function showToast(emoji, message) {
        toastEmoji.textContent = emoji;
        toastMessage.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast.timeoutId);
        showToast.timeoutId = setTimeout(() => {
          toast.classList.remove("show");
        }, 3200);
      }

      function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
      }

      function createSamplePlayer() {
        if (typeof Audio === "undefined") {
          return null;
        }

        const definitions = {
          meow: {
            sources: ["meow-1.mp3", "meow_QO6VsE6.mp3", "the-end-meow-by-nekocat-just-3-second-1.mp3"],
            volume: 0.58,
          },
          purr: {
            sources: ["cat-purr.mp3", "little-puff-purr.mp3", "little-puff-purr-brr.mp3"],
            volume: 0.4,
          },
        };

        const aliases = {
          feed: "meow",
          play: "meow",
          nap: "purr",
        };

        function createAudioPool(sources, { volume = 0.5 } = {}) {
          const entries = sources
          .filter(Boolean)
          .map((src) => {
            const element = new Audio(src);
            element.preload = "auto";
            element.volume = volume;
            element.load();
            return { src, instances: [element], volume };
          });

          function getInstance(entry) {
            if (!entry) return null;
            const available = entry.instances.find((audio) => audio.paused);
            if (available) {
              return available;
            }
            const clone = entry.instances[0]?.cloneNode(true) || new Audio(entry.src);
            clone.volume = entry.volume;
            clone.preload = "auto";
            entry.instances.push(clone);
            return clone;
          }

          function play() {
            if (entries.length === 0) {
              return null;
            }
            const entry = entries[Math.floor(Math.random() * entries.length)];
            const audio = getInstance(entry);
            if (!audio) {
              return null;
            }
            audio.currentTime = 0;
            try {
              const maybePromise = audio.play();
              if (maybePromise && typeof maybePromise.then === "function") {
                return maybePromise;
              }
              return Promise.resolve();
            } catch (error) {
              return Promise.reject(error);
            }
          }

          return { play };
        }

        const pools = Object.entries(definitions).reduce((acc, [key, config]) => {
          const pool = createAudioPool(config.sources, config);
          if (pool) {
            acc[key] = pool;
          }
          return acc;
        }, {});

        return {
          play(effectKey) {
            const targetKey = pools[effectKey] ? effectKey : aliases[effectKey];
            const pool = targetKey ? pools[targetKey] : null;
            if (!pool || typeof pool.play !== "function") {
              return null;
            }
            return pool.play();
          },
        };
      }

      function createSoundEngine() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          return null;
        }
        let context;
        let masterGain;

        function ensureContext() {
          if (context) return context;
          try {
            context = new AudioContextClass();
            masterGain = context.createGain();
            masterGain.gain.value = 0.22;
            masterGain.connect(context.destination);
          } catch (error) {
            console.warn("AudioContext no disponible", error);
            context = null;
          }
          return context;
        }

        function playPattern(pattern) {
          const ctx = ensureContext();
          if (!ctx || !Array.isArray(pattern)) return;
          if (ctx.state === "suspended") {
            ctx.resume();
          }
          let time = ctx.currentTime + 0.05;
          pattern.forEach((tone) => {
            if (!tone) return;
            const {
              freq,
              duration = 0.2,
              type = "sine",
              volume = 0.6,
              delay = 0,
              slide = 0,
            } = tone;
            time += delay;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(freq, time);
            if (slide !== 0) {
              const targetFreq = freq + slide;
              oscillator.frequency.linearRampToValueAtTime(
                targetFreq,
                time + Math.max(duration - 0.02, 0.01)
              );
            }
            const peakTime = time + Math.min(duration * 0.35, 0.12);
            gainNode.gain.setValueAtTime(0.0001, time);
            gainNode.gain.linearRampToValueAtTime(volume, peakTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.04);
            oscillator.connect(gainNode);
            gainNode.connect(masterGain);
            oscillator.start(time);
            oscillator.stop(time + duration + 0.1);
            time += duration;
          });
        }

        return {
          playPattern,
        };
      }

      function toggleAccessory(show) {
        if (catAccessoryOverlay) {
          catAccessoryOverlay.style.opacity = show ? 1 : 0;
        }
        catSpriteController?.setAccessory(show);
      }


  function createCatSpriteController(canvas) {
    if (!canvas || typeof canvas.getContext !== "function") {
      return null;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const logicalWidth = canvas.width;
    const logicalHeight = canvas.height;
    const ratio = window.devicePixelRatio || 1;
    if (ratio !== 1) {
      canvas.width = logicalWidth * ratio;
      canvas.height = logicalHeight * ratio;
      ctx.scale(ratio, ratio);
    }

    ctx.imageSmoothingEnabled = true;

    const base = {
      width: logicalWidth,
      height: logicalHeight,
    };

    const metrics = {
      groundY: base.height * 0.9,
      body: {
        cx: base.width * 0.58,
        cy: base.height * 0.72,
        rx: base.width * 0.26,
        ry: base.height * 0.22,
      },
      head: {
        cx: base.width * 0.34,
        cy: base.height * 0.4,
        r: base.height * 0.34,
      },
      ear: {
        width: base.width * 0.26,
        height: base.height * 0.32,
      },
      tail: {
        length: base.width * 0.52,
        baseX: base.width * 0.8,
      },
      leg: {
        width: base.width * 0.13,
        height: base.height * 0.3,
      },
    };

    const legPositions = {
      backFar: { x: metrics.body.cx + metrics.body.rx * 0.18, y: metrics.groundY },
      backNear: { x: metrics.body.cx + metrics.body.rx * 0.46, y: metrics.groundY },
      frontFar: { x: metrics.body.cx - metrics.body.rx * 0.02, y: metrics.groundY },
      frontNear: { x: metrics.body.cx - metrics.body.rx * 0.36, y: metrics.groundY },
    };

    const palette = {
      furMain: "#fbd6e8",
      furSecondary: "#f6adc9",
      furAccent: "#ffeef7",
      belly: "#fff8fb",
      earInner: "#ffb8d6",
      cheek: "#ff9ac4",
      paw: "#fff1f8",
      nose: "#ff86b6",
      pupil: "#2d1428",
      tailTip: "#ffe9f4",
      iris: "#8ff0ff",
      patternMask: "#ffe2f2",
      patternDetail: "#ff9bcf",
      outline: "#602041",
    };

    let styleKey = "sakura";

    const state = {
      mood: "feliz",
      activity: "idle",
      motion: "idle",
      accessory: false,
    };

    const moodExpressions = {
      feliz: { eyes: "happy", mouth: "smile" },
      contento: { eyes: "soft", mouth: "soft" },
      neutro: { eyes: "relaxed", mouth: "flat" },
      triste: { eyes: "droop", mouth: "sad" },
      enfadado: { eyes: "narrow", mouth: "angry" },
    };

    const idleCycle = [
      { headOffsetY: -2, bodyOffsetY: 0, tailAngle: -10, whiskerTilt: -2 },
      { headOffsetY: 0, bodyOffsetY: -1.5, tailAngle: -2, whiskerTilt: 0 },
      { headOffsetY: -1, bodyOffsetY: 0, tailAngle: 8, whiskerTilt: 2 },
      { headOffsetY: 1, bodyOffsetY: -1, tailAngle: 2, whiskerTilt: 0 },
    ];

    const walkCycle = [
      {
        frontNear: { lift: 6, forward: 2 },
        frontFar: { lift: 2, forward: -2 },
        backNear: { lift: 4, forward: -2 },
        backFar: { lift: 7, forward: 2 },
        headOffsetY: -2,
        bodyOffsetY: -1,
        tailAngle: -12,
      },
      {
        frontNear: { lift: 3, forward: 3 },
        frontFar: { lift: 5, forward: -1 },
        backNear: { lift: 6, forward: -1 },
        backFar: { lift: 2, forward: 2 },
        headOffsetY: 0,
        bodyOffsetY: -2,
        tailAngle: -4,
      },
      {
        frontNear: { lift: 1, forward: 0 },
        frontFar: { lift: 4, forward: -3 },
        backNear: { lift: 6, forward: 2 },
        backFar: { lift: 3, forward: -1 },
        headOffsetY: -1,
        bodyOffsetY: -1,
        tailAngle: 10,
      },
      {
        frontNear: { lift: 4, forward: -1 },
        frontFar: { lift: 1, forward: -2 },
        backNear: { lift: 2, forward: 2 },
        backFar: { lift: 5, forward: -1 },
        headOffsetY: 1,
        bodyOffsetY: -2,
        tailAngle: 4,
      },
    ];

    const feedCycle = [
      { headOffsetY: 4, bodyOffsetY: 0, tailAngle: -6 },
      { headOffsetY: 8, bodyOffsetY: 2, tailAngle: -4 },
      { headOffsetY: 6, bodyOffsetY: 1, tailAngle: -2 },
      { headOffsetY: 7, bodyOffsetY: 2, tailAngle: -4 },
    ];

    const playCycle = [
      { headOffsetY: -2, bodyOffsetY: -2, tailAngle: 18, tailLift: 6, whiskerTilt: 4 },
      { headOffsetY: 0, bodyOffsetY: -1, tailAngle: -10, tailLift: 2, whiskerTilt: -2 },
      { headOffsetY: -3, bodyOffsetY: -3, tailAngle: 24, tailLift: 8, whiskerTilt: 5 },
      { headOffsetY: -1, bodyOffsetY: -2, tailAngle: -6, tailLift: 4, whiskerTilt: -3 },
    ];

    const napCycle = [0, 1];

    const animations = {
      idle: { frames: idleCycle.length, duration: 380, draw: drawIdleFrame },
      walk: { frames: walkCycle.length, duration: 160, draw: drawWalkFrame },
      feed: { frames: feedCycle.length, duration: 240, draw: drawFeedFrame },
      play: { frames: playCycle.length, duration: 210, draw: drawPlayFrame },
      nap: { frames: napCycle.length, duration: 520, draw: drawNapFrame },
    };

    let animationKey = resolveAnimationKey(state);
    let frameIndex = 0;
    let animationFrameId = null;
    let lastTimestamp = 0;
    let frameAccumulator = 0;
    let paused = false;

    function setPalette(newPalette = {}) {
      const mapping = {
        furMain: "furMain",
        furSecondary: "furSecondary",
        furAccent: "furAccent",
        belly: "belly",
        earInner: "earInner",
        cheek: "cheek",
        paw: "paw",
        nose: "nose",
        pupil: "pupil",
        tailTip: "tailTip",
        iris: "iris",
        patternMask: "patternMask",
        patternDetail: "patternDetail",
        outline: "outline",
        pattern: "pattern",
      };
      Object.entries(mapping).forEach(([key, target]) => {
        if (newPalette[key] === undefined || newPalette[key] === null) return;
        if (target === "pattern") {
          styleKey = String(newPalette[key]);
        } else {
          palette[target] = newPalette[key];
        }
      });
      drawCurrentFrame();
      scheduleLoop();
    }

    function setAccessory(show) {
      state.accessory = !!show;
      drawCurrentFrame();
      scheduleLoop();
    }

    function setState(partial) {
      Object.assign(state, partial);
      const nextKey = resolveAnimationKey(state);
      if (nextKey !== animationKey) {
        animationKey = nextKey;
        restartLoop();
      } else {
        drawCurrentFrame();
        scheduleLoop();
      }
    }

    function resolveAnimationKey(localState) {
      if (!localState) return "idle";
      if (localState.activity === "nap") return "nap";
      if (localState.activity === "feed") return "feed";
      if (localState.activity === "play") return "play";
      if (localState.motion === "walk") return "walk";
      return "idle";
    }

    function restartLoop() {
      cancelLoop();
      const settings = animations[animationKey] || animations.idle;
      frameIndex = 0;
      frameAccumulator = 0;
      lastTimestamp = 0;
      drawCurrentFrame();
      scheduleLoop();
    }

    function drawCurrentFrame() {
      const settings = animations[animationKey] || animations.idle;
      ctx.clearRect(0, 0, base.width, base.height);
      settings.draw({ frameIndex });
    }

    function step(timestamp) {
      animationFrameId = null;
      if (paused) {
        return;
      }
      const settings = animations[animationKey] || animations.idle;
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
        scheduleLoop();
        return;
      }
      if (isDocumentHidden()) {
        lastTimestamp = 0;
        scheduleLoop();
        return;
      }
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      frameAccumulator += delta;
      const frameDuration = settings.duration;
      if (frameAccumulator >= frameDuration) {
        const framesToAdvance = Math.max(1, Math.floor(frameAccumulator / frameDuration));
        frameAccumulator -= framesToAdvance * frameDuration;
        frameIndex = (frameIndex + framesToAdvance) % settings.frames;
        drawCurrentFrame();
      }
      scheduleLoop();
    }

    function scheduleLoop() {
      if (paused) {
        return;
      }
      if (animationFrameId !== null) {
        return;
      }
      animationFrameId = window.requestAnimationFrame(step);
    }

    function cancelLoop() {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastTimestamp = 0;
    }

    function pause() {
      if (paused) return;
      paused = true;
      cancelLoop();
    }

    function resume() {
      if (!paused) return;
      paused = false;
      scheduleLoop();
    }

    function drawIdleFrame({ frameIndex }) {
      const frame = idleCycle[frameIndex % idleCycle.length];
      const expression = buildExpression("idle", frameIndex);
      renderStandingCat({
        expression,
        headOffsetY: frame.headOffsetY,
        bodyOffsetY: frame.bodyOffsetY,
        tailAngle: frame.tailAngle,
        whiskerTilt: frame.whiskerTilt,
      });
    }

    function drawWalkFrame({ frameIndex }) {
      const frame = walkCycle[frameIndex % walkCycle.length];
      const expression = buildExpression("walk", frameIndex);
      renderStandingCat({
        expression,
        headOffsetY: frame.headOffsetY,
        bodyOffsetY: frame.bodyOffsetY,
        tailAngle: frame.tailAngle,
        frontLegs: { near: frame.frontNear, far: frame.frontFar },
        backLegs: { near: frame.backNear, far: frame.backFar },
      });
    }

    function drawFeedFrame({ frameIndex }) {
      const frame = feedCycle[frameIndex % feedCycle.length];
      const expression = buildExpression("feed", frameIndex);
      renderStandingCat({
        expression,
        headOffsetY: frame.headOffsetY,
        bodyOffsetY: frame.bodyOffsetY,
        tailAngle: frame.tailAngle,
        frontLegs: { near: { lift: 3, forward: 1 }, far: { lift: 4, forward: -1 } },
        backLegs: { near: { lift: 1, forward: 0 }, far: { lift: 2, forward: 0 } },
      });
    }

    function drawPlayFrame({ frameIndex }) {
      const frame = playCycle[frameIndex % playCycle.length];
      const expression = buildExpression("play", frameIndex);
      renderStandingCat({
        expression,
        headOffsetY: frame.headOffsetY,
        bodyOffsetY: frame.bodyOffsetY,
        tailAngle: frame.tailAngle,
        tailLift: frame.tailLift,
        whiskerTilt: frame.whiskerTilt,
        frontLegs: { near: { lift: 3, forward: 2 }, far: { lift: 2, forward: -2 } },
        backLegs: { near: { lift: 2, forward: 1 }, far: { lift: 3, forward: -1 } },
      });
    }

    function drawNapFrame({ frameIndex }) {
      const breath = napCycle[frameIndex % napCycle.length];
      renderSleepingCat({ breath });
    }

    function buildExpression(animation, frame) {
      const baseExpression = moodExpressions[state.mood] || moodExpressions.neutro;
      const expression = { eyes: baseExpression.eyes, mouth: baseExpression.mouth, tongue: false };
      if (state.activity === "nap" || animation === "nap") {
        expression.eyes = "sleep";
        expression.mouth = "sleep";
      } else if (state.activity === "feed" || animation === "feed") {
        expression.eyes = "wide";
        expression.mouth = "yum";
        expression.tongue = true;
      } else if (state.activity === "play" || animation === "play") {
        expression.eyes = expression.eyes === "narrow" ? "narrow" : "happy";
        expression.mouth = "grin";
      } else if (animation === "idle" && frame % idleCycle.length === idleCycle.length - 1) {
        expression.eyes = "blink";
      }
      return expression;
    }

    function renderStandingCat({
      expression,
      headOffsetX = 0,
      headOffsetY = 0,
      bodyOffsetY = 0,
      tailAngle = 0,
      tailLift = 0,
      whiskerTilt = 0,
      frontLegs = {},
      backLegs = {},
    }) {
      drawShadow(bodyOffsetY);
      drawTail(tailAngle, tailLift, bodyOffsetY);
      drawLegSegment("backFar", backLegs.far, bodyOffsetY, true);
      drawLegSegment("frontFar", frontLegs.far, bodyOffsetY, true);
      drawBody(bodyOffsetY);
      drawLegSegment("backNear", backLegs.near, bodyOffsetY, false);
      drawLegSegment("frontNear", frontLegs.near, bodyOffsetY, false);
      drawHead(expression, headOffsetX, headOffsetY, bodyOffsetY, whiskerTilt);
    }

    function renderSleepingCat({ breath = 0 } = {}) {
      const rise = breath ? 4 : 0;
      drawShadow(-rise);
      const cx = base.width * 0.52;
      const cy = base.height * 0.7;

      ctx.save();
      ctx.translate(cx + metrics.body.rx * 0.5, cy + rise * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        metrics.tail.length * 0.4,
        -metrics.tail.length * 0.15,
        metrics.tail.length * 0.4,
        -metrics.tail.length * 0.55,
        -metrics.tail.length * 0.12,
        -metrics.tail.length * 0.5
      );
      ctx.bezierCurveTo(
        -metrics.tail.length * 0.45,
        -metrics.tail.length * 0.35,
        -metrics.tail.length * 0.5,
        -metrics.tail.length * 0.05,
        -metrics.tail.length * 0.28,
        metrics.tail.length * 0.12
      );
      ctx.closePath();
      const tailGrad = ctx.createLinearGradient(0, -metrics.tail.length * 0.5, 0, metrics.tail.length * 0.2);
      tailGrad.addColorStop(0, shiftColor(palette.furSecondary, 0.08));
      tailGrad.addColorStop(1, shiftColor(palette.furMain, -0.1));
      ctx.fillStyle = tailGrad;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy + rise * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, metrics.body.rx * 1.05, metrics.body.ry * 0.82 + rise * 0.2, 0, 0, Math.PI * 2);
      const bodyGrad = ctx.createLinearGradient(-metrics.body.rx, -metrics.body.ry, metrics.body.rx, metrics.body.ry);
      bodyGrad.addColorStop(0, shiftColor(palette.furSecondary, 0.12));
      bodyGrad.addColorStop(1, shiftColor(palette.furMain, -0.12));
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-metrics.body.rx * 0.18, metrics.body.ry * 0.12, metrics.body.rx * 0.72, metrics.body.ry * 0.58, 0, 0, Math.PI * 2);
      const bellyGrad = ctx.createLinearGradient(0, -metrics.body.ry * 0.4, 0, metrics.body.ry * 0.4);
      bellyGrad.addColorStop(0, shiftColor(palette.belly, 0.12));
      bellyGrad.addColorStop(1, shiftColor(palette.belly, -0.12));
      ctx.fillStyle = bellyGrad;
      ctx.globalAlpha = styleKey === "sakura" ? 0.96 : 0.88;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      const pawColor = palette.paw || palette.belly;
      for (const offset of [-metrics.body.rx * 0.4, -metrics.body.rx * 0.12]) {
        ctx.save();
        ctx.translate(cx + offset, cy + metrics.body.ry * 0.35 + rise * 0.1);
        ctx.beginPath();
        ctx.ellipse(0, 0, metrics.leg.width * 0.6, metrics.leg.height * 0.32, 0, 0, Math.PI * 2);
        const pawGrad = ctx.createLinearGradient(0, -metrics.leg.height * 0.2, 0, metrics.leg.height * 0.3);
        pawGrad.addColorStop(0, shiftColor(pawColor, 0.12));
        pawGrad.addColorStop(1, shiftColor(pawColor, -0.16));
        ctx.fillStyle = pawGrad;
        ctx.fill();
        ctx.restore();
      }

      const headX = cx - metrics.body.rx * 0.55;
      const headY = cy - metrics.body.ry * 0.15 + rise * 0.2;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(-0.12);
      const radius = metrics.head.r * 0.94;
      const headGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
      headGrad.addColorStop(0, shiftColor(palette.furSecondary, 0.16));
      headGrad.addColorStop(1, shiftColor(palette.furMain, -0.14));
      drawSleepingEar(radius * 0.1, -radius * 1.22, true);
      drawSleepingEar(-radius * 0.82, -radius * 1.12, false);

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = headGrad;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.clip();
      drawSleepingFaceMask(radius);
      ctx.restore();

      drawSleepingEye(-radius * 0.42, radius * 0.1);
      drawSleepingEye(radius * 0.42, radius * 0.12);

      ctx.beginPath();
      ctx.moveTo(-radius * 0.2, radius * 0.38);
      ctx.quadraticCurveTo(0, radius * 0.46, radius * 0.2, radius * 0.38);
      ctx.strokeStyle = shiftColor(palette.pupil || "#1a1c26", -0.1);
      ctx.lineWidth = radius * 0.08;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.restore();
    }

    function drawShadow(offset = 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      const scale = Math.max(0.7, 1 + offset * 0.02);
      ctx.beginPath();
      ctx.ellipse(base.width * 0.52, metrics.groundY + Math.min(12, offset * 0.3), metrics.body.rx * 0.95, metrics.body.ry * 0.32 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawTail(angle = 0, lift = 0, offsetY = 0) {
      ctx.save();
      const baseX = metrics.tail.baseX;
      const baseY = metrics.body.cy + offsetY - metrics.body.ry * 0.3 - lift * 0.6;
      ctx.translate(baseX, baseY);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(metrics.tail.length * 0.35, -metrics.tail.length * 0.2, metrics.tail.length * 0.6, -metrics.tail.length * 0.8, metrics.tail.length * 0.2, -metrics.tail.length);
      ctx.bezierCurveTo(-metrics.tail.length * 0.12, -metrics.tail.length * 0.88, -metrics.tail.length * 0.32, -metrics.tail.length * 0.42, -metrics.tail.length * 0.08, -metrics.tail.length * 0.08);
      ctx.closePath();
      const tailGrad = ctx.createLinearGradient(0, -metrics.tail.length, 0, 0);
      tailGrad.addColorStop(0, shiftColor(palette.furSecondary, 0.08));
      tailGrad.addColorStop(1, shiftColor(palette.furMain, -0.1));
      ctx.fillStyle = tailGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(metrics.tail.length * 0.06, -metrics.tail.length * 0.18);
      ctx.bezierCurveTo(
        metrics.tail.length * 0.38,
        -metrics.tail.length * 0.62,
        metrics.tail.length * 0.22,
        -metrics.tail.length * 0.98,
        -metrics.tail.length * 0.18,
        -metrics.tail.length * 0.88
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.2, metrics.tail.length * 0.08);
      ctx.lineCap = "round";
      ctx.stroke();

      if (palette.tailTip) {
        ctx.beginPath();
        ctx.moveTo(metrics.tail.length * 0.1, -metrics.tail.length * 0.8);
        ctx.bezierCurveTo(metrics.tail.length * 0.26, -metrics.tail.length * 1.1, -metrics.tail.length * 0.14, -metrics.tail.length * 1.05, -metrics.tail.length * 0.12, -metrics.tail.length * 0.78);
        ctx.closePath();
        const tipGrad = ctx.createLinearGradient(0, -metrics.tail.length, 0, -metrics.tail.length * 0.6);
        tipGrad.addColorStop(0, shiftColor(palette.tailTip, 0.12));
        tipGrad.addColorStop(1, shiftColor(palette.tailTip, -0.12));
        ctx.fillStyle = tipGrad;
        ctx.fill();
      }
      ctx.restore();
    }

    function drawBody(offsetY = 0) {
      const cx = metrics.body.cx;
      const cy = metrics.body.cy + offsetY;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.ellipse(0, 0, metrics.body.rx, metrics.body.ry, 0, 0, Math.PI * 2);
      const gradient = ctx.createLinearGradient(-metrics.body.rx, -metrics.body.ry, metrics.body.rx, metrics.body.ry);
      gradient.addColorStop(0, shiftColor(palette.furSecondary, 0.16));
      gradient.addColorStop(0.55, palette.furMain);
      gradient.addColorStop(1, shiftColor(palette.furMain, -0.12));
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-metrics.body.rx * 0.05, metrics.body.ry * 0.05, metrics.body.rx * 0.55, metrics.body.ry * 0.65, 0, 0, Math.PI * 2);
      const bellyGrad = ctx.createLinearGradient(0, -metrics.body.ry * 0.6, 0, metrics.body.ry * 0.6);
      bellyGrad.addColorStop(0, shiftColor(palette.belly, 0.12));
      bellyGrad.addColorStop(1, shiftColor(palette.belly, -0.15));
      ctx.fillStyle = bellyGrad;
      ctx.globalAlpha = styleKey === "sakura" ? 0.98 : 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;

      drawBodyDecorations();

      ctx.restore();
      drawBodyPattern(cx, cy);
    }

    function drawBodyDecorations() {
      drawShoulderShade();
      drawHipHighlight();
      drawSpineHighlight();
      drawChestTuft();
    }

    function drawSparkles(originX, originY) {
      const sparkleColor = shiftColor(palette.iris || "#ffffff", 0.25);
      const accent = shiftColor(palette.cheek || sparkleColor, 0.1);
      const points = [
        { x: originX, y: originY, size: base.width * 0.022 },
        { x: originX + base.width * 0.08, y: originY + base.height * 0.04, size: base.width * 0.018 },
        { x: originX - base.width * 0.06, y: originY + base.height * 0.02, size: base.width * 0.014 },
        { x: originX + base.width * 0.04, y: originY - base.height * 0.04, size: base.width * 0.015 },
      ];
      points.forEach((sparkle, index) => {
        ctx.save();
        ctx.translate(sparkle.x, sparkle.y);
        ctx.rotate(((index % 2 === 0 ? 12 : -18) * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(0, -sparkle.size);
        ctx.lineTo(sparkle.size * 0.4, 0);
        ctx.lineTo(0, sparkle.size);
        ctx.lineTo(-sparkle.size * 0.4, 0);
        ctx.closePath();
        const grad = ctx.createRadialGradient(0, 0, sparkle.size * 0.1, 0, 0, sparkle.size);
        grad.addColorStop(0, accent);
        grad.addColorStop(0.6, sparkleColor);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.restore();
      });
    }

    function drawBodyPattern(cx, cy) {
      ctx.save();
      if (styleKey === "sakura") {
        const maskColor = palette.patternMask || shiftColor(palette.belly, 0.12);
        ctx.beginPath();
        ctx.ellipse(cx - metrics.body.rx * 0.14, cy - metrics.body.ry * 0.08, metrics.body.rx * 0.62, metrics.body.ry * 0.56, 0, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          cx - metrics.body.rx * 0.28,
          cy - metrics.body.ry * 0.2,
          metrics.body.rx * 0.14,
          cx,
          cy,
          metrics.body.rx * 0.72
        );
        grad.addColorStop(0, shiftColor(maskColor, 0.22));
        grad.addColorStop(1, shiftColor(maskColor, -0.08));
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;

        const petalColor = palette.patternDetail || shiftColor(palette.furAccent || palette.furMain, -0.02);
        const petals = [
          { x: cx - metrics.body.rx * 0.22, y: cy - metrics.body.ry * 0.34, size: metrics.body.ry * 0.52, rotation: -0.4 },
          { x: cx + metrics.body.rx * 0.12, y: cy - metrics.body.ry * 0.26, size: metrics.body.ry * 0.45, rotation: 0.3 },
          { x: cx - metrics.body.rx * 0.02, y: cy - metrics.body.ry * 0.02, size: metrics.body.ry * 0.5, rotation: 0.12 },
        ];
        petals.forEach((petal, index) => {
          ctx.save();
          ctx.translate(petal.x, petal.y);
          ctx.rotate(petal.rotation);
          const radius = petal.size;
          ctx.beginPath();
          ctx.moveTo(0, -radius);
          ctx.quadraticCurveTo(radius * 0.58, -radius * 0.36, radius * 0.82, 0);
          ctx.quadraticCurveTo(radius * 0.44, radius * 0.48, 0, radius * 0.74);
          ctx.quadraticCurveTo(-radius * 0.44, radius * 0.48, -radius * 0.82, 0);
          ctx.quadraticCurveTo(-radius * 0.58, -radius * 0.36, 0, -radius);
          ctx.closePath();
          const petalGrad = ctx.createRadialGradient(0, -radius * 0.3, radius * 0.12, 0, 0, radius);
          petalGrad.addColorStop(0, shiftColor(petalColor, 0.18 + index * 0.02));
          petalGrad.addColorStop(1, shiftColor(petalColor, -0.1));
          ctx.fillStyle = petalGrad;
          ctx.globalAlpha = 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        });

        drawSparkles(cx - metrics.body.rx * 0.32, cy - metrics.body.ry * 0.28);
      } else if (styleKey === "galaxia") {
        const trailColor = palette.patternDetail || shiftColor(palette.furSecondary, -0.1);
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = base.width * 0.015;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - metrics.body.rx * 0.42, cy - metrics.body.ry * 0.18);
        ctx.bezierCurveTo(
          cx - metrics.body.rx * 0.1,
          cy - metrics.body.ry * 0.58,
          cx + metrics.body.rx * 0.55,
          cy - metrics.body.ry * 0.22,
          cx + metrics.body.rx * 0.46,
          cy + metrics.body.ry * 0.24
        );
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - metrics.body.rx * 0.36, cy + metrics.body.ry * 0.02);
        ctx.quadraticCurveTo(
          cx + metrics.body.rx * 0.2,
          cy + metrics.body.ry * 0.18,
          cx + metrics.body.rx * 0.44,
          cy - metrics.body.ry * 0.14
        );
        const ribbonGrad = ctx.createLinearGradient(cx - metrics.body.rx * 0.36, cy, cx + metrics.body.rx * 0.5, cy);
        ribbonGrad.addColorStop(0, "rgba(255, 255, 255, 0.18)");
        ribbonGrad.addColorStop(0.4, shiftColor(trailColor, 0.18));
        ribbonGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.strokeStyle = ribbonGrad;
        ctx.stroke();

        const stars = 6;
        for (let i = 0; i < stars; i += 1) {
          const angle = (Math.PI * 2 * i) / stars;
          const radius = metrics.body.rx * 0.3;
          const px = cx + Math.cos(angle) * radius * 0.72;
          const py = cy + Math.sin(angle) * metrics.body.ry * 0.42;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(((i % 2 === 0 ? 1 : -1) * 24 * Math.PI) / 180);
          const size = base.width * 0.026 * (0.7 + 0.3 * Math.sin(angle * 2));
          ctx.beginPath();
          for (let j = 0; j < 5; j += 1) {
            const theta = (Math.PI * 2 * j) / 5;
            const r = j % 2 === 0 ? size : size * 0.42;
            ctx.lineTo(Math.cos(theta) * r, Math.sin(theta) * r);
          }
          ctx.closePath();
          const starGrad = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size);
          starGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          starGrad.addColorStop(0.45, shiftColor(palette.iris || trailColor, 0.22));
          starGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = starGrad;
          ctx.fill();
          ctx.restore();
        }
      } else if (styleKey === "crema") {
        const drizzle = palette.patternDetail || shiftColor(palette.furAccent || palette.furMain, -0.12);
        ctx.beginPath();
        ctx.moveTo(cx - metrics.body.rx * 0.48, cy - metrics.body.ry * 0.1);
        ctx.bezierCurveTo(
          cx - metrics.body.rx * 0.24,
          cy - metrics.body.ry * 0.54,
          cx + metrics.body.rx * 0.42,
          cy - metrics.body.ry * 0.36,
          cx + metrics.body.rx * 0.44,
          cy + metrics.body.ry * 0.02
        );
        ctx.bezierCurveTo(
          cx + metrics.body.rx * 0.2,
          cy + metrics.body.ry * 0.42,
          cx - metrics.body.rx * 0.18,
          cy + metrics.body.ry * 0.32,
          cx - metrics.body.rx * 0.4,
          cy + metrics.body.ry * 0.18
        );
        ctx.closePath();
        const drizzleGrad = ctx.createLinearGradient(cx - metrics.body.rx * 0.5, cy, cx + metrics.body.rx * 0.5, cy + metrics.body.ry * 0.4);
        drizzleGrad.addColorStop(0, shiftColor(drizzle, 0.22));
        drizzleGrad.addColorStop(1, shiftColor(drizzle, -0.12));
        ctx.fillStyle = drizzleGrad;
        ctx.globalAlpha = 0.82;
        ctx.fill();
        ctx.globalAlpha = 1;

        const drops = [
          { x: cx - metrics.body.rx * 0.18, y: cy + metrics.body.ry * 0.34, scale: 1 },
          { x: cx + metrics.body.rx * 0.08, y: cy + metrics.body.ry * 0.26, scale: 0.86 },
          { x: cx + metrics.body.rx * 0.28, y: cy + metrics.body.ry * 0.12, scale: 0.72 },
        ];
        const dripColor = shiftColor(palette.patternMask || drizzle, -0.05);
        drops.forEach((drop) => {
          ctx.save();
          ctx.translate(drop.x, drop.y);
          ctx.scale(drop.scale, drop.scale);
          ctx.beginPath();
          ctx.moveTo(0, -metrics.body.ry * 0.12);
          ctx.quadraticCurveTo(metrics.body.rx * 0.08, 0, 0, metrics.body.ry * 0.18);
          ctx.quadraticCurveTo(-metrics.body.rx * 0.08, 0, 0, -metrics.body.ry * 0.12);
          const dropGrad = ctx.createLinearGradient(0, -metrics.body.ry * 0.12, 0, metrics.body.ry * 0.18);
          dropGrad.addColorStop(0, shiftColor(dripColor, 0.18));
          dropGrad.addColorStop(1, shiftColor(dripColor, -0.14));
          ctx.fillStyle = dropGrad;
          ctx.fill();
          ctx.restore();
        });
      }
      ctx.restore();
    }

    function drawShoulderShade() {
      ctx.save();
      ctx.translate(-metrics.body.rx * 0.36, -metrics.body.ry * 0.12);
      ctx.rotate(-0.28);
      ctx.beginPath();
      ctx.ellipse(0, 0, metrics.body.rx * 0.46, metrics.body.ry * 0.28, 0, 0, Math.PI * 2);
      const shoulderGrad = ctx.createRadialGradient(
        -metrics.body.rx * 0.12,
        -metrics.body.ry * 0.18,
        metrics.body.rx * 0.08,
        0,
        0,
        metrics.body.rx * 0.52
      );
      shoulderGrad.addColorStop(0, shiftColor(palette.furMain, 0.18));
      shoulderGrad.addColorStop(1, shiftColor(palette.furSecondary, -0.18));
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = shoulderGrad;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawHipHighlight() {
      ctx.save();
      ctx.translate(metrics.body.rx * 0.48, metrics.body.ry * 0.06);
      ctx.rotate(0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0, metrics.body.rx * 0.52, metrics.body.ry * 0.32, 0, 0, Math.PI * 2);
      const hipGrad = ctx.createRadialGradient(
        -metrics.body.rx * 0.08,
        -metrics.body.ry * 0.16,
        metrics.body.rx * 0.1,
        0,
        0,
        metrics.body.rx * 0.55
      );
      hipGrad.addColorStop(0, shiftColor(palette.furMain, 0.16));
      hipGrad.addColorStop(1, shiftColor(palette.furSecondary, -0.2));
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = hipGrad;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawSpineHighlight() {
      ctx.save();
      ctx.translate(-metrics.body.rx * 0.12, -metrics.body.ry * 0.56);
      ctx.rotate(-0.08);
      ctx.beginPath();
      ctx.moveTo(-metrics.body.rx * 0.1, 0);
      ctx.quadraticCurveTo(
        metrics.body.rx * 0.42,
        -metrics.body.ry * 0.2,
        metrics.body.rx * 0.78,
        metrics.body.ry * 0.16
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = Math.max(1.4, metrics.body.ry * 0.12);
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    }

    function drawChestTuft() {
      const bellyColor = palette.belly || shiftColor(palette.furMain, 0.24);
      ctx.save();
      ctx.translate(-metrics.body.rx * 0.68, -metrics.body.ry * 0.08);
      ctx.beginPath();
      ctx.moveTo(-metrics.body.rx * 0.05, -metrics.body.ry * 0.28);
      ctx.quadraticCurveTo(
        -metrics.body.rx * 0.16,
        -metrics.body.ry * 0.62,
        metrics.body.rx * 0.12,
        -metrics.body.ry * 0.48
      );
      ctx.quadraticCurveTo(
        metrics.body.rx * 0.36,
        -metrics.body.ry * 0.12,
        metrics.body.rx * 0.26,
        metrics.body.ry * 0.34
      );
      ctx.quadraticCurveTo(metrics.body.rx * 0.06, metrics.body.ry * 0.26, -metrics.body.rx * 0.06, metrics.body.ry * 0.36);
      ctx.closePath();
      const tuftGrad = ctx.createLinearGradient(
        -metrics.body.rx * 0.12,
        -metrics.body.ry * 0.48,
        metrics.body.rx * 0.28,
        metrics.body.ry * 0.36
      );
      tuftGrad.addColorStop(0, shiftColor(bellyColor, 0.18));
      tuftGrad.addColorStop(1, shiftColor(bellyColor, -0.08));
      ctx.globalAlpha = styleKey === "sakura" ? 0.92 : 0.82;
      ctx.fillStyle = tuftGrad;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.moveTo(-metrics.body.rx * 0.02, -metrics.body.ry * 0.18);
      ctx.quadraticCurveTo(
        metrics.body.rx * 0.1,
        -metrics.body.ry * 0.16,
        metrics.body.rx * 0.18,
        metrics.body.ry * 0.26
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = Math.max(1, metrics.body.ry * 0.08);
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    }

    function drawLegSegment(position, motion = {}, offsetY = 0, far = true) {
      const basePos = legPositions[position];
      if (!basePos) return;
      const lift = (motion?.lift || 0) * 2.4;
      const forward = (motion?.forward || 0) * 2.2;
      const height = Math.max(metrics.leg.height * 0.45, metrics.leg.height - lift * 0.4);
      const width = metrics.leg.width * (far ? 0.9 : 1);
      const x = basePos.x + forward;
      const y = basePos.y + offsetY;
      ctx.save();
      ctx.translate(x, y);
      const color = far ? palette.furSecondary : palette.furMain;
      const grad = ctx.createLinearGradient(0, -height, 0, 0);
      grad.addColorStop(0, shiftColor(color, 0.16));
      grad.addColorStop(0.65, color);
      grad.addColorStop(1, shiftColor(color, -0.14));
      drawRoundedRect(-width / 2, -height, width, height, width * 0.45, grad);
      const pawHeight = metrics.leg.height * 0.28;
      const pawOffset = Math.min(pawHeight * 0.6, lift * 0.6);
      const pawColor = palette.paw || palette.belly;
      const pawGrad = ctx.createLinearGradient(0, -pawHeight, 0, 0);
      pawGrad.addColorStop(0, shiftColor(pawColor, 0.12));
      pawGrad.addColorStop(1, shiftColor(pawColor, -0.14));
      drawRoundedRect(-width / 2 + 1, -pawHeight + pawOffset, width - 2, pawHeight, pawHeight / 2, pawGrad);

      ctx.beginPath();
      ctx.ellipse(0, -pawHeight * 0.4 + pawOffset, Math.max(width * 0.28, 2), pawHeight * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.globalAlpha = far ? 0.2 : 0.32;
      ctx.fill();
      ctx.globalAlpha = 1;

      const toeSpacing = Math.max(width - 4, 2) / 3;
      const toeBaseY = pawOffset - pawHeight * 0.06;
      const toeColor = shiftColor(pawColor, -0.18);
      ctx.strokeStyle = toeColor;
      ctx.lineWidth = Math.max(0.8, pawHeight * 0.14);
      ctx.lineCap = "round";
      ctx.globalAlpha = far ? 0.28 : 0.5;
      for (let i = 0; i < 3; i += 1) {
        const xToe = -width / 2 + toeSpacing * (i + 0.5) + 1;
        ctx.beginPath();
        ctx.ellipse(xToe, toeBaseY, toeSpacing * 0.32, pawHeight * 0.32, 0, 0, Math.PI);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawHead(expression, offsetX = 0, offsetY = 0, bodyOffsetY = 0, whiskerTilt = 0) {
      const cx = metrics.head.cx + offsetX;
      const cy = metrics.head.cy + offsetY + bodyOffsetY * 0.45;
      const radius = metrics.head.r;

      ctx.save();
      ctx.translate(cx, cy);
      const headGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.5, radius * 0.2, 0, 0, radius);
      headGrad.addColorStop(0, shiftColor(palette.furSecondary, 0.18));
      headGrad.addColorStop(1, shiftColor(palette.furMain, -0.12));
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = headGrad;
      ctx.fill();

      drawEar(-radius * 0.75, -radius * 1.05, false);
      drawEar(radius * 0.75, -radius * 1.05, true);

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.995, 0, Math.PI * 2);
      ctx.clip();
      drawFaceMask(radius);
      ctx.restore();

      drawCheek(-radius * 0.52, radius * 0.2);
      drawCheek(radius * 0.45, radius * 0.2);

      const eyeY = -radius * 0.15;
      drawEye(expression.eyes, -radius * 0.42, eyeY, whiskerTilt);
      drawEye(expression.eyes, radius * 0.42, eyeY, -whiskerTilt);

      ctx.save();
      ctx.translate(0, radius * 0.32);
      drawNose();
      drawMouth(expression.mouth, expression.tongue);
      ctx.restore();

      drawWhiskers(whiskerTilt);

      ctx.restore();
    }

    function drawEar(offsetX, offsetY, mirrored) {
      ctx.save();
      ctx.translate(offsetX, offsetY);
      if (mirrored) {
        ctx.scale(-1, 1);
      }
      const earWidth = metrics.ear.width;
      const earHeight = metrics.ear.height;
      const baseInset = earWidth * 0.22;
      ctx.beginPath();
      ctx.moveTo(-baseInset, earHeight);
      ctx.quadraticCurveTo(earWidth * 0.02, earHeight * 0.58, earWidth * 0.16, earHeight * 0.16);
      ctx.quadraticCurveTo(earWidth * 0.38, -earHeight * 0.18, earWidth * 0.64, earHeight * 0.22);
      ctx.quadraticCurveTo(earWidth * 0.48, earHeight * 0.74, earWidth * 0.08, earHeight * 1.0);
      ctx.quadraticCurveTo(-baseInset * 0.1, earHeight * 0.92, -baseInset, earHeight);
      ctx.closePath();
      const earColor = styleKey === "crema" ? palette.patternMask || palette.furAccent : palette.furSecondary;
      const earGrad = ctx.createLinearGradient(-baseInset * 0.6, earHeight, earWidth * 0.7, -earHeight * 0.05);
      earGrad.addColorStop(0, shiftColor(earColor, 0.22));
      earGrad.addColorStop(0.55, shiftColor(earColor, 0.02));
      earGrad.addColorStop(1, shiftColor(earColor, -0.18));
      ctx.fillStyle = earGrad;
      ctx.fill();

      ctx.strokeStyle = shiftColor(earColor, -0.28);
      ctx.lineWidth = Math.max(0.9, earWidth * 0.05);
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (palette.earInner) {
        ctx.beginPath();
        ctx.moveTo(-baseInset * 0.1, earHeight * 0.88);
        ctx.quadraticCurveTo(earWidth * 0.18, earHeight * 0.48, earWidth * 0.34, earHeight * 0.22);
        ctx.quadraticCurveTo(earWidth * 0.36, earHeight * 0.48, earWidth * 0.18, earHeight * 0.82);
        ctx.quadraticCurveTo(earWidth * 0.06, earHeight * 0.96, -baseInset * 0.1, earHeight * 0.88);
        ctx.closePath();
        const innerGrad = ctx.createLinearGradient(-baseInset * 0.2, earHeight, earWidth * 0.52, earHeight * 0.18);
        innerGrad.addColorStop(0, shiftColor(palette.earInner, -0.1));
        innerGrad.addColorStop(1, shiftColor(palette.earInner, 0.18));
        ctx.fillStyle = innerGrad;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.moveTo(-baseInset * 0.2, earHeight * 0.9);
      ctx.quadraticCurveTo(earWidth * 0.28, earHeight * 0.28, earWidth * 0.58, earHeight * 0.38);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
      ctx.lineWidth = Math.max(0.8, earWidth * 0.045);
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-baseInset * 0.15, earHeight * 0.98);
      ctx.quadraticCurveTo(earWidth * 0.12, earHeight * 1.04, earWidth * 0.34, earHeight * 0.92);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
      ctx.lineWidth = Math.max(0.7, earWidth * 0.038);
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    }

    function drawSleepingEar(offsetX, offsetY, mirrored = false) {
      ctx.save();
      ctx.translate(offsetX, offsetY);
      if (mirrored) {
        ctx.scale(-1, 1);
      }
      ctx.rotate(-0.12);
      const earWidth = metrics.ear.width * 0.92;
      const earHeight = metrics.ear.height * 1.05;
      ctx.beginPath();
      ctx.moveTo(0, earHeight * 0.98);
      ctx.quadraticCurveTo(earWidth * 0.2, earHeight * 0.38, earWidth * 0.66, -earHeight * 0.08);
      ctx.quadraticCurveTo(earWidth * 0.32, earHeight * 0.54, 0, earHeight * 0.98);
      ctx.closePath();
      const earColor = styleKey === "crema" ? palette.patternMask || palette.furAccent : palette.furSecondary;
      const earGrad = ctx.createLinearGradient(earWidth * 0.1, earHeight, earWidth * 0.78, earHeight * 0.12);
      earGrad.addColorStop(0, shiftColor(earColor, 0.14));
      earGrad.addColorStop(1, shiftColor(earColor, -0.16));
      ctx.fillStyle = earGrad;
      ctx.fill();

      if (palette.earInner) {
        ctx.beginPath();
        ctx.moveTo(earWidth * 0.14, earHeight * 0.88);
        ctx.quadraticCurveTo(earWidth * 0.4, earHeight * 0.32, earWidth * 0.56, earHeight * 0.68);
        ctx.quadraticCurveTo(earWidth * 0.3, earHeight * 0.6, earWidth * 0.14, earHeight * 0.94);
        ctx.closePath();
        const innerGrad = ctx.createLinearGradient(earWidth * 0.12, earHeight * 0.95, earWidth * 0.6, earHeight * 0.25);
        innerGrad.addColorStop(0, shiftColor(palette.earInner, -0.04));
        innerGrad.addColorStop(1, shiftColor(palette.earInner, 0.18));
        ctx.fillStyle = innerGrad;
        ctx.globalAlpha = 0.88;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.moveTo(earWidth * 0.16, earHeight * 0.74);
      ctx.quadraticCurveTo(earWidth * 0.38, earHeight * 0.26, earWidth * 0.58, earHeight * 0.48);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
      ctx.lineWidth = Math.max(1, earWidth * 0.06);
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    }

    function drawFaceMask(radius) {
      let muzzleColor = palette.belly;
      if (styleKey === "sakura") {
        const maskColor = palette.patternMask || shiftColor(palette.belly, 0.12);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.36, radius * 0.12);
        ctx.quadraticCurveTo(-radius * 0.32, -radius * 0.26, radius * 0.3, -radius * 0.28);
        ctx.quadraticCurveTo(radius * 0.48, radius * 0.16, 0, radius * 0.46);
        ctx.quadraticCurveTo(-radius * 0.48, radius * 0.16, -radius * 0.36, radius * 0.12);
        ctx.closePath();
        const grad = ctx.createRadialGradient(0, radius * 0.1, radius * 0.14, 0, radius * 0.32, radius * 0.48);
        grad.addColorStop(0, shiftColor(maskColor, 0.2));
        grad.addColorStop(1, shiftColor(maskColor, -0.08));
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
        muzzleColor = maskColor;
      } else if (styleKey === "galaxia") {
        const haloColor = palette.patternMask || shiftColor(palette.furAccent || palette.furMain, 0.16);
        const halo = ctx.createRadialGradient(0, -radius * 0.12, radius * 0.18, 0, 0, radius * 0.86);
        halo.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        halo.addColorStop(0.5, shiftColor(haloColor, 0.14));
        halo.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.beginPath();
        ctx.arc(0, -radius * 0.04, radius * 0.88, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
        muzzleColor = shiftColor(palette.belly, 0.02);
      } else if (styleKey === "crema") {
        const maskColor = palette.patternMask || shiftColor(palette.furAccent || palette.furMain, -0.06);
        ctx.beginPath();
        ctx.ellipse(-radius * 0.02, radius * 0.08, radius * 0.8, radius * 0.64, 0, 0, Math.PI * 2);
        const grad = ctx.createLinearGradient(0, -radius * 0.52, 0, radius * 0.6);
        grad.addColorStop(0, shiftColor(maskColor, 0.12));
        grad.addColorStop(1, shiftColor(maskColor, -0.14));
        ctx.fillStyle = grad;
        ctx.fill();
        muzzleColor = shiftColor(palette.belly, -0.02);
      }

      if (muzzleColor) {
        drawMuzzleDetail(radius, muzzleColor, { overlay: styleKey === "crema" });
      }
    }

    function drawMuzzleDetail(radius, color, { overlay = false } = {}) {
      const width = radius * 0.46;
      const height = radius * 0.32;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-radius * 0.05, radius * 0.36, width, height, 0, 0, Math.PI * 2);
      const muzzleGrad = ctx.createLinearGradient(0, radius * 0.2, 0, radius * 0.56);
      muzzleGrad.addColorStop(0, shiftColor(color, 0.16));
      muzzleGrad.addColorStop(1, shiftColor(color, -0.12));
      ctx.globalAlpha = overlay ? 0.78 : 0.88;
      ctx.fillStyle = muzzleGrad;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.ellipse(-radius * 0.08, radius * 0.24, width * 0.52, height * 0.42, 0, 0, Math.PI * 2);
      const highlightGrad = ctx.createRadialGradient(
        -width * 0.2,
        -height * 0.1,
        width * 0.12,
        0,
        0,
        width * 0.64
      );
      highlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.25)");
      highlightGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = highlightGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-radius * 0.05, radius * 0.44, width * 0.8, height * 0.66, 0, 0, Math.PI);
      ctx.strokeStyle = shiftColor(color, -0.2);
      ctx.lineWidth = radius * 0.05;
      ctx.globalAlpha = 0.28;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawCheek(x, y) {
      if (!palette.cheek) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.ellipse(0, 0, metrics.head.r * 0.28, metrics.head.r * 0.18, 0, 0, Math.PI * 2);
      const cheekGrad = ctx.createRadialGradient(0, -metrics.head.r * 0.04, metrics.head.r * 0.06, 0, 0, metrics.head.r * 0.28);
      cheekGrad.addColorStop(0, shiftColor(palette.cheek, 0.14));
      cheekGrad.addColorStop(1, shiftColor(palette.cheek, -0.1));
      ctx.fillStyle = cheekGrad;
      ctx.globalAlpha = styleKey === "galaxia" ? 0.76 : 0.86;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.ellipse(-metrics.head.r * 0.08, -metrics.head.r * 0.04, metrics.head.r * 0.08, metrics.head.r * 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.fill();
      ctx.restore();
    }

    function drawEye(type, offsetX, offsetY, tilt = 0) {
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.rotate((tilt * Math.PI) / 180);
      const width = metrics.head.r * 0.56;
      const height = type === "wide" ? metrics.head.r * 0.4 : metrics.head.r * 0.32;

      if (type === "sleep" || type === "blink") {
        ctx.beginPath();
        ctx.moveTo(-width * 0.42, 0);
        ctx.quadraticCurveTo(0, metrics.head.r * 0.2, width * 0.42, 0);
        ctx.strokeStyle = shiftColor(palette.furSecondary, -0.2);
        ctx.lineWidth = metrics.head.r * 0.12;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
        return;
      }

      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.52, height * 0.52, 0, 0, Math.PI * 2);
      const whiteGrad = ctx.createRadialGradient(0, -height * 0.2, width * 0.12, 0, 0, Math.max(width, height) * 0.52);
      whiteGrad.addColorStop(0, shiftColor(palette.belly || "#f5f7fb", 0.2));
      whiteGrad.addColorStop(1, shiftColor(palette.belly || "#f5f7fb", -0.05));
      ctx.fillStyle = whiteGrad;
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
      ctx.lineWidth = Math.max(1, metrics.head.r * 0.02);
      ctx.stroke();

      let topClip = 0;
      let bottomClip = 0;
      if (type === "happy") {
        topClip = height * 0.26;
      } else if (type === "soft") {
        topClip = height * 0.2;
      } else if (type === "relaxed") {
        topClip = height * 0.14;
      } else if (type === "narrow") {
        topClip = height * 0.36;
      } else if (type === "droop") {
        bottomClip = height * 0.28;
      }

      if (topClip > 0) {
        ctx.beginPath();
        ctx.rect(-width, -height, width * 2, topClip);
        ctx.fillStyle = palette.furMain;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (bottomClip > 0) {
        ctx.beginPath();
        ctx.rect(-width, height * 0.5 - bottomClip, width * 2, bottomClip + height * 0.4);
        ctx.fillStyle = palette.furSecondary;
        ctx.globalAlpha = 0.88;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const irisScale = type === "wide" ? 1.08 : type === "narrow" ? 0.8 : 0.95;
      const irisWidth = width * 0.32 * irisScale;
      const irisHeight = height * 0.58 * irisScale;
      ctx.beginPath();
      ctx.ellipse(0, 0, irisWidth, irisHeight, 0, 0, Math.PI * 2);
      const irisColor = palette.iris || shiftColor(palette.furAccent || palette.furMain, 0.3);
      const irisGrad = ctx.createRadialGradient(0, -irisHeight * 0.4, irisWidth * 0.2, 0, 0, irisWidth);
      irisGrad.addColorStop(0, shiftColor(irisColor, 0.22));
      irisGrad.addColorStop(1, shiftColor(irisColor, -0.1));
      ctx.fillStyle = irisGrad;
      ctx.fill();

      const pupilWidth = irisWidth * 0.5;
      const pupilHeight = irisHeight * (type === "wide" ? 0.56 : 0.7);
      ctx.beginPath();
      ctx.ellipse(0, 0, pupilWidth, pupilHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette.pupil || "#111";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-irisWidth * 0.32, -irisHeight * 0.34, irisWidth * 0.28, irisHeight * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(irisWidth * 0.2, irisHeight * 0.22, irisWidth * 0.16, irisHeight * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fill();

      ctx.restore();
    }

    function drawNose() {
      const width = metrics.head.r * 0.22;
      const height = metrics.head.r * 0.14;
      ctx.beginPath();
      ctx.moveTo(-width / 2, 0);
      ctx.quadraticCurveTo(0, height * 0.8, width / 2, 0);
      ctx.quadraticCurveTo(0, height * 0.2, -width / 2, 0);
      ctx.fillStyle = palette.nose || "#f3a9bb";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, height * 0.3);
      ctx.lineTo(0, height * 1.2);
      ctx.strokeStyle = shiftColor(palette.pupil || "#1a1c26", 0.1);
      ctx.lineWidth = metrics.head.r * 0.04;
      ctx.stroke();
    }

    function drawMouth(type, showTongue = false) {
      const width = metrics.head.r * 0.55;
      const strokeColor = shiftColor(palette.pupil || "#1a1c26", -0.1);
      const lineWidth = metrics.head.r * 0.08;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      switch (type) {
        case "smile":
          ctx.moveTo(-width * 0.5, -width * 0.08);
          ctx.quadraticCurveTo(0, width * 0.42, width * 0.5, -width * 0.08);
          break;
        case "soft":
          ctx.moveTo(-width * 0.35, -width * 0.04);
          ctx.quadraticCurveTo(0, width * 0.22, width * 0.35, -width * 0.04);
          break;
        case "flat":
          ctx.moveTo(-width * 0.42, 0);
          ctx.lineTo(width * 0.42, 0);
          break;
        case "sad":
          ctx.moveTo(-width * 0.44, width * 0.12);
          ctx.quadraticCurveTo(0, -width * 0.28, width * 0.44, width * 0.12);
          break;
        case "angry":
          ctx.moveTo(-width * 0.38, -width * 0.1);
          ctx.lineTo(-width * 0.05, -width * 0.26);
          ctx.moveTo(width * 0.38, -width * 0.1);
          ctx.lineTo(width * 0.05, -width * 0.26);
          ctx.moveTo(-width * 0.3, -width * 0.08);
          ctx.quadraticCurveTo(0, -width * 0.04, width * 0.3, -width * 0.08);
          break;
        case "grin":
          ctx.moveTo(-width * 0.5, -width * 0.08);
          ctx.quadraticCurveTo(0, width * 0.5, width * 0.5, -width * 0.08);
          showTongue = true;
          break;
        case "yum":
          ctx.moveTo(-width * 0.38, -width * 0.08);
          ctx.quadraticCurveTo(0, width * 0.36, width * 0.38, -width * 0.08);
          showTongue = true;
          break;
        case "sleep":
          ctx.moveTo(-width * 0.4, 0);
          ctx.quadraticCurveTo(0, width * 0.05, width * 0.4, 0);
          break;
        default:
          ctx.moveTo(-width * 0.4, 0);
          ctx.lineTo(width * 0.4, 0);
      }
      ctx.strokeStyle = strokeColor;
      ctx.stroke();

      if (showTongue) {
        ctx.beginPath();
        ctx.ellipse(0, width * 0.18, width * 0.26, width * 0.22, 0, 0, Math.PI);
        const tongueColor = palette.earInner || palette.nose || "#f3a9bb";
        const grad = ctx.createLinearGradient(0, width * 0.04, 0, width * 0.32);
        grad.addColorStop(0, shiftColor(tongueColor, 0.12));
        grad.addColorStop(1, shiftColor(tongueColor, -0.12));
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    function drawWhiskers(tilt = 0) {
      const whiskerColor = shiftColor(palette.belly || "#ffffff", -0.4);
      ctx.strokeStyle = whiskerColor;
      ctx.lineWidth = metrics.head.r * 0.045;
      ctx.lineCap = "round";

      const yBase = metrics.head.r * 0.52;
      ctx.beginPath();
      ctx.moveTo(-metrics.head.r * 0.25, yBase - metrics.head.r * 0.1);
      ctx.quadraticCurveTo(-metrics.head.r * 0.9, yBase - metrics.head.r * 0.15 - tilt * 0.4, -metrics.head.r * 1.18, yBase - metrics.head.r * 0.2 - tilt * 0.4);
      ctx.moveTo(-metrics.head.r * 0.22, yBase + metrics.head.r * 0.02);
      ctx.quadraticCurveTo(-metrics.head.r * 0.9, yBase + tilt * 0.2, -metrics.head.r * 1.15, yBase + tilt * 0.3);

      ctx.moveTo(metrics.head.r * 0.22, yBase - metrics.head.r * 0.1);
      ctx.quadraticCurveTo(metrics.head.r * 0.9, yBase - metrics.head.r * 0.15 + tilt * 0.4, metrics.head.r * 1.15, yBase - metrics.head.r * 0.2 + tilt * 0.4);
      ctx.moveTo(metrics.head.r * 0.25, yBase + metrics.head.r * 0.02);
      ctx.quadraticCurveTo(metrics.head.r * 0.9, yBase - tilt * 0.2, metrics.head.r * 1.18, yBase - tilt * 0.3);
      ctx.stroke();
    }

    function drawSleepingFaceMask(radius) {
      if (styleKey === "crema") {
        const maskColor = palette.patternMask || palette.furAccent;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.84, radius * 0.74, 0, 0, Math.PI * 2);
        const grad = ctx.createLinearGradient(0, -radius * 0.58, 0, radius * 0.6);
        grad.addColorStop(0, shiftColor(maskColor, 0.14));
        grad.addColorStop(1, shiftColor(maskColor, -0.14));
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, radius * 0.3, radius * 0.42, radius * 0.3, 0, 0, Math.PI * 2);
        const muzzleColor = shiftColor(palette.belly, -0.02);
        const muzzleGrad = ctx.createLinearGradient(0, radius * 0.16, 0, radius * 0.48);
        muzzleGrad.addColorStop(0, shiftColor(muzzleColor, 0.08));
        muzzleGrad.addColorStop(1, shiftColor(muzzleColor, -0.12));
        ctx.fillStyle = muzzleGrad;
        ctx.fill();
      } else if (styleKey === "sakura") {
        const maskColor = palette.patternMask || palette.belly;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.34, radius * 0.16);
        ctx.quadraticCurveTo(-radius * 0.28, -radius * 0.28, radius * 0.26, -radius * 0.26);
        ctx.quadraticCurveTo(radius * 0.42, radius * 0.12, 0, radius * 0.44);
        ctx.quadraticCurveTo(-radius * 0.42, radius * 0.12, -radius * 0.34, radius * 0.16);
        ctx.closePath();
        const grad = ctx.createRadialGradient(0, radius * 0.12, radius * 0.12, 0, radius * 0.32, radius * 0.46);
        grad.addColorStop(0, shiftColor(maskColor, 0.18));
        grad.addColorStop(1, shiftColor(maskColor, -0.06));
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (styleKey === "galaxia") {
        const detail = palette.patternDetail || shiftColor(palette.furSecondary, -0.08);
        ctx.strokeStyle = detail;
        ctx.lineWidth = radius * 0.12;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-radius * 0.28, -radius * 0.36);
        ctx.quadraticCurveTo(0, -radius * 0.5, radius * 0.28, -radius * 0.36);
        ctx.stroke();
      }
    }

    function drawSleepingEye(x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(-metrics.head.r * 0.18, 0);
      ctx.quadraticCurveTo(0, metrics.head.r * 0.12, metrics.head.r * 0.18, 0);
      ctx.strokeStyle = shiftColor(palette.furSecondary, -0.2);
      ctx.lineWidth = metrics.head.r * 0.09;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    }

    function drawRoundedRect(x, y, width, height, radius, fillStyle) {
      const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }

    function shiftColor(color, amount = 0) {
      if (!color || typeof color !== "string") return color;
      const match = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (!match) {
        return color;
      }
      let hex = match[1];
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((char) => char + char)
          .join("");
      }
      const numeric = parseInt(hex, 16);
      const delta = Math.round(amount * 255);
      const r = Math.max(0, Math.min(255, ((numeric >> 16) & 0xff) + delta));
      const g = Math.max(0, Math.min(255, ((numeric >> 8) & 0xff) + delta));
      const b = Math.max(0, Math.min(255, (numeric & 0xff) + delta));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    restartLoop();

    return {
      setPalette,
      setState,
      setAccessory,
      redraw: drawCurrentFrame,
      pause,
      resume,
    };
  }
  function getAutomaticDayMode(date = new Date()) {
        const hour = date.getHours();
        return hour >= 22 || hour < 6 ? "night" : "day";
      }

      function refreshDayMode({ announce = false } = {}) {
        const desiredMode = getAutomaticDayMode();
        const modeChanged = state.dayMode !== desiredMode;
        state.dayMode = desiredMode;
        updateDayMode();
        if (modeChanged) {
          if (announce) {
            pushLog(`El entorno cambia a modo ${state.dayMode === "day" ? "día" : "noche"}.`, "🌗");
          }
          scheduleStateSave();
        }
      }

      function startDayModeWatcher() {
        if (dayModeIntervalId) {
          clearInterval(dayModeIntervalId);
        }
        refreshDayMode();
        dayModeIntervalId = setInterval(() => refreshDayMode({ announce: true }), DAY_MODE_CHECK_INTERVAL);
      }

      function updateDayMode() {
        document.body.dataset.mode = state.dayMode;
        if (state.dayMode === "day") {
          document.documentElement.style.setProperty(
            "--bg-primary",
            "radial-gradient(circle at top, #ffe3f1 0%, #ffb7d5 36%, #ff86c6 70%, #f564a5 100%)"
          );
          dayEmoji.textContent = "🌞";
          dayLabel.textContent = "Modo día";
          degradeRates = { ...baseDegradeRates };
        } else {
            document.documentElement.style.setProperty(
              "--bg-primary",
              "radial-gradient(circle at top, #2b1b68 0%, #1d0f51 42%, #10063a 75%, #040019 100%)"
            );
            dayEmoji.textContent = "🌙";
            dayLabel.textContent = "Modo noche";
            degradeRates = { ...baseDegradeRates, energy: -1.4 };
          }
        }

        function startCatWander() {
          if (!catScene || !catWanderer || !cat) return;
          clearCatWander();
          wanderCat(true);
          if (!shouldAnimateCat()) {
            return;
          }
          const schedule = () => {
            catWanderTimeoutId = window.setTimeout(() => {
              if (!shouldAnimateCat()) {
                clearCatWander();
                return;
              }
              wanderCat();
              schedule();
            }, WANDER_DELAY);
          };
          schedule();
        }

        function wanderCat(force = false) {
          if (!catScene || !catWanderer || !cat) return;
          if (!force && (!shouldAnimateCat() || cat.dataset.activity !== "idle")) {
            return;
          }
          const snapToGrid = (value, size = 2) => Math.round(value / size) * size;
          const sceneWidth = catScene.clientWidth;
          const catWidth = catWanderer.offsetWidth || 1;
          const maxOffset = (sceneWidth - catWidth) / 2 - 12;
          if (maxOffset <= 0) return;
          let newX = (Math.random() * 2 - 1) * maxOffset;
          if (!force && Math.abs(newX - catMotion.x) < sceneWidth * 0.1) {
            newX = Math.sign(newX || 1) * Math.min(maxOffset, Math.abs(newX) + sceneWidth * 0.18);
          }
          const newY = -Math.random() * 18;
          const previousX = catMotion.x;
          newX = snapToGrid(newX);
          const direction = newX < previousX ? -1 : 1;
          catMotion.x = newX;
          catMotion.y = snapToGrid(newY);
          catWanderer.style.setProperty("--x", `${catMotion.x}px`);
          catWanderer.style.setProperty("--y", `${catMotion.y}px`);
          catWanderer.style.setProperty("--flip", direction === -1 ? "-1" : "1");
          if (cat.dataset.activity === "idle") {
            const distance = Math.abs(newX - previousX);
            if (force || distance > sceneWidth * 0.12) {
              setMotion("walk", { duration: WALK_MOTION_DURATION });
            }
          }
        }

window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    stopTickLoop();
    flushStateSave();
    refreshMotionSystems();
    return;
  }
  const now = Date.now();
  state.lastTick = Number(state.lastTick) || now;
  tick();
  refreshDayMode({ announce: true });
  refreshMotionSystems();
  startTickLoop();
  refreshNotificationAvailability();
  markInteractionForReminder();
  scheduleStateSave();
});

window.addEventListener("beforeunload", () => {
  stopTickLoop();
  flushStateSave();
});

        setupInstallPromptHandlers();
        registerServiceWorker();
        setupNotificationReminders();
