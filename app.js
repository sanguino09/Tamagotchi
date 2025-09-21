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

let currentSkinIndex = 0;
let lastMoodKey = null;

const catSkins = [
  {
    id: "tuxedo",
    name: "Tizón",
    emoji: "🐈‍⬛",
    pattern: "tuxedo",
    colors: {
      furMain: "#2b2f3c",
      furSecondary: "#1b202b",
      furAccent: "#3a4154",
      belly: "#f5f7fb",
      earInner: "#f7b4c3",
      cheek: "#f7c2d4",
      outline: "#10131b",
      paw: "#ffffff",
      collar: "#6ee7ff",
      collarStroke: "#3a9bff",
      nose: "#f3a9bb",
      pupil: "#11141f",
      tailTip: "#f1f4fb",
      iris: "#7fd1f1",
      patternMask: "#f5f7fb",
      patternDetail: "#dbe3f6",
    },
  },
  {
    id: "silver",
    name: "Luna",
    emoji: "🐈",
    pattern: "silver",
    colors: {
      furMain: "#c7d0dd",
      furSecondary: "#a9b2c2",
      furAccent: "#e3e7f2",
      belly: "#f6f8fd",
      earInner: "#f6c4da",
      cheek: "#f7a8c8",
      outline: "#3b465a",
      paw: "#ffffff",
      collar: "#7ed8ff",
      collarStroke: "#4aa5d4",
      nose: "#f3afc6",
      pupil: "#1f242e",
      tailTip: "#dfe4ef",
      iris: "#6bcfbe",
      patternMask: "#e8edf6",
      patternDetail: "#b2bbc9",
    },
  },
  {
    id: "siamese",
    name: "Suri",
    emoji: "🐱",
    pattern: "siamese",
    colors: {
      furMain: "#efe2cf",
      furSecondary: "#d2c2ac",
      furAccent: "#765947",
      belly: "#fdf4e6",
      earInner: "#f4c7bb",
      cheek: "#f2a89a",
      outline: "#3a2822",
      paw: "#765947",
      collar: "#5fe0dd",
      collarStroke: "#2aa7a4",
      nose: "#d48c7d",
      pupil: "#1a1410",
      tailTip: "#5c4436",
      iris: "#8bc5d8",
      patternMask: "#5c4436",
      patternDetail: "#7d5b49",
    },
  },
];

const defaultProgressBySkin = catSkins.reduce((acc, skin) => {
  acc[skin.id] = { level: 1, xp: 0 };
  return acc;
}, {});

const defaultState = {
  name: catSkins[0].name,
  hunger: 80,
  energy: 80,
  fun: 80,
  xp: 0,
  level: 1,
  lastTick: Date.now(),
  history: [],
  accessoriesUnlocked: false,
  dayMode: "day",
  skin: catSkins[0].id,
  progressBySkin: structuredClone(defaultProgressBySkin),
};

const state = loadState();

state.dayMode = getAutomaticDayMode();

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

const actions = {
  feed: {
    emoji: "🍣",
    text: () => `${getName()} disfruta del mejor salmón nigiri.`,
    effects: { hunger: +26, fun: +6, energy: -4 },
    xp: 12,
  },
  play: {
    emoji: "🧶",
    text: () => `${getName()} persigue el ovillo como si fuera la última vez.`,
    effects: { fun: +24, energy: -12, hunger: -8 },
    xp: 16,
  },
  nap: {
    emoji: "😴",
    text: () => `${getName()} ronronea mientras duerme la siesta.`,
    effects: { energy: +32, hunger: -8, fun: -4 },
    xp: 10,
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
  hunger: -2.5,
  energy: -2,
  fun: -2.3,
};

let degradeRates = { ...baseDegradeRates };
const DAY_MODE_CHECK_INTERVAL = 60 * 1000;
let dayModeIntervalId;
const tickInterval = 2500;
let wanderIntervalId;
let activityTimeout;
let motionTimeout;
const WALK_MOTION_DURATION = 2200;
const catMotion = { x: 0, y: 0 };

initialize();
setInterval(tick, tickInterval);

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
    state.progressBySkin = structuredClone(defaultProgressBySkin);
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
      pushLog(`${skin.name} estrena un nuevo pelaje.`, "😺");
      showToast("😺", `Ahora cuidas a ${skin.name}.`);
    } else {
      saveState();
    }
  }

  function syncSpriteState({ moodKey } = {}) {
    if (!catSpriteController) return;
    const activity = cat?.dataset?.activity || "idle";
    const motionState = cat?.dataset?.motion || "idle";
    const moodState = moodKey || cat?.dataset?.mood || getMood().key;
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
    catNameInput.value = state.name;
    catNameInput.addEventListener("change", () => {
      const fallbackName = catSkins[currentSkinIndex]?.name ?? catSkins[0].name;
      state.name = catNameInput.value.trim() || fallbackName;
      saveState();
      pushLog(`Ahora se llama ${state.name}.`, "✨");
    });

    document.querySelectorAll(".device-button").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn.dataset.action));
    });

    if (identityAvatar) {
      identityAvatar.addEventListener("click", cycleCatSkin);
    }

    if (state.history.length === 0) {
      pushLog(`Comienza una nueva aventura con ${state.name}.`, "🚀");
    } else {
        state.history.forEach((entry) => addLogEntry(entry));
      }

      if (cat) {
        if (!cat.dataset.activity) {
          cat.dataset.activity = "idle";
        }
        setMotion(cat.dataset.motion || "idle");
      }

      updateUI();
      startDayModeWatcher();
      startCatWander();
    }

    function loadState() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return structuredClone(defaultState);
        const parsed = JSON.parse(stored);
        const merged = { ...structuredClone(defaultState), ...parsed };
        const { clean, health, vetCooldown, ...safeState } = merged;
        const baseProgress = structuredClone(defaultProgressBySkin);
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
        return structuredClone(defaultState);
      }
    }

    function saveState() {
      try {
        persistSkinProgress();
        const copy = { ...state, history: state.history.slice(-25) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
      } catch (error) {
        console.error("Error guardando estado", error);
      }
    }

    function tick() {
      const now = Date.now();
      const delta = (now - state.lastTick) / 1000;
      state.lastTick = now;

      Object.entries(degradeRates).forEach(([stat, rate]) => {
        modifyStat(stat, rate * delta);
      });

      if (state.hunger < 30) {
        modifyStat("fun", -1.4 * delta);
      }
      if (state.energy < 25) {
        modifyStat("fun", -1 * delta);
      }
      if (state.fun < 25) {
        modifyStat("energy", -0.8 * delta);
      }

      updateUI();
      saveState();
    }

    function modifyStat(stat, amount) {
      state[stat] = clamp(state[stat] + amount, MIN_STAT, MAX_STAT);
    }

    function handleAction(actionKey) {
      const action = actions[actionKey];
      if (!action) return;

      let effects = action.effects;
      if (typeof effects === "function") {
        effects = effects();
      }

      Object.entries(effects).forEach(([stat, value]) => modifyStat(stat, value));
      playActionSound(actionKey);
      gainXp(action.xp);
      const narration = action.text();
      addLogEntry({ emoji: action.emoji, message: narration, timestamp: Date.now() });

      if (!state.accessoriesUnlocked && state.level >= 3) {
        state.accessoriesUnlocked = true;
        toggleAccessory(true);
        pushLog(`${getName()} desbloquea su primer accesorio exclusivo.`, "🌟");
      }

      setCatActivity(actionKey);
      const mood = getMood();
      cat.dataset.mood = mood.key;
      showToast(action.emoji, narration);
      updateUI();
      saveState();
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
    syncSpriteState({ moodKey: getMood().key });

    if (!isAnimatedAction) {
      updateCatFace(getMood().key);
      return;
    }

      const duration = nextActivity === "nap" ? 5200 : 2800;
      activityTimeout = setTimeout(() => {
        cat.dataset.activity = "idle";
        activityTimeout = null;
        setMotion("idle");
        syncSpriteState({ moodKey: getMood().key });
        updateCatFace(getMood().key);
      }, duration);
    }

    function gainXp(amount) {
      state.xp = Math.max(0, state.xp + amount);
      const levelThreshold = state.level * 120;
      if (state.xp >= levelThreshold) {
        state.xp -= levelThreshold;
        state.level += 1;
        pushLog(`${getName()} sube al nivel ${state.level}.`, "🏅");
        showToast("🏅", `${getName()} alcanza el nivel ${state.level}.`);
      }
      persistSkinProgress();
    }

    function getMood() {
      const avg = (state.hunger + state.energy + state.fun) / 3;
      if (avg > 80) return { key: "feliz", label: "✨ Feliz" };
      if (avg > 60) return { key: "contento", label: "😺 Contento" };
      if (avg > 40) return { key: "neutro", label: "😐 Pensativo" };
      if (avg > 20) return { key: "triste", label: "🥺 Tristón" };
      return { key: "enfadado", label: "😾 Enfadado" };
    }

    function updateUI() {
      updateStat(hungerBar, hungerValue, state.hunger);
      updateStat(energyBar, energyValue, state.energy);
      updateStat(funBar, funValue, state.fun);
      updateXP();

      const mood = getMood();
      moodLabel.textContent = mood.label;
      cat.dataset.mood = mood.key;
      updateCatFace(mood.key);
      if (lastMoodKey && lastMoodKey !== mood.key) {
        playMoodSound(mood.key);
      }
      lastMoodKey = mood.key;
      levelLabel.textContent = state.level;
      document.title = `${getName()} · Nivel ${state.level} | Catagotchi`;
    }

    function updateStat(bar, valueLabel, statValue) {
      bar.style.setProperty("--value", `${statValue}%`);
      bar.style.width = `${statValue}%`;
      valueLabel.textContent = `${Math.round(statValue)}%`;
      if (statValue < 30) {
        valueLabel.style.color = "#ff4770";
      } else if (statValue > 70) {
        valueLabel.style.color = "#2eab6f";
      } else {
        valueLabel.style.color = "inherit";
      }
    }

    function updateXP() {
      const levelThreshold = state.level * 120;
      const xpPercent = Math.min(100, (state.xp / levelThreshold) * 100);
      xpBar.style.setProperty("--value", `${xpPercent}%`);
      xpBar.style.width = `${xpPercent}%`;
    }

    function updateCatFace(moodKey) {
      const activity = cat?.dataset?.activity || "idle";

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

      function addLogEntry(entry) {
        const element = logEntryTemplate.content.cloneNode(true);
        const timeElement = element.querySelector(".log-time");
        const textElement = element.querySelector(".log-text");
        const date = new Date(entry.timestamp || Date.now());
        const time = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
        timeElement.textContent = `${entry.emoji} ${time}`;
        textElement.textContent = entry.message;
        log.prepend(element);
        state.history.push(entry);
        state.history = state.history.slice(-40);
      }

      function pushLog(message, emoji = "✨") {
        const entry = { emoji, message, timestamp: Date.now() };
        addLogEntry(entry);
        saveState();
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
      groundY: base.height * 0.86,
      body: {
        cx: base.width * 0.58,
        cy: base.height * 0.64,
        rx: base.width * 0.28,
        ry: base.height * 0.24,
      },
      head: {
        cx: base.width * 0.34,
        cy: base.height * 0.42,
        r: base.height * 0.26,
      },
      ear: {
        width: base.width * 0.2,
        height: base.height * 0.26,
      },
      tail: {
        length: base.width * 0.42,
        baseX: base.width * 0.76,
      },
      leg: {
        width: base.width * 0.12,
        height: base.height * 0.3,
      },
    };

    const legPositions = {
      backFar: { x: metrics.body.cx + metrics.body.rx * 0.2, y: metrics.groundY },
      backNear: { x: metrics.body.cx + metrics.body.rx * 0.5, y: metrics.groundY },
      frontFar: { x: metrics.body.cx - metrics.body.rx * 0.05, y: metrics.groundY },
      frontNear: { x: metrics.body.cx - metrics.body.rx * 0.35, y: metrics.groundY },
    };

    const palette = {
      furMain: "#2b2f3c",
      furSecondary: "#1b202b",
      furAccent: "#3a4154",
      belly: "#f5f7fb",
      earInner: "#f7b4c3",
      cheek: "#f7c2d4",
      paw: "#ffffff",
      nose: "#f3a9bb",
      pupil: "#11141f",
      tailTip: "#f1f4fb",
      iris: "#7fd1f1",
      patternMask: "#f5f7fb",
      patternDetail: "#dbe3f6",
      outline: "#10131b",
    };

    let styleKey = "tuxedo";

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
    let intervalId = null;

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
    }

    function setAccessory(show) {
      state.accessory = !!show;
      drawCurrentFrame();
    }

    function setState(partial) {
      Object.assign(state, partial);
      const nextKey = resolveAnimationKey(state);
      if (nextKey !== animationKey) {
        animationKey = nextKey;
        restartLoop();
      } else {
        drawCurrentFrame();
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
      if (intervalId) {
        clearInterval(intervalId);
      }
      const settings = animations[animationKey] || animations.idle;
      frameIndex = 0;
      drawCurrentFrame();
      intervalId = window.setInterval(() => {
        frameIndex = (frameIndex + 1) % settings.frames;
        drawCurrentFrame();
      }, settings.duration);
    }

    function drawCurrentFrame() {
      const settings = animations[animationKey] || animations.idle;
      ctx.clearRect(0, 0, base.width, base.height);
      settings.draw({ frameIndex });
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
      ctx.globalAlpha = styleKey === "tuxedo" ? 0.96 : 0.9;
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
      ctx.globalAlpha = styleKey === "tuxedo" ? 1 : 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
      drawBodyPattern(cx, cy);
    }

    function drawBodyPattern(cx, cy) {
      if (styleKey === "tuxedo") {
        ctx.save();
        ctx.translate(cx - metrics.body.rx * 0.05, cy + metrics.body.ry * 0.08);
        ctx.beginPath();
        ctx.moveTo(-metrics.body.rx * 0.25, -metrics.body.ry * 0.3);
        ctx.quadraticCurveTo(0, metrics.body.ry * 0.55, metrics.body.rx * 0.32, -metrics.body.ry * 0.25);
        ctx.quadraticCurveTo(metrics.body.rx * 0.1, metrics.body.ry * 0.2, -metrics.body.rx * 0.25, -metrics.body.ry * 0.3);
        ctx.closePath();
        const maskColor = palette.patternMask || palette.belly;
        const grad = ctx.createLinearGradient(0, -metrics.body.ry * 0.5, 0, metrics.body.ry * 0.6);
        grad.addColorStop(0, shiftColor(maskColor, 0.12));
        grad.addColorStop(1, shiftColor(maskColor, -0.08));
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      } else if (styleKey === "silver") {
        const stripeColor = palette.patternDetail || shiftColor(palette.furSecondary, -0.1);
        ctx.save();
        ctx.strokeStyle = stripeColor;
        ctx.lineWidth = base.width * 0.012;
        ctx.lineCap = "round";
        for (let i = 0; i < 3; i += 1) {
          const y = cy - metrics.body.ry * 0.32 + i * metrics.body.ry * 0.28;
          ctx.beginPath();
          ctx.moveTo(cx + metrics.body.rx * 0.15, y);
          ctx.quadraticCurveTo(cx + metrics.body.rx * 0.55, y - metrics.body.ry * 0.08, cx + metrics.body.rx * 0.35, y + metrics.body.ry * 0.24);
          ctx.stroke();
        }
        ctx.restore();
      } else if (styleKey === "siamese") {
        ctx.save();
        ctx.translate(cx + metrics.body.rx * 0.2, cy + metrics.body.ry * 0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, metrics.body.rx * 0.55, metrics.body.ry * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fill();
        ctx.restore();
      }
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
      ctx.beginPath();
      ctx.moveTo(0, earHeight);
      ctx.quadraticCurveTo(earWidth * 0.15, earHeight * 0.2, earWidth * 0.6, 0);
      ctx.quadraticCurveTo(earWidth * 0.32, earHeight * 0.6, 0, earHeight);
      ctx.closePath();
      const earColor = styleKey === "siamese" ? palette.patternMask || palette.furAccent : palette.furSecondary;
      const earGrad = ctx.createLinearGradient(0, earHeight, earWidth * 0.6, 0);
      earGrad.addColorStop(0, shiftColor(earColor, 0.16));
      earGrad.addColorStop(1, shiftColor(earColor, -0.14));
      ctx.fillStyle = earGrad;
      ctx.fill();

      if (palette.earInner) {
        ctx.beginPath();
        ctx.moveTo(earWidth * 0.12, earHeight * 0.88);
        ctx.quadraticCurveTo(earWidth * 0.36, earHeight * 0.35, earWidth * 0.52, earHeight * 0.82);
        ctx.quadraticCurveTo(earWidth * 0.28, earHeight * 0.65, earWidth * 0.12, earHeight * 0.88);
        ctx.closePath();
        const innerGrad = ctx.createLinearGradient(0, earHeight, earWidth * 0.5, earHeight * 0.2);
        innerGrad.addColorStop(0, shiftColor(palette.earInner, -0.08));
        innerGrad.addColorStop(1, shiftColor(palette.earInner, 0.14));
        ctx.fillStyle = innerGrad;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function drawFaceMask(radius) {
      if (styleKey === "tuxedo") {
        ctx.beginPath();
        ctx.ellipse(-radius * 0.05, radius * 0.28, radius * 0.62, radius * 0.5, 0, 0, Math.PI * 2);
        const maskColor = palette.patternMask || palette.belly;
        const grad = ctx.createLinearGradient(0, radius * 0.05, 0, radius * 0.6);
        grad.addColorStop(0, shiftColor(maskColor, 0.12));
        grad.addColorStop(1, shiftColor(maskColor, -0.08));
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (styleKey === "siamese") {
        const maskColor = palette.patternMask || palette.furAccent;
        ctx.beginPath();
        ctx.ellipse(-radius * 0.02, radius * 0.06, radius * 0.82, radius * 0.74, 0, 0, Math.PI * 2);
        const grad = ctx.createLinearGradient(0, -radius * 0.6, 0, radius * 0.6);
        grad.addColorStop(0, shiftColor(maskColor, 0.12));
        grad.addColorStop(1, shiftColor(maskColor, -0.14));
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(-radius * 0.05, radius * 0.36, radius * 0.42, radius * 0.3, 0, 0, Math.PI * 2);
        const muzzleColor = shiftColor(palette.belly, -0.02);
        const muzzleGrad = ctx.createLinearGradient(0, radius * 0.2, 0, radius * 0.55);
        muzzleGrad.addColorStop(0, shiftColor(muzzleColor, 0.12));
        muzzleGrad.addColorStop(1, shiftColor(muzzleColor, -0.1));
        ctx.fillStyle = muzzleGrad;
        ctx.fill();
      } else if (styleKey === "silver") {
        const detail = palette.patternDetail || shiftColor(palette.furSecondary, -0.08);
        ctx.strokeStyle = detail;
        ctx.lineWidth = radius * 0.16;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-radius * 0.3, -radius * 0.45);
        ctx.quadraticCurveTo(0, -radius * 0.65, radius * 0.3, -radius * 0.45);
        ctx.stroke();
      }
    }

    function drawCheek(x, y) {
      if (!palette.cheek) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.ellipse(0, 0, metrics.head.r * 0.24, metrics.head.r * 0.16, 0, 0, Math.PI * 2);
      const cheekGrad = ctx.createRadialGradient(0, 0, metrics.head.r * 0.05, 0, 0, metrics.head.r * 0.24);
      cheekGrad.addColorStop(0, shiftColor(palette.cheek, 0.1));
      cheekGrad.addColorStop(1, shiftColor(palette.cheek, -0.12));
      ctx.fillStyle = cheekGrad;
      ctx.globalAlpha = 0.82;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawEye(type, offsetX, offsetY, tilt = 0) {
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.rotate((tilt * Math.PI) / 180);
      const width = metrics.head.r * 0.48;
      const height = type === "wide" ? metrics.head.r * 0.34 : metrics.head.r * 0.28;

      if (type === "sleep" || type === "blink") {
        ctx.beginPath();
        ctx.moveTo(-width * 0.4, 0);
        ctx.quadraticCurveTo(0, metrics.head.r * 0.18, width * 0.4, 0);
        ctx.strokeStyle = shiftColor(palette.furSecondary, -0.2);
        ctx.lineWidth = metrics.head.r * 0.12;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
        return;
      }

      ctx.beginPath();
      ctx.ellipse(0, 0, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
      const eyeWhite = shiftColor(palette.belly || "#f5f7fb", 0.15);
      ctx.fillStyle = eyeWhite;
      ctx.fill();

      let topClip = 0;
      let bottomClip = 0;
      if (type === "happy") {
        topClip = height * 0.25;
      } else if (type === "soft") {
        topClip = height * 0.18;
      } else if (type === "relaxed") {
        topClip = height * 0.12;
      } else if (type === "narrow") {
        topClip = height * 0.35;
      } else if (type === "droop") {
        bottomClip = height * 0.25;
      }

      if (topClip > 0) {
        ctx.beginPath();
        ctx.rect(-width, -height, width * 2, topClip);
        ctx.fillStyle = palette.furMain;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (bottomClip > 0) {
        ctx.beginPath();
        ctx.rect(-width, height * 0.5 - bottomClip, width * 2, bottomClip + height * 0.4);
        ctx.fillStyle = palette.furSecondary;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const irisScale = type === "wide" ? 1.1 : type === "narrow" ? 0.82 : 0.95;
      const irisWidth = width * 0.3 * irisScale;
      const irisHeight = height * 0.55 * irisScale;
      ctx.beginPath();
      ctx.ellipse(0, 0, irisWidth, irisHeight, 0, 0, Math.PI * 2);
      const irisColor = palette.iris || shiftColor(palette.furAccent || palette.furMain, 0.28);
      ctx.fillStyle = irisColor;
      ctx.fill();

      const pupilWidth = irisWidth * 0.55;
      const pupilHeight = irisHeight * (type === "wide" ? 0.58 : 0.72);
      ctx.beginPath();
      ctx.ellipse(0, 0, pupilWidth, pupilHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette.pupil || "#111";
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-irisWidth * 0.35, -irisHeight * 0.35, irisWidth * 0.28, irisHeight * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
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
      if (styleKey === "siamese") {
        const maskColor = palette.patternMask || palette.furAccent;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.86, radius * 0.76, 0, 0, Math.PI * 2);
        const grad = ctx.createLinearGradient(0, -radius * 0.6, 0, radius * 0.6);
        grad.addColorStop(0, shiftColor(maskColor, 0.12));
        grad.addColorStop(1, shiftColor(maskColor, -0.14));
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, radius * 0.3, radius * 0.45, radius * 0.32, 0, 0, Math.PI * 2);
        const muzzleColor = shiftColor(palette.belly, -0.02);
        const muzzleGrad = ctx.createLinearGradient(0, radius * 0.18, 0, radius * 0.52);
        muzzleGrad.addColorStop(0, shiftColor(muzzleColor, 0.1));
        muzzleGrad.addColorStop(1, shiftColor(muzzleColor, -0.1));
        ctx.fillStyle = muzzleGrad;
        ctx.fill();
      } else if (styleKey === "tuxedo") {
        const maskColor = palette.patternMask || palette.belly;
        ctx.beginPath();
        ctx.ellipse(-radius * 0.05, radius * 0.25, radius * 0.58, radius * 0.46, 0, 0, Math.PI * 2);
        ctx.fillStyle = maskColor;
        ctx.globalAlpha = 0.96;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (styleKey === "silver") {
        const detail = palette.patternDetail || shiftColor(palette.furSecondary, -0.08);
        ctx.strokeStyle = detail;
        ctx.lineWidth = radius * 0.14;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-radius * 0.32, -radius * 0.36);
        ctx.quadraticCurveTo(0, -radius * 0.5, radius * 0.32, -radius * 0.36);
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
    drawCurrentFrame();

    return {
      setPalette,
      setState,
      setAccessory,
      redraw: drawCurrentFrame,
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
          saveState();
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
          dayLabel.textContent = "Parque soleado";
          degradeRates = { ...baseDegradeRates };
        } else {
            document.documentElement.style.setProperty(
              "--bg-primary",
              "radial-gradient(circle at top, #2b1b68 0%, #1d0f51 42%, #10063a 75%, #040019 100%)"
            );
            dayEmoji.textContent = "🌙";
            dayLabel.textContent = "Noche estrellada";
            degradeRates = { ...baseDegradeRates, energy: -1.4 };
          }
        }

        function getName() {
          const fallbackSkin = catSkins[currentSkinIndex] ?? catSkins[0];
          return state.name || fallbackSkin?.name || "Pixel";
        }

        function startCatWander() {
          if (wanderIntervalId) clearInterval(wanderIntervalId);
          wanderIntervalId = setInterval(() => wanderCat(), 4200);
          wanderCat(true);
        }

        function wanderCat(force = false) {
          if (!catScene || !catWanderer || !cat) return;
          if (!force && cat.dataset.activity !== "idle") {
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
          state.lastTick = Date.now();
          if (document.visibilityState === "visible") {
            refreshDayMode({ announce: true });
          }
        });

        window.addEventListener("beforeunload", saveState);
