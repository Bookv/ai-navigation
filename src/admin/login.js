import { detectMode, loginWithPassword, isAuthed } from "./lib.js";

const $ = (id) => document.getElementById(id);

const ui = {
  modeBadge: $("mode-badge"),
  statusText: $("status-text"),
  noticePanel: $("notice-panel"),
  noticeText: $("notice-text"),
  loginPassword: $("login-password"),
  loginBtn: $("login-btn"),
  bootstrapWrap: $("bootstrap-wrap"),
  bootstrapPassword: $("bootstrap-password")
};

const showNotice = (text) => {
  ui.noticeText.textContent = text;
  ui.noticePanel.hidden = !text;
};

const setStatus = (text) => {
  ui.statusText.textContent = text;
};

const showBootstrapPassword = (password) => {
  if (!password) return;
  ui.bootstrapPassword.textContent = password;
  ui.bootstrapWrap.hidden = false;
};

const init = async () => {
  if (isAuthed()) {
    window.location.href = "/admin/engines.html";
    return;
  }

  const modeInfo = await detectMode();
  ui.modeBadge.textContent = modeInfo.mode === "kv" ? "KV 模式" : "本地存储";
  setStatus(modeInfo.mode === "kv" ? "读取 EdgeOne KV" : "使用浏览器存储");

  if (modeInfo.bootstrapPassword) {
    showBootstrapPassword(modeInfo.bootstrapPassword);
  }

  if (modeInfo.isDefault) {
    showNotice("当前密码为默认值 123456，请尽快修改。");
  }

  const doLogin = async () => {
    const password = ui.loginPassword.value.trim();
    if (!password) {
      showNotice("请输入管理密码");
      return;
    }

    const ok = await loginWithPassword(password, modeInfo.mode);
    if (!ok) {
      showNotice("密码不正确");
      return;
    }

    window.location.href = "/admin/engines.html";
  };

  ui.loginBtn.addEventListener("click", doLogin);
  ui.loginPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      doLogin();
    }
  });
};

init();