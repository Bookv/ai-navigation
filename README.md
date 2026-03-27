# 个人导航站 (Node.js 纯静态)

功能覆盖
- 简约现代风格
- 深浅色主题切换
- 多搜索引擎支持
- 响应式设计，适配移动端
- 纯静态页面，极速加载
- 分类管理，支持自定义分组
- Docker 容器化部署
- 灵活配置，支持环境变量和配置文件
- 动态标题，根据配置自动更新页面标题
- 搜索功能，快速查找导航链接
- 性能优化：图标懒加载 + Service Worker 缓存
- EdgeOne KV 管理后台（可选）

## 本地使用

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:4173`。

## 后台入口

- 登录页：`/admin/login.html`
- 搜索引擎：`/admin/engines.html`
- 网站管理：`/admin/sites.html`
- 站点信息：`/admin/settings.html`

`/admin/` 会自动跳转到登录页。

## EdgeOne KV 管理后台

此方案适用于 EdgeOne Pages Functions + KV。

### 绑定 KV
KV 变量名使用 `nav`。

### 密码规则
首次进入会自动初始化管理密码：
- 优先生成 10 位数字 + 字母随机密码
- 若无法生成，则默认 `123456`

如果当前密码是默认 `123456`，后台会提示必须修改后才能保存配置。

### 没有 KV 时的本地调试
如果检测不到 KV，系统会自动降级为浏览器 LocalStorage：
- `/admin/` 仍可使用
- 配置保存到 LocalStorage
- 前台优先读取 `/api/nav`，本地开发默认跳过远程请求，可用 `?remote=1` 强制请求

## 构建

```bash
npm run build
npm run preview
```

## 配置方式

### 1) 配置文件 (推荐)
编辑 `src/config.json`，然后重新构建：

```bash
npm run build
```

字段说明：
- `site.title` 页面标题
- `site.description` 副标题
- `site.theme` `auto` | `light` | `dark`
- `searchEngines` 搜索引擎数组（`url` 中用 `{query}` 占位）
- `groups` 分组数组，每组包含 `items`

### 2) 环境变量覆盖 (构建时)

```bash
NAV_TITLE="我的导航" \
NAV_DESCRIPTION="一站式入口" \
NAV_THEME="dark" \
NAV_SEARCH_ENGINES_JSON='[{"name":"Google","url":"https://www.google.com/search?q={query}"}]' \
NAV_GROUPS_JSON='[{"name":"常用","items":[{"name":"GitHub","url":"https://github.com"}]}]' \
npm run build
```

## Docker 部署

```bash
docker build -t personal-nav .
docker run -p 8080:80 personal-nav
```

### Docker 环境变量（运行时）
容器启动时如果传入任意 `NAV_` 变量，将自动生成 `config.js` 覆盖默认配置。

```bash
docker run -p 8080:80 \
  -e NAV_TITLE="我的导航" \
  -e NAV_DESCRIPTION="一站式入口" \
  -e NAV_THEME="auto" \
  -e NAV_SEARCH_ENGINES_JSON='[{"name":"Google","url":"https://www.google.com/search?q={query}"}]' \
  -e NAV_GROUPS_JSON='[]' \
  personal-nav
```

或者使用 `docker-compose.yml`。

## 开发提示
- `src/config.json` 是默认配置
- `src/config.template.js` 用于 Docker 运行时注入
- `dist/config.js` 为构建后的最终配置
- `edge-functions/api` 为 EdgeOne Functions API
- `/admin/*` 为后台入口