# Praesec Transparency Verification

Anyone can independently verify the integrity of Praesec Infra.

## Quick verify
```bash
praesec verify praesecinfra.com


## Independent Verification

Anyone can verify the Praesec transparency state:

git clone https://github.com/parineethboyina007/praesecinfra-site
cd praesecinfra-site

chmod +x verify.sh
./verify.sh praesecinfra.com

# Praesec Transparency Verification

Run:

./verify.sh praesecinfra.com

This verifies:

- canonical state hash
- Ed25519 state signature
- DNS witness anchor
- transparency bundle integrity