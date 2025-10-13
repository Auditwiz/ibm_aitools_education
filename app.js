// IBM AI Tools Learning Hub – app.js
// All code wrapped in DOMContentLoaded to ensure elements exist before manipulation

/***********************************************************************
 * DATA – pulled directly from provided JSON                           *
 **********************************************************************/
const curriculum = {
  modules: [
    {
      id: 1,
      title: "WatsonX Essentials",
      video: "https://www.youtube-nocookie.com/embed/_hlXYn5cAhY?rel=0&modestbranding=1",
      cards: [
        {
          front: "What is Granite 3.2?",
          back: "IBM's latest family of small, enterprise-tuned foundation models, Apache-2 licensed for commercial use"
        },
        {
          front: "Prompt Lab",
          back: "Low-code workspace to evaluate prompts against multiple models inside watsonx.ai"
        },
        {
          front: "watsonx.data Lakehouse",
          back: "Combines data-lake flexibility with warehouse performance using open table formats"
        }
      ],
      quiz: [
        {
          question: "Which Granite variant provides guardrails for safe AI deployment?",
          answer: "Granite Guardian",
          options: ["Granite Base", "Granite Guardian", "Granite MoE", "Granite Vision"]
        },
        {
          question: "watsonx.data is built on which open table format?",
          answer: "Iceberg",
          options: ["Delta Lake", "Hive", "Iceberg", "Parquet"]
        }
      ]
    },
    {
      id: 2,
      title: "Watson Orchestrate",
      video: "https://www.youtube-nocookie.com/embed/aQOsNjzqB0U?rel=0&modestbranding=1",
      cards: [
        {
          front: "Agent Catalog",
          back: "150+ pre-built agents and tools discoverable in one centralized location"
        },
        {
          front: "Flow Builder",
          back: "Visual designer for no-code agent workflows and automation (preview feature)"
        },
        {
          front: "Multi-agent orchestration",
          back: "Coordinate multiple agents across 80+ enterprise applications seamlessly"
        }
      ],
      quiz: [
        {
          question: "Watson Orchestrate integrates with approximately how many enterprise applications?",
          answer: "Over 80",
          options: ["10-20", "40-50", "Over 80", "200+"]
        },
        {
          question: "What reasoning architecture powers Agent Lab by default?",
          answer: "ReAct",
          options: ["Chain-of-Thought", "Seq2Seq", "ReAct", "Mixture of Experts"]
        }
      ]
    },
    {
      id: 3,
      title: "Consulting Advantage",
      video: "https://www.youtube-nocookie.com/embed/K5NTRuvsxJc?rel=0&modestbranding=1",
      cards: [
        {
          front: "Role-based Assistants",
          back: "Comprehensive library of AI assistants tailored for strategy, business analysis, and development tasks"
        },
        {
          front: "Productivity Impact",
          back: "Early adopters report up to 50% faster project delivery and improved efficiency"
        },
        {
          front: "Granite Integration",
          back: "Consultants can seamlessly toggle between IBM and third-party LLMs within unified interface"
        }
      ],
      quiz: [
        {
          question: "IBM Consulting Advantage is primarily powered by which AI platform?",
          answer: "watsonx",
          options: ["Azure OpenAI", "AWS Bedrock", "Google Vertex AI", "watsonx"]
        },
        {
          question: "Which key metric showed up to 50% improvement in early pilot programs?",
          answer: "Productivity",
          options: ["Storage cost", "Response latency", "Model accuracy", "Productivity"]
        }
      ]
    }
  ]
};

/***********************************************************************
 * STATE                                                                *
 **********************************************************************/
const learnerState = {}; // populated at runtime
const chartInstances = {}; // hold Chart.js instances for clean re-render

let currentModule = null;
let cardIndex = 0;
let quizIndex = 0;
let quizSelections = [];
let selectedOptionIdx = null; // currently selected answer in quiz

/***********************************************************************
 * HELPERS: Progress calculations & updates                            *
 **********************************************************************/
function calcModuleProgress(moduleId) {
  const st = learnerState[moduleId];
  let pct = 0;
  if (st.videoWatched) pct += 33;
  if (st.cardsCompleted) pct += 33; // fixed: use cardsCompleted instead of cardsMastered
  if (st.quizPassed) pct += 34;
  return pct;
}

function updateGlobalProgress() {
  const totalPct = Math.round(
    curriculum.modules.reduce((acc, m) => acc + calcModuleProgress(m.id), 0) / curriculum.modules.length
  );
  const bar = document.getElementById("globalProgressBar");
  const txt = document.getElementById("globalProgressText");
  if (bar) bar.style.width = `${totalPct}%`;
  if (txt) txt.textContent = `${totalPct}%`;
}

function updateModuleProgressDisplay() {
  if (!currentModule) return;
  const pct = calcModuleProgress(currentModule.id);
  const fill = document.getElementById("moduleProgressFill");
  const txt = document.getElementById("moduleProgressText");
  if (fill) fill.style.width = `${pct}%`;
  if (txt) txt.textContent = `${pct}% complete`;
  renderSidebar(); // refresh badges
  updateModuleChart();
  updateGlobalProgress();
}

/***********************************************************************
 * DOM RENDERING FUNCTIONS                                             *
 **********************************************************************/
function renderSidebar() {
  const list = document.getElementById("moduleList");
  if (!list) return;
  list.innerHTML = "";

  curriculum.modules.forEach(mod => {
    const li = document.createElement("li");
    li.className = "position-relative"; // for accent stripe

    const pct = calcModuleProgress(mod.id);
    const btn = document.createElement("button");
    btn.className = `module-btn ${currentModule && currentModule.id === mod.id ? "active" : ""}`;
    btn.setAttribute("type", "button");
    btn.setAttribute("aria-label", `Open module ${mod.title}`);

    btn.innerHTML = `
      <span>${mod.title}</span>
      <span class="module-badge ${pct === 100 ? "complete" : ""}">${pct}%</span>
    `;

    btn.addEventListener("click", () => {
      // collapse sidebar on mobile when a module is chosen
      if (window.innerWidth < 768) toggleSidebar();
      loadModule(mod.id);
    });

    li.appendChild(btn);
    list.appendChild(li);
  });
}

function buildProgressSection() {
  const pct = calcModuleProgress(currentModule.id);
  const sec = document.createElement("section");
  sec.className = "module-section";
  sec.innerHTML = `
    <h3 class="section-title">Progress</h3>
    <div class="progress mb-2" style="height:8px;">
      <div id="moduleProgressFill" class="progress-bar bg-primary" style="width:${pct}%"></div>
    </div>
    <div id="moduleProgressText" class="small mb-3" aria-live="polite">${pct}% complete</div>
    <div class="chart-wrap">
      <canvas id="moduleChart-${currentModule.id}" width="160" height="160" aria-label="Pie chart showing module progress" role="img"></canvas>
    </div>
  `;
  return sec;
}

function buildVideoSection() {
  const st = learnerState[currentModule.id];
  const sec = document.createElement("section");
  sec.className = "module-section";

  // Provide fallback link if video fails to load
  const videoHTML = `
    <div class="video-wrapper mb-3">
      <iframe src="${currentModule.video}" title="${currentModule.title} video lesson" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
    <noscript><p>Your browser does not support JavaScript or it is disabled. <a href="${currentModule.video}" target="_blank" rel="noopener noreferrer">Watch the video here</a>.</p></noscript>
  `;

  sec.innerHTML = `
    <h3 class="section-title">Video Lesson</h3>
    ${videoHTML}
    <button id="watchBtn" class="btn btn--primary" ${st.videoWatched ? "disabled" : ""}>${st.videoWatched ? "Watched" : "Mark as Watched"}</button>
  `;

  sec.querySelector("#watchBtn")?.addEventListener("click", e => {
    learnerState[currentModule.id].videoWatched = true;
    e.currentTarget.disabled = true;
    e.currentTarget.textContent = "Watched";
    updateModuleProgressDisplay();
  });

  return sec;
}

function buildCardsSection() {
  const sec = document.createElement("section");
  sec.className = "module-section";
  sec.id = "cardsSection";
  sec.innerHTML = `
    <h3 class="section-title">Study Cards</h3>
    <div id="cardContainer"></div>
  `;
  return sec;
}

function renderCurrentCard() {
  const container = document.getElementById("cardContainer");
  if (!container) return;
  const st = learnerState[currentModule.id];

  if (cardIndex >= currentModule.cards.length) {
    container.innerHTML = `
      <div class="text-center">
        <p class="fw-semibold">All cards reviewed.</p>
        <p>${st.cardsMastered} / ${st.totalCards} mastered.</p>
      </div>`;
    // Mark cards as completed when all are reviewed
    st.cardsCompleted = true;
    updateModuleProgressDisplay();
    return;
  }

  const card = currentModule.cards[cardIndex];
  container.innerHTML = `
    <div class="mb-2 small">Card ${cardIndex + 1} of ${currentModule.cards.length}</div>
    <div class="flip-card" id="studyCard" tabindex="0" aria-label="Flash card. Press flip to view answer.">
      <div class="flip-card-inner">
        <div class="flip-card-front d-flex align-items-center justify-content-center text-center fw-medium">
          <span>${card.front}</span>
        </div>
        <div class="flip-card-back d-flex align-items-center justify-content-center text-center">
          <span>${card.back}</span>
        </div>
      </div>
    </div>
    <div class="card-controls mt-2 mb-2">
      <button id="flipBtn" class="btn btn-flip me-2">Flip</button>
    </div>
    <div class="card-controls d-flex gap-8">
      <button id="dontKnowBtn" class="btn btn-dont-know flex-fill" aria-label="Mark as don't know">Don't know</button>
      <button id="knowBtn" class="btn btn-know flex-fill" aria-label="Mark as know">Know</button>
    </div>
  `;

  container.querySelector("#flipBtn")?.addEventListener("click", () => {
    document.getElementById("studyCard")?.classList.toggle("flipped");
  });
  container.querySelector("#dontKnowBtn")?.addEventListener("click", () => nextCard(false));
  container.querySelector("#knowBtn")?.addEventListener("click", () => nextCard(true));
}

function nextCard(know) {
  const st = learnerState[currentModule.id];
  if (know) st.cardsMastered = Math.min(st.cardsMastered + 1, st.totalCards);
  cardIndex += 1;
  renderCurrentCard();
}

function buildQuizSection() {
  const sec = document.createElement("section");
  sec.className = "module-section";
  sec.id = "quizSection";
  sec.innerHTML = `
    <h3 class="section-title">Quiz</h3>
    <div id="quizContainer"></div>
  `;
  return sec;
}

/***********************************************************************
 * Quiz Renders & Logic                                                *
 **********************************************************************/
function renderQuizQuestion() {
  const container = document.getElementById("quizContainer");
  if (!container) return;

  if (quizIndex >= currentModule.quiz.length) {
    renderQuizResults();
    return;
  }

  const qObj = currentModule.quiz[quizIndex];
  container.innerHTML = `
    <div class="mb-3 fw-medium">Question ${quizIndex + 1} of ${currentModule.quiz.length}</div>
    <p class="mb-3">${qObj.question}</p>
    <div id="optionsWrap" class="mb-3" role="radiogroup" aria-label="Answer options"></div>
    <button id="submitAnsBtn" class="btn btn--primary" disabled>Submit</button>
  `;

  const optsWrap = document.getElementById("optionsWrap");
  qObj.options.forEach((txt, idx) => {
    const opt = document.createElement("div");
    opt.className = "quiz-option d-flex align-items-start";
    opt.dataset.index = idx;
    opt.setAttribute("role", "radio");
    opt.setAttribute("tabindex", "0");
    opt.setAttribute("aria-checked", "false");
    opt.innerHTML = `<strong class="me-2">${String.fromCharCode(65 + idx)}.</strong> <span>${txt}</span>`;

    function handleSelect() {
      selectOption(idx);
      opt.focus();
    }
    opt.addEventListener("click", handleSelect);
    opt.addEventListener("keypress", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect();
      }
    });
    optsWrap.appendChild(opt);
  });

  document.getElementById("submitAnsBtn")?.addEventListener("click", gradeAnswer);
}

function selectOption(idx) {
  selectedOptionIdx = idx;
  document.querySelectorAll("#optionsWrap .quiz-option").forEach(el => {
    const isSelected = parseInt(el.dataset.index, 10) === idx;
    el.classList.toggle("selected", isSelected);
    el.setAttribute("aria-checked", isSelected.toString());
  });
  const submitBtn = document.getElementById("submitAnsBtn");
  if (submitBtn) submitBtn.disabled = false;
}

function gradeAnswer() {
  const qObj = currentModule.quiz[quizIndex];
  const correctIdx = qObj.options.indexOf(qObj.answer);

  document.querySelectorAll("#optionsWrap .quiz-option").forEach(el => {
    const idx = parseInt(el.dataset.index, 10);
    el.classList.remove("selected");
    if (idx === correctIdx) {
      el.classList.add("correct");
    } else if (idx === selectedOptionIdx) {
      el.classList.add("incorrect");
    }
    el.setAttribute("aria-checked", idx === selectedOptionIdx);
    el.style.pointerEvents = "none";
  });

  quizSelections.push(selectedOptionIdx === correctIdx);

  setTimeout(() => {
    quizIndex += 1;
    selectedOptionIdx = null;
    renderQuizQuestion();
  }, 1000);
}

function renderQuizResults() {
  const container = document.getElementById("quizContainer");
  if (!container) return;

  const correct = quizSelections.filter(Boolean).length;
  const pct = Math.round((correct / currentModule.quiz.length) * 100);
  const passed = pct >= 70;
  learnerState[currentModule.id].quizPassed = passed;

  container.innerHTML = `
    <div class="quiz-result ${passed ? "pass" : "fail"} text-center">
      <h4 class="mb-2">${pct}%</h4>
      <p class="mb-2">You answered ${correct} of ${currentModule.quiz.length} correctly.</p>
      ${passed ? "<p>Great job! You passed.</p>" : "<button id=\"retryBtn\" class=\"btn btn--primary\">Retry</button>"}
    </div>
  `;

  if (!passed) {
    container.querySelector("#retryBtn")?.addEventListener("click", () => {
      quizIndex = 0;
      quizSelections = [];
      renderQuizQuestion();
    });
  }

  updateModuleProgressDisplay();
}

/***********************************************************************
 * Chart.js                                                            *
 **********************************************************************/
function updateModuleChart() {
  const canvasId = `moduleChart-${currentModule.id}`;
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const st = learnerState[currentModule.id];
  const dataVals = [
    st.videoWatched ? 33 : 0,
    st.cardsCompleted ? 33 : 0, // fixed: use cardsCompleted instead of cardsMastered
    st.quizPassed ? 34 : 0
  ];

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Video", "Cards", "Quiz"],
      datasets: [
        {
          data: dataVals,
          backgroundColor: ["#1FB8CD", "#FFC185", "#B4413C"],
          borderWidth: 2,
          borderColor: "#ffffff"
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

/***********************************************************************
 * Module loading                                                      *
 **********************************************************************/
function loadModule(id) {
  const mod = curriculum.modules.find(m => m.id === id);
  if (!mod) return;

  currentModule = mod;
  cardIndex = 0;
  quizIndex = 0;
  quizSelections = [];
  selectedOptionIdx = null;

  const main = document.getElementById("mainContent");
  if (!main) return;
  main.innerHTML = "";

  // Title
  const heading = document.createElement("h2");
  heading.textContent = mod.title;
  heading.className = "mb-4";
  main.appendChild(heading);

  // Sections
  try {
    const progressSection = buildProgressSection();
    main.appendChild(progressSection);

    const videoSection = buildVideoSection();
    main.appendChild(videoSection);

    const cardsSection = buildCardsSection();
    main.appendChild(cardsSection);
    renderCurrentCard();

    const quizSection = buildQuizSection();
    main.appendChild(quizSection);
    renderQuizQuestion();
  } catch (err) {
    console.error("Error building module UI", err);
    main.innerHTML = `<p class="text-danger">An error occurred while loading the module. Please refresh.</p>`;
  }

  renderSidebar();
  updateModuleChart();
}

/***********************************************************************
 * Sidebar toggle (mobile)                                             *
 **********************************************************************/
function toggleSidebar(forceClose = false) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  const isCollapsed = sidebar.classList.contains("sidebar-collapsed");
  if (forceClose && isCollapsed) return; // already closed
  sidebar.classList.toggle("sidebar-collapsed", forceClose ? true : undefined);
  // if forceClose not provided, simply toggle
  if (!forceClose) sidebar.classList.toggle("sidebar-collapsed");
}

/***********************************************************************
 * INIT                                                                *
 **********************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Initialise learner state structure
  curriculum.modules.forEach(mod => {
    learnerState[mod.id] = {
      videoWatched: false,
      cardsMastered: 0,
      totalCards: mod.cards.length,
      cardsCompleted: false, // fixed: added cardsCompleted flag
      quizPassed: false
    };
  });

  // Attach sidebar toggle behaviour
  document.getElementById("sidebarToggle")?.addEventListener("click", () => toggleSidebar());

  // Collapse sidebar by default on small screens
  if (window.innerWidth < 768) {
    document.getElementById("sidebar")?.classList.add("sidebar-collapsed");
  }

  renderSidebar();
  loadModule(curriculum.modules[0].id);
});