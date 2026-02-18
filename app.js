document.addEventListener("DOMContentLoaded", async () => {

    const badge = document.getElementById("consensus-badge");
    const btn = document.getElementById("tamper-btn");
  
    let tamper = localStorage.getItem("tamper") === "true";
  
    btn.onclick = () => {
      localStorage.setItem("tamper", (!tamper).toString());
      location.reload();
    };
  
    try {
  
      // ==========================================
      // Fetch index.json as TEXT (important)
      // ==========================================
  
      const res = await fetch("/bundles/index.json");
      const rawText = await res.text();
      const index = JSON.parse(rawText);
  
      const latest = index.bundles[index.bundles.length - 1];
  
      document.getElementById("current-epoch").textContent = index.latest_epoch;
      document.getElementById("tree-size").textContent = index.latest_tree_size;
      document.getElementById("root-hash").textContent = latest.root;
  
      // ==========================================
      // DNS Witness
      // ==========================================
  
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
  
      const unique = new Set(witnesses.map(w => w.value).filter(Boolean));
  
      let consensus = "bad";
      if (unique.size === 1) consensus = "good";
      else if (unique.size === 2) consensus = "warn";
  
      // ==========================================
      // EXACT jq -c -S compatible canonicalizer
      // ==========================================
  
      function canonicalize(value) {
  
        if (value === null) return "null";
  
        if (typeof value !== "object") {
          return JSON.stringify(value);
        }
  
        if (Array.isArray(value)) {
          return "[" + value.map(v => canonicalize(v)).join(",") + "]";
        }
  
        // object
        const keys = Object.keys(value)
          .filter(k => k !== "state_signature" && k !== "signed_state_hash")
          .sort();
  
        return "{" + keys.map(k =>
          JSON.stringify(k) + ":" + canonicalize(value[k])
        ).join(",") + "}";
      }
  
      const canonicalString = canonicalize(index);
  
      // ==========================================
      // SHA256
      // ==========================================
  
      async function sha256(str) {
        const data = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
      }
  
      const browserHash = await sha256(canonicalString);
  
      console.log("Browser Hash:", browserHash);
      console.log("Signed Hash:", index.signed_state_hash);
  
      const hashMatches = browserHash === index.signed_state_hash;
  
      // ==========================================
      // Signature Verification (Ed25519)
      // ==========================================
  
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
  
      // ==========================================
      // Final Badge Logic
      // ==========================================
  
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
  
    } catch (err) {
      badge.className = "badge bad";
      badge.textContent = "Verification Failed";
      console.error(err);
    }
  
  });