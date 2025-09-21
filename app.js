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
    id: "lukis",
    name: "Lukis",
    emoji: "🐈‍⬛",
    colors: {
      furMain: "#2f2c3d",
      furSecondary: "#262338",
      furAccent: "#454058",
      belly: "#d8dbe8",
      earInner: "#f3adc9",
      cheek: "#f48fbf",
      outline: "#08050f",
      paw: "#e8ecf7",
      collar: "#6ee7ff",
      collarStroke: "#4aa5ff",
      nose: "#f3adc9",
      pupil: "#0e1018",
    },
  },
  {
    id: "arwen",
    name: "Arwen",
    emoji: "🐈",
    colors: {
      furMain: "#cbd5e0",
      furSecondary: "#b3bcc8",
      furAccent: "#e1e7ef",
      belly: "#f5f8ff",
      earInner: "#f5c3da",
      cheek: "#f7a6c6",
      outline: "#364154",
      paw: "#ffffff",
      collar: "#7ed8ff",
      collarStroke: "#4a9bd4",
      nose: "#f5c3da",
      pupil: "#1a1c26",
    },
  },
  {
    id: "iria",
    name: "Iria",
    emoji: "🐱",
    colors: {
      furMain: "#f0e7d8",
      furSecondary: "#d2c2ad",
      furAccent: "#5c4636",
      belly: "#fff6e7",
      earInner: "#f4c7bb",
      cheek: "#f3a79a",
      outline: "#3a2822",
      paw: "#f5e6d2",
      collar: "#5fe0dd",
      collarStroke: "#27b7b5",
      nose: "#d48c7d",
      pupil: "#1a1512",
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
    ctx.imageSmoothingEnabled = false;

    const base = {
      width: canvas.width,
      height: canvas.height,
      body: { x: 14, y: 16, width: 20, height: 16 },
      head: { x: 16, y: 4, width: 16, height: 12 },
      ear: { width: 6, height: 8 },
      legWidth: 6,
      legHeight: 9,
      groundOffset: 2,
    };

    const palette = {
      outline: "#08050f",
      furMain: "#2f2c3d",
      furSecondary: "#262338",
      furAccent: "#454058",
      belly: "#d8dbe8",
      earInner: "#f3adc9",
      cheek: "#f48fbf",
      paw: "#e8ecf7",
      nose: "#f3adc9",
      pupil: "#0e1018",
    };

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

    const state = {
      mood: "feliz",
      activity: "idle",
      motion: "idle",
      accessory: false,
    };

    const walkCycle = [
      {
        frontNear: { lift: 4, forward: 2 },
        frontFar: { lift: 1, forward: -2 },
        backNear: { lift: 2, forward: -2 },
        backFar: { lift: 4, forward: 2 },
        headOffsetY: -1,
        bodyOffsetY: -1,
        tailSway: 2,
      },
      {
        frontNear: { lift: 2, forward: 2 },
        frontFar: { lift: 4, forward: -2 },
        backNear: { lift: 4, forward: -2 },
        backFar: { lift: 1, forward: 2 },
        headOffsetY: 0,
        bodyOffsetY: 0,
        tailSway: 1,
      },
      {
        frontNear: { lift: 1, forward: 0 },
        frontFar: { lift: 3, forward: -1 },
        backNear: { lift: 4, forward: 2 },
        backFar: { lift: 2, forward: -2 },
        headOffsetY: -1,
        bodyOffsetY: -1,
        tailSway: -1,
      },
      {
        frontNear: { lift: 3, forward: 0 },
        frontFar: { lift: 1, forward: -2 },
        backNear: { lift: 1, forward: 2 },
        backFar: { lift: 3, forward: -2 },
        headOffsetY: 0,
        bodyOffsetY: 0,
        tailSway: -2,
      },
    ];

    const feedCycle = [
      { headOffsetY: -1, tailLift: 1, bodyOffsetY: 1 },
      { headOffsetY: 0, tailLift: 0, bodyOffsetY: 2 },
      { headOffsetY: -2, tailLift: 1, bodyOffsetY: 1 },
      { headOffsetY: -1, tailLift: 0, bodyOffsetY: 2 },
    ];

    const playCycle = [
      { headOffsetY: -1, tailLift: -2, tailSway: 2, bodyOffsetY: 3 },
      { headOffsetY: 0, tailLift: -1, tailSway: 1, bodyOffsetY: 2 },
      { headOffsetY: -2, tailLift: -3, tailSway: -1, bodyOffsetY: 3 },
      { headOffsetY: -1, tailLift: -2, tailSway: -2, bodyOffsetY: 2 },
    ];

    const napCycle = [0, 1];

    const animations = {
      idle: { frames: 4, duration: 320, draw: drawIdleFrame },
      walk: { frames: walkCycle.length, duration: 150, draw: drawWalkFrame },
      feed: { frames: feedCycle.length, duration: 260, draw: drawFeedFrame },
      play: { frames: playCycle.length, duration: 220, draw: drawPlayFrame },
      nap: { frames: napCycle.length, duration: 620, draw: drawNapFrame },
    };

    const moodExpressions = {
      feliz: { eyes: "happy", mouth: "smile" },
      contento: { eyes: "open", mouth: "smallSmile" },
      neutro: { eyes: "relaxed", mouth: "flat" },
      triste: { eyes: "droop", mouth: "sad" },
      enfadado: { eyes: "narrow", mouth: "angry" },
    };

    let animationKey = resolveAnimationKey(state);
    let frameIndex = 0;
    let intervalId = null;

    function setPalette(newPalette) {
      if (!newPalette) return;
      Object.entries(newPalette).forEach(([key, value]) => {
        if (value) {
          palette[key] = value;
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
      const expression = buildExpression("idle", frameIndex);
      const tailPattern = [0, 1, 0, -1];
      const headPattern = [0, -1, 0, 1];
      const bodyPattern = [0, 0, -1, 0];
      renderStandingCat({
        expression,
        tailSway: tailPattern[frameIndex % tailPattern.length],
        headOffsetY: headPattern[frameIndex % headPattern.length],
        bodyOffsetY: bodyPattern[frameIndex % bodyPattern.length],
      });
    }

    function drawWalkFrame({ frameIndex }) {
      const cycle = walkCycle[frameIndex % walkCycle.length];
      const expression = buildExpression("walk", frameIndex);
      renderStandingCat({
        expression,
        tailSway: cycle.tailSway,
        headOffsetY: cycle.headOffsetY,
        bodyOffsetY: cycle.bodyOffsetY,
        frontLegs: { near: cycle.frontNear, far: cycle.frontFar },
        backLegs: { near: cycle.backNear, far: cycle.backFar },
      });
    }

    function drawFeedFrame({ frameIndex }) {
      const cycle = feedCycle[frameIndex % feedCycle.length];
      const expression = buildExpression("feed", frameIndex);
      renderStandingCat({
        expression,
        headOffsetY: cycle.headOffsetY,
        tailLift: cycle.tailLift,
        bodyOffsetY: cycle.bodyOffsetY,
        bodySquash: 2,
        frontLegs: { near: { lift: 3 }, far: { lift: 3 } },
        backLegs: { near: { lift: 1 }, far: { lift: 0 } },
      });
    }

    function drawPlayFrame({ frameIndex }) {
      const cycle = playCycle[frameIndex % playCycle.length];
      const expression = buildExpression("play", frameIndex);
      renderStandingCat({
        expression,
        headOffsetY: cycle.headOffsetY,
        tailLift: cycle.tailLift,
        tailSway: cycle.tailSway,
        bodyOffsetY: cycle.bodyOffsetY,
        bodySquash: 3,
        frontLegs: { near: { lift: 2, forward: 1 }, far: { lift: 1, forward: -1 } },
        backLegs: { near: { lift: 1, forward: 1 }, far: { lift: 2, forward: -1 } },
      });
    }

    function drawNapFrame({ frameIndex }) {
      const breath = napCycle[frameIndex % napCycle.length];
      const expression = buildExpression("nap", frameIndex);
      renderSleepingCat({ breath, expression });
    }

    function buildExpression(animation, frame) {
      const baseExpression = moodExpressions[state.mood] || moodExpressions.neutro;
      const expression = { eyes: baseExpression.eyes, mouth: baseExpression.mouth };
      if (animation === "idle" && frame % 4 === 3 && state.activity === "idle") {
        expression.eyes = "blink";
      }
      if (state.activity === "nap" || animation === "nap") {
        expression.eyes = "sleep";
        expression.mouth = "sleep";
      } else if (state.activity === "feed" || animation === "feed") {
        expression.eyes = state.mood === "enfadado" ? "narrow" : "wide";
        expression.mouth = "yum";
        expression.tongue = true;
      } else if (state.activity === "play" || animation === "play") {
        expression.eyes = expression.eyes === "narrow" ? "narrow" : "happy";
        expression.mouth = "grin";
      }
      if (state.mood === "enfadado" && expression.mouth === "smile") {
        expression.mouth = "angry";
      }
      return expression;
    }

    function renderStandingCat({
      expression,
      tailSway = 0,
      tailLift = 0,
      headOffsetX = 0,
      headOffsetY = 0,
      bodyOffsetY = 0,
      bodySquash = 0,
      frontLegs = {},
      backLegs = {},
    }) {
      const outline = palette.outline || "#08050f";
      const furMain = palette.furMain || "#2f2c3d";
      const furSecondary = palette.furSecondary || "#262338";
      const furAccent = palette.furAccent || furSecondary;
      const belly = palette.belly || "#d8dbe8";
      const paw = palette.paw || "#e8ecf7";
      const cheekColor = palette.cheek || "#f48fbf";
      const bodyHeight = Math.max(12, base.body.height - bodySquash);
      const bodyY = base.body.y + bodyOffsetY + Math.max(0, bodySquash * 0.4);
      const bodyX = base.body.x;
      const bodyWidth = base.body.width;
      const groundY = bodyY + bodyHeight + base.groundOffset;
      const mainHighlight = shiftColor(furMain, 0.18);
      const mainShadow = shiftColor(furSecondary, -0.16);
      const accentHighlight = shiftColor(furAccent, 0.12);
      const accentShadow = shiftColor(furAccent, -0.18);
      const bellyHighlight = shiftColor(belly, 0.12);
      const bellyShadow = shiftColor(belly, -0.2);

      drawTail(bodyX, bodyY, tailSway, tailLift, furSecondary, furAccent, outline);

      drawLeg({
        x: bodyX + 2 + (backLegs.far?.forward ?? 0),
        baseY: groundY,
        width: base.legWidth,
        height: base.legHeight,
        lift: backLegs.far?.lift ?? 0,
        color: furSecondary,
        pawColor: paw,
        outline,
      });
      drawLeg({
        x: bodyX + bodyWidth - 12 + (frontLegs.far?.forward ?? 0),
        baseY: groundY,
        width: base.legWidth,
        height: base.legHeight,
        lift: frontLegs.far?.lift ?? 0,
        color: furSecondary,
        pawColor: paw,
        outline,
      });

      drawOutlinedRect(bodyX - 1, bodyY, bodyWidth + 2, bodyHeight, furMain, outline);
      drawRect(bodyX, bodyY + 1, bodyWidth, 2, mainHighlight);
      drawRect(bodyX + 1, bodyY + 3, 6, bodyHeight - 6, furSecondary);
      drawRect(bodyX + 2, bodyY + 4, 4, bodyHeight - 8, shiftColor(furSecondary, -0.08));
      drawRect(bodyX + 9, bodyY + 3, 9, bodyHeight - 6, belly);
      drawRect(bodyX + 10, bodyY + 4, 7, bodyHeight - 8, bellyHighlight);
      drawRect(bodyX + 9, bodyY + bodyHeight - 3, 9, 1, bellyShadow);
      drawRect(bodyX + bodyWidth - 6, bodyY + 4, 3, bodyHeight - 7, accentShadow);
      drawRect(bodyX + bodyWidth - 8, bodyY + 5, 2, bodyHeight - 9, accentHighlight);
      drawRect(bodyX + 7, bodyY + bodyHeight - 5, 8, 2, belly);
      drawRect(bodyX + 7, bodyY + bodyHeight - 5, 8, 1, bellyHighlight);
      drawRect(bodyX + 3, bodyY + bodyHeight - 3, bodyWidth - 4, 1, mainShadow);
      drawRect(bodyX + 2, bodyY + 2, 3, 1, mainHighlight);
      drawRect(bodyX + 4, bodyY + 5, 1, bodyHeight - 8, shiftColor(furSecondary, -0.12));
      drawRect(bodyX + bodyWidth - 4, bodyY + 6, 1, bodyHeight - 8, accentShadow);

      drawLeg({
        x: bodyX + 6 + (backLegs.near?.forward ?? 0),
        baseY: groundY,
        width: base.legWidth,
        height: base.legHeight,
        lift: backLegs.near?.lift ?? 0,
        color: furMain,
        pawColor: paw,
        outline,
      });
      drawLeg({
        x: bodyX + bodyWidth - 7 + (frontLegs.near?.forward ?? 0),
        baseY: groundY,
        width: base.legWidth,
        height: base.legHeight,
        lift: frontLegs.near?.lift ?? 0,
        color: furMain,
        pawColor: paw,
        outline,
      });

      const headX = base.head.x + headOffsetX;
      const headY = base.head.y + headOffsetY + Math.max(0, bodyOffsetY * 0.4);
      drawOutlinedRect(headX - 1, headY, base.head.width + 2, base.head.height + 1, furMain, outline);
      drawRect(headX, headY + 1, base.head.width, 1, mainHighlight);
      drawRect(headX + base.head.width - 4, headY + 3, 3, base.head.height - 4, shiftColor(furSecondary, -0.12));
      drawRect(headX + 1, headY + base.head.height - 2, base.head.width - 2, 1, mainShadow);

      drawEar(headX - 2, headY - base.ear.height + 2, false, furSecondary, furAccent, outline);
      drawEar(headX + base.head.width - base.ear.width + 1, headY - base.ear.height + 2, true, furSecondary, furAccent, outline);

      drawFace(expression, headX, headY, base.head.width, base.head.height, cheekColor);
    }


    function renderSleepingCat({ breath = 0, expression }) {
      const outline = palette.outline || "#08050f";
      const furMain = palette.furMain || "#2f2c3d";
      const furSecondary = palette.furSecondary || "#262338";
      const furAccent = palette.furAccent || furSecondary;
      const belly = palette.belly || "#d8dbe8";
      const paw = palette.paw || "#e8ecf7";
      const cheekColor = palette.cheek || "#f48fbf";

      const bodyHeight = Math.max(8, 12 - breath);
      const bodyY = base.body.y + 20 + breath;
      const bodyX = base.body.x + 1;

      const topHighlight = shiftColor(furMain, 0.16);
      const bodyShadow = shiftColor(furSecondary, -0.18);
      const accentHighlight = shiftColor(furAccent, 0.12);
      const accentShadow = shiftColor(furAccent, -0.2);
      const bellyHighlight = shiftColor(belly, 0.12);
      const bellyShadow = shiftColor(belly, -0.18);

      drawOutlinedRect(bodyX - 1, bodyY, 30, bodyHeight, furMain, outline);
      drawRect(bodyX, bodyY + 1, 28, 2, topHighlight);
      drawRect(bodyX + 2, bodyY + 3, 8, bodyHeight - 5, furSecondary);
      drawRect(bodyX + 3, bodyY + 4, 6, bodyHeight - 7, shiftColor(furSecondary, -0.08));
      drawRect(bodyX + 12, bodyY + 4, 12, bodyHeight - 6, belly);
      drawRect(bodyX + 13, bodyY + 5, 10, bodyHeight - 8, bellyHighlight);
      drawRect(bodyX + 12, bodyY + bodyHeight - 3, 12, 1, bellyShadow);
      drawRect(bodyX + 20, bodyY + 6, 4, bodyHeight - 9, accentShadow);
      drawRect(bodyX + 19, bodyY + 6, 2, bodyHeight - 10, accentHighlight);
      drawRect(bodyX + 6, bodyY + bodyHeight - 2, 18, 1, bodyShadow);
      drawRect(bodyX + 14, bodyY + bodyHeight - 5, 10, 2, bellyHighlight);

      const tailBaseX = bodyX - 4;
      const tailBaseY = bodyY + 3;
      drawOutlinedRect(tailBaseX, tailBaseY, 9, 6, furSecondary, outline);
      drawRect(tailBaseX + 1, tailBaseY + 1, 7, 1, shiftColor(furSecondary, 0.16));
      drawRect(tailBaseX + 1, tailBaseY + 4, 7, 2, shiftColor(furSecondary, -0.16));
      drawOutlinedRect(tailBaseX - 6, tailBaseY + 2, 7, 6, furAccent, outline);
      drawRect(tailBaseX - 5, tailBaseY + 3, 5, 1, accentHighlight);
      drawRect(tailBaseX - 5, tailBaseY + 6, 5, 1, accentShadow);
      drawRect(tailBaseX - 4, tailBaseY + 4, 3, 2, palette.belly || bellyHighlight);

      drawLeg({
        x: bodyX + 6,
        baseY: bodyY + bodyHeight + base.groundOffset - 1,
        width: base.legWidth,
        height: base.legHeight - 2,
        lift: 1,
        color: furMain,
        pawColor: paw,
        outline,
      });
      drawLeg({
        x: bodyX + 18,
        baseY: bodyY + bodyHeight + base.groundOffset - 1,
        width: base.legWidth,
        height: base.legHeight - 2,
        lift: 2,
        color: furMain,
        pawColor: paw,
        outline,
      });

      const headX = bodyX + 18;
      const headY = base.body.y + 14 + breath;
      drawOutlinedRect(headX, headY, 16, 10, furMain, outline);
      drawRect(headX + 1, headY + 1, 14, 1, topHighlight);
      drawRect(headX + 11, headY + 3, 4, 5, shiftColor(furSecondary, -0.12));
      drawRect(headX + 1, headY + 8, 14, 1, bodyShadow);

      drawEar(headX - 1, headY - base.ear.height + 2, false, furSecondary, furAccent, outline);
      drawEar(headX + 9, headY - base.ear.height + 3, true, furSecondary, furAccent, outline);

      const faceExpression = expression && expression.eyes ? { ...expression } : { eyes: "sleep", mouth: "sleep" };
      faceExpression.eyes = "sleep";
      faceExpression.mouth = "sleep";
      drawFace(faceExpression, headX, headY, 16, 10, cheekColor);
    }
    function drawFace(expression, headX, headY, headWidth, headHeight, cheekColor) {
      const outline = palette.outline || "#08050f";
      const furMain = palette.furMain || "#2f2c3d";
      const furSecondary = palette.furSecondary || furMain;
      const eyeWhite = "#f8fbff";
      const pupilColor = palette.pupil || outline;
      const irisColor = palette.earInner ? shiftColor(palette.earInner, -0.22) : shiftColor(furSecondary, -0.08);
      const irisShadow = shiftColor(irisColor, -0.2);
      const eyeShine = shiftColor(eyeWhite, 0.2);
      const eyelidColor = shiftColor(furMain, -0.12);
      const lowerLidColor = shiftColor(furSecondary, -0.2);
      const leftEyeX = headX + 4;
      const rightEyeX = headX + headWidth - 8;
      const eyeBaseline = headY + 6;
      const muzzleWidth = 8;
      const muzzleX = headX + Math.floor(headWidth / 2) - Math.floor(muzzleWidth / 2);
      const muzzleY = headY + headHeight - 6;
      const muzzleColor = palette.belly || "#e4e8f6";
      const muzzleHighlight = shiftColor(muzzleColor, 0.18);
      const muzzleShadow = shiftColor(muzzleColor, -0.18);
      const whiskerColor = palette.paw || "#f8fbff";

      drawRect(headX + 1, headY + 2, headWidth - 2, 1, shiftColor(furMain, 0.12));
      drawRect(headX + 1, headY + headHeight - 3, headWidth - 2, 1, shiftColor(furSecondary, -0.18));

      drawEye(expression.eyes, leftEyeX);
      drawEye(expression.eyes, rightEyeX);

      if (cheekColor) {
        drawRect(headX + 1, headY + headHeight - 5, 3, 2, cheekColor);
        drawRect(headX + headWidth - 4, headY + headHeight - 5, 3, 2, cheekColor);
      }

      drawRect(muzzleX - 1, muzzleY - 1, muzzleWidth + 2, 2, shiftColor(furMain, 0.1));
      drawRect(muzzleX, muzzleY, muzzleWidth, 4, muzzleColor);
      drawRect(muzzleX + 1, muzzleY + 1, muzzleWidth - 2, 1, muzzleHighlight);
      drawRect(muzzleX + 1, muzzleY + 2, muzzleWidth - 2, 1, muzzleShadow);

      const noseColor = palette.nose || palette.earInner || outline;
      const noseX = headX + Math.floor(headWidth / 2) - 1;
      const noseY = muzzleY - 1;
      drawRect(noseX, noseY, 2, 2, noseColor);
      drawRect(noseX, noseY, 1, 1, shiftColor(noseColor, 0.18));
      drawRect(noseX, noseY + 2, 2, 1, outline);
      drawRect(noseX, noseY + 3, 1, 1, outline);

      drawRect(muzzleX - 1, muzzleY + 1, 1, 2, outline);
      drawRect(muzzleX + muzzleWidth, muzzleY + 1, 1, 2, outline);
      drawRect(muzzleX - 5, muzzleY + 1, 4, 1, whiskerColor);
      drawRect(muzzleX - 6, muzzleY + 2, 5, 1, whiskerColor);
      drawRect(muzzleX + muzzleWidth + 1, muzzleY + 1, 4, 1, whiskerColor);
      drawRect(muzzleX + muzzleWidth, muzzleY + 2, 5, 1, whiskerColor);
      drawRect(muzzleX - 2, muzzleY + 1, 1, 1, outline);
      drawRect(muzzleX + muzzleWidth + 1, muzzleY + 1, 1, 1, outline);

      drawMouth(expression.mouth, muzzleX, muzzleY, muzzleWidth);

      function drawEye(style, x) {
        switch (style) {
          case "sleep":
            drawRect(x - 1, eyeBaseline + 2, 6, 1, outline);
            drawRect(x, eyeBaseline + 1, 4, 1, outline);
            break;
          case "blink":
            drawRect(x, eyeBaseline + 2, 4, 1, outline);
            drawRect(x, eyeBaseline + 1, 4, 1, eyelidColor);
            break;
          case "narrow":
            drawOpenEye(x, eyeBaseline, 3, { upperLid: true, lowerLid: false });
            drawRect(x, eyeBaseline + 2, 4, 1, outline);
            break;
          case "droop":
            drawOpenEye(x, eyeBaseline, 4, { upperLid: true, lowerLid: true });
            drawRect(x, eyeBaseline, 4, 1, eyelidColor);
            drawRect(x + 1, eyeBaseline + 3, 2, 1, outline);
            break;
          case "happy":
            drawOpenEye(x, eyeBaseline - 1, 5, { upperLid: false, lowerLid: true });
            drawRect(x, eyeBaseline + 3, 4, 1, shiftColor(palette.earInner || irisColor, -0.18));
            break;
          case "wide":
            drawOpenEye(x, eyeBaseline - 1, 5, { upperLid: false, lowerLid: true });
            break;
          case "relaxed":
            drawOpenEye(x, eyeBaseline, 4, { upperLid: true, lowerLid: true });
            break;
          default:
            drawOpenEye(x, eyeBaseline - 1, 5, { upperLid: true, lowerLid: true });
        }
      }

      function drawOpenEye(x, top, height, { upperLid = true, lowerLid = true } = {}) {
        const h = Math.max(3, height);
        const y = Math.round(top);
        drawOutlinedRect(x, y, 4, h, eyeWhite, outline);
        const irisHeight = Math.max(1, h - 2);
        const irisTop = y + 1;
        drawRect(x + 1, irisTop, 2, irisHeight, irisColor);
        const pupilHeight = Math.max(1, Math.min(irisHeight, h - 3));
        drawRect(x + 1, irisTop + irisHeight - pupilHeight, 2, pupilHeight, pupilColor);
        drawRect(x + 2, irisTop + irisHeight - 1, 1, 1, irisShadow);
        drawRect(x + 1, irisTop, 1, 1, eyeShine);
        if (upperLid) {
          drawRect(x, y, 4, 1, eyelidColor);
        }
        if (lowerLid) {
          drawRect(x, y + h - 1, 4, 1, lowerLidColor);
        }
      }

      function drawMouth(style, muzzleBaseX, muzzleBaseY, muzzleBaseWidth) {
        const mouthCenterX = muzzleBaseX + Math.floor(muzzleBaseWidth / 2);
        const mouthY = muzzleBaseY + 3;
        const mouthX = mouthCenterX - 3;
        const tongueColor = palette.earInner || palette.nose || "#f3adc9";
        switch (style) {
          case "smile":
            drawRect(mouthX - 1, mouthY - 1, 2, 1, outline);
            drawRect(mouthX + 4, mouthY - 1, 2, 1, outline);
            drawRect(mouthX, mouthY, 6, 1, outline);
            break;
          case "smallSmile":
            drawRect(mouthX - 1, mouthY - 1, 2, 1, outline);
            drawRect(mouthX + 4, mouthY - 1, 2, 1, outline);
            drawRect(mouthX, mouthY, 4, 1, outline);
            break;
          case "flat":
            drawRect(mouthX, mouthY, 6, 1, outline);
            break;
          case "sad":
            drawRect(mouthX - 1, mouthY, 2, 1, outline);
            drawRect(mouthX + 5, mouthY, 2, 1, outline);
            drawRect(mouthX, mouthY - 1, 6, 1, outline);
            break;
          case "angry":
            drawRect(mouthX - 1, mouthY - 1, 3, 1, outline);
            drawRect(mouthX + 3, mouthY - 1, 3, 1, outline);
            drawRect(mouthX, mouthY, 6, 1, outline);
            break;
          case "grin":
            drawRect(mouthX - 1, mouthY - 1, 2, 1, outline);
            drawRect(mouthX + 5, mouthY - 1, 2, 1, outline);
            drawRect(mouthX - 1, mouthY, 8, 2, outline);
            drawRect(mouthX, mouthY + 1, 6, 1, tongueColor);
            drawRect(mouthX, mouthY, 6, 1, outline);
            break;
          case "yum":
            drawRect(mouthX, mouthY - 1, 6, 3, outline);
            drawRect(mouthX + 1, mouthY, 4, 2, tongueColor);
            drawRect(mouthX + 1, mouthY, 4, 1, shiftColor(tongueColor, 0.16));
            break;
          case "sleep":
            drawRect(mouthX + 1, mouthY, 4, 1, outline);
            break;
          default:
            drawRect(mouthX, mouthY, 6, 1, outline);
        }
      }
    }
    function drawEar(x, y, mirror, outerColor, accentColor, outline) {
      const outer = outerColor || palette.furSecondary || "#262338";
      const inner = palette.earInner || accentColor;
      const highlight = shiftColor(outer, 0.18);
      const shadow = shiftColor(outer, -0.16);
      const innerHighlight = inner ? shiftColor(inner, 0.16) : inner;
      const innerShadow = inner ? shiftColor(inner, -0.12) : inner;

      drawOutlinedRect(x, y, base.ear.width, base.ear.height, outer, outline);
      drawRect(x + 1, y + 1, base.ear.width - 2, base.ear.height - 2, palette.furMain || outer);
      drawRect(x + 1, y + 1, base.ear.width - 2, 1, highlight);
      drawRect(x + 1, y + base.ear.height - 2, base.ear.width - 2, 1, shadow);
      const innerX = mirror ? x + base.ear.width - 3 : x + 2;
      if (inner) {
        drawRect(innerX, y + 2, 2, base.ear.height - 4, innerShadow);
        drawRect(innerX, y + 2, 2, 1, innerHighlight);
      }
    }
    function drawTail(bodyX, bodyY, sway, lift, color, accent, outline) {
      const baseX = bodyX - 2 + sway;
      const baseY = bodyY + 6 - lift;
      const segments = [
        { offsetX: -2, offsetY: 0, width: 7, height: 5, useAccent: false },
        { offsetX: -5, offsetY: -3, width: 6, height: 5, useAccent: false },
        { offsetX: -6, offsetY: -6, width: 5, height: 4, useAccent: Boolean(accent) },
        { offsetX: -4, offsetY: -8, width: 4, height: 4, useAccent: Boolean(accent) },
      ];
      segments.forEach((segment) => {
        const fill = segment.useAccent ? accent || color : color;
        const x = baseX + segment.offsetX;
        const y = baseY + segment.offsetY;
        drawOutlinedRect(x, y, segment.width, segment.height, fill, outline);
        if (segment.width > 2 && segment.height > 2) {
          drawRect(x + 1, y + 1, segment.width - 2, 1, shiftColor(fill, 0.16));
          drawRect(x + 1, y + segment.height - 2, segment.width - 2, 1, shiftColor(fill, -0.18));
        }
        if (segment.useAccent && accent) {
          drawRect(x + segment.width - 2, y + 1, 1, segment.height - 2, shiftColor(accent, -0.1));
        }
      });
      if (accent) {
        drawRect(baseX - 6, baseY - 4, 4, 2, accent);
        drawRect(baseX - 6, baseY - 4, 4, 1, shiftColor(accent, 0.16));
        drawRect(baseX - 5, baseY - 2, 3, 1, shiftColor(accent, -0.16));
      }
    }
    function drawLeg({ x, baseY, width, height, lift = 0, color, pawColor, outline }) {
      const effectiveLift = Math.max(0, Math.min(height - 3, lift));
      const legHeight = Math.max(5, height - effectiveLift);
      const topY = baseY - legHeight;
      const legColor = color || palette.furMain || "#2f2c3d";
      drawOutlinedRect(x, topY, width, legHeight, legColor, outline);
      if (width > 2 && legHeight > 2) {
        drawRect(x + 1, topY + 1, width - 2, 1, shiftColor(legColor, 0.18));
        drawRect(x + width - 2, topY + 2, 1, legHeight - 3, shiftColor(legColor, -0.18));
      }
      if (effectiveLift < height - 2 && pawColor) {
        const pawY = baseY - 2 - Math.max(0, effectiveLift - 1);
        drawRect(x + 1, pawY, width - 2, 2, pawColor);
        drawRect(x + 1, pawY, width - 2, 1, shiftColor(pawColor, 0.12));
        drawRect(x + 1, pawY + 1, width - 2, 1, shiftColor(pawColor, -0.15));
      }
    }
    function drawOutlinedRect(x, y, width, height, fillColor, outlineColor) {
      if (width <= 0 || height <= 0) return;
      const px = Math.round(x);
      const py = Math.round(y);
      const pw = Math.round(width);
      const ph = Math.round(height);
      ctx.fillStyle = outlineColor || fillColor;
      ctx.fillRect(px, py, pw, ph);
      if (pw > 2 && ph > 2 && fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      }
    }

    function drawRect(x, y, width, height, color) {
      if (!color || width <= 0 || height <= 0) return;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
    }

    restartLoop();

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
