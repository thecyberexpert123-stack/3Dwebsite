#!/usr/bin/env sh
# Whimlet Engine — build the standalone server and pack it for a bare VPS.
#
#   npm run engine:pack            → whimlet-standalone.tar.gz
#   scp whimlet-standalone.tar.gz user@vps:/srv/ && ssh user@vps \
#     'cd /srv && rm -rf whimlet && mkdir whimlet && tar xzf whimlet-standalone.tar.gz -C whimlet && systemctl restart whimlet'
#
# The archive contains everything `node server.js` needs (no node_modules install
# on the server): the standalone server, .next/static and public/.
set -eu
cd "$(dirname "$0")/.."
NEXT_STANDALONE=1 npm run build
rm -rf .next/standalone/.next/static .next/standalone/public
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public
tar -czf whimlet-standalone.tar.gz -C .next/standalone .
echo "→ whimlet-standalone.tar.gz ($(du -h whimlet-standalone.tar.gz | cut -f1)); run with: PORT=3000 node server.js"
