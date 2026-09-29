/**
 * Génère un guide PDF à partir de <dossier>/guide.html et <dossier>/captures/.
 * Usage (depuis web/) :
 *   node ../docs/guide-admin/build.cjs                      → Guide administrateur
 *   node ../docs/guide-admin/build.cjs guide-utilisateurs   → Guide utilisateurs
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "..", "web", "node_modules", "@playwright/test"));

const GUIDES = {
  "guide-admin": { pdf: "Guide-administrateur-NECS.pdf", footer: "Guide administrateur de la console" },
  "guide-utilisateurs": { pdf: "Guide-utilisateurs-NECS.pdf", footer: "Guide d’utilisation de l’application" },
};
const KEY = process.argv[2] || "guide-admin";
if (!GUIDES[KEY]) throw new Error(`Guide inconnu : ${KEY} (${Object.keys(GUIDES).join(", ")})`);
const DIR = path.join(__dirname, "..", KEY);
const OUT = path.join(__dirname, "..", GUIDES[KEY].pdf);
const LOGO = path.join(__dirname, "..", "..", "web", "public", "images", "logo-necs.png");

function dataUri(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const toJpeg = (src) =>
    page.evaluate(
      async ({ src }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const maxWidth = img.naturalHeight > img.naturalWidth ? 700 : 1700;
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const g = c.getContext("2d");
        g.fillStyle = "#fff";
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", 0.82);
      },
      { src },
    );

  let html = fs.readFileSync(path.join(DIR, "guide.html"), "utf8");
  const shots = [...html.matchAll(/\{\{img:([\w-]+)\}\}/g)].map((m) => m[1]);
  for (const name of new Set(shots)) {
    const file = path.join(DIR, "captures", `${name}.png`);
    const jpeg = await toJpeg(dataUri(file));
    html = html.split(`{{img:${name}}}`).join(jpeg);
  }
  const date = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  html = html.split("{{logo}}").join(dataUri(LOGO)).split("{{date}}").join(date);

  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: OUT,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font-size:8px;color:#64748b;padding:0 16mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial">
      <span>NECS · ${GUIDES[KEY].footer}</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  await browser.close();
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`PDF généré : ${OUT} (${kb} Ko)`);
})();
