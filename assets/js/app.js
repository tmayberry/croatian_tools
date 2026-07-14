import {
  ADJECTIVES,
  DRINKS,
  FOODS,
  NOMINATIVE_NOUNS,
  OBJECTS,
  PEOPLE,
  PLACES,
  SURFACES
} from "./a1-sentence-data.js";
import { VISUALS, WORDS } from "./nominative-plural-data.js";

const state = {
  currentModule: null,
  currentPrompt: null,
  previousPromptIds: {},
  correct: 0,
  streak: 0,
  seen: 0,
  recognition: null,
  listening: false,
  advanceTimer: null,
  acceptingSpeech: false,
  correctionRequired: false,
  pushToTalkActive: false,
  speechEnabled: true,
  ignoreDiacritics: true,
  toolActive: false
};

const elements = {
  landingView: document.querySelector("#landingView"),
  toolView: document.querySelector("#toolView"),
  moduleButtons: document.querySelectorAll("[data-module-id]"),
  backButton: document.querySelector("#backButton"),
  promptLabel: document.querySelector("#promptLabel"),
  wordVisual: document.querySelector("#wordVisual"),
  toolTitle: document.querySelector("#toolTitle"),
  wordMeta: document.querySelector("#wordMeta"),
  micButton: document.querySelector("#micButton"),
  speechToggle: document.querySelector("#speechToggle"),
  diacriticsToggle: document.querySelector("#diacriticsToggle"),
  skipButton: document.querySelector("#skipButton"),
  typedForm: document.querySelector("#typedForm"),
  typedAnswerLabel: document.querySelector("#typedAnswerLabel"),
  typedAnswer: document.querySelector("#typedAnswer"),
  result: document.querySelector("#result"),
  nextButton: document.querySelector("#nextButton"),
  speechStatus: document.querySelector("#speechStatus"),
  dataDescription: document.querySelector("#dataDescription"),
  correctCount: document.querySelector("#correctCount"),
  streakCount: document.querySelector("#streakCount"),
  seenCount: document.querySelector("#seenCount"),
  trainer: document.querySelector("#trainer"),
  burst: document.querySelector("#burst")
};

function buildBurst() {
  const colors = ["#1657a8", "#d33f49", "#f0b84d", "#138a5b", "#ffffff"];
  const pieces = Array.from({ length: 34 }, (_, index) => {
    const angle = Math.round((360 / 34) * index);
    const color = colors[index % colors.length];
    return `<span style="--angle: ${angle}deg; --piece: ${color}; animation-delay: ${index * 7}ms"></span>`;
  });
  elements.burst.innerHTML = pieces.join("");
}

function showView(view) {
  elements.landingView.classList.toggle("active", view === "landing");
  elements.toolView.classList.toggle("active", view === "tool");
  state.toolActive = view === "tool";
}

function pickItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function createPluralPrompt() {
  const word = pickItem(WORDS);
  return {
    id: `plural:${word.singular}`,
    title: word.singular,
    meta: `${word.english} · ${word.gender} noun${word.notes ? ` · ${word.notes}` : ""}`,
    visual: VISUALS[word.singular] || "🖼️",
    expectedAnswers: [word.plural],
    expectedLabel: "Plural",
    promptLabel: "Make the nominative plural",
    placeholder: "Type the plural instead",
    typedLabel: "Typed plural answer",
    readyText: "Hold space or the mic to answer, or type the plural form.",
    typedOnlyText: "Type the plural form.",
    allowSpaces: false
  };
}

const sentenceTemplates = [
  () => {
    const object = pickItem(OBJECTS);
    return sentencePrompt(`I have ${object.en}.`, `Imam ${object.acc}.`, object.visual);
  },
  () => {
    const object = pickItem(OBJECTS);
    return sentencePrompt(`I do not have ${object.en}.`, `Nemam ${object.acc}.`, object.visual);
  },
  () => {
    const person = pickItem(PEOPLE);
    const object = pickItem(OBJECTS);
    return sentencePrompt(`${person.en} has ${object.en}.`, `${person.hr} ima ${object.acc}.`, object.visual || person.visual);
  },
  () => {
    const object = pickItem([...OBJECTS, ...FOODS, ...DRINKS]);
    return sentencePrompt(`I like ${object.en}.`, `Volim ${object.acc}.`, object.visual);
  },
  () => {
    const place = pickItem(PLACES);
    return sentencePrompt(`I am going to ${place.en}.`, `Idem u ${place.acc}.`, place.visual);
  },
  () => {
    const place = pickItem(PLACES);
    return sentencePrompt(`I am in ${place.en}.`, `Ja sam u ${place.loc}.`, place.visual);
  },
  () => {
    const object = pickItem(NOMINATIVE_NOUNS);
    const surface = pickItem(SURFACES);
    return sentencePrompt(`${object.en} is on ${surface.en}.`, `${object.hr} je na ${surface.loc}.`, object.visual || surface.visual);
  },
  () => {
    const noun = pickItem(NOMINATIVE_NOUNS);
    const adjective = pickItem(ADJECTIVES);
    return sentencePrompt(`${noun.en} is ${adjective.en}.`, `${noun.hr} je ${adjective.forms[noun.gender]}.`, noun.visual);
  },
  () => {
    const food = pickItem(FOODS);
    return sentencePrompt(`I eat ${food.en}.`, `Jedem ${food.acc}.`, food.visual);
  },
  () => {
    const drink = pickItem(DRINKS);
    return sentencePrompt(`I drink ${drink.en}.`, `Pijem ${drink.acc}.`, drink.visual);
  }
];

function sentencePrompt(english, croatian, visual) {
  const displayEnglish = english.charAt(0).toUpperCase() + english.slice(1);
  return {
    id: `sentence:${displayEnglish}:${croatian}`,
    title: displayEnglish,
    meta: "Translate into Croatian",
    visual: visual || "💬",
    expectedAnswers: [croatian],
    expectedLabel: "Croatian",
    promptLabel: "Translate this sentence",
    placeholder: "Type the Croatian sentence",
    typedLabel: "Typed Croatian sentence",
    readyText: "Hold the mic to answer by speech, or type the Croatian sentence.",
    typedOnlyText: "Type the Croatian sentence.",
    allowSpaces: true
  };
}

const modules = {
  nominativePlural: {
    id: "nominativePlural",
    dataDescription: "Starter nouns are curated for Croatian practice and show English meanings plus a visual cue with each prompt.",
    nextPrompt: createPluralPrompt
  },
  a1Sentences: {
    id: "a1Sentences",
    dataDescription: "A1 sentence prompts use controlled templates and pre-inflected Croatian word banks.",
    nextPrompt: () => pickItem(sentenceTemplates)()
  }
};

function normalizeAnswer(value) {
  const normalized = value
    .normalize("NFC")
    .toLocaleLowerCase("hr-HR")
    .replace(/[.,!?;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return state.ignoreDiacritics ? foldCroatianDiacritics(normalized) : normalized;
}

function foldCroatianDiacritics(value) {
  return value
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "d");
}

function pickPrompt() {
  clearAdvanceTimer();
  const module = state.currentModule;
  let prompt = module.nextPrompt();
  const previousId = state.previousPromptIds[module.id];
  let attempts = 0;
  while (prompt.id === previousId && attempts < 8) {
    prompt = module.nextPrompt();
    attempts += 1;
  }
  state.previousPromptIds[module.id] = prompt.id;
  state.currentPrompt = prompt;
  state.seen += 1;
  renderPrompt();
}

function renderPrompt() {
  const prompt = state.currentPrompt;
  elements.promptLabel.textContent = prompt.promptLabel;
  elements.wordVisual.textContent = prompt.visual;
  elements.toolTitle.textContent = prompt.title;
  elements.toolTitle.classList.toggle("sentence-card", prompt.allowSpaces);
  elements.wordMeta.textContent = prompt.meta;
  elements.typedAnswerLabel.textContent = prompt.typedLabel;
  elements.typedAnswer.placeholder = prompt.placeholder;
  elements.typedAnswer.value = "";
  elements.result.className = "result empty";
  elements.result.textContent = state.speechEnabled ? prompt.readyText : prompt.typedOnlyText;
  elements.nextButton.hidden = true;
  elements.skipButton.disabled = false;
  state.acceptingSpeech = true;
  state.correctionRequired = false;
  elements.typedAnswer.focus({ preventScroll: true });
  renderScore();
}

function renderScore() {
  elements.correctCount.textContent = state.correct;
  elements.streakCount.textContent = state.streak;
  elements.seenCount.textContent = state.seen;
}

function clearAdvanceTimer() {
  if (state.advanceTimer) {
    window.clearTimeout(state.advanceTimer);
    state.advanceTimer = null;
  }
}

function scheduleNextPrompt(isCorrect) {
  clearAdvanceTimer();
  state.acceptingSpeech = false;
  state.advanceTimer = window.setTimeout(() => {
    state.advanceTimer = null;
    pickPrompt();
  }, isCorrect ? 2000 : 4000);
}

function gradeAnswer(rawAnswer, method) {
  if (state.correctionRequired) {
    gradeCorrection(rawAnswer);
    return;
  }

  const answers = collectSpeechAlternatives(rawAnswer);
  const answer = normalizeAnswer(answers[0] || "");
  if (!answers.some((item) => normalizeAnswer(item))) {
    showNeutral(method === "speech" && state.speechEnabled
      ? `I did not catch an answer. ${speechInstruction()}`
      : state.currentPrompt.typedOnlyText);
    return;
  }

  const expectedAnswers = state.currentPrompt.expectedAnswers;
  const normalizedExpectedAnswers = expectedAnswers.map((expected) => normalizeAnswer(expected));
  const isCorrect = normalizedExpectedAnswers.includes(answer);
  const matchedAnswer = answers.find((item) => normalizedExpectedAnswers.includes(normalizeAnswer(item)));

  showResult(isCorrect || Boolean(matchedAnswer), matchedAnswer || rawAnswer, method);
}

function collectSpeechAlternatives(rawAnswer) {
  if (!Array.isArray(rawAnswer)) {
    return [rawAnswer];
  }
  return rawAnswer;
}

function showNeutral(message) {
  elements.result.className = "result empty";
  elements.result.textContent = message;
}

function speechInstruction() {
  if (!state.currentPrompt) {
    return "Choose a practice module to begin.";
  }
  return state.currentPrompt?.allowSpaces
    ? "Hold the microphone to answer. Space types spaces in this module."
    : "Hold space or hold the microphone to answer.";
}

function setSpeechState(status, message) {
  elements.micButton.classList.toggle("listening", status === "listening");
  elements.micButton.classList.toggle("processing", status === "processing");
  elements.micButton.classList.toggle("paused", status === "paused" || status === "blocked" || status === "unavailable");

  const labels = {
    idle: "Start speech recognition",
    listening: "Listening",
    processing: "Checking speech",
    paused: "Resume speech recognition",
    blocked: "Speech recognition needs manual resume",
    unavailable: "Speech recognition unavailable"
  };
  elements.micButton.setAttribute("aria-label", labels[status] || labels.idle);

  if (message) {
    elements.speechStatus.textContent = message;
  }
}

function showResult(isCorrect, rawAnswer, method) {
  state.acceptingSpeech = false;
  const spoken = Array.isArray(rawAnswer) ? rawAnswer[0] : rawAnswer;
  const prompt = state.currentPrompt;

  if (isCorrect) {
    state.correct += 1;
    state.streak += 1;
    animateCorrect();
  } else {
    state.streak = 0;
    animateIncorrect();
  }

  elements.result.className = `result ${isCorrect ? "correct" : "incorrect"}`;
  const correctionPrompt = isCorrect ? "" : "<p class=\"correction-note\">Type the expected answer to continue.</p>";
  elements.result.innerHTML = `
    <p class="result-title">${isCorrect ? "Correct" : "Not quite"}</p>
    <dl>
      <dt>${method === "speech" ? "Heard" : "You typed"}</dt>
      <dd>${escapeHtml(spoken)}</dd>
      <dt>${escapeHtml(prompt.expectedLabel)}</dt>
      <dd>${escapeHtml(prompt.expectedAnswers[0])}</dd>
    </dl>
    ${correctionPrompt}
  `;
  renderScore();
  if (isCorrect) {
    elements.nextButton.hidden = false;
    scheduleNextPrompt(true);
  } else {
    clearAdvanceTimer();
    state.correctionRequired = true;
    state.acceptingSpeech = false;
    elements.nextButton.hidden = true;
    elements.skipButton.disabled = true;
    elements.typedAnswer.value = "";
    elements.typedAnswer.placeholder = `Retype: ${prompt.expectedAnswers[0]}`;
    elements.typedAnswer.focus({ preventScroll: true });
  }
}

function gradeCorrection(rawAnswer) {
  const answer = normalizeAnswer(rawAnswer);
  const expectedAnswers = state.currentPrompt.expectedAnswers;
  const normalizedExpectedAnswers = expectedAnswers.map((expected) => normalizeAnswer(expected));
  if (!normalizedExpectedAnswers.includes(answer)) {
    elements.result.className = "result incorrect";
    elements.result.innerHTML = `
      <p class="result-title">Keep going</p>
      <dl>
        <dt>Expected</dt>
        <dd>${escapeHtml(expectedAnswers[0])}</dd>
      </dl>
      <p class="correction-note">Retype the expected answer to continue.</p>
    `;
    elements.typedAnswer.select();
    return;
  }

  state.correctionRequired = false;
  elements.result.className = "result correct";
  elements.result.innerHTML = `
    <p class="result-title">Reinforced</p>
    <dl>
      <dt>${escapeHtml(state.currentPrompt.expectedLabel)}</dt>
      <dd>${escapeHtml(expectedAnswers[0])}</dd>
    </dl>
  `;
  elements.nextButton.hidden = false;
  elements.skipButton.disabled = false;
  scheduleNextPrompt(true);
}

function animateCorrect() {
  elements.trainer.classList.remove("celebrate");
  void elements.trainer.offsetWidth;
  elements.trainer.classList.add("celebrate");
  window.setTimeout(() => elements.trainer.classList.remove("celebrate"), 900);
}

function animateIncorrect() {
  elements.trainer.classList.remove("shake");
  void elements.trainer.offsetWidth;
  elements.trainer.classList.add("shake");
  window.setTimeout(() => elements.trainer.classList.remove("shake"), 480);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    elements.micButton.disabled = true;
    setSpeechState("unavailable", "Speech recognition is not available in this browser. Typed answers still work.");
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "hr-HR";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  recognition.addEventListener("start", () => {
    state.listening = true;
    setSpeechState("listening", "Listening. Release space or the mic when you are done.");
    if (state.acceptingSpeech) {
      showNeutral("Listening...");
    }
  });

  recognition.addEventListener("end", () => {
    state.listening = false;
    state.pushToTalkActive = false;
    if (!state.speechEnabled) {
      setSpeechState("unavailable", "Speech recognition is off. Typed answers still work.");
      return;
    }
    setSpeechState("idle", speechInstruction());
    if (state.acceptingSpeech && elements.result.textContent === "Listening...") {
      showNeutral(`${speechInstruction()} Or type the answer.`);
    }
  });

  recognition.addEventListener("result", (event) => {
    if (!state.acceptingSpeech) {
      return;
    }
    const latestResult = event.results[event.results.length - 1];
    if (!latestResult.isFinal) {
      return;
    }
    const alternatives = Array.from(latestResult, (result) => result.transcript);
    gradeAnswer(alternatives, "speech");
  });

  recognition.addEventListener("nomatch", () => {
    if (state.acceptingSpeech) {
      showNeutral(`I could not match the speech. ${speechInstruction()}`);
    }
  });

  recognition.addEventListener("error", (event) => {
    const messages = {
      "not-allowed": "Microphone permission was blocked. Typed answers still work.",
      "no-speech": "No speech was detected. Try again or type the answer.",
      "audio-capture": "No microphone was found. Typed answers still work.",
      network: "Speech recognition needs network access in this browser right now. Typed answers still work."
    };
    const message = messages[event.error] || `Speech recognition error: ${event.error}. Typed answers still work.`;
    if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
      setSpeechState("blocked", message);
    } else {
      setSpeechState("idle", speechInstruction());
    }
    if (state.acceptingSpeech) {
      showNeutral(message);
    }
  });

  state.recognition = recognition;
  setSpeechState("idle", speechInstruction());
}

function startPushToTalk(event) {
  if (event) {
    event.preventDefault();
  }
  if (!state.toolActive || state.correctionRequired || !state.acceptingSpeech || !state.speechEnabled || !state.recognition || state.listening) {
    return;
  }
  try {
    state.pushToTalkActive = true;
    state.recognition.start();
  } catch (error) {
    const message = "Speech recognition is already starting. Try again in a moment.";
    setSpeechState("blocked", message);
    if (state.acceptingSpeech) {
      showNeutral(message);
    }
  }
}

function stopPushToTalk(event) {
  if (event) {
    event.preventDefault();
  }
  if (!state.pushToTalkActive || !state.recognition) {
    return;
  }
  state.pushToTalkActive = false;
  if (state.listening) {
    setSpeechState("processing", "Checking...");
    try {
      state.recognition.stop();
    } catch (error) {
      state.listening = false;
      setSpeechState("idle", speechInstruction());
    }
  }
}

function abortSpeech() {
  state.pushToTalkActive = false;
  if (state.recognition && state.listening) {
    try {
      state.recognition.abort();
    } catch (error) {
      state.listening = false;
    }
  }
  setSpeechState("idle", speechInstruction());
}

function setSpeechEnabled(enabled) {
  state.speechEnabled = enabled;
  elements.speechToggle.checked = enabled;
  elements.micButton.disabled = !enabled || !state.recognition;

  if (enabled) {
    state.acceptingSpeech = state.toolActive && state.currentPrompt && elements.nextButton.hidden;
    setSpeechState("idle", state.recognition
      ? speechInstruction()
      : "Speech recognition is not available in this browser. Typed answers still work.");
    if (state.toolActive && state.currentPrompt && elements.nextButton.hidden) {
      showNeutral(state.currentPrompt.readyText);
    }
  } else {
    abortSpeech();
    elements.micButton.disabled = true;
    setSpeechState("unavailable", "Speech recognition is off. Typed answers still work.");
    if (state.toolActive && state.currentPrompt && elements.nextButton.hidden) {
      showNeutral(state.currentPrompt.typedOnlyText);
    }
  }
}

function startModule(moduleId) {
  const module = modules[moduleId];
  if (!module) {
    return;
  }
  abortSpeech();
  clearAdvanceTimer();
  state.currentModule = module;
  state.currentPrompt = null;
  state.correct = 0;
  state.streak = 0;
  state.seen = 0;
  elements.dataDescription.textContent = module.dataDescription;
  showView("tool");
  renderScore();
  pickPrompt();
}

elements.moduleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startModule(button.dataset.moduleId);
  });
});

elements.backButton.addEventListener("click", () => {
  abortSpeech();
  clearAdvanceTimer();
  showView("landing");
});

elements.micButton.addEventListener("pointerdown", startPushToTalk);
elements.micButton.addEventListener("pointerup", stopPushToTalk);
elements.micButton.addEventListener("pointercancel", stopPushToTalk);
elements.micButton.addEventListener("pointerleave", stopPushToTalk);

elements.speechToggle.addEventListener("change", () => {
  setSpeechEnabled(elements.speechToggle.checked);
});

elements.diacriticsToggle.addEventListener("change", () => {
  state.ignoreDiacritics = elements.diacriticsToggle.checked;
});

window.addEventListener("keydown", (event) => {
  if (event.target === elements.typedAnswer && state.currentPrompt?.allowSpaces) {
    return;
  }
  if (event.code === "Space" && !event.repeat && state.speechEnabled) {
    startPushToTalk(event);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.target === elements.typedAnswer && state.currentPrompt?.allowSpaces) {
    return;
  }
  if (event.code === "Space" && (state.speechEnabled || state.pushToTalkActive)) {
    stopPushToTalk(event);
  }
});

elements.skipButton.addEventListener("click", () => {
  if (state.correctionRequired) {
    elements.typedAnswer.focus({ preventScroll: true });
    elements.typedAnswer.select();
    return;
  }
  state.streak = 0;
  pickPrompt();
});

elements.typedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  gradeAnswer(elements.typedAnswer.value, "typed");
});

elements.typedAnswer.addEventListener("beforeinput", (event) => {
  if (!state.currentPrompt?.allowSpaces && event.data && /\s/.test(event.data)) {
    event.preventDefault();
  }
});

elements.typedAnswer.addEventListener("input", () => {
  if (!state.currentPrompt?.allowSpaces) {
    elements.typedAnswer.value = elements.typedAnswer.value.replace(/\s+/g, "");
  }
});

elements.nextButton.addEventListener("click", pickPrompt);

buildBurst();
setupSpeechRecognition();
