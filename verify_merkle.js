const fs = require("fs");

// ===== CONFIG =====
const LOG_PATH = "praesec-transparency-bundle-v1/log.jsonl";
const ROOT_PATH = "root.txt";
const LEAF_PATH = "leaf.json";

// ===== CHECK FILES =====
if (!fs.existsSync(LOG_PATH)) {
  console.error("❌ log.jsonl missing");
  process.exit(1);
}

if (!fs.existsSync(ROOT_PATH)) {
  console.error("❌ root.txt missing");
  process.exit(1);
}

if (!fs.existsSync(LEAF_PATH)) {
  console.error("❌ leaf.json missing");
  process.exit(1);
}

// ===== READ FILES =====
const root = fs.readFileSync(ROOT_PATH, "utf-8").trim();
const leaf = JSON.parse(fs.readFileSync(LEAF_PATH, "utf-8"));

const lines = fs.readFileSync(LOG_PATH, "utf-8")
  .trim()
  .split("\n")
  .filter(Boolean);

// ===== PARSE LOG =====
const entries = lines.map((line, i) => {
  try {
    return JSON.parse(line);
  } catch {
    console.error(`❌ Invalid JSON at line ${i + 1}`);
    process.exit(1);
  }
});

// ===== VERIFY HASH CHAIN =====
let valid = true;

for (let i = 1; i < entries.length; i++) {
  const prev = entries[i - 1];
  const curr = entries[i];

  if (curr.prev_log_hash !== prev.log_hash) {
    console.log(`❌ Chain broken at index ${i}`);
    valid = false;
  }
}

// ===== VERIFY ROOT =====
const last = entries[entries.length - 1];

console.log("Computed Root:", last.log_hash);
console.log("Expected Root:", root);

if (last.log_hash !== root) {
  console.log("❌ Root mismatch");
  valid = false;
}

// ===== VERIFY LEAF =====
console.log("Leaf Hash:", leaf.log_hash);

if (leaf.log_hash !== root) {
  console.log("❌ Leaf does not match root");
  valid = false;
}

// ===== FINAL RESULT =====
if (valid) {
  console.log("✅ FULL CHAIN VALID");
} else {
  console.log("❌ INVALID");
}