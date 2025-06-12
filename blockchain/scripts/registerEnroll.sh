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

# Exit on any error
set -e

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Check if identity exists
check_identity_exists() {
    local ca_name=$1
    local id_name=$2
    local tls_cert=$3
    local msp_dir=$4

    if fabric-ca-client identity list --caname $ca_name --tls.certfiles $tls_cert --mspdir $msp_dir 2>/dev/null | grep -q "$id_name"; then
        return 0
    else
        return 1
    fi
}

# Check if MSP is populated
check_msp_populated() {
    local msp_dir=$1
    if [ -d "$msp_dir/signcerts" ] && [ -d "$msp_dir/keystore" ] && [ -d "$msp_dir/cacerts" ]; then
        return 0
    else
        return 1
    fi
}

# Enroll admin identity
enroll_admin() {
    local org=$1
    local ca_port=$2
    local ca_name=$3
    local msp_dir=$4
    local tls_cert=$5

    log "Enrolling admin for $org..."
    if check_msp_populated "$msp_dir"; then
        log "Admin MSP already exists for $org, skipping enrollment"
        return
    fi

    fabric-ca-client enroll -u http://admin:adminpw@localhost:$ca_port \
        --caname $ca_name \
        --mspdir $msp_dir \
        --tls.certfiles $tls_cert

    log "Admin enrolled successfully for $org"
    log "MSP directory: $msp_dir"
}

# Register and enroll identity
register_enroll() {
    local org=$1
    local ca_port=$2
    local ca_name=$3
    local id_name=$4
    local id_secret=$5
    local id_type=$6
    local affiliation=$7
    local msp_dir=$8
    local tls_cert=$9
    local admin_msp_dir=${10}

    log "Processing $id_name for $org..."

    # Check if identity exists
    if check_identity_exists $ca_name $id_name $tls_cert $admin_msp_dir; then
        log "Identity $id_name already exists, skipping registration"
    else
        log "Registering $id_name..."
        fabric-ca-client register \
            --caname $ca_name \
            --id.name $id_name \
            --id.secret $id_secret \
            --id.type $id_type \
            --id.affiliation $affiliation \
            --tls.certfiles $tls_cert \
            --mspdir $admin_msp_dir
        log "Registration successful for $id_name"
    fi

    # Check if MSP is populated
    if check_msp_populated "$msp_dir"; then
        log "MSP already exists for $id_name, skipping enrollment"
        return
    fi

    log "Enrolling $id_name..."
    fabric-ca-client enroll -u http://$id_name:$id_secret@localhost:$ca_port \
        --caname $ca_name \
        --mspdir $msp_dir \
        --tls.certfiles $tls_cert

    log "Enrollment successful for $id_name"
    log "MSP directory: $msp_dir"
}

# Main execution
log "Starting identity registration and enrollment process..."

# Enroll org1 admin
enroll_admin "org1" "7054" "ca-org1" \
    "blockchain/organizations/peerOrganizations/org1.permit.com/users/admin@org1.permit.com/msp" \
    "blockchain/organizations/peerOrganizations/org1.permit.com/ca/ca.org1.permit.com-cert.pem"

# Register and enroll org1 identities
register_enroll "org1" "7054" "ca-org1" "User1@org1" "userpw" "client" "org1.department1" \
    "blockchain/organizations/peerOrganizations/org1.permit.com/users/User1@org1/msp" \
    "blockchain/organizations/peerOrganizations/org1.permit.com/ca/ca.org1.permit.com-cert.pem" \
    "blockchain/organizations/peerOrganizations/org1.permit.com/users/admin@org1.permit.com/msp"

register_enroll "org1" "7054" "ca-org1" "peer0.org1" "peerpw" "peer" "org1.department1" \
    "blockchain/organizations/peerOrganizations/org1.permit.com/peers/peer0.org1/msp" \
    "blockchain/organizations/peerOrganizations/org1.permit.com/ca/ca.org1.permit.com-cert.pem" \
    "blockchain/organizations/peerOrganizations/org1.permit.com/users/admin@org1.permit.com/msp"

# Enroll org2 admin
enroll_admin "org2" "8054" "ca-org2" \
    "blockchain/organizations/peerOrganizations/org2.permit.com/users/admin@org2.permit.com/msp" \
    "blockchain/organizations/peerOrganizations/org2.permit.com/ca/ca.org2.permit.com-cert.pem"

# Register and enroll org2 identities
register_enroll "org2" "8054" "ca-org2" "User1@org2" "userpw" "client" "org2.department1" \
    "blockchain/organizations/peerOrganizations/org2.permit.com/users/User1@org2/msp" \
    "blockchain/organizations/peerOrganizations/org2.permit.com/ca/ca.org2.permit.com-cert.pem" \
    "blockchain/organizations/peerOrganizations/org2.permit.com/users/admin@org2.permit.com/msp"

register_enroll "org2" "8054" "ca-org2" "peer0.org2" "peerpw" "peer" "org2.department1" \
    "blockchain/organizations/peerOrganizations/org2.permit.com/peers/peer0.org2/msp" \
    "blockchain/organizations/peerOrganizations/org2.permit.com/ca/ca.org2.permit.com-cert.pem" \
    "blockchain/organizations/peerOrganizations/org2.permit.com/users/admin@org2.permit.com/msp"

# Enroll orderer admin
enroll_admin "orderer" "9054" "ca-orderer" \
    "blockchain/organizations/ordererOrganizations/permit.com/users/Admin@permit.com/msp" \
    "blockchain/organizations/ordererOrganizations/permit.com/ca/ca.permit.com-cert.pem"

# Register and enroll orderer
register_enroll "orderer" "9054" "ca-orderer" "orderer.permit.com" "ordererpw" "orderer" "orderer" \
    "blockchain/organizations/ordererOrganizations/permit.com/orderers/orderer.permit.com/msp" \
    "blockchain/organizations/ordererOrganizations/permit.com/ca/ca.permit.com-cert.pem" \
    "blockchain/organizations/ordererOrganizations/permit.com/users/Admin@permit.com/msp"

log "Identity registration and enrollment process completed successfully" 