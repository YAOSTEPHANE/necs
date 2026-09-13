const fs = require("fs");
const path = require("path");

const dir = path.join("public", "galerie", "templates");
const coords = [
  "Propreté · Rigueur · Confiance<br />",
  "            Siège : [Adresse complète — Cameroun]<br />",
  "            Tél. : [+237 …] · Email : commercial@necs.cm",
].join("\n");

let n = 0;
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  const fp = path.join(dir, file);
  let html = fs.readFileSync(fp, "utf8");
  if (!html.includes('class="doc-header"')) continue;

  html = html.replace(/<header class="doc-header">[\s\S]*?<\/header>/, (block) => {
    const typeMatch = block.match(/class="doc-type">([^<]+)</);
    const docType = typeMatch ? typeMatch[1].trim() : "Document";

    const pairs = [];
    const re = /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g;
    let m;
    while ((m = re.exec(block))) {
      const label = m[1].replace(/<[^>]+>/g, "").trim();
      let value = m[2]
        .replace(/<span[^>]*>|<\/span>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      pairs.push({ label, value });
    }

    const metaLines = pairs
      .map(({ label, value }) => {
        const l = label.toLowerCase();
        if (
          l.includes("référence") ||
          l.includes("reference") ||
          l === "n°" ||
          l === "nº"
        ) {
          return `          <p class="meta-line">N° <strong>${value}</strong></p>`;
        }
        if (l.includes("date")) {
          return `          <p class="meta-line">Date : <strong>${value}</strong></p>`;
        }
        if (l.includes("valid")) {
          return `          <p class="meta-line">Validité : <strong>${value}</strong></p>`;
        }
        if (l.includes("version")) {
          return `          <p class="meta-line">Version : <strong>${value}</strong></p>`;
        }
        if (l.includes("statut") || l.includes("status")) {
          return `          <p class="meta-line">${value}</p>`;
        }
        return `          <p class="meta-line">${label} : <strong>${value}</strong></p>`;
      })
      .join("\n");

    return `<header class="doc-header">
        <img class="doc-header__logo" src="../assets/logo-necs.png" alt="Logo NECS SARL" />
        <div class="doc-header__brand">
          <p class="coords">
            ${coords}
          </p>
        </div>
        <div class="doc-header__meta">
          <span class="doc-type">${docType}</span>
${metaLines || '          <p class="meta-line">Document NECS</p>'}
        </div>
      </header>`;
  });

  html = html.replace(/\.\.\/assets\/logo-necs\.jpg/g, "../assets/logo-necs.png");
  fs.writeFileSync(fp, html, "utf8");
  n += 1;
  console.log("updated", file);
}

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  const fp = path.join(dir, file);
  let html = fs.readFileSync(fp, "utf8");
  if (!html.includes("pdf-letterhead")) continue;
  const next = html.replace(/\.\.\/assets\/logo-necs\.jpg/g, "../assets/logo-necs.png");
  // Align brand h1 block: ensure entity + coords present (already are)
  // Soften gradient text already handled in CSS
  if (next !== html) {
    fs.writeFileSync(fp, next, "utf8");
    console.log("logo png", file);
  }
}

console.log("total doc-header", n);
