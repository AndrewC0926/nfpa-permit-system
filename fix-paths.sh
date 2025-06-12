#!/bin/bash
set -e
# This script normalizes all configtxgen output paths in scripts to use $(pwd)/blockchain/channel-artifacts/ and adds mkdir -p guards.

find . -type f -name '*.sh' | while read -r script; do
  if grep -q 'configtxgen' "$script"; then
    echo "[INFO] Patching $script ..."
    sed -i.bak -E \
      -e 's#(outputBlock|outputCreateChannelTx|outputAnchorPeersUpdate) ?([.\/]*)channel-artifacts#\1 $(pwd)/blockchain/channel-artifacts#g' \
      -e '/configtxgen/ i mkdir -p $(pwd)/blockchain/channel-artifacts' \
      "$script"
  fi
done 