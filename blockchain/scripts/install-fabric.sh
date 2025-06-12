#!/bin/bash
# Do not use sudo. All operations must run as a regular user.
if [[ $EUID -eq 0 ]]; then
  echo "ERROR: This script must NOT be run as root or with sudo. Exiting." >&2
  exit 1
fi
if command -v sudo >/dev/null 2>&1; then
  if sudo -n true 2>/dev/null; then
    echo "ERROR: Sudo is available, but this script must not use sudo. Exiting." >&2
    exit 1
  fi
fi
set -e

# Set Fabric config path to blockchain directory
export FABRIC_CFG_PATH=$(cd "$(dirname "$0")/.." && pwd)

# Create bin directory if it doesn't exist
mkdir -p ../bin

# Download Fabric binaries
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.1 1.5.5

# Move binaries to bin directory
mv bin/* ../bin/

# Clean up
rm -rf bin config

echo "Fabric binaries installed successfully." 