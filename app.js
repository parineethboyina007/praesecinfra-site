document.addEventListener("DOMContentLoaded", async () => {
    const epochContainer = document.getElementById("epochs");
    const detailsPanel = document.getElementById("details");
    const epochTitle = document.getElementById("epoch-title");
    const epochData = document.getElementById("epoch-data");
    const header = document.querySelector("header");
  
    // 🔎 Fetch DNS TXT record using DNS-over-HTTPS (Cloudflare)
    async function fetchDnsRoot() {
      try {
        const response = await fetch(
          "https://cloudflare-dns.com/dns-query?name=_praesec-merkle.praesecinfra.com&type=TXT",
          {
            headers: {
              "accept": "application/dns-json"
            }
          }
        );
  
        const data = await response.json();
  
        if (!data.Answer || data.Answer.length === 0) {
          return null;
        }
  
        // Extract TXT value
        const txtRecord = data.Answer[0].data.replace(/"/g, "");
        return txtRecord.replace("sha256=", "");
      } catch (error) {
        console.error("DNS fetch error:", error);
        return null;
      }
    }
  
    try {
      // 📦 Load transparency bundle index
      const response = await fetch("/bundles/index.json");
      const index = await response.json();
  
      if (!index.bundles || index.bundles.length === 0) {
        throw new Error("No bundles found in index.json");
      }
  
      const latestBundle = index.bundles[index.bundles.length - 1];
      const bundleRoot = latestBundle.root;
  
      // 🗂 Render Epoch Cards
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
  
      // 🔐 LIVE DNS VERIFICATION BADGE
      const badge = document.createElement("div");
      badge.className = "sync-badge";
  
      badge.innerHTML = "🔎 Verifying DNS Root...";
      header.appendChild(badge);
  
      const dnsRoot = await fetchDnsRoot();
  
      if (!dnsRoot) {
        badge.classList.add("mismatch");
        badge.innerHTML = "⚠️ Unable to Fetch DNS Root";
        return;
      }
  
      if (dnsRoot === bundleRoot) {
        badge.classList.add("verified");
        badge.innerHTML = "🟢 LIVE DNS Verified — Transparency Intact";
      } else {
        badge.classList.add("mismatch");
        badge.innerHTML = "🔴 DNS ROOT MISMATCH — Potential Tampering";
      }
  
    } catch (err) {
      console.error("Error loading transparency index:", err);
  
      const errorBadge = document.createElement("div");
      errorBadge.className = "sync-badge mismatch";
      errorBadge.innerHTML = "❌ Transparency Index Load Failed";
      header.appendChild(errorBadge);
    }
  });