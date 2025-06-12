#!/bin/bash

set -e

# Fail if run as root or with sudo
if [ "$EUID" -eq 0 ]; then
  echo "❌ Do not run this script as root or with sudo. Exiting." >&2
  exit 1
fi
if [ -n "$SUDO_USER" ]; then
  echo "❌ Do not run this script with sudo. Exiting." >&2
  exit 1
fi

# Fail if any root-owned files exist in backend/ or logs/
if find . -path './node_modules' -prune -o -user root | grep -qv '^\./node_modules'; then
  echo "❌ Root-owned files detected in backend/. Please fix permissions. Exiting." >&2
  exit 1
fi
if [ -d logs ] && find logs -user root | grep -q .; then
  echo "❌ Root-owned files detected in logs/. Please fix permissions. Exiting." >&2
  exit 1
fi

echo "---- Installing nvm (Node Version Manager) ----"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "---- Installing Node.js 20 LTS ----"
nvm install 20
nvm use 20

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

echo "---- Cleaning old dependencies ----"
rm -rf node_modules package-lock.json

echo "---- Reinstalling dependencies ----"
npm install

echo "---- Attempting to fix vulnerabilities ----"
npm audit fix --force || true

echo "---- Updating deprecated packages ----"
npm install uuid@latest multer@latest xss-clean@latest

echo "---- All done! Try starting your backend with: npm run dev ----" 