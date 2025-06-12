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

# Set paths
BLOCKCHAIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create fabric-ca-client home directory
mkdir -p "$BLOCKCHAIN_DIR/organizations/fabric-ca-client"

# Create fabric-ca-client config file
cat > "$BLOCKCHAIN_DIR/organizations/fabric-ca-client/fabric-ca-client-config.yaml" << EOF
version: 1.0.0
client:
  organization: org1
  logging:
    level: info
  cryptoconfig:
    path: ${BLOCKCHAIN_DIR}/organizations
  credentialStore:
    path: ${BLOCKCHAIN_DIR}/organizations/peerOrganizations/org1.permit.com/users
    cryptoStore:
      path: ${BLOCKCHAIN_DIR}/organizations/peerOrganizations/org1.permit.com/msp
  tlsCerts:
    systemCertPool: true
EOF

# Set environment variable for fabric-ca-client
export FABRIC_CA_CLIENT_HOME="$BLOCKCHAIN_DIR/organizations/fabric-ca-client"

# Enroll the admin user for org1
fabric-ca-client enroll \
  -u http://admin:adminpw@localhost:7054 \
  --caname ca-org1 \
  --mspdir "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/users/Admin@org1.permit.com/msp" \
  --tls.certfiles "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org1.permit.com/ca/ca.org1.permit.com-cert.pem"

# Enroll the admin user for org2
fabric-ca-client enroll \
  -u http://admin:adminpw@localhost:8054 \
  --caname ca-org2 \
  --mspdir "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/users/Admin@org2.permit.com/msp" \
  --tls.certfiles "$BLOCKCHAIN_DIR/organizations/peerOrganizations/org2.permit.com/ca/ca.org2.permit.com-cert.pem"

# Enroll the admin user for orderer
fabric-ca-client enroll \
  -u http://admin:adminpw@localhost:9054 \
  --caname ca-orderer \
  --mspdir "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/users/Admin@permit.com/msp" \
  --tls.certfiles "$BLOCKCHAIN_DIR/organizations/ordererOrganizations/permit.com/ca/ca.permit.com-cert.pem"

echo "Fabric CA client setup complete!" 