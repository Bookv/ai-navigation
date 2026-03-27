#!/bin/sh
set -e

if [ -n "$NAV_TITLE" ] || [ -n "$NAV_DESCRIPTION" ] || [ -n "$NAV_THEME" ] || [ -n "$NAV_SEARCH_ENGINES_JSON" ] || [ -n "$NAV_GROUPS_JSON" ]; then
  : "${NAV_TITLE:=个人导航}"
  : "${NAV_DESCRIPTION:=简约现代导航站}"
  : "${NAV_THEME:=auto}"
  if [ -z "$NAV_SEARCH_ENGINES_JSON" ]; then
    NAV_SEARCH_ENGINES_JSON='[{"name":"Google","url":"https://www.google.com/search?q={query}"},{"name":"Bing","url":"https://www.bing.com/search?q={query}"},{"name":"DuckDuckGo","url":"https://duckduckgo.com/?q={query}"}]'
  fi
  if [ -z "$NAV_GROUPS_JSON" ]; then
    NAV_GROUPS_JSON='[]'
  fi
  export NAV_TITLE NAV_DESCRIPTION NAV_THEME NAV_SEARCH_ENGINES_JSON NAV_GROUPS_JSON
  envsubst < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js
fi
