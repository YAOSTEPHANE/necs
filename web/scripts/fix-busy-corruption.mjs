import fs from "fs";
import path from "path";

const dir = "src/components/admin";
let fixed = 0;

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
  const p = path.join(dir, f);
  let src = fs.readFileSync(p, "utf8");
  const before = src;

  // Corrupted setBusy(true) -> (true) after busy guard
  src = src.replace(
    /(if \(busy\) return(?: null)?;)\r?\n(\s*)\(true\);/g,
    "$1\n$2setBusy(true);",
  );

  // Orphan opening brace between guard and setBusy
  src = src.replace(
    /(if \(busy\) return(?: null)?;)\r?\n\{\r?\n(\s*)setBusy\(true\);/g,
    "$1\n$2setBusy(true);",
  );

  if (src !== before) {
    fs.writeFileSync(p, src);
    fixed++;
    console.log("repaired", f);
  }
}

console.log("repaired files:", fixed);

// Report remaining bare (true);
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
  const p = path.join(dir, f);
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/^\s*\(true\);\s*$/.test(line)) {
      console.log("REMAINING", f + ":" + (i + 1), line);
    }
  });
}
