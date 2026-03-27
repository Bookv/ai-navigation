import {
  detectMode,
  requireAuth,
  normalizeConfig,
  sanitizeConfig,
  loadConfig,
  saveConfig,
  initNav
} from "./lib.js";

const $ = (id) => document.getElementById(id);

const ui = {
  modeBadge: $("mode-badge"),
  statusText: $("status-text"),
  noticePanel: $("notice-panel"),
  noticeText: $("notice-text"),
  engineList: $("engine-list"),
  engineAdd: $("engine-add"),
  saveBtn: $("save-btn")
};

const state = {
  mode: "local",
  isDefault: false,
  draft: null,
  dirty: false
};

const showNotice = (text) => {
  ui.noticeText.textContent = text;
  ui.noticePanel.hidden = !text;
};

const setStatus = (text) => {
  ui.statusText.textContent = text;
};

const setDirty = (value) => {
  state.dirty = value;
  ui.saveBtn.disabled = !value;
  if (value) {
    setStatus("有未保存的修改");
  }
};

const beforeUnload = (event) => {
  if (!state.dirty) return;
  event.preventDefault();
  event.returnValue = "";
};

const swap = (list, from, to) => {
  if (to < 0 || to >= list.length) return;
  const copy = list[from];
  list[from] = list[to];
  list[to] = copy;
  setDirty(true);
};

const createActionButton = (label, onClick, className = "ghost") => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.className = className;
  btn.addEventListener("click", onClick);
  return btn;
};

const updateEngineHint = (input, hint) => {
  if (!input.value.trim()) {
    input.classList.remove("warning");
    hint.textContent = "";
    return;
  }

  if (!input.value.includes("{query}")) {
    input.classList.add("warning");
    hint.textContent = "URL 需要包含 {query}";
  } else {
    input.classList.remove("warning");
    hint.textContent = "";
  }
};

const renderEngines = () => {
  ui.engineList.innerHTML = "";
  state.draft.searchEngines.forEach((engine, index) => {
    const row = document.createElement("div");
    row.className = "list-row";

    const nameField = document.createElement("input");
    nameField.type = "text";
    nameField.placeholder = "引擎名称";
    nameField.value = engine.name ?? "";
    nameField.addEventListener("input", () => {
      engine.name = nameField.value;
      setDirty(true);
    });

    const urlWrap = document.createElement("div");
    urlWrap.className = "field";

    const urlField = document.createElement("input");
    urlField.type = "text";
    urlField.placeholder = "搜索 URL（包含 {query}）";
    urlField.value = engine.url ?? "";
    const hint = document.createElement("div");
    hint.className = "helper-text";

    urlField.addEventListener("input", () => {
      engine.url = urlField.value;
      updateEngineHint(urlField, hint);
      setDirty(true);
    });

    updateEngineHint(urlField, hint);
    urlWrap.appendChild(urlField);
    urlWrap.appendChild(hint);

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.appendChild(
      createActionButton("上移", () => {
        swap(state.draft.searchEngines, index, index - 1);
        renderEngines();
      })
    );
    actions.appendChild(
      createActionButton("下移", () => {
        swap(state.draft.searchEngines, index, index + 1);
        renderEngines();
      })
    );
    actions.appendChild(
      createActionButton("删除", () => {
        if (!confirm("确认删除该搜索引擎？")) return;
        state.draft.searchEngines.splice(index, 1);
        renderEngines();
        setDirty(true);
      })
    );

    row.appendChild(nameField);
    row.appendChild(urlWrap);
    row.appendChild(actions);
    ui.engineList.appendChild(row);
  });

  if (!state.draft.searchEngines.length) {
    const empty = document.createElement("div");
    empty.className = "helper-text";
    empty.textContent = "暂无搜索引擎，点击“添加引擎”开始。";
    ui.engineList.appendChild(empty);
  }
};

const validate = () => {
  let ok = true;
  const errors = [];

  state.draft.searchEngines.forEach((engine, idx) => {
    const name = engine.name?.trim();
    const url = engine.url?.trim();
    if (!name || !url) {
      ok = false;
      errors.push(`第 ${idx + 1} 个引擎未填写完整`);
    }
    if (url && !url.includes("{query}")) {
      ok = false;
      errors.push(`第 ${idx + 1} 个引擎 URL 缺少 {query}`);
    }
  });

  if (!ok) {
    showNotice(errors[0]);
  }

  return ok;
};

const loadAndRender = async () => {
  const config = await loadConfig(state.mode);
  state.draft = normalizeConfig(config);
  renderEngines();
  setDirty(false);
};

const saveAll = async () => {
  if (state.isDefault) {
    showNotice("当前密码为默认值 123456，请先在站点信息页修改密码。");
    return;
  }

  if (!validate()) return;

  try {
    const payload = sanitizeConfig(state.draft);
    await saveConfig(payload, state.mode);
    setStatus("配置已保存");
    showNotice("");
    setDirty(false);
  } catch (error) {
    showNotice(error.message || "保存失败");
  }
};

const init = async () => {
  if (!requireAuth()) return;
  initNav("engines");

  const modeInfo = await detectMode();
  state.mode = modeInfo.mode;
  state.isDefault = modeInfo.isDefault;

  ui.modeBadge.textContent = modeInfo.mode === "kv" ? "KV 模式" : "本地存储";
  setStatus(modeInfo.mode === "kv" ? "读取 EdgeOne KV" : "使用浏览器存储");

  await loadAndRender();

  ui.engineAdd.addEventListener("click", () => {
    state.draft.searchEngines.push({ name: "", url: "" });
    renderEngines();
    setDirty(true);
  });

  ui.saveBtn.addEventListener("click", saveAll);
  window.addEventListener("beforeunload", beforeUnload);
};

init();