const fs = require("fs");

// ===== CONFIG =====
const LOG_PATH = "bundle_tmp/praesec-transparency-bundle-v1/log.jsonl";
const OUTPUT_DIR = "bundle_tmp";

// ===== VALIDATE PATH =====
if (!fs.existsSync(LOG_PATH)) {
  console.error("❌ log.jsonl not found at:", LOG_PATH);
  process.exit(1);
}

// ===== READ LOG =====
const lines = fs.readFileSync(LOG_PATH, "utf-8")
  .trim()
  .split("\n")
  .filter(Boolean);

if (lines.length === 0) {
  console.error("❌ log.jsonl is empty");
  process.exit(1);
}

// ===== PARSE LOG =====
const entries = lines.map((line, i) => {
  try {
    return JSON.parse(line);
  } catch {
    console.error(`❌ Invalid JSON at line ${i + 1}`);
    process.exit(1);
  }
});

// ===== VALIDATE HASH CHAIN =====
for (let i = 1; i < entries.length; i++) {
  const prev = entries[i - 1];
  const curr = entries[i];

  if (curr.prev_log_hash !== prev.log_hash) {
    console.error(`❌ Chain broken at index ${i}`);
    process.exit(1);
  }
}

// ===== ROOT (HASH CHAIN MODEL) =====
const last = entries[entries.length - 1];
const root = last.log_hash;

if (!root || root.length !== 64) {
  console.error("❌ Invalid root hash");
  process.exit(1);
}

// ===== ENSURE OUTPUT DIR =====
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ===== WRITE leaf.json =====
const leaf = {
  epoch: last.epoch,
  log_hash: last.log_hash
};

fs.writeFileSync(
  `${OUTPUT_DIR}/leaf.json`,
  JSON.stringify(leaf, null, 2)
);

// ===== WRITE merkle_path.json (compatibility) =====
fs.writeFileSync(
  `${OUTPUT_DIR}/merkle_path.json`,
  JSON.stringify({
    type: "hash_chain",
    path: []
  }, null, 2)
);

// ===== WRITE root.txt =====
fs.writeFileSync(`${OUTPUT_DIR}/root.txt`, root);

// ===== OUTPUT =====
console.log("✅ Hash Chain Root:", root);
console.log("📄 Generated:");
console.log(" - bundle_tmp/leaf.json");
console.log(" - bundle_tmp/merkle_path.json");
console.log(" - bundle_tmp/root.txt");