#!/usr/bin/env python3
"""
verify_log.py — Bundle-Safe Transparency Log Verifier

Rules:
- Hash format MUST match append_log.py exactly
- Genesis entry:
    index = 0
    prev_log_hash = 64 zeros
"""

import json
import hashlib
import os
from cryptography.hazmat.primitives import serialization

LOG_PATH = "log.jsonl"
KEY_PATH = "checkpoint_public.pem"


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_pubkey():
    if not os.path.exists(KEY_PATH):
        raise FileNotFoundError(f"❌ Public key missing: {KEY_PATH}")

    return serialization.load_pem_public_key(
        open(KEY_PATH, "rb").read()
    )


def verify():
    if not os.path.exists(LOG_PATH):
        raise FileNotFoundError(f"❌ Log file missing: {LOG_PATH}")

    pub = load_pubkey()
    prev_log_hash = "0" * 64

    with open(LOG_PATH) as f:
        for line_no, line in enumerate(f, start=1):
            entry = json.loads(line)

            # 🔒 MUST MATCH append_log.py EXACTLY
            material = (
                f"{entry['epoch']}|"
                f"{entry['epoch_hash']}|"
                f"{prev_log_hash}"
            ).encode()

            expected_hash = sha256_hex(material)

            if expected_hash != entry["log_hash"]:
                raise Exception(f"❌ CHAIN BREAK at line {line_no}")

            pub.verify(
                bytes.fromhex(entry["signature"]),
                expected_hash.encode()
            )

            prev_log_hash = entry["log_hash"]

    print("✅ FULL LOG VERIFIED — APPEND-ONLY GUARANTEED")


if __name__ == "__main__":
    verify()