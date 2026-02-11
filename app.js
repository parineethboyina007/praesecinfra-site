document.addEventListener("DOMContentLoaded", async () => {
    const epochContainer = document.getElementById("epochs");
    const detailsPanel = document.getElementById("details");
    const epochTitle = document.getElementById("epoch-title");
    const epochData = document.getElementById("epoch-data");
    const header = document.querySelector("header");
  
    let simulateTamper = false;
  
    async function fetchDnsRoot() {
      try {
        const response = await fetch(
          "https://cloudflare-dns.com/dns-query?name=_praesec-merkle.praesecinfra.com&type=TXT",
          { headers: { "accept": "application/dns-json" } }
        );
  
        const data = await response.json();
        if (!data.Answer || data.Answer.length === 0) return null;
  
        const txtRecord = data.Answer[0].data.replace(/"/g, "");
        return txtRecord.replace("sha256=", "");
      } catch (error) {
        console.error("DNS fetch error:", error);
        return null;
      }
    }
  
    function createTamperToggle() {
      const toggle = document.createElement("button");
      toggle.className = "tamper-toggle";
      toggle.textContent = "Simulate Tamper";
      toggle.onclick = () => {
        simulateTamper = !simulateTamper;
        toggle.textContent = simulateTamper
          ? "Disable Tamper Simulation"
          : "Simulate Tamper";
        location.reload();
      };
      header.appendChild(toggle);
    }
  
    try {
      const response = await fetch("/bundles/index.json");
      const index = await response.json();
  
      const latestBundle = index.bundles[index.bundles.length - 1];
      const bundleRoot = latestBundle.root;
  
      // Render Epoch Cards
      index.bundles.forEach(bundle => {
        const card = document.createElement("div");
        card.className = "epoch-card";
        card.innerHTML = `
          <h3>Epoch ${bundle.epoch}</h3>
          <p>Type: ${bundle.type}</p>
          <p>Root: ${bundle.root.substring(0, 20)}...</p>
        `;
        card.onclick = () => {
          epochTitle.textContent = `Epoch ${bundle.epoch} Details`;
          epochData.textContent = JSON.stringify(bundle, null, 2);
          detailsPanel.classList.remove("hidden");
        };
        epochContainer.appendChild(card);
      });
  
      const badge = document.createElement("div");
      badge.className = "sync-badge";
      badge.innerHTML = "🔎 Verifying DNS Root...";
      header.appendChild(badge);
  
      createTamperToggle();
  
      const dnsRoot = await fetchDnsRoot();
  
      if (!dnsRoot) {
        badge.classList.add("mismatch");
        badge.innerHTML = "⚠️ Unable to Fetch DNS Root";
        return;
      }
  
      const effectiveRoot = simulateTamper
        ? dnsRoot.substring(0, dnsRoot.length - 1) + "0"
        : dnsRoot;
  
      if (effectiveRoot === bundleRoot) {
        badge.classList.add("verified");
        badge.innerHTML = "🟢 LIVE DNS Verified — Transparency Intact";
      } else {
        badge.classList.add("mismatch");
        badge.innerHTML = "🔴 DNS ROOT MISMATCH — Potential Tampering";
      }
  
    } catch (err) {
      console.error("Transparency load error:", err);
    }
  });