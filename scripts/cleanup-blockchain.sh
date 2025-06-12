#!/bin/bash

# Stop and remove containers
docker-compose -f docker-compose.blockchain.yml down

# Remove volumes
docker volume prune -f

# Clean up blockchain directory
rm -rf blockchain/channel-artifacts/*
rm -rf blockchain/organizations/*
rm -rf blockchain/crypto-config/*

echo "Blockchain network cleaned up successfully!" 