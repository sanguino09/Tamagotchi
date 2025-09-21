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
const pupilElements = document.querySelectorAll(".pupil");
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
    emoji: "🐈‍⬜",
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
  if (palette.pupil) {
    pupilElements.forEach((pupil) => pupil.setAttribute("fill", palette.pupil));
    cat.style.setProperty("--pupil", palette.pupil);
  }
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
      }, duration);
    }
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

      if (!isAnimatedAction) {
        updateCatFace(getMood().key);
        return;
      }

      const duration = nextActivity === "nap" ? 5200 : 2800;
      activityTimeout = setTimeout(() => {
        cat.dataset.activity = "idle";
        activityTimeout = null;
        setMotion("idle");
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
        const mouth = document.getElementById("mouth");
        const pupils = pupilElements;
        const activity = cat?.dataset?.activity || "idle";

        const setPupils = (cy, radius = 9) => {
          pupils.forEach((pupil) => {
            if (!pupil) return;
            pupil.setAttribute("cy", cy);
            pupil.setAttribute("r", radius);
          });
        };

        const setScale = (scale, bobSpeed, shadow) => {
          catWanderer.style.setProperty("--scale", scale);
          catWanderer.style.setProperty("--bob-speed", bobSpeed);
          catWanderer.style.setProperty("--shadow-opacity", shadow);
        };

        if (activity === "nap") {
          setPupils(110, 5);
          mouth.setAttribute("d", "M148 132 C154 136 162 136 168 132");
          setScale("0.95", "4.6s", "0.32");
          return;
        }

        if (activity === "feed") {
          setPupils(96, 11);
          mouth.setAttribute("d", "M146 128 C154 142 162 142 170 128");
          setScale("1.05", "2.1s", "0.52");
          return;
        }

        if (activity === "play") {
          setPupils(96, 12);
          mouth.setAttribute("d", "M144 126 C154 146 164 146 174 126");
          setScale("1.06", "2s", "0.55");
          return;
        }

        switch (moodKey) {
        case "feliz":
          mouth.setAttribute("d", "M146 124 C154 136 162 136 170 124");
          setPupils(98, 10);
          setScale("1.04", "2.4s", "0.5");
          break;
        case "contento":
          mouth.setAttribute("d", "M148 126 C156 134 162 134 168 126");
          setPupils(100, 9);
          setScale("1", "2.8s", "0.46");
          break;
        case "neutro":
          mouth.setAttribute("d", "M150 128 C158 128 164 128 172 128");
          setPupils(102, 8);
          setScale("0.98", "3.1s", "0.42");
          break;
        case "triste":
          mouth.setAttribute("d", "M150 132 C158 124 164 124 172 132");
          setPupils(106, 7);
          setScale("0.96", "3.4s", "0.38");
          break;
        default:
          mouth.setAttribute("d", "M148 134 C156 120 164 120 172 134");
          setPupils(108, 7);
          setScale("0.94", "3.6s", "0.34");
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
        const accessory = document.getElementById("accessory");
        accessory.style.opacity = show ? 1 : 0;
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
          const direction = newX < previousX ? -1 : 1;
          catMotion.x = newX;
          catMotion.y = newY;
          catWanderer.style.setProperty("--x", `${newX}px`);
          catWanderer.style.setProperty("--y", `${newY}px`);
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
