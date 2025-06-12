#!/bin/bash

# Exit on first error
set -e

# Package chaincode
peer lifecycle chaincode package permitcontract.tar.gz \
  --path ../chaincode \
  --lang node \
  --label permitcontract_1.0

echo "Chaincode packaged successfully" 