import {
  detectMode,
  requireAuth,
  normalizeConfig,
  sanitizeConfig,
  loadConfig,
  saveConfig,
  updatePassword,
  initNav
} from "./lib.js";

const $ = (id) => document.getElementById(id);

const ui = {
  modeBadge: $("mode-badge"),
  statusText: $("status-text"),
  noticePanel: $("notice-panel"),
  noticeText: $("notice-text"),
  siteTitle: $("site-title"),
  siteDesc: $("site-desc"),
  siteTheme: $("site-theme"),
  siteBg: $("site-bg"),
  bgPreview: $("bg-preview"),
  siteGlass: $("site-glass"),
  glassValue: $("glass-value"),
  saveBtn: $("save-btn"),
  passwordCurrent: $("password-current"),
  passwordNew: $("password-new"),
  passwordBtn: $("password-btn")
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

const clampOpacity = (value) => Math.min(1, Math.max(0.01, value));

const formatOpacity = (value) => `${Math.round(value * 100)}%`;

const getOpacityValue = () => {
  const raw = Number(ui.siteGlass.value);
  if (!Number.isFinite(raw)) return 0.62;
  return clampOpacity(raw / 100);
};

const updateGlassValue = (value) => {
  ui.glassValue.textContent = formatOpacity(value);
  document.documentElement.style.setProperty("--glass-opacity", String(value));
};

const updateBgPreview = (url) => {
  const wrapper = ui.bgPreview?.parentElement;
  if (!wrapper) return;
  if (!url) {
    wrapper.classList.add("empty");
    ui.bgPreview.removeAttribute("src");
    return;
  }
  wrapper.classList.remove("empty");
  ui.bgPreview.src = url;
};

const loadAndRender = async () => {
  const config = await loadConfig(state.mode);
  state.draft = normalizeConfig(config);
  ui.siteTitle.value = state.draft.site.title ?? "";
  ui.siteDesc.value = state.draft.site.description ?? "";
  ui.siteTheme.value = state.draft.site.theme ?? "auto";
  ui.siteBg.value = state.draft.site.backgroundImage ?? "";
  updateBgPreview(ui.siteBg.value.trim());

  const opacity = clampOpacity(state.draft.site.glassOpacity ?? 0.62);
  ui.siteGlass.value = String(Math.round(opacity * 100));
  updateGlassValue(opacity);
  setDirty(false);
};

const saveSite = async () => {
  if (state.isDefault) {
    showNotice("当前密码为默认值 123456，请先修改密码后再保存。");
    return;
  }

  try {
    const payload = sanitizeConfig({
      ...state.draft,
      site: {
        title: ui.siteTitle.value.trim() || "个人导航",
        description: ui.siteDesc.value.trim() || "简约现代导航站",
        theme: ui.siteTheme.value,
        backgroundImage: ui.siteBg.value.trim(),
        glassOpacity: getOpacityValue()
      }
    });
    await saveConfig(payload, state.mode);
    setStatus("站点信息已保存");
    showNotice("");
    setDirty(false);
  } catch (error) {
    showNotice(error.message || "保存失败");
  }
};

const handlePassword = async () => {
  const current = ui.passwordCurrent.value.trim();
  const next = ui.passwordNew.value.trim();

  try {
    await updatePassword(state.mode, current, next);
    state.isDefault = false;
    setStatus("密码已更新");
    showNotice("");
  } catch (error) {
    showNotice(error.message || "更新失败");
  }
};

const init = async () => {
  if (!requireAuth()) return;
  initNav("settings");

  const modeInfo = await detectMode();
  state.mode = modeInfo.mode;
  state.isDefault = modeInfo.isDefault;

  ui.modeBadge.textContent = modeInfo.mode === "kv" ? "KV 模式" : "本地存储";
  setStatus(modeInfo.mode === "kv" ? "读取 EdgeOne KV" : "使用浏览器存储");

  if (state.isDefault) {
    showNotice("当前密码为默认值 123456，请尽快修改。");
  }

  await loadAndRender();

  ui.saveBtn.addEventListener("click", saveSite);
  ui.passwordBtn.addEventListener("click", handlePassword);

  ui.siteTitle.addEventListener("input", () => setDirty(true));
  ui.siteDesc.addEventListener("input", () => setDirty(true));
  ui.siteTheme.addEventListener("change", () => setDirty(true));
  ui.siteBg.addEventListener("input", () => {
    setDirty(true);
    updateBgPreview(ui.siteBg.value.trim());
  });
  ui.siteGlass.addEventListener("input", () => {
    const value = getOpacityValue();
    updateGlassValue(value);
    setDirty(true);
  });

  window.addEventListener("beforeunload", beforeUnload);
};

init();