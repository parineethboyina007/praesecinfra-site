#!/bin/bash

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Usage: ./verify.sh <domain>"
  exit 1
fi

echo "Fetching transparency state..."

curl -s https://$DOMAIN/bundles/index.json -o index.json
curl -s https://$DOMAIN/bundles/canonical.json -o canonical.json

echo ""
echo "Verifying canonical hash..."

LOCAL_HASH=$(shasum -a 256 canonical.json | awk '{print $1}')
SIGNED_HASH=$(jq -r .signed_state_hash index.json)

echo "Local hash:  $LOCAL_HASH"
echo "Signed hash: $SIGNED_HASH"

if [ "$LOCAL_HASH" != "$SIGNED_HASH" ]; then
  echo "STATE HASH MISMATCH"
  exit 1
fi

echo "STATE HASH VALID"

echo ""
echo "Extracting signature..."

jq -r .state_signature index.json > sig.b64
jq -r .state_public_key index.json > pub.b64

base64 -D -i sig.b64 -o sig.bin
base64 -D -i pub.b64 -o pub.der

openssl pkey -pubin -inform DER -in pub.der -out pub.pem

echo ""
echo "Verifying signature..."

openssl pkeyutl -verify \
-pubin \
-inkey pub.pem \
-rawin \
-in canonical.json \
-sigfile sig.bin

echo ""
echo "Checking DNS witness..."

dig TXT _praesec-merkle.$DOMAIN

echo ""
echo "Downloading transparency bundle..."

curl -s https://$DOMAIN/bundles/praesec-transparency-bundle-v1.zip -o bundle.zip

shasum -a 256 bundle.zip

echo ""
echo "Verification complete."