## Canonicalization Policy

- Epoch-2: legacy string-based canonical format (pre-Step-23)
- Epoch-3+: canonical JSON (jq -cS) format

Legacy epochs remain valid and anchored.
Canonical epochs MUST NOT change format.

# Praesec Transparency — Independent Audit Guide

This repository enables **offline, trust-minimized verification**
of Praesec transparency epochs.

No server access is required.

---

## Required Files

- governance/transparency/index.json
- governance/witnesses/epoch-*-payload.json
- praesec_log/keys/checkpoint_public.pem
- governance/offline_audit/verify_epoch3_offline.py

---

## Step 1 — Verify Transparency Index

```bash
jq '.' governance/transparency/index.json