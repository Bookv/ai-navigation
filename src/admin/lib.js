const defaultConfig = window.__NAV_CONFIG__ ?? {};

const storageKeys = {
  config: "nav_config",
  password: "nav_admin_password",
  defaultFlag: "nav_admin_default",
  bootstrapShown: "nav_admin_bootstrap_shown",
  sessionAuthed: "nav_admin_authed",
  sessionPassword: "nav_admin_session"
};

const isLocalhost = () => ["localhost", "127.0.0.1"].includes(window.location.hostname);

const shouldTryRemote = () => {
  if (!isLocalhost()) return true;
  const params = new URLSearchParams(window.location.search);
  return params.get("remote") === "1";
};

const fetchWithTimeout = (url, options = {}, timeoutMs = 1500) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
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

const initLocalAuth = () => {
  let password = localStorage.getItem(storageKeys.password);
  let isDefault = localStorage.getItem(storageKeys.defaultFlag) === "1";
  let bootstrapPassword = "";

  if (!password) {
    password = generatePassword() ?? "123456";
    localStorage.setItem(storageKeys.password, password);
    isDefault = password === "123456";
    localStorage.setItem(storageKeys.defaultFlag, isDefault ? "1" : "0");
    bootstrapPassword = password;
  }

  if (!bootstrapPassword && localStorage.getItem(storageKeys.bootstrapShown) !== "1") {
    bootstrapPassword = password;
  }

  if (bootstrapPassword) {
    localStorage.setItem(storageKeys.bootstrapShown, "1");
  }

  return { password, isDefault, bootstrapPassword };
};

const detectMode = async () => {
  if (shouldTryRemote()) {
    try {
      const response = await fetchWithTimeout("/api/admin/status", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        return {
          mode: "kv",
          isDefault: Boolean(data.isDefault),
          bootstrapPassword: data.bootstrapPassword ?? ""
        };
      }
    } catch {
      // fall back to local
    }
  }

  const local = initLocalAuth();
  return {
    mode: "local",
    isDefault: local.isDefault,
    bootstrapPassword: local.bootstrapPassword
  };
};

const setSession = (password) => {
  sessionStorage.setItem(storageKeys.sessionAuthed, "1");
  sessionStorage.setItem(storageKeys.sessionPassword, password);
};

const clearSession = () => {
  sessionStorage.removeItem(storageKeys.sessionAuthed);
  sessionStorage.removeItem(storageKeys.sessionPassword);
};

const isAuthed = () => sessionStorage.getItem(storageKeys.sessionAuthed) === "1";

const getSessionPassword = () => sessionStorage.getItem(storageKeys.sessionPassword) ?? "";

const loginWithPassword = async (password, mode) => {
  if (!password) return false;

  if (mode === "kv") {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) return false;
    setSession(password);
    return true;
  }

  const stored = localStorage.getItem(storageKeys.password) ?? "";
  if (password !== stored) return false;
  setSession(password);
  return true;
};

const requireAuth = () => {
  if (isAuthed()) return true;
  window.location.href = "/admin/login.html";
  return false;
};

const clampOpacity = (value) => Math.min(1, Math.max(0.01, value));

const normalizeOpacity = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.62;
  return clampOpacity(num);
};

const normalizeConfig = (config) => {
  const safe = config ?? {};
  const site = safe.site ?? {};
  return {
    site: {
      title: site.title ?? "个人导航",
      description: site.description ?? "简约现代导航站",
      theme: site.theme ?? "auto",
      backgroundImage: site.backgroundImage ?? "",
      glassOpacity: normalizeOpacity(site.glassOpacity ?? 0.62)
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
    const groupName = trim(group?.name) || "未命名分组";
    const items = (group?.items ?? [])
      .map((item) => {
        const tags = Array.from(
          new Set((item?.tags ?? []).map((tag) => trim(tag)).filter(Boolean))
        );
        return {
          name: trim(item?.name),
          url: trim(item?.url),
          description: trim(item?.description),
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
      title: trim(config.site?.title) || "个人导航",
      description: trim(config.site?.description) || "简约现代导航站",
      theme: config.site?.theme ?? "auto",
      backgroundImage: trim(config.site?.backgroundImage),
      glassOpacity: normalizeOpacity(config.site?.glassOpacity ?? 0.62)
    },
    searchEngines: cleanEngines,
    groups: cleanGroups
  };
};

const loadConfig = async (mode) => {
  if (mode === "kv" && shouldTryRemote()) {
    try {
      const response = await fetchWithTimeout("/api/nav", { cache: "no-store" }, 2000);
      if (response.ok) return await response.json();
    } catch {
      // ignore
    }
  }

  try {
    const raw = localStorage.getItem(storageKeys.config);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  return defaultConfig;
};

const saveConfig = async (payload, mode) => {
  if (mode === "kv" && shouldTryRemote()) {
    const response = await fetch("/api/nav", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": getSessionPassword()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "保存失败");
    }
  }

  localStorage.setItem(storageKeys.config, JSON.stringify(payload));
};

const updatePassword = async (mode, current, next) => {
  if (next.length < 6) {
    throw new Error("新密码至少 6 位");
  }

  if (mode === "kv" && shouldTryRemote()) {
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: current, newPassword: next })
    });

    if (!response.ok) {
      throw new Error("当前密码错误或更新失败");
    }
  } else {
    const stored = localStorage.getItem(storageKeys.password) ?? "";
    if (stored !== current) {
      throw new Error("当前密码错误");
    }
    localStorage.setItem(storageKeys.password, next);
    localStorage.setItem(storageKeys.defaultFlag, "0");
  }

  sessionStorage.setItem(storageKeys.sessionPassword, next);
};

const initNav = (active) => {
  const links = document.querySelectorAll("[data-nav]");
  links.forEach((link) => {
    if (link.dataset.nav === active) {
      link.classList.add("active");
    }
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      window.location.href = "/admin/login.html";
    });
  }
};

export {
  storageKeys,
  detectMode,
  loginWithPassword,
  requireAuth,
  normalizeConfig,
  sanitizeConfig,
  loadConfig,
  saveConfig,
  updatePassword,
  initNav,
  clearSession,
  isAuthed
};