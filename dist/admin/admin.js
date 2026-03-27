const defaultConfig = window.__NAV_CONFIG__ ?? {};

const storageKeys = {
  config: "nav_config",
  password: "nav_admin_password",
  defaultFlag: "nav_admin_default"
};

const state = {
  mode: "local",
  sessionPassword: "",
  bootstrapPassword: "",
  isDefault: false,
  authed: false,
  draft: null
};

const $ = (id) => document.getElementById(id);

const ui = {
  modeBadge: $("mode-badge"),
  statusText: $("status-text"),
  noticePanel: $("notice-panel"),
  noticeText: $("notice-text"),
  loginPassword: $("login-password"),
  loginBtn: $("login-btn"),
  bootstrapWrap: $("bootstrap-wrap"),
  bootstrapPassword: $("bootstrap-password"),
  editorPanel: $("editor-panel"),
  siteTitle: $("site-title"),
  siteDesc: $("site-desc"),
  siteTheme: $("site-theme"),
  engineList: $("engine-list"),
  engineAdd: $("engine-add"),
  groupList: $("group-list"),
  groupAdd: $("group-add"),
  loadBtn: $("load-btn"),
  saveBtn: $("save-btn"),
  passwordCurrent: $("password-current"),
  passwordNew: $("password-new"),
  passwordBtn: $("password-btn")
};

const fetchWithTimeout = (url, options = {}, timeoutMs = 1500) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
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

const generatePassword = () => {
  try {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const length = 10;
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  } catch {
    return null;
  }
};

const normalizeConfig = (config) => {
  const safe = config ?? {};
  const site = safe.site ?? {};
  return {
    site: {
      title: site.title ?? "涓汉瀵艰埅",
      description: site.description ?? "绠€绾︾幇浠ｅ鑸珯",
      theme: site.theme ?? "auto"
    },
    searchEngines: Array.isArray(safe.searchEngines) ? safe.searchEngines : [],
    groups: Array.isArray(safe.groups) ? safe.groups : []
  };
};

const sanitizeConfig = (config) => {
  const trim = (value) => String(value ?? "").trim();

  const cleanEngines = (config.searchEngines ?? [])
    .map((engine) => ({
      name: trim(engine?.name),
      url: trim(engine?.url)
    }))
    .filter((engine) => engine.name && engine.url);

  const cleanGroups = (config.groups ?? []).map((group) => {
    const groupName = trim(group?.name) || "鏈懡鍚嶅垎缁?;
    const items = (group?.items ?? [])
      .map((item) => {
        const tags = Array.from(
          new Set((item?.tags ?? []).map((tag) => trim(tag)).filter(Boolean))
        );
        return {
          name: trim(item?.name),
          url: trim(item?.url),
          icon: trim(item?.icon),
          tags
        };
      })
      .filter((item) => item.name && item.url);

    return {
      name: groupName,
      items
    };
  });

  return {
    site: {
      title: trim(config.site?.title) || "涓汉瀵艰埅",
      description: trim(config.site?.description) || "绠€绾︾幇浠ｅ鑸珯",
      theme: config.site?.theme ?? "auto"
    },
    searchEngines: cleanEngines,
    groups: cleanGroups
  };
};

const initLocalAuth = () => {
  let password = localStorage.getItem(storageKeys.password);
  let isDefault = localStorage.getItem(storageKeys.defaultFlag) === "1";

  if (!password) {
    password = generatePassword() ?? "123456";
    localStorage.setItem(storageKeys.password, password);
    isDefault = password === "123456";
    localStorage.setItem(storageKeys.defaultFlag, isDefault ? "1" : "0");
    state.bootstrapPassword = password;
  }

  state.isDefault = isDefault;
};

const detectMode = async () => {
  try {
    const response = await fetchWithTimeout("/api/admin/status", { cache: "no-store" });
    if (!response.ok) throw new Error("not ok");
    const data = await response.json();
    state.mode = "kv";
    state.isDefault = Boolean(data.isDefault);
    state.bootstrapPassword = data.bootstrapPassword ?? "";
    ui.modeBadge.textContent = "KV 妯″紡";
    setStatus("璇诲彇 EdgeOne KV");
  } catch {
    state.mode = "local";
    initLocalAuth();
    ui.modeBadge.textContent = "鏈湴瀛樺偍";
    setStatus("鏈娴嬪埌 KV锛屼娇鐢ㄦ祻瑙堝櫒瀛樺偍");
  }

  if (state.bootstrapPassword) {
    showBootstrapPassword(state.bootstrapPassword);
  }

  if (state.isDefault) {
    showNotice("褰撳墠瀵嗙爜涓洪粯璁ゅ€?123456锛岃灏藉揩淇敼銆傛湭淇敼鍓嶅皢鏃犳硶淇濆瓨閰嶇疆銆?);
    ui.saveBtn.disabled = true;
  }
};

const loadLocalConfig = () => {
  try {
    const raw = localStorage.getItem(storageKeys.config);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const loadConfig = async () => {
  if (state.mode === "kv") {
    try {
      const response = await fetchWithTimeout("/api/nav", { cache: "no-store" }, 2000);
      if (response.ok) return await response.json();
    } catch {
      return null;
    }
  }

  const local = loadLocalConfig();
  if (local) return local;
  return defaultConfig;
};

const setEditorVisible = (visible) => {
  ui.editorPanel.hidden = !visible;
};

const updateSiteDraft = () => {
  state.draft.site.title = ui.siteTitle.value.trim() || "涓汉瀵艰埅";
  state.draft.site.description = ui.siteDesc.value.trim() || "绠€绾︾幇浠ｅ鑸珯";
  state.draft.site.theme = ui.siteTheme.value;
};

const swap = (list, from, to) => {
  if (to < 0 || to >= list.length) return;
  const copy = list[from];
  list[from] = list[to];
  list[to] = copy;
};

const createActionButton = (label, onClick, className = "ghost") => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.className = className;
  btn.addEventListener("click", onClick);
  return btn;
};

const renderEngines = () => {
  ui.engineList.innerHTML = "";
  state.draft.searchEngines.forEach((engine, index) => {
    const row = document.createElement("div");
    row.className = "list-row";

    const nameField = document.createElement("input");
    nameField.type = "text";
    nameField.placeholder = "寮曟搸鍚嶇О";
    nameField.value = engine.name ?? "";
    nameField.addEventListener("input", () => {
      engine.name = nameField.value;
    });

    const urlField = document.createElement("input");
    urlField.type = "text";
    urlField.placeholder = "鎼滅储 URL锛堝寘鍚?{query}锛?;
    urlField.value = engine.url ?? "";
    urlField.addEventListener("input", () => {
      engine.url = urlField.value;
    });

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.appendChild(
      createActionButton("涓婄Щ", () => {
        swap(state.draft.searchEngines, index, index - 1);
        renderEngines();
      })
    );
    actions.appendChild(
      createActionButton("涓嬬Щ", () => {
        swap(state.draft.searchEngines, index, index + 1);
        renderEngines();
      })
    );
    actions.appendChild(
      createActionButton("鍒犻櫎", () => {
        state.draft.searchEngines.splice(index, 1);
        renderEngines();
      }, "ghost")
    );

    row.appendChild(nameField);
    row.appendChild(urlField);
    row.appendChild(actions);
    ui.engineList.appendChild(row);
  });

  if (!state.draft.searchEngines.length) {
    const empty = document.createElement("div");
    empty.className = "helper-text";
    empty.textContent = "鏆傛棤鎼滅储寮曟搸锛岀偣鍑烩€滄坊鍔犲紩鎿庘€濆紑濮?;
    ui.engineList.appendChild(empty);
  }
};

const renderTags = (tags, onRemove) => {
  const wrapper = document.createElement("div");
  wrapper.className = "tag-list";

  tags.forEach((tag, idx) => {
    const item = document.createElement("span");
    item.className = "tag-item";
    item.textContent = tag;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "脳";
    removeBtn.addEventListener("click", () => onRemove(idx));
    item.appendChild(removeBtn);

    wrapper.appendChild(item);
  });

  return wrapper;
};

const renderGroups = () => {
  ui.groupList.innerHTML = "";

  state.draft.groups.forEach((group, groupIndex) => {
    group.items = Array.isArray(group.items) ? group.items : [];
    const card = document.createElement("div");
    card.className = "group-card";

    const head = document.createElement("div");
    head.className = "group-head";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "鍒嗙粍鍚嶇О";
    nameInput.value = group.name ?? "";
    nameInput.addEventListener("input", () => {
      group.name = nameInput.value;
    });

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.appendChild(
      createActionButton("涓婄Щ", () => {
        swap(state.draft.groups, groupIndex, groupIndex - 1);
        renderGroups();
      })
    );
    actions.appendChild(
      createActionButton("涓嬬Щ", () => {
        swap(state.draft.groups, groupIndex, groupIndex + 1);
        renderGroups();
      })
    );
    actions.appendChild(
      createActionButton("鍒犻櫎", () => {
        state.draft.groups.splice(groupIndex, 1);
        renderGroups();
      })
    );

    head.appendChild(nameInput);
    head.appendChild(actions);

    const siteList = document.createElement("div");
    siteList.className = "site-list";

    (group.items ?? []).forEach((site, siteIndex) => {
      const siteCard = document.createElement("div");
      siteCard.className = "site-card";

      const siteGrid = document.createElement("div");
      siteGrid.className = "site-grid";

      const siteName = document.createElement("input");
      siteName.type = "text";
      siteName.placeholder = "缃戠珯鍚嶇О";
      siteName.value = site.name ?? "";
      siteName.addEventListener("input", () => {
        site.name = siteName.value;
      });

      const siteUrl = document.createElement("input");
      siteUrl.type = "text";
      siteUrl.placeholder = "缃戠珯閾炬帴";
      siteUrl.value = site.url ?? "";
      siteUrl.addEventListener("input", () => {
        site.url = siteUrl.value;
      });

      const siteIcon = document.createElement("input");
      siteIcon.type = "text";
      siteIcon.placeholder = "鍥炬爣 URL";
      siteIcon.value = site.icon ?? "";
      siteIcon.addEventListener("input", () => {
        site.icon = siteIcon.value;
      });

      siteGrid.appendChild(siteName);
      siteGrid.appendChild(siteUrl);
      siteGrid.appendChild(siteIcon);

      const tagInputWrap = document.createElement("div");
      tagInputWrap.className = "tag-input";

      const tagInput = document.createElement("input");
      tagInput.type = "text";
      tagInput.placeholder = "娣诲姞鏍囩";

      const tagBtn = createActionButton("娣诲姞", () => {
        const value = tagInput.value.trim();
        if (!value) return;
        site.tags = Array.isArray(site.tags) ? site.tags : [];
        if (!site.tags.includes(value)) {
          site.tags.push(value);
        }
        tagInput.value = "";
        renderGroups();
      }, "ghost");

      tagInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          tagBtn.click();
        }
      });

      tagInputWrap.appendChild(tagInput);
      tagInputWrap.appendChild(tagBtn);

      const tagList = renderTags(site.tags ?? [], (tagIndex) => {
        site.tags.splice(tagIndex, 1);
        renderGroups();
      });

      const siteActions = document.createElement("div");
      siteActions.className = "row-actions";
      siteActions.appendChild(
        createActionButton("涓婄Щ", () => {
          swap(group.items, siteIndex, siteIndex - 1);
          renderGroups();
        })
      );
      siteActions.appendChild(
        createActionButton("涓嬬Щ", () => {
          swap(group.items, siteIndex, siteIndex + 1);
          renderGroups();
        })
      );
      siteActions.appendChild(
        createActionButton("鍒犻櫎", () => {
          group.items.splice(siteIndex, 1);
          renderGroups();
        })
      );

      siteCard.appendChild(siteGrid);
      siteCard.appendChild(tagInputWrap);
      siteCard.appendChild(tagList);
      siteCard.appendChild(siteActions);

      siteList.appendChild(siteCard);
    });

    const addSiteBtn = createActionButton("娣诲姞缃戠珯", () => {
      group.items = Array.isArray(group.items) ? group.items : [];
      group.items.push({ name: "", url: "", icon: "", tags: [] });
      renderGroups();
    });

    card.appendChild(head);
    card.appendChild(siteList);
    card.appendChild(addSiteBtn);
    ui.groupList.appendChild(card);
  });

  if (!state.draft.groups.length) {
    const empty = document.createElement("div");
    empty.className = "helper-text";
    empty.textContent = "鏆傛棤鍒嗙粍锛岀偣鍑烩€滄坊鍔犲垎缁勨€濆紑濮?;
    ui.groupList.appendChild(empty);
  }
};

const renderAll = () => {
  ui.siteTitle.value = state.draft.site.title ?? "";
  ui.siteDesc.value = state.draft.site.description ?? "";
  ui.siteTheme.value = state.draft.site.theme ?? "auto";
  renderEngines();
  renderGroups();
};

const loadAndRender = async () => {
  const config = await loadConfig();
  state.draft = normalizeConfig(config);
  renderAll();
};

const saveConfig = async () => {
  if (!state.authed) {
    showNotice("璇峰厛鐧诲綍鍚庡彴");
    return;
  }

  if (state.isDefault) {
    showNotice("褰撳墠瀵嗙爜涓洪粯璁ゅ€?123456锛岃鍏堜慨鏀瑰瘑鐮佸悗鍐嶄繚瀛樸€?);
    return;
  }

  try {
    updateSiteDraft();
    const payload = sanitizeConfig(state.draft);

    if (state.mode === "kv") {
      const response = await fetch("/api/nav", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": state.sessionPassword
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "淇濆瓨澶辫触");
      }
    }

    localStorage.setItem(storageKeys.config, JSON.stringify(payload));
    setStatus("閰嶇疆宸蹭繚瀛?);
    showNotice("");
  } catch (error) {
    showNotice(error.message || "淇濆瓨澶辫触");
  }
};

const login = async () => {
  const password = ui.loginPassword.value.trim();
  if (!password) {
    showNotice("璇疯緭鍏ョ鐞嗗瘑鐮?);
    return;
  }

  if (state.mode === "kv") {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      showNotice("瀵嗙爜涓嶆纭?);
      return;
    }
  } else {
    const stored = localStorage.getItem(storageKeys.password) ?? "";
    if (password !== stored) {
      showNotice("瀵嗙爜涓嶆纭?);
      return;
    }
  }

  state.sessionPassword = password;
  state.authed = true;
  setEditorVisible(true);
  showNotice("");
  await loadAndRender();
};

const updatePassword = async () => {
  const current = ui.passwordCurrent.value.trim();
  const next = ui.passwordNew.value.trim();

  if (next.length < 6) {
    showNotice("鏂板瘑鐮佽嚦灏?6 浣?);
    return;
  }

  try {
    if (state.mode === "kv") {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: current, newPassword: next })
      });

      if (!response.ok) {
        throw new Error("褰撳墠瀵嗙爜閿欒鎴栨洿鏂板け璐?);
      }
    } else {
      const stored = localStorage.getItem(storageKeys.password) ?? "";
      if (stored !== current) {
        throw new Error("褰撳墠瀵嗙爜閿欒");
      }
      localStorage.setItem(storageKeys.password, next);
      localStorage.setItem(storageKeys.defaultFlag, "0");
    }

    state.isDefault = false;
    ui.saveBtn.disabled = false;
    showNotice("瀵嗙爜宸叉洿鏂?);
  } catch (error) {
    showNotice(error.message || "鏇存柊澶辫触");
  }
};

const bindEvents = () => {
  ui.loginBtn.addEventListener("click", login);
  ui.engineAdd.addEventListener("click", () => {
    if (!state.authed) return;
    state.draft.searchEngines.push({ name: "", url: "" });
    renderEngines();
  });
  ui.groupAdd.addEventListener("click", () => {
    if (!state.authed) return;
    state.draft.groups.push({ name: "", items: [] });
    renderGroups();
  });
  ui.loadBtn.addEventListener("click", async () => {
    if (!state.authed) return;
    await loadAndRender();
  });
  ui.saveBtn.addEventListener("click", saveConfig);
  ui.passwordBtn.addEventListener("click", updatePassword);

  ui.siteTitle.addEventListener("input", updateSiteDraft);
  ui.siteDesc.addEventListener("input", updateSiteDraft);
  ui.siteTheme.addEventListener("change", updateSiteDraft);
};

const init = async () => {
  setEditorVisible(false);
  await detectMode();
  bindEvents();
};

init();