import { VISUALS, WORDS } from "./nominative-plural-data.js";

const state = {
  current: null,
  previousIndex: -1,
  correct: 0,
  streak: 0,
  seen: 0,
  recognition: null,
  listening: false,
  advanceTimer: null,
  acceptingSpeech: false,
  pushToTalkActive: false,
  speechEnabled: true,
  ignoreDiacritics: true,
  toolActive: false
};

const elements = {
  landingView: document.querySelector("#landingView"),
  toolView: document.querySelector("#toolView"),
  startToolButton: document.querySelector("#startToolButton"),
  backButton: document.querySelector("#backButton"),
  wordVisual: document.querySelector("#wordVisual"),
  toolTitle: document.querySelector("#toolTitle"),
  wordMeta: document.querySelector("#wordMeta"),
  micButton: document.querySelector("#micButton"),
  speechToggle: document.querySelector("#speechToggle"),
  diacriticsToggle: document.querySelector("#diacriticsToggle"),
  skipButton: document.querySelector("#skipButton"),
  typedForm: document.querySelector("#typedForm"),
  typedAnswer: document.querySelector("#typedAnswer"),
  result: document.querySelector("#result"),
  nextButton: document.querySelector("#nextButton"),
  speechStatus: document.querySelector("#speechStatus"),
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

function pickWord() {
  clearAdvanceTimer();
  let index = Math.floor(Math.random() * WORDS.length);
  if (WORDS.length > 1) {
    while (index === state.previousIndex) {
      index = Math.floor(Math.random() * WORDS.length);
    }
  }
  state.previousIndex = index;
  state.current = WORDS[index];
  state.seen += 1;
  renderPrompt();
}

function renderPrompt() {
  const word = state.current;
  elements.wordVisual.textContent = VISUALS[word.singular] || "🖼️";
  elements.toolTitle.textContent = word.singular;
  elements.wordMeta.textContent = `${word.english} · ${word.gender} noun${word.notes ? ` · ${word.notes}` : ""}`;
  elements.typedAnswer.value = "";
  elements.result.className = "result empty";
  elements.result.textContent = state.speechEnabled ? "Hold space or the mic to answer, or type the plural form." : "Type the plural form.";
  elements.nextButton.hidden = true;
  state.acceptingSpeech = true;
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

function scheduleNextWord(isCorrect) {
  clearAdvanceTimer();
  state.acceptingSpeech = false;
  state.advanceTimer = window.setTimeout(() => {
    state.advanceTimer = null;
    pickWord();
  }, isCorrect ? 2000 : 4000);
}

function gradeAnswer(rawAnswer, method) {
  const answers = collectSpeechAlternatives(rawAnswer);
  const answer = normalizeAnswer(answers[0] || "");
  if (!answers.some((item) => normalizeAnswer(item))) {
    showNeutral(state.speechEnabled
      ? "I did not catch an answer. Hold space or the mic and try again."
      : "Type the plural form.");
    return;
  }

  const expected = normalizeAnswer(state.current.plural);
  const isCorrect = answer === expected;
  const matchedAnswer = answers.find((item) => normalizeAnswer(item) === expected);

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
  const word = state.current;

  if (isCorrect) {
    state.correct += 1;
    state.streak += 1;
    animateCorrect();
  } else {
    state.streak = 0;
    animateIncorrect();
  }

  elements.result.className = `result ${isCorrect ? "correct" : "incorrect"}`;
  elements.result.innerHTML = `
    <p class="result-title">${isCorrect ? "Correct" : "Not quite"}</p>
    <dl>
      <dt>${method === "speech" ? "Heard" : "You typed"}</dt>
      <dd>${escapeHtml(spoken)}</dd>
      <dt>Plural</dt>
      <dd>${escapeHtml(word.plural)}</dd>
    </dl>
  `;
  elements.nextButton.hidden = false;
  renderScore();
  scheduleNextWord(isCorrect);
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
    setSpeechState("idle", "Hold space or hold the microphone to answer.");
    if (state.acceptingSpeech && elements.result.textContent === "Listening...") {
      showNeutral("Hold space or the mic to try again, or type the answer.");
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
      showNeutral("I could not match the speech. Hold space or the mic and try again.");
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
      setSpeechState("idle", "Hold space or hold the microphone to answer.");
    }
    if (state.acceptingSpeech) {
      showNeutral(message);
    }
  });

  state.recognition = recognition;
  setSpeechState("idle", "Hold space or hold the microphone to answer.");
}

function startPushToTalk(event) {
  if (event) {
    event.preventDefault();
  }
  if (!state.toolActive || !state.acceptingSpeech || !state.speechEnabled || !state.recognition || state.listening) {
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
      setSpeechState("idle", "Hold space or hold the microphone to answer.");
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
  setSpeechState("idle", "Hold space or hold the microphone to answer.");
}

function setSpeechEnabled(enabled) {
  state.speechEnabled = enabled;
  elements.speechToggle.checked = enabled;
  elements.micButton.disabled = !enabled || !state.recognition;

  if (enabled) {
    state.acceptingSpeech = state.toolActive && state.current && elements.nextButton.hidden;
    setSpeechState("idle", state.recognition
      ? "Hold space or hold the microphone to answer."
      : "Speech recognition is not available in this browser. Typed answers still work.");
    if (state.toolActive && state.current && elements.nextButton.hidden) {
      showNeutral("Hold space or the mic to answer, or type the plural form.");
    }
  } else {
    abortSpeech();
    elements.micButton.disabled = true;
    setSpeechState("unavailable", "Speech recognition is off. Typed answers still work.");
    if (state.toolActive && state.current && elements.nextButton.hidden) {
      showNeutral("Type the plural form.");
    }
  }
}

elements.startToolButton.addEventListener("click", () => {
  showView("tool");
  if (!state.current) {
    pickWord();
  } else {
    state.acceptingSpeech = elements.nextButton.hidden;
  }
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
  if (event.code === "Space" && !event.repeat && state.speechEnabled) {
    startPushToTalk(event);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space" && (state.speechEnabled || state.pushToTalkActive)) {
    stopPushToTalk(event);
  }
});

elements.skipButton.addEventListener("click", () => {
  state.streak = 0;
  pickWord();
});

elements.typedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  gradeAnswer(elements.typedAnswer.value, "typed");
});

elements.typedAnswer.addEventListener("beforeinput", (event) => {
  if (event.data && /\s/.test(event.data)) {
    event.preventDefault();
  }
});

elements.typedAnswer.addEventListener("input", () => {
  elements.typedAnswer.value = elements.typedAnswer.value.replace(/\s+/g, "");
});

elements.nextButton.addEventListener("click", pickWord);

buildBurst();
setupSpeechRecognition();
