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
  groupList: $("group-list"),
  groupAdd: $("group-add"),
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

const renderTags = (tags, onRemove) => {
  const wrapper = document.createElement("div");
  wrapper.className = "tag-list";

  tags.forEach((tag, idx) => {
    const item = document.createElement("span");
    item.className = "tag-item";
    item.textContent = tag;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "删除";
    removeBtn.addEventListener("click", () => onRemove(idx));
    item.appendChild(removeBtn);

    wrapper.appendChild(item);
  });

  return wrapper;
};

const createIconPreview = (url) => {
  const wrap = document.createElement("div");
  wrap.className = "icon-preview";
  const img = document.createElement("img");
  img.alt = "icon";
  if (url) {
    img.src = url;
  }
  img.onerror = () => {
    img.classList.add("hidden");
  };
  wrap.appendChild(img);
  return wrap;
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
    nameInput.placeholder = "分组名称";
    nameInput.value = group.name ?? "";
    nameInput.addEventListener("input", () => {
      group.name = nameInput.value;
      setDirty(true);
    });

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.appendChild(
      createActionButton("上移", () => {
        swap(state.draft.groups, groupIndex, groupIndex - 1);
        renderGroups();
      })
    );
    actions.appendChild(
      createActionButton("下移", () => {
        swap(state.draft.groups, groupIndex, groupIndex + 1);
        renderGroups();
      })
    );
    actions.appendChild(
      createActionButton("删除", () => {
        if (!confirm("确认删除该分组及其网站？")) return;
        state.draft.groups.splice(groupIndex, 1);
        renderGroups();
        setDirty(true);
      })
    );

    head.appendChild(nameInput);
    head.appendChild(actions);

    const siteList = document.createElement("div");
    siteList.className = "site-list";

    group.items.forEach((site, siteIndex) => {
      const siteCard = document.createElement("div");
      siteCard.className = "site-card";

      const siteGrid = document.createElement("div");
      siteGrid.className = "site-grid";

      const siteName = document.createElement("input");
      siteName.type = "text";
      siteName.placeholder = "网站名称";
      siteName.value = site.name ?? "";
      siteName.addEventListener("input", () => {
        site.name = siteName.value;
        setDirty(true);
      });

      const siteUrl = document.createElement("input");
      siteUrl.type = "text";
      siteUrl.placeholder = "网站链接";
      siteUrl.value = site.url ?? "";
      siteUrl.addEventListener("input", () => {
        site.url = siteUrl.value;
        setDirty(true);
      });

      const iconWrap = document.createElement("div");
      iconWrap.className = "icon-field";

      const siteIcon = document.createElement("input");
      siteIcon.type = "text";
      siteIcon.placeholder = "图标 URL（可选）";
      siteIcon.value = site.icon ?? "";

      const preview = createIconPreview(site.icon);
      siteIcon.addEventListener("input", () => {
        site.icon = siteIcon.value;
        const img = preview.querySelector("img");
        img.classList.remove("hidden");
        img.src = siteIcon.value || "";
        setDirty(true);
      });

      iconWrap.appendChild(siteIcon);
      iconWrap.appendChild(preview);

      siteGrid.appendChild(siteName);
      siteGrid.appendChild(siteUrl);
      siteGrid.appendChild(iconWrap);

      const tagInputWrap = document.createElement("div");
      tagInputWrap.className = "tag-input";

      const tagInput = document.createElement("input");
      tagInput.type = "text";
      tagInput.placeholder = "添加标签（回车或逗号分隔）";

      const addTagValue = () => {
        const raw = tagInput.value.trim();
        if (!raw) return;
        site.tags = Array.isArray(site.tags) ? site.tags : [];
        raw
          .split(/[，,]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((value) => {
            if (!site.tags.includes(value)) {
              site.tags.push(value);
            }
          });
        tagInput.value = "";
        renderGroups();
        setDirty(true);
      };

      const tagBtn = createActionButton("添加", addTagValue, "ghost");

      tagInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addTagValue();
        }
      });

      tagInput.addEventListener("blur", addTagValue);

      tagInputWrap.appendChild(tagInput);
      tagInputWrap.appendChild(tagBtn);

      const tagList = renderTags(site.tags ?? [], (tagIndex) => {
        site.tags.splice(tagIndex, 1);
        renderGroups();
        setDirty(true);
      });

      const siteActions = document.createElement("div");
      siteActions.className = "row-actions";
      siteActions.appendChild(
        createActionButton("上移", () => {
          swap(group.items, siteIndex, siteIndex - 1);
          renderGroups();
        })
      );
      siteActions.appendChild(
        createActionButton("下移", () => {
          swap(group.items, siteIndex, siteIndex + 1);
          renderGroups();
        })
      );
      siteActions.appendChild(
        createActionButton("删除", () => {
          if (!confirm("确认删除该网站？")) return;
          group.items.splice(siteIndex, 1);
          renderGroups();
          setDirty(true);
        })
      );

      siteCard.appendChild(siteGrid);
      siteCard.appendChild(tagInputWrap);
      siteCard.appendChild(tagList);
      siteCard.appendChild(siteActions);

      siteList.appendChild(siteCard);
    });

    const addSiteBtn = createActionButton("添加网站", () => {
      group.items.push({ name: "", url: "", icon: "", tags: [] });
      renderGroups();
      setDirty(true);
    });

    card.appendChild(head);
    card.appendChild(siteList);
    card.appendChild(addSiteBtn);
    ui.groupList.appendChild(card);
  });

  if (!state.draft.groups.length) {
    const empty = document.createElement("div");
    empty.className = "helper-text";
    empty.textContent = "暂无分组，点击“添加分组”开始。";
    ui.groupList.appendChild(empty);
  }
};

const validate = () => {
  let ok = true;
  const errors = [];

  state.draft.groups.forEach((group, gIndex) => {
    if (!group.name?.trim()) {
      ok = false;
      errors.push(`第 ${gIndex + 1} 个分组未命名`);
    }
    group.items.forEach((site, sIndex) => {
      if (!site.name?.trim() || !site.url?.trim()) {
        ok = false;
        errors.push(`分组 ${gIndex + 1} 的第 ${sIndex + 1} 个网站未填写完整`);
      }
    });
  });

  if (!ok) {
    showNotice(errors[0]);
  }

  return ok;
};

const loadAndRender = async () => {
  const config = await loadConfig(state.mode);
  state.draft = normalizeConfig(config);
  renderGroups();
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
  initNav("sites");

  const modeInfo = await detectMode();
  state.mode = modeInfo.mode;
  state.isDefault = modeInfo.isDefault;

  ui.modeBadge.textContent = modeInfo.mode === "kv" ? "KV 模式" : "本地存储";
  setStatus(modeInfo.mode === "kv" ? "读取 EdgeOne KV" : "使用浏览器存储");

  await loadAndRender();

  ui.groupAdd.addEventListener("click", () => {
    state.draft.groups.push({ name: "", items: [] });
    renderGroups();
    setDirty(true);
  });

  ui.saveBtn.addEventListener("click", saveAll);
  window.addEventListener("beforeunload", beforeUnload);
};

init();