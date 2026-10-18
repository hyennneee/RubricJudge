const STORAGE_KEY = "rubric-studio-config-v1";
const defaultQuestions = [
  { id: crypto.randomUUID(), title: "문제 1 - 퍼셉트론 구현", points: 40, efficiencyPoints: 10, efficiencyCriteria: "calculate_sum 시간 복잡도 O(N) (4점)\ntrain 시간 복잡도 O(NE) (6점)", requirements: "가중치와 편향을 사용해 입력을 계산합니다. 학습률을 반영해 가중치를 갱신합니다.", functions: "calculate_sum, step_function, train", complexity: "학습 데이터 수 N, 반복 횟수 E에 대해 O(NE) 권장", tests: "AND 게이트 입력에서 [1, 1]은 1, [0, 0]은 0을 반환", testCases: [{ name: "AND gate", input: JSON.stringify({ trainingData: [{ inputs: [0, 0], label: 0 }, { inputs: [0, 1], label: 0 }, { inputs: [1, 0], label: 0 }, { inputs: [1, 1], label: 1 }], epochs: 30, learningRate: 0.1 }), expectedOutput: '{"predictions": [0, 0, 0, 1]}', hidden: true }], reference: "" },
  { id: crypto.randomUUID(), title: "문제 2 - 최단 경로 탐색", points: 35, efficiencyPoints: 13, efficiencyCriteria: "우선순위 큐를 사용해 O((V + E) log V) 달성 (9점)\n인접 리스트를 사용해 O(V + E) 공간 유지 (4점)", requirements: "가중치가 음수가 아닌 그래프에서 시작점부터 모든 정점까지 최단 거리를 구합니다.", functions: "dijkstra, reconstruct_path", complexity: "인접 리스트와 우선순위 큐를 사용해 O((V + E) log V)", tests: "연결되지 않은 정점은 무한대 또는 명확한 미도달 값으로 표시", testCases: [{ name: "Shortest paths", input: JSON.stringify({ graph: { A: [["B", 1], ["C", 4]], B: [["C", 2], ["D", 5]], C: [["D", 1]], D: [] }, start: "A" }), expectedOutput: '{"distances": {"A": 0, "B": 1, "C": 3, "D": 4}, "paths": {"A": ["A"], "B": ["A", "B"], "C": ["A", "B", "C"], "D": ["A", "B", "C", "D"]}}', hidden: true }], reference: "" },
  { id: crypto.randomUUID(), title: "문제 3 - 괄호 문자열 검증", points: 25, efficiencyPoints: 15, efficiencyCriteria: "문자열을 한 번 순회해 O(N) 시간 달성 (8점)\n필요한 괄호만 스택에 보관해 O(N) 공간 이내 유지 (7점)", requirements: "중첩된 (), [], {} 괄호가 올바른 순서로 짝을 이루는지 판별합니다.", functions: "is_valid", complexity: "시간 O(N), 공간 O(N) 이내", tests: "{[()]}는 유효, ([)] 및 닫히지 않은 괄호는 유효하지 않음", testCases: [{ name: "Nested brackets", input: "{[()]}", expectedOutput: "true", hidden: true }, { name: "Wrong nesting", input: "([)]", expectedOutput: "false", hidden: true }], reference: "" },
];
const defaultAwards = [
  { id: crypto.randomUUID(), name: "금상", count: 1 },
  { id: crypto.randomUUID(), name: "은상", count: 1 },
  { id: crypto.randomUUID(), name: "동상", count: 1 },
];
const state = { questions: [], students: [], awards: [], tab: "config", apiConfigured: false, grading: false };
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function loadConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const questions = Array.isArray(stored?.questions) && stored.questions.length ? stored.questions : structuredClone(defaultQuestions);
    state.questions = questions.map((question) => {
      const points = Number(question.points) || 10;
      const savedEfficiencyPoints = Number(question.efficiencyPoints);
      const efficiencyPoints = Number.isFinite(savedEfficiencyPoints) ? Math.max(0, Math.min(points, savedEfficiencyPoints)) : (question.complexity ? Math.round(points * 0.3) : 0);
      return { ...question, efficiencyPoints, efficiencyCriteria: question.efficiencyCriteria || (efficiencyPoints ? `복잡도 기준 ${question.complexity || "요구 알고리즘 성능"} 충족 (${efficiencyPoints}점)` : ""), testCases: Array.isArray(question.testCases) ? question.testCases : [] };
    });
    const storedAwards = Array.isArray(stored?.awards) ? stored.awards : null;
    const previousDefaultAwards = storedAwards?.length === 3
      && storedAwards[0].name === "금상" && Number(storedAwards[0].count) === 1
      && storedAwards[1].name === "은상" && Number(storedAwards[1].count) === 2
      && storedAwards[2].name === "동상" && Number(storedAwards[2].count) === 3;
    state.awards = previousDefaultAwards
      ? storedAwards.map((award) => ({ ...award, count: 1 }))
      : storedAwards || structuredClone(defaultAwards);
    $("#exam-title").value = stored?.title || "알고리즘 실기 평가";
    $("#filename-pattern").value = stored?.pattern || "{학번}_{이름}_문제{문항번호}.{확장자}";
  } catch {
    state.questions = structuredClone(defaultQuestions);
    state.awards = structuredClone(defaultAwards);
  }
  renderQuestions();
  renderAwardSettings();
}

function saveConfig() {
  const config = { title: $("#exam-title").value, pattern: $("#filename-pattern").value, questions: state.questions, awards: state.awards };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { showToast("브라우저 저장 공간이 부족해 설정을 저장하지 못했습니다.", "error"); }
  updateSummary();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function renderQuestions() {
  const list = $("#question-list");
  if (!state.questions.length) {
    list.innerHTML = '<div class="empty-files">문항을 추가하거나 시험지 파일에서 불러오세요.</div>';
    updateSummary();
    return;
  }
  list.innerHTML = state.questions.map((question, index) => `
    <article class="question-card" data-question-id="${escapeHtml(question.id)}">
      <div class="question-top"><span class="question-number">${String(index + 1).padStart(2, "0")}</span><input class="question-title" data-field="title" aria-label="문항명" value="${escapeHtml(question.title)}"/><label class="question-points"><input data-field="points" type="number" min="0" max="1000" value="${Number(question.points) || 0}" aria-label="배점"/><span>점</span></label><button class="icon-delete" data-action="delete-question" aria-label="문항 삭제">×</button></div>
      <div class="question-body">
        <label>정확성 채점 기준<textarea data-field="requirements" placeholder="정답, 예외 처리, 필수 요구사항별 배점">${escapeHtml(question.requirements)}</textarea></label>
        <label>필수 함수 목록<textarea data-field="functions" placeholder="예: calculate_sum, step_function">${escapeHtml(question.functions)}</textarea></label>
        <div class="wide efficiency-field"><div class="efficiency-field-head"><label for="efficiency-${escapeHtml(question.id)}">효율성 채점 기준</label><label class="efficiency-point-control">배점<input id="efficiency-${escapeHtml(question.id)}" data-field="efficiencyPoints" type="number" min="0" max="${Number(question.points) || 0}" value="${Number(question.efficiencyPoints) || 0}" aria-label="효율성 배점"/>점</label></div><textarea data-field="efficiencyCriteria" placeholder="시간·공간 복잡도를 나눠 적고, 항목별 배점을 명시하세요.">${escapeHtml(question.efficiencyCriteria)}</textarea><small class="efficiency-budget-note">효율성 배점은 총점 안에 포함되고, 나머지는 정확성 배점으로 채점합니다.</small></div>
        <label>시간·공간 복잡도 기준<textarea data-field="complexity" placeholder="기대 시간·공간 복잡도, 입력 크기, 허용 가능한 대안">${escapeHtml(question.complexity)}</textarea></label>
        <label>테스트 케이스·입출력<textarea data-field="tests" placeholder="예: 입력 1, 2 → 출력 3">${escapeHtml(question.tests)}</textarea></label>
        <div class="wide testcase-section"><div class="testcase-heading"><span><strong>Wandbox 자동 실행 테스트</strong><small>프로그램의 표준 입력과 출력을 비교합니다.</small></span><button class="add-button" data-action="add-testcase" type="button">＋ 테스트 추가</button></div>${question.testCases?.length ? `<div class="testcase-list">${question.testCases.map((testCase, testIndex) => `<div class="testcase-row" data-test-index="${testIndex}"><span class="testcase-number">${String(testIndex + 1).padStart(2, "0")}</span><label>입력<textarea data-test-field="input" placeholder="프로그램 stdin">${escapeHtml(testCase.input || "")}</textarea></label><label>예상 출력<textarea data-test-field="expectedOutput" placeholder="정확히 일치해야 하는 stdout">${escapeHtml(testCase.expectedOutput || "")}</textarea></label><button class="icon-delete" data-action="delete-testcase" type="button" aria-label="테스트 삭제">×</button></div>`).join("")}</div>` : `<div class="testcase-empty">테스트를 추가해야 실행 채점을 할 수 있습니다. 한 문항에 최대 12개까지 설정할 수 있어요.</div>`}<small class="testcase-notice">표준 입력·출력 프로그램에 사용하세요. 함수만 제출하는 문제는 별도 실행 코드가 필요합니다. 제출 코드는 Wandbox에 전송되어 실행됩니다.</small></div>
        <label class="wide">정답 예시 또는 추가 기준<textarea data-field="reference" placeholder="선택 사항: 정답 코드, 예외 처리 기준, 부분 점수 기준">${escapeHtml(question.reference)}</textarea></label>
      </div>
    </article>`).join("");
  updateSummary();
}

function updateSummary() {
  const total = state.questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
  const count = state.questions.length;
  $("#question-count").textContent = count;
  $("#question-pill").textContent = String(count).padStart(2, "0");
  $("#total-points").textContent = total;
  $("#aside-total").textContent = total;
  $("#aside-question-count").textContent = String(count).padStart(2, "0");
  $("#aside-average").innerHTML = `${count ? (total / count).toFixed(1) : "0.0"}<span>점</span>`;
  $("#score-meter-fill").style.width = `${Math.min(total, 100)}%`;
  $("#sidebar-exam-title").textContent = $("#exam-title").value || "새 시험";
  $("#sidebar-exam-meta").textContent = `${count}개 문항 · ${total}점 만점`;
}

function setTab(tab) {
  state.tab = tab;
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.tab === tab));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${tab}`));
  const titles = { config: ["시험 설정", "채점 기준을 정의하고 학생 코드를 일관되게 평가하세요."], submissions: ["제출물 채점", "학생 코드를 업로드하고 루브릭에 따라 평가하세요."], dashboard: ["채점 결과", "학생별 점수와 문항 피드백을 검토하세요."] };
  if (tab !== "dashboard") {
    $("#page-title").textContent = titles[tab][0];
    $("#page-description").textContent = titles[tab][1];
  }
  if (tab === "dashboard") renderDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message, type = "") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  $("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

async function checkApiStatus() {
  try {
    const response = await fetch("/api/status");
    const result = await response.json();
    state.apiConfigured = Boolean(result.configured);
    $("#api-dot").classList.toggle("connected", state.apiConfigured);
    $("#api-status-text").textContent = state.apiConfigured ? "서버 키 설정됨 · 요청 시 권한 확인" : "서버 키 설정이 필요합니다";
    $("#grade-mode-status").textContent = state.apiConfigured ? "Gemini 점수 분석 · Wandbox 테스트" : "Gemini 미설정 · Wandbox 테스트만 실행";
  } catch {
    $("#api-status-text").textContent = "채점 서버에 연결할 수 없습니다";
    $("#grade-mode-status").textContent = "서버 연결을 확인해 주세요";
  }
}

async function extractText(file) {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    if (!window.pdfjsLib) throw new Error("PDF 읽기 도구를 불러오지 못했습니다. TXT 또는 Markdown 파일을 이용해 주세요.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = [];
      let line = [];
      let lastY = null;
      const flushLine = () => {
        const text = line.join(" ").replace(/\s+/g, " ").trim();
        if (text) lines.push(text);
        line = [];
      };
      for (const item of content.items) {
        const y = Number(item.transform?.[5]);
        if (lastY != null && Number.isFinite(y) && Math.abs(y - lastY) > 2.5) flushLine();
        if (item.str) line.push(item.str);
        if (Number.isFinite(y)) lastY = y;
        if (item.hasEOL) { flushLine(); lastY = null; }
      }
      flushLine();
      pages.push(`\n[PDF page ${pageNumber}]\n${lines.join("\n")}`);
    }
    return pages.join("\n");
  }
  return file.text();
}

async function parseExamFile(file) {
  const button = $("#select-exam-file");
  button.disabled = true;
  button.textContent = "시험지를 분석하고 있습니다…";
  $("#exam-upload-zone").setAttribute("aria-busy", "true");
  try {
    if (!/\.(pdf|txt|md|markdown)$/i.test(file.name)) throw new Error("PDF, TXT 또는 Markdown 시험지 파일을 올려 주세요.");
    const text = await extractText(file);
    if (!text.trim()) throw new Error("PDF에서 읽을 수 있는 글자를 찾지 못했습니다. 스캔 이미지가 아닌 텍스트 PDF인지 확인해 주세요.");
    let parsed = [];
    let usedLocalParser = false;
    let expectedQuestionCount = 0;
    try {
      if (!state.apiConfigured) throw new Error("AI 키 없음");
      const response = await fetch("/api/parse-problem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI 분석 실패");
      parsed = Array.isArray(payload.result) ? payload.result : payload.result.questions || [];
      expectedQuestionCount = Number(payload.meta?.detectedQuestionCount) || 0;
      if (expectedQuestionCount > parsed.length) throw new Error("일부 문항 분석을 다시 확인합니다.");
    } catch {
      usedLocalParser = true;
      const lines = text.split(/\r?\n/);
      const starts = [];
      lines.forEach((line, index) => {
        const match = /^\s*(?:#{1,6}\s*)?(?:(?:제\s*)?(?:문제|문항)\s*(\d+)\s*번?|(?:question|problem|q)\s*(\d+)|(\d+)\s*번\s*(?:문제|문항))\s*[:.)\-]?\s*(.*)$/i.exec(line);
        if (match) starts.push({ index, number: match[1] || match[2] || match[3], title: match[4].trim() });
      });
      expectedQuestionCount = starts.length;
      const sections = starts.length ? starts.map((start, index) => ({ ...start, body: lines.slice(start.index + 1, starts[index + 1]?.index ?? lines.length).join("\n") })) : [{ number: "1", title: file.name.replace(/\.[^.]+$/, ""), body: text }];
      parsed = sections.map((section) => {
        const source = `${section.title}\n${section.body}`;
        const pointMatch = /(?:배점\s*[:：]?\s*)?(\d{1,3})\s*점/.exec(source);
        const functions = [...source.matchAll(/\b(?:function|def|void|int|public\s+\w+)\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);
        const complexities = [...new Set(source.match(/O\([^\n,;]*?\)/g) || [])];
        const points = Number(pointMatch?.[1]) || 10;
        const efficiencyPoints = complexities.length ? Math.round(points * 0.3) : 0;
        return { title: section.title || `문제 ${section.number}`, points, sourceQuestion: section.body.trim(), requirements: section.body.trim().slice(0, 3500), requiredFunctions: [...new Set(functions)], complexity: complexities.join(", "), efficiencyPoints, efficiencyCriteria: efficiencyPoints ? [`요구 복잡도 ${complexities.join(", ")} 충족 (${efficiencyPoints}점)`] : [], tests: /(?:테스트|입력|출력|예시)[^\n]*/gi.test(source) ? source.match(/(?:테스트|입력|출력|예시)[^\n]*/gi).join("\n") : "", testCases: [], reference: "" };
      });
    }
    const additions = parsed.map((question) => {
      const points = Number(question.points) || 10;
      const complexity = String(question.complexity || "");
      const hasEfficiencyPoints = question.efficiencyPoints != null && question.efficiencyPoints !== "" && Number.isFinite(Number(question.efficiencyPoints));
      const efficiencyPoints = Math.max(0, Math.min(points, hasEfficiencyPoints ? Number(question.efficiencyPoints) : (complexity ? Math.round(points * 0.3) : 0)));
      const efficiencyCriteria = Array.isArray(question.efficiencyCriteria) ? question.efficiencyCriteria.join("\n") : String(question.efficiencyCriteria || "");
      return {
        id: crypto.randomUUID(), title: question.title || "가져온 문항", points, sourceQuestion: String(question.sourceQuestion || question.prompt || ""),
        efficiencyPoints, efficiencyCriteria: efficiencyCriteria || (efficiencyPoints ? `${complexity || "문제에 필요한 알고리즘 복잡도"} 기준을 충족 (${efficiencyPoints}점)` : ""),
        requirements: Array.isArray(question.requirements) ? question.requirements.join("\n") : String(question.requirements || question.requirementsText || ""),
        functions: Array.isArray(question.requiredFunctions) ? question.requiredFunctions.join(", ") : String(question.requiredFunctions || ""), complexity,
        testCases: Array.isArray(question.testCases) ? question.testCases.map((testCase, index) => ({ name: String(testCase.name || `테스트 ${index + 1}`), input: String(testCase.input || ""), expectedOutput: String(testCase.expectedOutput || ""), hidden: testCase.hidden !== false })) : [],
        tests: typeof question.tests === "string" ? question.tests : JSON.stringify(question.tests || ""), reference: question.reference || "",
      };
    });
    if (!additions.length) throw new Error("문항을 찾지 못했습니다. 시험지 텍스트를 확인해 주세요.");
    if (expectedQuestionCount && additions.length < expectedQuestionCount) throw new Error(`PDF에서 ${expectedQuestionCount}개 문항 제목을 찾았지만 ${additions.length}개만 추출했습니다. 기존 설정은 유지했습니다. PDF의 문항 번호와 글자 추출 상태를 확인해 주세요.`);
    state.questions = additions;
    $("#exam-title").value = file.name.replace(/\.[^.]+$/, "") || "새 시험";
    renderQuestions();
    saveConfig();
    showToast(`${additions.length}개 문항과 채점 기준을 추출했습니다.${usedLocalParser ? " 로컬 기본 분석 결과이므로 내용을 확인해 주세요." : " 배점과 기준을 검토해 주세요."}`, "success");
  } catch (error) {
    showToast(error.message || "시험지를 분석하지 못했습니다.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "PDF 파일 선택";
    $("#exam-upload-zone").removeAttribute("aria-busy");
  }
}

const sourceExtensions = new Set(["js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "java", "cpp", "cc", "c", "h", "hpp", "cs", "go", "rs", "php", "rb", "swift", "kt", "html", "css", "txt", "ipynb"]);
function extensionOf(name) { return name.split(".").pop().toLowerCase(); }
function parseStudentFile(fileName, code, file) {
  const pattern = $("#filename-pattern").value.trim();
  const tokens = { "학번": "id", "이름": "name", "문항번호": "question", "확장자": "extension" };
  const matcher = /\{(학번|이름|문항번호|확장자)\}/g;
  const pathParts = fileName.replaceAll("\\", "/").split("/");
  const baseName = pathParts.at(-1).replace(/\.[^.]+$/, "");
  let expression = "^";
  let cursor = 0;
  const fields = [];
  let match;
  while ((match = matcher.exec(pattern))) {
    expression += pattern.slice(cursor, match.index).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expression += match[1] === "문항번호" ? "(\\d+)" : "([^/\\\\]+?)";
    fields.push(tokens[match[1]]);
    cursor = matcher.lastIndex;
  }
  expression += pattern.slice(cursor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let values = {};
  try {
    const found = new RegExp(expression, "i").exec(pathParts.at(-1));
    if (found) fields.forEach((field, index) => { values[field] = found[index + 1]; });
  } catch { /* Use the fallback naming convention if the custom pattern is malformed. */ }
  if (!values.id || !values.name) {
    const identityBase = baseName.replace(/[_-](?:(?:문제|problem|question|q)[\s_-]*\d+번?|\d+번?)(?:[_-].*)?$/i, "");
    const fallback = /^(\d+)[_-](.+)$/.exec(identityBase);
    if (fallback) values = { ...values, id: values.id || fallback[1], name: values.name || fallback[2] };
  }
  const marker = fileName.match(/(?:문제|problem|question|q)[\s_-]*(\d+)\s*번?/i);
  const suffix = /(?:^|[_-])(\d+)\s*번?$/.exec(baseName);
  const folderQuestion = pathParts.slice(0, -1).reverse().map((part) => /^(?:(?:문제|problem|question|q)[\s_-]*)?(\d+)\s*번?$/i.exec(part)?.[1]).find(Boolean);
  const questionNumber = Number(values.question || marker?.[1] || suffix?.[1] || folderQuestion);
  const studentId = String(values.id || baseName).trim();
  const studentName = String(values.name || "이름 미확인").trim();
  const questionIndex = Number.isInteger(questionNumber) && questionNumber > 0 ? questionNumber - 1 : null;
  return { id: studentId, name: studentName, questionNumber: Number.isInteger(questionNumber) && questionNumber > 0 ? questionNumber : null, questionIndex, fileName, code, size: file.size || new Blob([code]).size };
}

async function readSubmissionFiles(fileList) {
  const picked = [...fileList];
  if (!picked.length) return;
  const parsedFiles = [];
  try {
    for (const file of picked) {
      if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name} 파일이 50MB를 초과합니다.`);
      if (extensionOf(file.name) === "zip") {
        if (!window.JSZip) throw new Error("ZIP 읽기 도구를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        const archive = await window.JSZip.loadAsync(file);
        for (const [entryName, entry] of Object.entries(archive.files)) {
          if (entry.dir || !sourceExtensions.has(extensionOf(entryName))) continue;
          const code = await entry.async("string");
          parsedFiles.push(parseStudentFile(entryName, code, { size: new Blob([code]).size }));
        }
      } else if (sourceExtensions.has(extensionOf(file.name))) {
        parsedFiles.push(parseStudentFile(file.webkitRelativePath || file.name, await file.text(), file));
      }
    }
    if (!parsedFiles.length) throw new Error("지원하는 코드 파일을 찾지 못했습니다.");
    const grouped = new Map();
    let assignedByOrder = 0;
    for (const submission of parsedFiles) {
      const key = submission.id;
      if (!grouped.has(key)) grouped.set(key, { id: submission.id, name: submission.name, submissions: {}, files: [], unassignedFiles: [], assignedQuestions: new Set(), pendingFiles: [] });
      const student = grouped.get(key);
      student.name = student.name === "이름 미확인" ? submission.name : student.name;
      student.files.push(submission);
      if (submission.questionNumber && !state.questions[submission.questionIndex]) {
        student.unassignedFiles.push(submission);
        continue;
      }
      if (submission.questionIndex == null) {
        student.pendingFiles.push(submission);
        continue;
      }
      assignSubmission(student, submission, submission.questionIndex);
    }
    for (const student of grouped.values()) {
      student.pendingFiles.sort((a, b) => a.fileName.localeCompare(b.fileName, "ko", { numeric: true }));
      for (const submission of student.pendingFiles) {
        const nextQuestion = state.questions.findIndex((_, index) => !student.assignedQuestions.has(index));
        if (nextQuestion < 0) {
          student.unassignedFiles.push(submission);
          continue;
        }
        assignSubmission(student, submission, nextQuestion);
        assignedByOrder += 1;
      }
      delete student.pendingFiles;
      delete student.assignedQuestions;
    }
    state.students = [...grouped.values()].sort((a, b) => a.id.localeCompare(b.id, "ko", { numeric: true }));
    renderSubmissionFiles();
    $("#start-grading").disabled = !state.students.length || state.grading;
    $("#nav-submission-count").textContent = state.students.length;
    const unassignedCount = state.students.reduce((sum, student) => sum + student.unassignedFiles.length, 0);
    const unknownNameCount = state.students.filter((student) => student.name === "이름 미확인").length;
    const notes = [
      unknownNameCount ? `${unknownNameCount}명은 이름을 읽지 못해 파일명 패턴 확인이 필요합니다.` : "학번·이름을 분류했습니다.",
      assignedByOrder ? `문항 번호가 없는 ${assignedByOrder}개 파일은 남은 문항 순서로 배정했습니다.` : "",
      unassignedCount ? `${unassignedCount}개 파일은 문항을 찾지 못해 검토가 필요합니다.` : "",
    ].filter(Boolean).join(" ");
    showToast(`${parsedFiles.length}개 파일을 ${state.students.length}명에게 분류했습니다. ${notes}`, unknownNameCount || unassignedCount ? "error" : "success");
  } catch (error) {
    showToast(error.message || "제출 파일을 읽지 못했습니다.", "error");
  }
}

function assignSubmission(student, submission, questionIndex) {
  const question = state.questions[questionIndex];
  if (!question) return;
  submission.questionIndex = questionIndex;
  student.submissions[question.id] = [...(student.submissions[question.id] || []), submission];
  student.assignedQuestions.add(questionIndex);
}

function renderSubmissionFiles() {
  const files = state.students.flatMap((student) => student.files.map((file) => ({ ...file, studentName: student.name, unassigned: student.unassignedFiles.includes(file) })));
  $("#upload-count").textContent = `${files.length}개 파일 · ${state.students.length}명`;
  $("#file-list-count").textContent = `${files.length}개`;
  $("#submission-file-list").innerHTML = files.length ? files.map((file) => `
    <div class="submission-file"><span class="file-type-icon">${escapeHtml(extensionOf(file.fileName).slice(0, 4))}</span><span class="file-info"><strong>${escapeHtml(file.fileName)}</strong><small>${escapeHtml(file.studentName)} · ${(file.size / 1024).toFixed(1)} KB</small></span><span class="file-student-tag ${file.unassigned ? "unassigned" : ""}">${escapeHtml(file.id)} · ${file.unassigned || file.questionIndex == null ? "문항 확인" : `문제 ${file.questionIndex + 1}`}</span></div>`).join("") : '<div class="empty-files"><span>▤</span>업로드한 파일이 여기에 표시됩니다.</div>';
}

async function runWandboxTests(problem, files) {
  const testCases = Array.isArray(problem.testCases) ? problem.testCases : [];
  if (!testCases.length) return { tested: false, passed: 0, total: 0, results: [], error: "Wandbox 입출력 테스트가 설정되지 않았습니다." };
  try {
    const response = await fetch("/api/wandbox-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: files.map((file) => ({ fileName: file.fileName, code: file.code })), testCases }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Wandbox 실행에 실패했습니다.");
    return payload.result;
  } catch (error) {
    return { tested: false, passed: 0, total: testCases.length, results: [], error: error.message || "Wandbox에 연결하지 못했습니다." };
  }
}

function localEvaluation(problem, code, execution) {
  const points = Number(problem.points) || 0;
  const efficiencyMax = Math.max(0, Math.min(points, Number(problem.efficiencyPoints) || 0));
  const accuracyMax = points - efficiencyMax;
  const deductions = [];
  const required = String(problem.functions || "").split(/[,\n]/).map((part) => part.trim()).filter(Boolean);
  const missing = required.filter((name) => !new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(code));
  if (missing.length) deductions.push({ reason: `필수 함수 ${missing.join(", ")} 확인이 필요합니다.`, points: Math.min(problem.points * 0.3, missing.length * 3) });
  const reqWords = String(problem.requirements || "").split(/[\s,，。.!?、]+/).filter((word) => word.length >= 4);
  const presentWords = reqWords.filter((word) => code.toLowerCase().includes(word.toLowerCase()));
  const missingRatio = reqWords.length ? 1 - presentWords.length / reqWords.length : 0;
  if (reqWords.length && missingRatio > 0.8) deductions.push({ reason: "요구사항의 핵심 키워드가 코드에서 충분히 확인되지 않아 검토가 필요합니다.", points: Math.min(problem.points * 0.25, 5) });
  if (efficiencyMax > 0) deductions.push({ reason: "AI 연결이 되지 않아 시간·공간 복잡도를 평가하지 못했습니다.", points: efficiencyMax, category: "efficiency" });
  const accuracyDeductions = deductions.filter((item) => item.category !== "efficiency");
  const heuristicScore = Math.max(0, Math.min(accuracyMax, Math.round((accuracyMax - accuracyDeductions.reduce((sum, item) => sum + item.points, 0)) * 10) / 10));
  const testCap = execution?.tested && execution.total ? accuracyMax * execution.passed / execution.total : accuracyMax;
  const score = Math.round(Math.min(heuristicScore, testCap) * 10) / 10;
  if (execution?.tested && execution.passed < execution.total) deductions.push({ category: "accuracy", reason: `Wandbox 입출력 테스트 ${execution.total - execution.passed}개 실패`, points: Math.round((heuristicScore - score) * 10) / 10 });
  if (execution?.error) deductions.push({ category: "accuracy", reason: `Wandbox 테스트를 완료하지 못했습니다: ${execution.error}`, points: 0 });
  return { score, accuracyScore: score, efficiencyScore: 0, accuracy: "정확성은 함수명 기본 점검과 실제 Wandbox 테스트 결과를 사용했습니다. 세부 기준은 직접 확인해 주세요.", efficiency: "복잡도는 로컬에서 판별하지 않았습니다.", efficiencyDetails: { timeComplexity: "AI 분석 없음", spaceComplexity: "AI 분석 없음", comparison: `효율성 배점 ${efficiencyMax}점은 검토가 필요합니다.`, evidence: "복잡도 분석에는 코드 흐름 검토가 필요합니다." }, deductions: deductions.map((item) => ({ ...item, category: item.category || "accuracy" })), feedback: execution?.tested ? `Wandbox 테스트 ${execution.passed}/${execution.total}개 통과. AI 평가가 아니므로 결과를 검토해 주세요.` : `로컬 기본 점검 결과입니다. ${execution?.error || "Wandbox 테스트가 설정되지 않았습니다."}`, suggestion: "함수 단위 테스트와 시간·공간 복잡도를 직접 점검해 보세요.", execution, needsReview: true };
}

function rubricSpecs(text, maxPoints, fallbackLabel) {
  if (maxPoints <= 0) return [];
  const lines = String(text || "").split(/\r?\n/).map((line) => line.replace(/^\s*[•*\-]+\s*/, "").trim()).filter(Boolean);
  if (!lines.length) return [{ criterion: fallbackLabel, maxPoints }];
  const parsed = lines.map((line) => {
    const match = /(?:\((\d+(?:\.\d+)?)\s*점\)|(\d+(?:\.\d+)?)\s*점)\s*$/.exec(line);
    return { criterion: line.replace(/\s*(?:\(\d+(?:\.\d+)?\s*점\)|\d+(?:\.\d+)?\s*점)\s*$/, "").trim() || fallbackLabel, requestedPoints: match ? Number(match[1] || match[2]) : null };
  });
  const fixedTotal = parsed.reduce((sum, item) => sum + (item.requestedPoints || 0), 0);
  const flexible = parsed.filter((item) => item.requestedPoints == null);
  if (fixedTotal > maxPoints) {
    const scale = maxPoints / fixedTotal;
    parsed.forEach((item) => { item.maxPoints = item.requestedPoints == null ? 0 : item.requestedPoints * scale; });
  } else if (flexible.length) {
    const remaining = Math.max(0, maxPoints - fixedTotal);
    flexible.forEach((item) => { item.maxPoints = remaining / flexible.length; });
    parsed.forEach((item) => { if (item.maxPoints == null) item.maxPoints = item.requestedPoints || 0; });
  } else {
    parsed.forEach((item) => { item.maxPoints = item.requestedPoints || 0; });
    if (fixedTotal < maxPoints) parsed.at(-1).maxPoints += maxPoints - fixedTotal;
  }
  const specs = parsed.map((item) => ({ criterion: item.criterion, maxPoints: Math.round(item.maxPoints * 10) / 10 }));
  const roundingDifference = Math.round((maxPoints - specs.reduce((sum, item) => sum + item.maxPoints, 0)) * 10) / 10;
  specs.at(-1).maxPoints = Math.max(0, Math.round((specs.at(-1).maxPoints + roundingDifference) * 10) / 10);
  return specs;
}

function normalizeBreakdown(items, specs, fallbackScore) {
  if (!specs.length) return { rows: [], score: 0, needsReview: false };
  const hasRows = Array.isArray(items);
  const safeFallbackScore = Math.max(0, Math.min(specs.reduce((sum, item) => sum + item.maxPoints, 0), Number(fallbackScore) || 0));
  let remainingFallback = safeFallbackScore;
  const rows = specs.map((spec, index) => {
    const item = hasRows ? items[index] : null;
    const hasAward = item && Number.isFinite(Number(item.awardedPoints));
    const proportional = index === specs.length - 1 ? remainingFallback : Math.min(spec.maxPoints, safeFallbackScore * spec.maxPoints / specs.reduce((sum, entry) => sum + entry.maxPoints, 0));
    const awardedPoints = Math.round(Math.max(0, Math.min(spec.maxPoints, hasAward ? Number(item.awardedPoints) : (hasRows ? 0 : proportional))) * 10) / 10;
    remainingFallback = Math.max(0, remainingFallback - awardedPoints);
    return { criterion: spec.criterion, maxPoints: spec.maxPoints, awardedPoints, evidence: String(item?.evidence || "") };
  });
  const incomplete = !hasRows || items.length !== specs.length || rows.some((row, index) => !items[index] || !Number.isFinite(Number(items[index].awardedPoints)) || !row.evidence);
  return { rows, score: rows.reduce((sum, row) => sum + row.awardedPoints, 0), needsReview: incomplete };
}

function scaleBreakdown(rows, score) {
  const total = rows.reduce((sum, item) => sum + item.awardedPoints, 0);
  if (!rows.length || total <= score) return rows;
  let remaining = score;
  return rows.map((item, index) => {
    const awardedPoints = index === rows.length - 1 ? remaining : Math.round(item.awardedPoints * score / total * 10) / 10;
    remaining = Math.max(0, Math.round((remaining - awardedPoints) * 10) / 10);
    return { ...item, awardedPoints, evidence: `${item.evidence}${item.evidence ? " · " : ""}Wandbox 테스트 통과율 기준으로 조정` };
  });
}

function normalizeEvaluation(result, problem, execution) {
  const max = Number(problem.points) || 0;
  const efficiencyMax = Math.max(0, Math.min(max, Number(problem.efficiencyPoints) || 0));
  const accuracyMax = max - efficiencyMax;
  const details = typeof result.efficiency === "object" && result.efficiency ? result.efficiency : { summary: String(result.efficiency || "") };
  const requestedScore = Math.max(0, Math.min(max, Number(result.score) || 0));
  const accuracyFallback = Number.isFinite(Number(result.accuracyScore)) ? result.accuracyScore : (max ? requestedScore * accuracyMax / max : 0);
  const efficiencyFallback = Number.isFinite(Number(result.efficiencyScore)) ? result.efficiencyScore : requestedScore - accuracyFallback;
  const accuracyBreakdown = normalizeBreakdown(result.accuracyBreakdown, rubricSpecs(problem.requirements, accuracyMax, "정확성 기준"), accuracyFallback);
  const efficiencyBreakdown = normalizeBreakdown(result.efficiencyBreakdown, rubricSpecs(problem.efficiencyCriteria, efficiencyMax, "효율성 기준"), efficiencyFallback);
  const accuracyBeforeExecution = accuracyBreakdown.score;
  const testCap = execution?.tested && execution.total ? accuracyMax * execution.passed / execution.total : accuracyMax;
  const accuracyScore = Math.round(Math.min(accuracyBeforeExecution, testCap) * 10) / 10;
  accuracyBreakdown.rows = scaleBreakdown(accuracyBreakdown.rows, accuracyScore);
  const efficiencyScore = efficiencyBreakdown.score;
  const score = Math.max(0, Math.min(max, accuracyScore + efficiencyScore));
  const hasItemBreakdown = Array.isArray(result.accuracyBreakdown) || Array.isArray(result.efficiencyBreakdown);
  const deductions = hasItemBreakdown ? [
    ...accuracyBreakdown.rows.filter((item) => item.awardedPoints < item.maxPoints).map((item) => ({ category: "accuracy", reason: `${item.criterion}: ${item.evidence || "기준 충족 근거 부족"}`, points: Math.round((item.maxPoints - item.awardedPoints) * 10) / 10 })),
    ...efficiencyBreakdown.rows.filter((item) => item.awardedPoints < item.maxPoints).map((item) => ({ category: "efficiency", reason: `${item.criterion}: ${item.evidence || "복잡도 기준 미충족"}`, points: Math.round((item.maxPoints - item.awardedPoints) * 10) / 10 })),
  ] : (Array.isArray(result.deductions) ? result.deductions.map((item) => ({ category: String(item.category || ""), reason: String(item.reason || "감점"), points: Number(item.points) || 0 })) : []);
  if (execution?.tested && execution.passed < execution.total) deductions.push({ category: "accuracy", reason: `Wandbox 입출력 테스트 ${execution.total - execution.passed}개 실패`, points: Math.round((accuracyBeforeExecution - accuracyScore) * 10) / 10 });
  const efficiency = [details.timeComplexity && `시간: ${details.timeComplexity}`, details.spaceComplexity && `공간: ${details.spaceComplexity}`, details.comparison, details.evidence, details.summary].filter(Boolean).join("\n") || "효율성 분석 결과가 없습니다.";
  return { score, accuracyScore, efficiencyScore, accuracyBreakdown: accuracyBreakdown.rows, efficiencyBreakdown: efficiencyBreakdown.rows, accuracy: String(result.accuracy || "정확성 피드백이 없습니다."), efficiency, efficiencyDetails: { timeComplexity: String(details.timeComplexity || "분석 없음"), spaceComplexity: String(details.spaceComplexity || "분석 없음"), comparison: String(details.comparison || ""), evidence: String(details.evidence || ""), summary: String(details.summary || "") }, deductions, feedback: String(result.feedback || ""), suggestion: String(result.suggestion || ""), execution, needsReview: Boolean(result.needsReview) || accuracyBreakdown.needsReview || efficiencyBreakdown.needsReview || !execution?.tested || Boolean(execution?.error) };
}

async function gradeOne(problem, files) {
  const code = files.map((file) => `// File: ${file.fileName}\n${file.code}`).join("\n\n");
  const execution = await runWandboxTests(problem, files);
  if (!state.apiConfigured) return { evaluation: localEvaluation(problem, code, execution), code, files };
  try {
    const points = Number(problem.points) || 0;
    const efficiencyPoints = Math.max(0, Math.min(points, Number(problem.efficiencyPoints) || 0));
    const scoringProblem = { ...problem, accuracyScoringPlan: rubricSpecs(problem.requirements, points - efficiencyPoints, "정확성 기준"), efficiencyScoringPlan: rubricSpecs(problem.efficiencyCriteria, efficiencyPoints, "효율성 기준") };
    const response = await fetch("/api/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problem: scoringProblem, code, fileName: files.map((file) => file.fileName).join(", "), execution }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "AI 채점에 실패했습니다.");
    return { evaluation: normalizeEvaluation(payload.result, problem, execution), code, files };
  } catch (error) {
    const evaluation = localEvaluation(problem, code, execution);
    evaluation.feedback = `AI 채점 연결에 실패했습니다 (${error.message}). 로컬 기본 점검 결과로 표시합니다.`;
    return { evaluation, code, files };
  }
}

async function startGrading() {
  if (!state.students.length || !state.questions.length || state.grading) return;
  state.grading = true;
  const button = $("#start-grading");
  button.disabled = true;
  button.innerHTML = '<span class="button-spinner"></span> 채점 중…';
  $("#grading-progress").hidden = false;
  const tasks = state.students.flatMap((student) => state.questions.map((question) => ({ student, question })));
  let completed = 0;
  for (const { student, question } of tasks) {
    const files = student.submissions[question.id] || [];
    if (files.length) student.results ||= {}, student.results[question.id] = await gradeOne(question, files);
    else student.results ||= {}, student.results[question.id] = { evaluation: { score: 0, accuracyScore: 0, efficiencyScore: 0, accuracy: "해당 문항 제출 파일이 없습니다.", efficiency: "평가할 제출 코드가 없습니다.", efficiencyDetails: { timeComplexity: "평가할 코드 없음", spaceComplexity: "평가할 코드 없음", comparison: "", evidence: "" }, deductions: [{ category: "accuracy", reason: "문항 제출 누락", points: Math.max(0, (Number(question.points) || 0) - (Number(question.efficiencyPoints) || 0)) }, { category: "efficiency", reason: "문항 제출 누락으로 복잡도 분석 불가", points: Number(question.efficiencyPoints) || 0 }], feedback: "제출 파일이 없어 0점 처리되었습니다.", suggestion: "누락된 파일이 있는지 업로드 항목과 파일명 규칙을 확인해 주세요.", needsReview: true }, code: "", files: [] };
    completed += 1;
    const percent = Math.round(completed / tasks.length * 100);
    $("#progress-label").textContent = `${completed} / ${tasks.length}`;
    $("#progress-bar").style.width = `${percent}%`;
    $("#progress-detail").textContent = `${student.name} · ${question.title} 평가 중`;
  }
  state.grading = false;
  button.innerHTML = '채점 완료 · 결과 보기 <span>→</span>';
  button.disabled = false;
  renderDashboard();
  setTab("dashboard");
  showToast(`${state.students.length}명의 채점이 완료되었습니다.`, "success");
}

function studentTotal(student) {
  return state.questions.reduce((sum, question) => sum + (student.results?.[question.id]?.evaluation.score || 0), 0);
}

function studentTestStats(student) {
  const executions = state.questions.map((question) => student.results?.[question.id]?.evaluation.execution).filter((execution) => execution?.tested);
  return { passed: executions.reduce((sum, execution) => sum + execution.passed, 0), total: executions.reduce((sum, execution) => sum + execution.total, 0) };
}

function studentNeedsReview(student) {
  return Boolean(student.unassignedFiles?.length) || state.questions.some((question) => student.results?.[question.id]?.evaluation.needsReview);
}

function rankedStudents() {
  const sorted = [...state.students].sort((a, b) => studentTotal(b) - studentTotal(a) || studentTestStats(b).passed - studentTestStats(a).passed || a.id.localeCompare(b.id, "ko", { numeric: true }));
  let rank = 0;
  let previousTotal;
  let previousPassed;
  return sorted.map((student, index) => {
    const total = studentTotal(student);
    const passed = studentTestStats(student).passed;
    if (index === 0 || total !== previousTotal || passed !== previousPassed) rank = index + 1;
    previousTotal = total;
    previousPassed = passed;
    return { student, rank };
  });
}

function tieBreakReason(student, ranked) {
  const passed = studentTestStats(student).passed;
  const tied = ranked.filter(({ student: other }) => other.id !== student.id && studentTotal(other) === studentTotal(student));
  const hasMorePassed = tied.some(({ student: other }) => studentTestStats(other).passed > passed);
  const hasFewerPassed = tied.some(({ student: other }) => studentTestStats(other).passed < passed);
  if (!hasMorePassed && !hasFewerPassed) return "";
  if (hasMorePassed && hasFewerPassed) return "동점자 간 테스트 통과 수로 순위 결정";
  return hasMorePassed ? "동점자보다 테스트 통과 수가 적어 순위 조정" : "동점자보다 테스트를 더 통과해 상위 순위";
}

function awardForRank(rank) {
  let firstRank = 1;
  for (const award of state.awards) {
    const count = Math.max(0, Number(award.count) || 0);
    const lastRank = firstRank + count - 1;
    if (count > 0 && rank >= firstRank && rank <= lastRank) return award.name;
    firstRank = lastRank + 1;
  }
  return "";
}

function awardLabel(student, rank) {
  const award = awardForRank(rank);
  return award && studentNeedsReview(student) ? `${award} 후보` : award;
}

function renderAwardSettings() {
  const list = $("#award-rules");
  if (!list) return;
  list.innerHTML = state.awards.length ? state.awards.map((award, index) => `
    <div class="award-rule" data-award-id="${escapeHtml(award.id)}"><span class="award-order">${String(index + 1).padStart(2, "0")}</span><label><span>상 이름</span><input data-award-field="name" value="${escapeHtml(award.name)}" aria-label="상 이름" placeholder="예: 금상"/></label><label class="award-count-field"><span>인원</span><span class="award-count-input"><input data-award-field="count" type="number" min="0" max="500" value="${Math.max(0, Number(award.count) || 0)}" aria-label="${escapeHtml(award.name)} 수상 인원"/><small>명</small></span></label><button class="icon-delete" data-action="delete-award" aria-label="${escapeHtml(award.name)} 삭제">×</button></div>`).join("") : '<div class="empty-files">수상 기준이 없습니다. 상을 추가해 주세요.</div>';
}

function renderAwardResults() {
  const target = $("#award-results");
  if (!target) return;
  if (!state.students.length) {
    target.innerHTML = '<div class="award-empty">채점이 끝나면 등수에 따라 수상자가 자동으로 표시됩니다.</div>';
    return;
  }
  let firstRank = 1;
  target.innerHTML = state.awards.map((award, index) => {
    const startRank = firstRank;
    const count = Math.max(0, Number(award.count) || 0);
    const lastRank = firstRank + count - 1;
    const recipients = rankedStudents().filter(({ rank }) => count > 0 && rank >= firstRank && rank <= lastRank);
    firstRank = lastRank + 1;
    return `<article class="award-result-card award-tone-${index % 3}"><div class="award-result-head"><span class="award-medal">${index < 3 ? ["01", "02", "03"][index] : String(index + 1).padStart(2, "0")}</span><span><strong>${escapeHtml(award.name || "이름 없는 상")}</strong><small>${count ? `${startRank}~${lastRank}위 구간 · ${count}명 배정` : "인원 미배정"}</small></span><b>${recipients.length}명</b></div>${recipients.length ? `<div class="award-recipient-list">${recipients.map(({ student, rank }) => `<div class="award-recipient"><span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.id)} · ${rank}위 · ${studentTotal(student)}점</small></span><em class="${studentNeedsReview(student) ? "provisional" : ""}">${studentNeedsReview(student) ? "검토 후 확정" : "수상"}</em></div>`).join("")}</div>` : '<div class="award-empty">현재 기준에 해당하는 학생이 없습니다.</div>'}</article>`;
  }).join("");
}

function renderDashboard() {
  const head = $("#results-head");
  const body = $("#results-body");
  const questions = state.questions;
  head.innerHTML = `<tr><th>등수</th><th>수상</th><th>학생 정보</th><th>Wandbox 테스트</th>${questions.map((q, i) => `<th>문제 ${i + 1} <span>· ${Number(q.points) || 0}점</span></th>`).join("")}<th>총점</th><th>채점 상태</th><th></th></tr>`;
  const query = $("#result-search").value.trim().toLowerCase();
  const filter = $("#status-filter").value;
  const ranking = rankedStudents();
  const filtered = ranking.filter(({ student }) => {
    const matchesQuery = `${student.id} ${student.name}`.toLowerCase().includes(query);
    const status = studentNeedsReview(student) ? "검토 필요" : "완료";
    return matchesQuery && (filter === "all" || filter === status);
  });
  body.innerHTML = filtered.length ? filtered.map(({ student, rank }) => {
    const total = studentTotal(student);
    const status = studentNeedsReview(student) ? "검토 필요" : "완료";
    const review = status === "검토 필요";
    const award = awardLabel(student, rank);
    const testStats = studentTestStats(student);
    const tieReason = tieBreakReason(student, ranking);
    return `<tr><td><span class="rank-badge rank-${Math.min(rank, 3)}">${rank}위</span>${tieReason ? `<small class="rank-tie-reason">${escapeHtml(tieReason)}</small>` : ""}</td><td>${award ? `<span class="award-pill">${escapeHtml(award)}</span>` : "—"}</td><td><div class="student-cell"><span class="student-mini-avatar">${escapeHtml(student.name.slice(0, 1))}</span><span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.id)}</small></span></div></td><td><span class="test-pass-count">${testStats.total ? `${testStats.passed} / ${testStats.total}` : "미설정"}</span></td>${questions.map((question) => { const score = student.results?.[question.id]?.evaluation.score; return `<td><button class="score-link" data-student-id="${escapeHtml(student.id)}" aria-label="${escapeHtml(student.name)} ${escapeHtml(question.title)} 상세 결과">${score == null ? "—" : `${score}<span> / ${Number(question.points) || 0}</span>`}</button></td>`; }).join("")}<td><span class="total-score">${total.toFixed(total % 1 ? 1 : 0)} <span>/ ${questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)}</span></td><td><span class="status-pill ${review ? "review" : "complete"}"><i></i>${status}</span></td><td><button class="detail-button" data-detail-id="${escapeHtml(student.id)}">상세 보기 →</button></td></tr>`;
  }).join("") : `<tr><td class="empty-results" colspan="${questions.length + 7}">${state.students.length ? "검색 조건에 맞는 결과가 없습니다." : "아직 채점된 결과가 없습니다. 제출물을 업로드하고 채점을 시작해 주세요."}</td></tr>`;
  const totals = state.students.map(studentTotal);
  const overallAverage = state.students.length ? totals.reduce((a, b) => a + b, 0) / state.students.length : null;
  $("#stat-complete").innerHTML = `${state.students.length}<span>명</span>`;
  $("#stat-average").innerHTML = `${overallAverage == null ? "—" : overallAverage.toFixed(1)}<span>점</span>`;
  $("#stat-high").innerHTML = `${totals.length ? Math.max(...totals).toFixed(Math.max(...totals) % 1 ? 1 : 0) : "—"}<span>점</span>`;
  $("#stat-review").innerHTML = `${state.students.filter(studentNeedsReview).length}<span>건</span>`;
  $("#results-subtitle").textContent = `${state.students.length}명 · ${questions.length}개 문항 · 총 ${questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)}점`;
  $("#table-count").textContent = `총 ${filtered.length}명`;
  renderAwardResults();
}

function highlightCode(code) {
  const tokenPattern = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|class|new|import|from|export|def|print|in|range|True|False|None|public|static|void|int|string|boolean|double|package|return|this|async|await|try|catch|throw)\b|\b\d+(?:\.\d+)?\b)/g;
  let html = "";
  let last = 0;
  for (const match of code.matchAll(tokenPattern)) {
    html += escapeHtml(code.slice(last, match.index));
    const token = match[0];
    const cls = /^(\/\/|#|\/\*)/.test(token) ? "code-comment" : /^["'`]/.test(token) ? "code-string" : /^\d/.test(token) ? "code-number" : "code-keyword";
    html += `<span class="${cls}">${escapeHtml(token)}</span>`;
    last = match.index + token.length;
  }
  return html + escapeHtml(code.slice(last));
}

function openReport(student) {
  const place = rankedStudents().find((entry) => entry.student.id === student.id)?.rank || "—";
  const award = awardLabel(student, place);
  $("#modal-student").innerHTML = `<span class="student-mini-avatar">${escapeHtml(student.name.slice(0, 1))}</span><span><strong>${escapeHtml(student.name)} <small style="display:inline;font:9px var(--mono);color:#999">${escapeHtml(student.id)}</small></strong><small>${escapeHtml($("#exam-title").value)} · ${place}위${award ? ` · ${escapeHtml(award)}` : ""} · 총점 ${studentTotal(student)}점</small></span>`;
  const unassignedNote = student.unassignedFiles?.length ? `<div class="report-alert">문항 번호를 확인하지 못한 파일입니다: ${student.unassignedFiles.map((file) => escapeHtml(file.fileName)).join(", ")}</div>` : "";
  $("#report-content").innerHTML = unassignedNote + state.questions.map((question, index) => {
    const item = student.results?.[question.id] || { evaluation: { score: 0, accuracy: "평가 결과가 없습니다.", efficiency: "평가 결과가 없습니다.", deductions: [], feedback: "", suggestion: "" }, code: "", files: [] };
    const evaluation = item.evaluation;
    const accuracyMax = Math.max(0, (Number(question.points) || 0) - (Number(question.efficiencyPoints) || 0));
    const efficiencyDetails = evaluation.efficiencyDetails || {};
    const renderBreakdown = (rows) => Array.isArray(rows) && rows.length ? `<div class="criterion-breakdown">${rows.map((row) => `<div class="criterion-row"><span><strong>${escapeHtml(row.criterion)}</strong><small>${escapeHtml(row.evidence || "평가 근거 없음")}</small></span><b>${row.awardedPoints} / ${row.maxPoints}점</b></div>`).join("")}</div>` : '<div class="breakdown-warning">항목별 점수 근거가 없어 검토가 필요합니다.</div>';
    const execution = evaluation.execution;
    const executionReport = execution?.tested ? `<div class="execution-results"><div class="execution-results-head"><strong>Wandbox 테스트</strong><span>${execution.passed} / ${execution.total} 통과</span></div>${execution.results.map((testCase, testIndex) => `<div class="execution-case"><div><strong>${escapeHtml(testCase.name || `테스트 ${testIndex + 1}`)}</strong><span class="${testCase.passed ? "test-pass" : "test-fail"}">${testCase.passed ? "통과" : "실패"}</span></div><small>입력: ${escapeHtml(testCase.input || "(빈 입력)")}</small><small>기대 출력: ${escapeHtml(testCase.expectedOutput || "(빈 출력)")}</small><small>실제 출력: ${escapeHtml(testCase.actualOutput || "(빈 출력)")}</small>${testCase.error ? `<small class="test-error">${escapeHtml(testCase.error)}</small>` : ""}</div>`).join("")}</div>` : `<div class="execution-warning">${escapeHtml(execution?.error || "Wandbox 테스트 미설정")} ${execution?.error ? "" : "표준 입출력 테스트를 추가해야 실행 채점이 가능합니다."}</div>`;
    const deductions = evaluation.deductions.length ? `<ul class="deduction-list">${evaluation.deductions.map((deduction) => `<li>${deduction.category ? `[${deduction.category === "efficiency" ? "효율성" : "정확성"}] ` : ""}${escapeHtml(deduction.reason)}${deduction.points ? ` · ${deduction.points}점 감점` : ""}</li>`).join("")}</ul>` : "";
    const code = item.code ? `<details class="code-details"><summary>제출 코드 보기 · ${item.files.map((file) => escapeHtml(file.fileName.split("/").pop())).join(", ")}</summary><pre class="code-block"><code>${highlightCode(item.code)}</code></pre></details>` : '<details class="code-details"><summary>제출 코드 보기</summary><div class="empty-files">제출 코드가 없습니다.</div></details>';
    const suggestion = evaluation.suggestion ? `<div class="suggestion"><strong>개선 제안</strong><p>${escapeHtml(evaluation.suggestion)}</p></div>` : "";
    return `<article class="report-question"><header class="report-question-head"><h3>문제 ${index + 1} · ${escapeHtml(question.title)}</h3><span class="report-score"><strong>${evaluation.score}</strong> / ${Number(question.points) || 0}점</span></header>${executionReport}<div class="report-grid"><div class="report-metric"><strong>정확성 · ${evaluation.accuracyScore ?? evaluation.score} / ${accuracyMax}점</strong><p>${escapeHtml(evaluation.accuracy)}${evaluation.feedback ? `<br>${escapeHtml(evaluation.feedback)}` : ""}</p>${renderBreakdown(evaluation.accuracyBreakdown)}</div><div class="report-metric efficiency-metric"><strong>효율성 · ${evaluation.efficiencyScore ?? 0} / ${Number(question.efficiencyPoints) || 0}점</strong><p><b>시간</b> ${escapeHtml(efficiencyDetails.timeComplexity || "복잡도 근거 없음")}<br><b>공간</b> ${escapeHtml(efficiencyDetails.spaceComplexity || "복잡도 근거 없음")}${efficiencyDetails.comparison ? `<br><b>기준 비교</b> ${escapeHtml(efficiencyDetails.comparison)}` : ""}${efficiencyDetails.evidence ? `<br><b>코드 근거</b> ${escapeHtml(efficiencyDetails.evidence)}` : ""}</p>${renderBreakdown(evaluation.efficiencyBreakdown)}</div></div>${deductions}${suggestion}${code}</article>`;
  }).join("");
  $("#report-modal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeReport() { $("#report-modal").hidden = true; document.body.style.overflow = ""; }

function exportCsv() {
  if (!state.students.length) { showToast("내보낼 채점 결과가 아직 없습니다.", "error"); return; }
  const headers = ["등수", "수상", "학번", "이름", ...state.questions.flatMap((question, index) => [`문제 ${index + 1} 점수`, `문제 ${index + 1} 정확성`, `문제 ${index + 1} 효율성`, `문제 ${index + 1} 테스트`, `문제 ${index + 1} 피드백`]), "통과 테스트", "총 테스트", "총점", "채점 상태"];
  const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = rankedStudents().map(({ student, rank }) => [rank, awardLabel(student, rank), student.id, student.name, ...state.questions.flatMap((question) => {
    const result = student.results?.[question.id]?.evaluation;
    const lineItems = [...(result?.accuracyBreakdown || []), ...(result?.efficiencyBreakdown || [])].map((item) => `${item.criterion}: ${item.awardedPoints}/${item.maxPoints}점 (${item.evidence})`);
    const execution = result?.execution;
    const testDetails = (execution?.results || []).map((testCase) => `${testCase.name}: ${testCase.passed ? "통과" : "실패"} (예상 ${testCase.expectedOutput} / 실제 ${testCase.actualOutput})`);
    return [result?.score ?? 0, result?.accuracyScore ?? result?.score ?? 0, result?.efficiencyScore ?? 0, execution?.tested ? `${execution.passed}/${execution.total}` : "미설정", [result?.feedback, result?.accuracy, result?.efficiency, ...lineItems, ...testDetails, ...(result?.deductions || []).map((item) => item.reason)].filter(Boolean).join(" | ")];
  }), studentTestStats(student).passed, studentTestStats(student).total, studentTotal(student), studentNeedsReview(student) ? "검토 필요" : "완료"]);
  const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `${($("#exam-title").value || "채점결과").replace(/[\\/:*?"<>|]/g, "_")}_성적표.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("문항별 점수와 피드백을 CSV로 내보냈습니다.", "success");
}

function exportXlsx() {
  if (!state.students.length) { showToast("내보낼 채점 결과가 아직 없습니다.", "error"); return; }
  if (!window.XLSX) { showToast("Excel 내보내기 도구를 불러오지 못했습니다. CSV로 다운로드해 주세요.", "error"); return; }
  const workbook = XLSX.utils.book_new();
  const ranked = rankedStudents();
  const scoreRows = [["등수", "수상", "학번", "이름", ...state.questions.flatMap((question, index) => [`문제 ${index + 1} 총점 (${question.points}점)`, `정확성 (${Math.max(0, (Number(question.points) || 0) - (Number(question.efficiencyPoints) || 0))}점)`, `효율성 (${Number(question.efficiencyPoints) || 0}점)`, `문제 ${index + 1} 테스트 통과`]), "통과 테스트", "총 테스트", "총점", "채점 상태"]];
  for (const { student, rank } of ranked) {
    scoreRows.push([rank, awardLabel(student, rank), student.id, student.name, ...state.questions.flatMap((question) => {
      const evaluation = student.results?.[question.id]?.evaluation;
      return [evaluation?.score ?? 0, evaluation?.accuracyScore ?? evaluation?.score ?? 0, evaluation?.efficiencyScore ?? 0, evaluation?.execution?.tested ? `${evaluation.execution.passed}/${evaluation.execution.total}` : "미설정"];
    }), studentTestStats(student).passed, studentTestStats(student).total, studentTotal(student), studentNeedsReview(student) ? "검토 필요" : "완료"]);
  }
  const feedbackRows = [["등수", "수상", "학번", "이름", "문항", "총점", "만점", "Wandbox 테스트", "테스트별 실행 결과", "정확성 점수", "정확성 만점", "효율성 점수", "효율성 만점", "정확성 항목별 점수·근거", "효율성 항목별 점수·근거", "추론 시간 복잡도", "추론 공간 복잡도", "기준 비교", "코드 근거", "정확성 피드백", "종합 피드백", "감점 사유", "개선 제안", "제출 파일"]];
  for (const { student, rank } of ranked) {
    for (const [index, question] of state.questions.entries()) {
      const result = student.results?.[question.id];
      const evaluation = result?.evaluation;
      feedbackRows.push([
        rank,
        awardLabel(student, rank),
        student.id,
        student.name,
        `문제 ${index + 1} · ${question.title}`,
        evaluation?.score ?? 0,
        Number(question.points) || 0,
        evaluation?.execution?.tested ? `${evaluation.execution.passed}/${evaluation.execution.total}` : "미설정",
        (evaluation?.execution?.results || []).map((testCase) => `${testCase.name}: ${testCase.passed ? "통과" : "실패"}; 예상 ${testCase.expectedOutput}; 실제 ${testCase.actualOutput}${testCase.error ? `; 오류 ${testCase.error}` : ""}`).join("\n"),
        evaluation?.accuracyScore ?? evaluation?.score ?? 0,
        Math.max(0, (Number(question.points) || 0) - (Number(question.efficiencyPoints) || 0)),
        evaluation?.efficiencyScore ?? 0,
        Number(question.efficiencyPoints) || 0,
        (evaluation?.accuracyBreakdown || []).map((item) => `${item.criterion}: ${item.awardedPoints}/${item.maxPoints}점 - ${item.evidence}`).join("\n"),
        (evaluation?.efficiencyBreakdown || []).map((item) => `${item.criterion}: ${item.awardedPoints}/${item.maxPoints}점 - ${item.evidence}`).join("\n"),
        evaluation?.efficiencyDetails?.timeComplexity || "",
        evaluation?.efficiencyDetails?.spaceComplexity || "",
        evaluation?.efficiencyDetails?.comparison || "",
        evaluation?.efficiencyDetails?.evidence || "",
        evaluation?.accuracy || "",
        evaluation?.feedback || "",
        (evaluation?.deductions || []).map((item) => `${item.reason}${item.points ? ` (${item.points}점)` : ""}`).join("\n"),
        evaluation?.suggestion || "",
        (result?.files || []).map((file) => file.fileName.split("/").pop()).join(", "),
      ]);
    }
  }
  const rubricRows = [["문항", "총점", "정확성 배점", "효율성 배점", "정확성 기준", "효율성 기준", "필수 함수", "복잡도 기준", "테스트 케이스", "정답 예시·추가 기준"]];
  for (const [index, question] of state.questions.entries()) {
    rubricRows.push([`문제 ${index + 1} · ${question.title}`, Number(question.points) || 0, Math.max(0, (Number(question.points) || 0) - (Number(question.efficiencyPoints) || 0)), Number(question.efficiencyPoints) || 0, question.requirements, question.efficiencyCriteria, question.functions, question.complexity, [question.tests, ...(question.testCases || []).map((testCase) => `${testCase.name}: ${testCase.input} => ${testCase.expectedOutput}`)].filter(Boolean).join("\n"), question.reference]);
  }
  const addSheet = (name, rows) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = rows[0].map((_, columnIndex) => ({ wch: Math.min(48, Math.max(12, ...rows.slice(0, 80).map((row) => String(row[columnIndex] ?? "").length + 2))) }));
    if (rows.length > 1) sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: rows[0].length - 1 } }) };
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  };
  addSheet("성적표", scoreRows);
  addSheet("문항별 피드백", feedbackRows);
  addSheet("채점 기준", rubricRows);
  const filename = `${($("#exam-title").value || "채점결과").replace(/[\\/:*?"<>|]/g, "_")}_채점결과.xlsx`;
  XLSX.writeFile(workbook, filename, { compression: true });
  showToast("성적표·문항별 피드백·채점 기준을 Excel 파일로 저장했습니다.", "success");
}

$("#question-list").addEventListener("input", (event) => {
  const testField = event.target.dataset.testField;
  const testRow = event.target.closest("[data-test-index]");
  const card = event.target.closest("[data-question-id]");
  if (testField && testRow && card) {
    const question = state.questions.find((item) => item.id === card.dataset.questionId);
    const testCase = question?.testCases?.[Number(testRow.dataset.testIndex)];
    if (testCase) {
      testCase[testField] = event.target.value;
      saveConfig();
    }
    return;
  }
  const field = event.target.dataset.field;
  if (!field || !card) return;
  const question = state.questions.find((item) => item.id === card.dataset.questionId);
  if (!question) return;
  if (field === "points" || field === "efficiencyPoints") {
    question[field] = Math.max(0, Number(event.target.value) || 0);
    if (field === "points") {
      question.efficiencyPoints = Math.min(question.efficiencyPoints, question.points);
      const efficiencyInput = card.querySelector('[data-field="efficiencyPoints"]');
      if (efficiencyInput) efficiencyInput.value = question.efficiencyPoints;
    } else {
      question.efficiencyPoints = Math.min(question.efficiencyPoints, Number(question.points) || 0);
      event.target.value = question.efficiencyPoints;
    }
  } else question[field] = event.target.value;
  saveConfig();
});
$("#question-list").addEventListener("click", (event) => {
  const testButton = event.target.closest('[data-action="add-testcase"], [data-action="delete-testcase"]');
  if (testButton) {
    const card = testButton.closest("[data-question-id]");
    const question = state.questions.find((item) => item.id === card?.dataset.questionId);
    if (!question) return;
    const questionId = question.id;
    question.testCases ||= [];
    if (testButton.dataset.action === "add-testcase" && question.testCases.length >= 12) {
      showToast("Wandbox 실행은 문항당 테스트 12개까지 지원합니다.", "error");
      return;
    }
    if (testButton.dataset.action === "add-testcase") question.testCases.push({ name: `테스트 ${question.testCases.length + 1}`, input: "", expectedOutput: "", hidden: true });
    else question.testCases.splice(Number(testButton.closest("[data-test-index]").dataset.testIndex), 1);
    renderQuestions();
    saveConfig();
    if (testButton.dataset.action === "add-testcase") [...$("#question-list").querySelectorAll("[data-question-id]")].find((item) => item.dataset.questionId === questionId)?.querySelector("[data-test-index]:last-child [data-test-field='input']")?.focus();
    return;
  }
  const button = event.target.closest('[data-action="delete-question"]');
  if (!button) return;
  const id = button.closest("[data-question-id]").dataset.questionId;
  state.questions = state.questions.filter((question) => question.id !== id);
  renderQuestions();
  saveConfig();
});
$("#award-rules").addEventListener("input", (event) => {
  const field = event.target.dataset.awardField;
  const row = event.target.closest("[data-award-id]");
  if (!field || !row) return;
  const award = state.awards.find((item) => item.id === row.dataset.awardId);
  if (!award) return;
  award[field] = field === "count" ? Math.max(0, Math.min(500, Number.parseInt(event.target.value, 10) || 0)) : event.target.value;
  if (field === "count") event.target.value = award.count;
  saveConfig();
  renderDashboard();
});
$("#award-rules").addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="delete-award"]');
  if (!button) return;
  const id = button.closest("[data-award-id]").dataset.awardId;
  state.awards = state.awards.filter((award) => award.id !== id);
  renderAwardSettings();
  saveConfig();
  renderDashboard();
});
$("#add-award").addEventListener("click", () => {
  state.awards.push({ id: crypto.randomUUID(), name: "특별상", count: 1 });
  renderAwardSettings();
  saveConfig();
  renderDashboard();
  $('#award-rules .award-rule:last-child [data-award-field="name"]').focus();
});
$("#add-question").addEventListener("click", () => {
  state.questions.push({ id: crypto.randomUUID(), title: `문제 ${state.questions.length + 1}`, points: 10, efficiencyPoints: 3, efficiencyCriteria: "", requirements: "", functions: "", complexity: "", tests: "", testCases: [], reference: "" });
  renderQuestions();
  saveConfig();
  $("#question-list .question-card:last-child .question-title").focus();
});
$("#exam-title").addEventListener("input", saveConfig);
$("#filename-pattern").addEventListener("input", saveConfig);
$("#select-exam-file").addEventListener("click", () => $("#exam-file").click());
$("#exam-upload-zone").addEventListener("click", (event) => {
  if (!event.target.closest("button") && !$("#exam-upload-zone").hasAttribute("aria-busy")) $("#exam-file").click();
});
$("#exam-file").addEventListener("change", async (event) => { const file = event.target.files[0]; if (file) await parseExamFile(file); event.target.value = ""; });
$("#exam-upload-zone").addEventListener("dragover", (event) => { event.preventDefault(); $("#exam-upload-zone").style.background = "#f3f1ff"; });
$("#exam-upload-zone").addEventListener("dragleave", () => { $("#exam-upload-zone").style.background = ""; });
$("#exam-upload-zone").addEventListener("drop", async (event) => { event.preventDefault(); $("#exam-upload-zone").style.background = ""; const file = event.dataTransfer.files[0]; if (file) await parseExamFile(file); });
$("#choose-submissions").addEventListener("click", () => $("#submission-files").click());
$("#choose-folder").addEventListener("click", () => $("#submission-folder").click());
$("#load-sample-submissions").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "샘플 불러오는 중...";
  try {
    const response = await fetch("/sample-submissions.zip");
    if (!response.ok) throw new Error("샘플 코드 파일을 불러오지 못했습니다.");
    const archive = await response.blob();
    await readSubmissionFiles([new File([archive], "sample-submissions.zip", { type: "application/zip" })]);
  } catch (error) {
    showToast(error.message || "샘플 코드 파일을 불러오지 못했습니다.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "샘플 코드 불러오기";
  }
});
$("#submission-files").addEventListener("change", async (event) => { await readSubmissionFiles(event.target.files); event.target.value = ""; });
$("#submission-folder").addEventListener("change", async (event) => { await readSubmissionFiles(event.target.files); event.target.value = ""; });
const dropzone = $("#submission-dropzone");
dropzone.addEventListener("dragover", (event) => { event.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", (event) => { if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove("dragover"); });
dropzone.addEventListener("drop", async (event) => { event.preventDefault(); dropzone.classList.remove("dragover"); await readSubmissionFiles(event.dataTransfer.files); });
$("#clear-submissions").addEventListener("click", () => {
  state.students = [];
  $("#start-grading").disabled = true;
  $("#nav-submission-count").textContent = "0";
  $("#grading-progress").hidden = true;
  $("#start-grading").innerHTML = '일괄 채점 시작 <span>→</span>';
  renderSubmissionFiles();
  renderDashboard();
});
$("#start-grading").addEventListener("click", startGrading);
$("#result-search").addEventListener("input", renderDashboard);
$("#status-filter").addEventListener("change", renderDashboard);
$("#results-body").addEventListener("click", (event) => {
  const button = event.target.closest("[data-detail-id], [data-student-id]");
  if (!button) return;
  const student = state.students.find((item) => item.id === (button.dataset.detailId || button.dataset.studentId));
  if (student) openReport(student);
});
$("#close-report").addEventListener("click", closeReport);
$("#report-modal").addEventListener("click", (event) => { if (event.target === $("#report-modal")) closeReport(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#report-modal").hidden) closeReport(); });
$("#export-csv").addEventListener("click", exportCsv);
$("#export-xlsx").addEventListener("click", exportXlsx);
$("#api-help").addEventListener("click", () => showToast("Gemini 키는 서버에서만 보관합니다. 첫 채점 요청에서 API 키 권한도 확인됩니다."));
$("#rubric-tip").addEventListener("click", () => showToast("효율성 배점을 별도로 정하고, 기대 시간·공간 복잡도와 대안 알고리즘의 감점 기준을 적어보세요."));
$("#footer-help").addEventListener("click", (event) => { event.preventDefault(); showToast("먼저 문항 기준을 확인하고, 제출 파일을 올린 뒤 채점을 시작하세요."); });
$("#reset-demo").addEventListener("click", () => {
  $("#exam-title").value = "알고리즘 실기 평가";
  $("#filename-pattern").value = "{학번}_{이름}_문제{문항번호}.{확장자}";
  state.questions = structuredClone(defaultQuestions).map((question) => ({ ...question, id: crypto.randomUUID() }));
  state.awards = structuredClone(defaultAwards).map((award) => ({ ...award, id: crypto.randomUUID() }));
  renderAwardSettings();
  renderQuestions(); saveConfig(); showToast("샘플 채점 기준을 불러왔습니다.", "success");
});
$$('[data-tab]').forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
$$('[data-go]').forEach((button) => button.addEventListener("click", () => setTab(button.dataset.go)));

loadConfig();
checkApiStatus();
