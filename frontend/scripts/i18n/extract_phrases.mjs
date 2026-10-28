// Collects every English phrase that goes through t()/tn()/T() in src -> phrases.json (unique, source order)
// and lists t() calls whose first argument is not a plain string (so they can be reviewed).
// usage: node extract_phrases.mjs <srcDir> <outJson>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(process.argv[2]);
const outFile = path.resolve(process.argv[3]);
const require = createRequire(path.join(root, "..", "package.json"));
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "locales") continue;
      walk(p, out);
    } else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const phrases = new Map(); // phrase -> first location
const dynamic = [];
for (const file of walk(root)) {
  const code = fs.readFileSync(file, "utf8");
  const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  const rel = path.relative(root, file).replace(/\\/g, "/");
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "Identifier" || !["t", "tn", "T"].includes(c.name)) return;
      const a = p.node.arguments[0];
      if (!a) return;
      const loc = `${rel}:${p.node.loc.start.line}`;
      if (a.type === "StringLiteral") {
        if (!phrases.has(a.value)) phrases.set(a.value, loc);
      } else if (a.type === "TemplateLiteral" && a.expressions.length === 0) {
        const v = a.quasis[0].value.cooked;
        if (!phrases.has(v)) phrases.set(v, loc);
      } else {
        dynamic.push(`${loc}  ${code.slice(a.start, a.end).replace(/\s+/g, " ").slice(0, 90)}`);
      }
    },
  });
}
fs.writeFileSync(outFile, JSON.stringify([...phrases.keys()], null, 1), "utf8");
console.log(`${phrases.size} unique phrases -> ${outFile}`);
console.log(`\n${dynamic.length} t() calls with a non-literal key:`);
console.log(dynamic.join("\n"));
