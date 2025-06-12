#!/bin/bash
set -e
ARTIFACTS=(genesis.block channel.tx Org1MSPanchors.tx Org2MSPanchors.tx)
ARTIFACT_DIR="$(pwd)/blockchain/channel-artifacts"
MAX_AGE_MINUTES=30

for artifact in "${ARTIFACTS[@]}"; do
  file="$ARTIFACT_DIR/$artifact"
  if [[ ! -f "$file" ]]; then
    echo "[ERROR] Missing artifact: $file"
    continue
  fi
  size=$(stat -c%s "$file")
  if [[ $size -le 0 ]]; then
    echo "[ERROR] Artifact $file is empty!"
    continue
  fi
  mtime=$(stat -c %Y "$file")
  now=$(date +%s)
  age=$(( (now - mtime) / 60 ))
  if [[ $age -gt $MAX_AGE_MINUTES ]]; then
    echo "[WARNING] Artifact $file is older than $MAX_AGE_MINUTES minutes ($age min old)"
  else
    echo "[OK] $file exists, size $size bytes, age $age min"
  fi
done 