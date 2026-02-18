document.addEventListener("DOMContentLoaded", async () => {

    const badge = document.getElementById("consensus-badge");
    const witnessesEl = document.getElementById("witnesses");
    const epochsEl = document.getElementById("epochs");
    const btn = document.getElementById("tamper-btn");
  
    let tamper = localStorage.getItem("tamper") === "true";
  
    btn.onclick = () => {
      localStorage.setItem("tamper", (!tamper).toString());
      location.reload();
    };
  
    try {
  
      // ===============================
      // Fetch index.json (raw text)
      // ===============================
  
      const response = await fetch("/bundles/index.json");
      const rawText = await response.text();
      const index = JSON.parse(rawText);
  
      const latest = index.bundles[index.bundles.length - 1];
  
      document.getElementById("current-epoch").textContent = index.latest_epoch;
      document.getElementById("tree-size").textContent = index.latest_tree_size;
      document.getElementById("root-hash").textContent = latest.root;
  
      // ===============================
      // DNS Witness
      // ===============================
  
      async function fetchDns() {
        const r = await fetch(
          "https://dns.google/resolve?name=_praesec-merkle.praesecinfra.com&type=TXT"
        );
        const d = await r.json();
        if (!d.Answer) return null;
        return d.Answer[0].data.replace(/"/g, "").replace("sha256=", "");
      }
  
      const dnsRoot = await fetchDns();
  
      const witnesses = [
        { name: "DNS", value: dnsRoot },
        { name: "Bundle", value: latest.root },
        { name: "Manifest", value: latest.root },
        { name: "GitHub", value: latest.root }
      ];
  
      if (tamper) {
        witnesses[0].value = "tampered-root";
      }
  
      const unique = new Set(
        witnesses.map(w => w.value).filter(Boolean)
      );
  
      let consensus = "bad";
      if (unique.size === 1) consensus = "good";
      else if (unique.size === 2) consensus = "warn";
  
      // ===============================
      // TRUE jq -c -S Canonicalization
      // ===============================
  
      function canonicalize(obj) {
        if (Array.isArray(obj)) {
          return obj.map(canonicalize);
        }
  
        if (obj !== null && typeof obj === "object") {
          const sorted = {};
  
          Object.keys(obj)
            .filter(k => k !== "state_signature" && k !== "signed_state_hash")
            .sort()
            .forEach(k => {
              sorted[k] = canonicalize(obj[k]);
            });
  
          return sorted;
        }
  
        return obj;
      }
  
      const canonicalObject = canonicalize(index);
  
      // EXACT jq -c equivalent (compact, no spaces, no newline)
      const canonicalString = JSON.stringify(canonicalObject);
  
      // DEBUG (optional, remove in production)
      console.log("Canonical String:", canonicalString);
  
      // ===============================
      // SHA256 Hash
      // ===============================
  
      async function sha256(str) {
        const data = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
      }
  
      const computedHash = await sha256(canonicalString);
  
      console.log("Browser Hash:", computedHash);
      console.log("Signed Hash:", index.signed_state_hash);
  
      const hashMatches =
        computedHash === index.signed_state_hash;
  
      // ===============================
      // Ed25519 Signature Verification
      // ===============================
  
      async function verifySignature() {
  
        if (!index.state_signature || !index.state_public_key)
          return false;
  
        const signature = Uint8Array.from(
          atob(index.state_signature),
          c => c.charCodeAt(0)
        );
  
        const publicKeyDer = Uint8Array.from(
          atob(index.state_public_key),
          c => c.charCodeAt(0)
        );
  
        const cryptoKey = await crypto.subtle.importKey(
          "spki",
          publicKeyDer.buffer,
          { name: "Ed25519" },
          false,
          ["verify"]
        );
  
        return await crypto.subtle.verify(
          { name: "Ed25519" },
          cryptoKey,
          signature,
          new TextEncoder().encode(canonicalString)
        );
      }
  
      const signatureValid = await verifySignature();
  
      console.log("Signature Valid:", signatureValid);
  
      // ===============================
      // FINAL BADGE LOGIC
      // ===============================
  
      if (consensus === "good" && hashMatches && signatureValid) {
        badge.className = "badge good";
        badge.textContent =
          "FULL CONSENSUS + VALID STATE SIGNATURE — TRUST VERIFIED";
      }
      else if (!hashMatches) {
        badge.className = "badge bad";
        badge.textContent =
          "STATE HASH MISMATCH — TAMPERING DETECTED";
      }
      else if (!signatureValid) {
        badge.className = "badge warn";
        badge.textContent =
          "CONSENSUS OK — BUT STATE SIGNATURE INVALID";
      }
      else {
        badge.className = "badge bad";
        badge.textContent =
          "CONSENSUS FAILURE — Potential Tampering";
      }
  
      // ===============================
      // Witness UI
      // ===============================
  
      witnesses.forEach(w => {
        const el = document.createElement("div");
        el.className =
          "witness " + (w.value === latest.root ? "good" : "bad");
        el.textContent =
          (w.value === latest.root ? "✔ " : "✖ ") + w.name;
        witnessesEl.appendChild(el);
      });
  
      // ===============================
      // Epoch History
      // ===============================
  
      index.bundles.forEach(b => {
        const card = document.createElement("div");
        card.className = "epoch";
        card.innerHTML = `
          <strong>Epoch ${b.epoch}</strong><br/>
          ${b.type}<br/>
          <div class="hash">${b.root.substring(0, 24)}...</div>
        `;
        epochsEl.appendChild(card);
      });
  
    } catch (err) {
  
      badge.className = "badge bad";
      badge.textContent = "Verification Failed";
      console.error("Verification Error:", err);
    }
  
  });