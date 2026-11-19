#!/bin/sh
# Proxies /api/ to the gateway when API_UPSTREAM is set (for example http://api-gateway:8000).
# The browser's Host header is kept: the gateway's auth routes require Origin to match the
# request authority (CSRF check). Without API_UPSTREAM, /api/ answers 503.
set -eu

snippet=/etc/nginx/snippets/api-proxy.conf
rm -f "$snippet"

if [ -z "${API_UPSTREAM:-}" ]; then
  # Answer API calls with 503 instead of letting the SPA fallback return index.html.
  printf 'location /api/ {\n  return 503;\n}\n' > "$snippet"
  echo "api-proxy: API_UPSTREAM not set, /api/ answers 503"
  exit 0
fi

if ! printf '%s' "$API_UPSTREAM" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?$'; then
  echo "api-proxy: API_UPSTREAM must look like http://host:port without a path" >&2
  exit 1
fi

cat > "$snippet" <<CONF
location /api/ {
  proxy_pass $API_UPSTREAM;
  proxy_http_version 1.1;
  proxy_set_header Host \$http_host;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
CONF
echo "api-proxy: /api/ -> $API_UPSTREAM"
