#!/usr/bin/env bash

set -e

echo "---- PRAESEC STATE SIGNER ----"

INDEX="bundles/index.json"
ROOT_INDEX="index.json"
PRIVATE_KEY="praesec_private.pem"

# ================================
# Step 0: Check required files
# ================================

if [ ! -f "$INDEX" ]; then
  echo "❌ ERROR: $INDEX not found"
  exit 1
fi

if [ ! -f "$PRIVATE_KEY" ]; then
  echo "❌ ERROR: Private key not found"
  exit 1
fi

# ================================
# Step 1: Remove old signature
# ================================

echo "[1] Removing signature fields..."

jq 'del(.state_signature, .signed_state_hash)' $INDEX > clean.json

# ================================
# Step 2: Create canonical JSON
# ================================

echo "[2] Creating canonical JSON..."

jq -c -S '.' clean.json > canonical.json

# ALSO STORE FOR PRODUCTION
cp canonical.json bundles/canonical.json

# ================================
# Step 3: Compute SHA256
# ================================

echo "[3] Computing SHA256 hash..."

HASH=$(shasum -a 256 canonical.json | awk '{print $1}')
echo "State Hash: $HASH"

# ================================
# Step 4: Sign canonical
# ================================

echo "[4] Signing canonical state..."

openssl pkeyutl -sign \
  -inkey $PRIVATE_KEY \
  -rawin \
  -in canonical.json \
  -out sig.bin

base64 -i sig.bin -o state.sig

SIG=$(cat state.sig)

# ================================
# Step 5: Update index.json
# ================================

echo "[5] Updating index.json..."

jq \
  --arg hash "$HASH" \
  --arg sig "$SIG" \
  '.signed_state_hash=$hash | .state_signature=$sig' \
  $INDEX > updated.json

mv updated.json $INDEX

# ================================
# Step 6: Sync root index.json
# ================================

echo "[6] Syncing root index.json..."

cp $INDEX $ROOT_INDEX

# ================================
# Step 7: Cleanup (SAFE)
# ================================

echo "[7] Cleaning temporary files..."

rm clean.json sig.bin state.sig

# NOTE: DO NOT DELETE canonical.json ❗

echo "---- STATE SUCCESSFULLY SIGNED ----"