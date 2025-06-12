#!/bin/bash

# Get the current user's UID and GID
USER_ID=$(id -u)
GROUP_ID=$(id -g)

# Create blockchain directories if they don't exist
mkdir -p blockchain/organizations
mkdir -p blockchain/channel-artifacts

# Set ownership to current user
chown -R $USER_ID:$GROUP_ID blockchain

# Set permissions
chmod -R u+rwX blockchain

echo "Permissions set successfully for blockchain directories" 