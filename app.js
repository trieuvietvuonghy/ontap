(() => {
  "use strict";

  const QUESTIONS = window.QUESTIONS;
  const TOTAL = QUESTIONS.length;
  const STORAGE_KEY = "trieu-viet-vuong-study-v2";
  // v1 stored progress by position in the old question order; it no longer maps to the same questions.
  const LEGACY_STORAGE_KEYS = ["trieu-viet-vuong-study-v1"];
  const LETTERS = ["A", "B", "C", "D"];

  const defaultState = () => ({
    answers: {},
    bookmarks: [],
  });

  let state = loadState();
  let currentIndex = 0;

  const el = {
    landingView: document.getElementById("landingView"),
    studyView: document.getElementById("studyView"),
    homeBtn: document.getElementById("homeBtn"),
    backToLandingBtn: document.getElementById("backToLandingBtn"),
    resumeBtn: document.getElementById("resumeBtn"),
    landingSequential: document.getElementById("landingSequential"),
    landingTotalLabel: document.getElementById("landingTotalLabel"),
    landingPercent: document.getElementById("landingPercent"),
    landingProgressFill: document.getElementById("landingProgressFill"),
    resumeHint: document.getElementById("resumeHint"),
    landingCompleted: document.getElementById("landingCompleted"),
    landingWrong: document.getElementById("landingWrong"),
    landingBookmarked: document.getElementById("landingBookmarked"),
    studySequential: document.getElementById("studySequential"),
    studyTotalLabel: document.getElementById("studyTotalLabel"),
    studyProgressFill: document.getElementById("studyProgressFill"),
    studyCompleted: document.getElementById("studyCompleted"),
    studyWrong: document.getElementById("studyWrong"),
    studyBookmarked: document.getElementById("studyBookmarked"),
    currentNumber: document.getElementById("currentNumber"),
    questionText: document.getElementById("questionText"),
    answerList: document.getElementById("answerList"),
    feedback: document.getElementById("feedback"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    bookmarkBtn: document.getElementById("bookmarkBtn"),
    questionDialog: document.getElementById("questionDialog"),
    questionGrid: document.getElementById("questionGrid"),
    dialogSequential: document.getElementById("dialogSequential"),
    dialogCompleted: document.getElementById("dialogCompleted"),
    closeGridBtn: document.getElementById("closeGridBtn"),
  };

  function loadState() {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage unavailable: nothing to clean up.
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return defaultState();

      const answers = parsed.answers && typeof parsed.answers === "object"
        ? parsed.answers
        : {};
      const bookmarks = Array.isArray(parsed.bookmarks)
        ? parsed.bookmarks.filter((index) => Number.isInteger(index) && index >= 0 && index < TOTAL)
        : [];

      for (const key of Object.keys(answers)) {
        const index = Number(key);
        const answer = answers[key];
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= TOTAL ||
          !answer ||
          !Number.isInteger(answer.selected) ||
          answer.selected < 0 ||
          answer.selected >= QUESTIONS[index].options.length ||
          typeof answer.correct !== "boolean"
        ) {
          delete answers[key];
        }
      }

      return { answers, bookmarks: [...new Set(bookmarks)] };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getStats() {
    const answers = Object.values(state.answers);
    let sequential = 0;

    while (sequential < TOTAL && state.answers[sequential]) {
      sequential += 1;
    }

    return {
      sequential,
      completed: answers.length,
      wrong: answers.filter((answer) => !answer.correct).length,
      bookmarked: state.bookmarks.length,
    };
  }

  function getResumeIndex() {
    const { sequential } = getStats();
    return sequential >= TOTAL ? TOTAL - 1 : sequential;
  }

  function isBookmarked(index) {
    return state.bookmarks.includes(index);
  }

  function updateDashboard() {
    const stats = getStats();
    const percent = Math.round((stats.sequential / TOTAL) * 100);

    el.landingSequential.textContent = stats.sequential;
    el.landingTotalLabel.textContent = `/${TOTAL} câu`;
    el.landingPercent.textContent = `${percent}%`;
    el.landingProgressFill.style.width = `${percent}%`;
    el.landingCompleted.textContent = stats.completed;
    el.landingWrong.textContent = stats.wrong;
    el.landingBookmarked.textContent = stats.bookmarked;

    if (stats.sequential === 0) {
      el.resumeBtn.textContent = "Bắt đầu từ câu 1";
      el.resumeHint.textContent = "Bạn chưa bắt đầu ôn tập.";
    } else if (stats.sequential >= TOTAL) {
      el.resumeBtn.textContent = `Xem lại từ câu ${TOTAL}`;
      el.resumeHint.textContent = `Bạn đã ôn xong cả ${TOTAL} câu. Muốn luyện lại, bấm "Ôn lại từ đầu" bên dưới.`;
    } else {
      el.resumeBtn.textContent = `Tiếp tục từ câu ${stats.sequential + 1}`;
      el.resumeHint.textContent = `Đã ôn xong câu 1–${stats.sequential}. Tiếp theo là câu ${stats.sequential + 1}.`;
    }

    updateStudyStats(stats);
  }

  function updateStudyStats(stats = getStats()) {
    const percent = (stats.sequential / TOTAL) * 100;
    el.studySequential.textContent = stats.sequential;
    el.studyTotalLabel.textContent = `/${TOTAL}`;
    el.studyProgressFill.style.width = `${percent}%`;
    el.studyCompleted.textContent = stats.completed;
    el.studyWrong.textContent = stats.wrong;
    el.studyBookmarked.textContent = stats.bookmarked;
    el.dialogSequential.textContent = stats.sequential;
    el.dialogCompleted.textContent = stats.completed;
  }

  function showLanding() {
    updateDashboard();
    el.studyView.hidden = true;
    el.landingView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showStudy(index) {
    currentIndex = Math.min(Math.max(index, 0), TOTAL - 1);
    el.landingView.hidden = true;
    el.studyView.hidden = false;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderQuestion() {
    const question = QUESTIONS[currentIndex];
    const storedAnswer = state.answers[currentIndex] || null;
    const bookmarked = isBookmarked(currentIndex);

    el.currentNumber.textContent = currentIndex + 1;
    el.questionText.textContent = question.q;
    el.answerList.replaceChildren();

    question.options.forEach((option, optionIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-option";
      button.dataset.optionIndex = optionIndex;
      button.disabled = Boolean(storedAnswer);

      const letter = document.createElement("span");
      letter.className = "answer-letter";
      letter.textContent = LETTERS[optionIndex];

      const copy = document.createElement("span");
      copy.className = "answer-copy";
      copy.textContent = option;

      const stateIcon = document.createElement("span");
      stateIcon.className = "answer-state";
      stateIcon.setAttribute("aria-hidden", "true");

      if (storedAnswer) {
        if (optionIndex === question.correct) {
          button.classList.add("is-correct");
          stateIcon.textContent = "✓";
        }
        if (optionIndex === storedAnswer.selected && !storedAnswer.correct) {
          button.classList.add("is-wrong");
          stateIcon.textContent = "×";
        }
      }

      button.append(letter, copy, stateIcon);
      button.addEventListener("click", () => selectAnswer(optionIndex));
      el.answerList.append(button);
    });

    renderFeedback(storedAnswer, question);
    el.prevBtn.disabled = currentIndex === 0;
    el.nextBtn.disabled = !storedAnswer;
    el.nextBtn.textContent = currentIndex === TOTAL - 1 ? "Hoàn tất" : "Câu tiếp →";
    el.bookmarkBtn.setAttribute("aria-pressed", String(bookmarked));
    el.bookmarkBtn.querySelector("span").textContent = bookmarked ? "★" : "☆";
    updateStudyStats();
  }

  function renderFeedback(answer, question) {
    if (!answer) {
      el.feedback.hidden = true;
      el.feedback.className = "feedback";
      el.feedback.textContent = "";
      return;
    }

    el.feedback.hidden = false;
    if (answer.correct) {
      el.feedback.className = "feedback correct";
      el.feedback.textContent = "Chính xác. Bạn có thể chuyển sang câu tiếp theo.";
    } else {
      el.feedback.className = "feedback wrong";
      el.feedback.textContent = `Chưa đúng. Đáp án đúng là ${LETTERS[question.correct]}: ${question.options[question.correct]}`;
    }
  }

  function selectAnswer(optionIndex) {
    if (state.answers[currentIndex]) return;

    const question = QUESTIONS[currentIndex];
    const correct = optionIndex === question.correct;
    state.answers[currentIndex] = { selected: optionIndex, correct };
    saveState();
    renderQuestion();
  }

  function toggleBookmark() {
    if (isBookmarked(currentIndex)) {
      state.bookmarks = state.bookmarks.filter((index) => index !== currentIndex);
    } else {
      state.bookmarks.push(currentIndex);
      state.bookmarks.sort((a, b) => a - b);
    }
    saveState();
    renderQuestion();
  }

  function goPrevious() {
    if (currentIndex > 0) showStudy(currentIndex - 1);
  }

  function goNext() {
    if (!state.answers[currentIndex]) return;
    if (currentIndex >= TOTAL - 1) {
      showLanding();
      return;
    }
    showStudy(currentIndex + 1);
  }

  function buildQuestionGrid() {
    const fragment = document.createDocumentFragment();

    QUESTIONS.forEach((_, index) => {
      const button = document.createElement("button");
      const answer = state.answers[index];
      button.type = "button";
      button.className = "grid-question";
      button.textContent = index + 1;
      button.setAttribute("aria-label", `Đi tới câu ${index + 1}`);

      if (!el.studyView.hidden && index === currentIndex) button.classList.add("is-current");
      if (answer?.correct) button.classList.add("is-correct");
      if (answer && !answer.correct) button.classList.add("is-wrong");
      if (isBookmarked(index)) button.classList.add("is-bookmarked");

      button.addEventListener("click", () => {
        el.questionDialog.close();
        showStudy(index);
      });
      fragment.append(button);
    });

    el.questionGrid.replaceChildren(fragment);
  }

  function openQuestionGrid() {
    buildQuestionGrid();
    updateStudyStats();
    if (!el.questionDialog.open) el.questionDialog.showModal();
  }

  function resetProgress() {
    const confirmed = window.confirm(
      "Cảnh báo: Các đáp án bạn đã chọn sẽ được đặt lại. Bạn sẽ ôn tập lại từ câu 1."
    );
    if (!confirmed) return;

    state = defaultState();
    saveState();
    currentIndex = 0;
    if (el.questionDialog.open) el.questionDialog.close();
    showLanding();
  }

  el.resumeBtn.addEventListener("click", () => showStudy(getResumeIndex()));
  el.homeBtn.addEventListener("click", showLanding);
  el.backToLandingBtn.addEventListener("click", showLanding);
  el.prevBtn.addEventListener("click", goPrevious);
  el.nextBtn.addEventListener("click", goNext);
  el.bookmarkBtn.addEventListener("click", toggleBookmark);
  el.closeGridBtn.addEventListener("click", () => el.questionDialog.close());

  ["openGridBtnHeader", "openGridBtnLanding", "openGridBtnSidebar", "openGridBtnSidebarLarge"]
    .forEach((id) => document.getElementById(id).addEventListener("click", openQuestionGrid));

  ["resetBtnLanding", "resetBtnStudy"]
    .forEach((id) => document.getElementById(id).addEventListener("click", resetProgress));

  el.questionDialog.addEventListener("click", (event) => {
    if (event.target === el.questionDialog) el.questionDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (el.studyView.hidden || el.questionDialog.open) return;

    if (!state.answers[currentIndex] && /^[1-4]$/.test(event.key)) {
      selectAnswer(Number(event.key) - 1);
      return;
    }
    if (event.key === "ArrowLeft" && currentIndex > 0) goPrevious();
    if (event.key === "ArrowRight" && state.answers[currentIndex]) goNext();
  });

  if (!Array.isArray(QUESTIONS) || TOTAL === 0) {
    throw new Error("Không tìm thấy câu hỏi để hiển thị.");
  }

  updateDashboard();
})();
