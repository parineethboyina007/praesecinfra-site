#!/usr/bin/env bash

set -e

echo "---- PRAESEC STATE SIGNER ----"

INDEX="bundles/index.json"
PRIVATE_KEY="praesec_private.pem"

echo "[1] Removing signature fields..."

jq 'del(.state_signature, .signed_state_hash)' $INDEX > clean.json

echo "[2] Creating canonical JSON..."

jq -c -S '.' clean.json > canonical.json
cp canonical.json bundles/canonical.json

echo "[3] Computing SHA256 hash..."

HASH=$(shasum -a 256 canonical.json | awk '{print $1}')
echo "State Hash: $HASH"

echo "[4] Signing canonical state..."

openssl pkeyutl -sign \
  -inkey $PRIVATE_KEY \
  -rawin \
  -in canonical.json \
  -out sig.bin

base64 -i sig.bin -o state.sig

SIG=$(cat state.sig)

echo "[5] Updating index.json..."

jq \
  --arg hash "$HASH" \
  --arg sig "$SIG" \
  '.signed_state_hash=$hash | .state_signature=$sig' \
  $INDEX > updated.json

mv updated.json $INDEX

echo "[6] Cleaning temporary files..."

rm clean.json canonical.json sig.bin state.sig

echo "---- STATE SUCCESSFULLY SIGNED ----"