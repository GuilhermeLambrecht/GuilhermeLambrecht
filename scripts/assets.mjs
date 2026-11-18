// Gera os SVGs estáticos do perfil (cabeçalho, editor, títulos de seção e rodapé) em PT e EN.
// Uso: node scripts/assets.mjs   → grava em assets/
// Rode de novo e faça commit sempre que mudar algum texto aqui.
import { mkdirSync, writeFileSync } from "node:fs";
import { THEMES, esc, windowFrame, prompt, typed, appear, cursor, svg } from "./lib.mjs";

const t = THEMES.dark;
const OUT = new URL("../assets/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const TEXT = {
  pt: {
    role: [["Desenvolvedor Fullstack", "text"], [" @ ", "muted"], ["Vocare Contabilidade", "orange"]],
    stack: [["TypeScript", "blue"], [" · ", "muted"], ["Python", "yellow"], [" · ", "muted"], ["Node.js", "accent"], [" · ", "muted"], ["React", "cyan"], [" · ", "muted"], ["IA", "purple"]],
    place: "Pelotas, RS — Brasil",
    cmdRole: "cat cargo.txt", cmdStack: "cat stack.txt", cmdPlace: "echo $LOCAL",
    tagline: "// fullstack · automação · ia",
    titleBar: "guilherme@github: ~ — zsh",
    editorTabs: ["guilherme.ts", "README.md"],
    code: [
      [["const ", "red"], ["guilherme", "blue"], [" = {", "soft"]],
      [["  cargo", "cyan"], [": ", "soft"], ['"Dev Fullstack @ Vocare"', "string"], [",", "soft"]],
      [["  formacao", "cyan"], [": ", "soft"], ['"ADS — UniSenac (3º sem.)"', "string"], [",", "soft"]],
      [["  stack", "cyan"], [": [", "soft"], ['"TypeScript"', "string"], [", ", "soft"], ['"Python"', "string"], [", ", "soft"], ['"Node.js"', "string"], [",", "soft"]],
      [["          ", "soft"], ['"NestJS"', "string"], [", ", "soft"], ['"React"', "string"], [", ", "soft"], ['"Next.js"', "string"], ["],", "soft"]],
      [["  infra", "cyan"], [": [", "soft"], ['"PostgreSQL"', "string"], [", ", "soft"], ['"Docker"', "string"], [", ", "soft"], ['"Oracle"', "string"], ["],", "soft"]],
      [["  foco", "cyan"], [": [", "soft"], ['"gestão"', "string"], [", ", "soft"], ['"integrações"', "string"], [", ", "soft"], ['"IA"', "string"], ["],", "soft"]],
      [["  remoto", "cyan"], [": ", "soft"], ["true", "blue"], [",", "soft"]],
      [["} ", "soft"], ["as const", "red"], [";", "soft"]],
      [],
      [["// TODO: ", "orange"], ["fazer durar, não só funcionar", "muted"]],
    ],
    status: ["⎇ main", "✓ 0 problemas", "UTF-8  TypeScript"],
    footer: {
      msg: "obrigado pela visita!",
      out: " 1 visitante alterado, 1 inserção(+)",
    },
    sections: [
      ["01", "sobre_mim", "quem sou eu"],
      ["02", "experiencia", "onde trabalho"],
      ["03", "projetos", "o que construí"],
      ["04", "stack", "com o que trabalho"],
      ["05", "estudando", "o que estou aprendendo"],
      ["06", "estatisticas", "números do github"],
      ["07", "contribuicoes", "último ano"],
      ["08", "contato", "vamos conversar"],
    ],
  },
  en: {
    role: [["Fullstack Developer", "text"], [" @ ", "muted"], ["Vocare Contabilidade", "orange"]],
    stack: [["TypeScript", "blue"], [" · ", "muted"], ["Python", "yellow"], [" · ", "muted"], ["Node.js", "accent"], [" · ", "muted"], ["React", "cyan"], [" · ", "muted"], ["AI", "purple"]],
    place: "Pelotas, RS — Brazil",
    cmdRole: "cat role.txt", cmdStack: "cat stack.txt", cmdPlace: "echo $LOCATION",
    tagline: "// fullstack · automation · ai",
    titleBar: "guilherme@github: ~ — zsh",
    editorTabs: ["guilherme.ts", "README.md"],
    code: [
      [["const ", "red"], ["guilherme", "blue"], [" = {", "soft"]],
      [["  role", "cyan"], [": ", "soft"], ['"Fullstack Dev @ Vocare"', "string"], [",", "soft"]],
      [["  education", "cyan"], [": ", "soft"], ['"Systems Dev — UniSenac"', "string"], [",", "soft"]],
      [["  stack", "cyan"], [": [", "soft"], ['"TypeScript"', "string"], [", ", "soft"], ['"Python"', "string"], [", ", "soft"], ['"Node.js"', "string"], [",", "soft"]],
      [["          ", "soft"], ['"NestJS"', "string"], [", ", "soft"], ['"React"', "string"], [", ", "soft"], ['"Next.js"', "string"], ["],", "soft"]],
      [["  infra", "cyan"], [": [", "soft"], ['"PostgreSQL"', "string"], [", ", "soft"], ['"Docker"', "string"], [", ", "soft"], ['"Oracle"', "string"], ["],", "soft"]],
      [["  focus", "cyan"], [": [", "soft"], ['"management"', "string"], [", ", "soft"], ['"integrations"', "string"], [", ", "soft"], ['"AI"', "string"], ["],", "soft"]],
      [["  remote", "cyan"], [": ", "soft"], ["true", "blue"], [",", "soft"]],
      [["} ", "soft"], ["as const", "red"], [";", "soft"]],
      [],
      [["// TODO: ", "orange"], ["make it last, not just work", "muted"]],
    ],
    status: ["⎇ main", "✓ 0 problems", "UTF-8  TypeScript"],
    footer: {
      msg: "thanks for visiting!",
      out: " 1 visitor changed, 1 insertion(+)",
    },
    sections: [
      ["01", "about_me", "who I am"],
      ["02", "experience", "where I work"],
      ["03", "projects", "what I've built"],
      ["04", "stack", "what I work with"],
      ["05", "learning", "what I'm studying"],
      ["06", "stats", "github numbers"],
      ["07", "contributions", "last year"],
      ["08", "contact", "let's talk"],
    ],
  },
};

const spans = (parts) => parts.map(([s, c]) => `<tspan fill="${t[c]}">${esc(s)}</tspan>`).join("");

// ---------- monograma "GL" em pixels ----------
const GLYPHS = {
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
};
function monogram(x0, y0, cell = 13, startAt = 0.2) {
  let px = "", i = 0;
  ["G", "L"].forEach((ch, k) => {
    GLYPHS[ch].forEach((row, r) => {
      [...row].forEach((c, col) => {
        if (c !== "#") return;
        const x = x0 + k * 6 * cell + col * cell, y = y0 + r * cell;
        px += `<rect x="${x}" y="${y}" width="${cell - 2}" height="${cell - 2}" rx="2" fill="url(#mg)" opacity="0">${appear(startAt + i++ * 0.03)}</rect>`;
      });
    });
  });
  return `<defs>
<linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.blue}"/></linearGradient>
<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<g filter="url(#glow)"><animate attributeName="opacity" values="1;.55;1" dur="3.2s" begin="2s" repeatCount="indefinite"/>${px}</g>`;
}

// ---------- cabeçalho: terminal ----------
function terminal(L) {
  const W = 1000, H = 372;
  let body = windowFrame(W, H, L.titleBar, t, { bar: 44, radius: 14 });
  body += monogram(790, 92);
  body += `<text x="860" y="226" text-anchor="middle" font-size="13" fill="${t.muted}" opacity="0">${appear(1.6)}${esc(L.tagline)}</text>`;

  let clock = 0.4, y = 86;
  const LH = 30;
  const cmd = (c) => {
    const tp = typed(c, t.soft, clock);
    const line = `<text x="30" y="${y}" font-size="16" opacity="0">${appear(clock - 0.2)}${prompt(t)}${tp.svg}</text>`;
    clock = tp.end + 0.25; y += LH;
    return line;
  };
  const out = (inner, size = 16, weight = 400) => {
    const line = `<text x="30" y="${y}" font-size="${size}" font-weight="${weight}" opacity="0">${appear(clock)}${inner}</text>`;
    clock += 0.35; y += LH;
    return line;
  };

  body += cmd("whoami");
  y += 4; body += out(`<tspan fill="${t.text}">Guilherme Lambrecht</tspan>`, 26, 700); y += 2;
  body += cmd(L.cmdRole);
  body += out(spans(L.role));
  body += cmd(L.cmdStack);
  body += out(spans(L.stack));
  body += cmd(L.cmdPlace);
  body += out(`<tspan fill="${t.string}">${esc(L.place)}</tspan>`);
  body += `<text x="30" y="${y}" font-size="16" opacity="0">${appear(clock)}${prompt(t)}${cursor(t.soft, clock)}</text>`;
  return svg(W, H, body);
}

// ---------- editor de código ----------
function editor(L) {
  const W = 560, H = 390, BAR = 40, TABS = 34;
  let body = windowFrame(W, H, "~/perfil — code", t, { bar: BAR });
  body += `<rect x="1" y="${BAR + 1}" width="${W - 2}" height="${TABS}" fill="${t.panel}"/>
<rect x="1" y="${BAR + 1}" width="168" height="${TABS}" fill="${t.bg}"/><rect x="1" y="${BAR + 1}" width="168" height="2" fill="${t.accent}"/>
<text x="16" y="${BAR + 23}" font-size="11" font-weight="700" fill="#3178c6">TS</text><text x="38" y="${BAR + 23}" font-size="13" fill="${t.soft}">${esc(L.editorTabs[0])}</text>
<text x="188" y="${BAR + 23}" font-size="13" fill="${t.muted}">${esc(L.editorTabs[1])}</text>
<rect x="1" y="${BAR + TABS + 1}" width="${W - 2}" height="1" fill="${t.border}"/>`;
  const y0 = BAR + TABS + 30, LH = 23;
  L.code.forEach((parts, i) => {
    const y = y0 + i * LH, at = 0.3 + i * 0.22;
    body += `<text x="34" y="${y}" font-size="13" text-anchor="end" fill="${t.muted}" fill-opacity=".55">${i + 1}</text>`;
    body += `<text x="50" y="${y}" font-size="13.5" opacity="0">${appear(at)}${spans(parts)}</text>`;
  });
  const sb = H - 28;
  body += `<path d="M1 ${sb} H${W - 1} V${H - 13} a12 12 0 0 1 -12 12 H13 a12 12 0 0 1 -12 -12Z" fill="${t.accent}"/>
<text x="14" y="${sb + 18}" font-size="12" fill="${t.bg}">${esc(L.status[0])}</text>
<text x="90" y="${sb + 18}" font-size="12" fill="${t.bg}">${esc(L.status[1])}</text>
<text x="${W - 14}" y="${sb + 18}" font-size="12" fill="${t.bg}" text-anchor="end">${esc(L.status[2])}</text>`;
  return svg(W, H, body);
}

// ---------- título de seção ----------
function section([num, name, comment]) {
  const W = 1000, H = 58;
  const body = `<defs><linearGradient id="ln" x1="0" x2="1"><stop offset="0" stop-color="${t.accent}"/><stop offset=".6" stop-color="${t.accent}" stop-opacity=".15"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="${t.bg}" stroke="${t.border}"/>
<rect x="16" y="14" width="44" height="30" rx="6" fill="${t.accent}"/>
<text x="38" y="35" text-anchor="middle" font-size="16" font-weight="700" fill="${t.bg}">${num}</text>
<text x="76" y="37" font-size="22" font-weight="700"><tspan fill="${t.purple}">fn </tspan><tspan fill="${t.text}">${esc(name)}</tspan><tspan fill="${t.orange}">()</tspan>${cursor(t.accent)}</text>
<text x="${W - 20}" y="35" text-anchor="end" font-size="14" fill="${t.muted}">// ${esc(comment)}</text>
<rect x="16" y="${H - 6}" width="${W - 32}" height="2" rx="1" fill="url(#ln)"/>`;
  return svg(W, H, body);
}

// ---------- rodapé ----------
function footer(L) {
  const W = 1000, H = 150;
  let body = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${t.bg}" stroke="${t.border}" stroke-width="2"/>`;
  const tp = typed(`git commit -m "${L.footer.msg}"`, t.soft, 0.4, 22);
  body += `<text x="30" y="42" font-size="16" opacity="0">${appear(0.2)}${prompt(t)}${tp.svg}</text>`;
  const a = tp.end + 0.3;
  body += `<text x="30" y="70" font-size="15" opacity="0">${appear(a)}<tspan fill="${t.muted}">[</tspan><tspan fill="${t.accent}">main</tspan><tspan fill="${t.orange}"> 7h4nk5</tspan><tspan fill="${t.muted}">] </tspan><tspan fill="${t.soft}">${esc(L.footer.msg)}</tspan></text>`;
  body += `<text x="30" y="94" font-size="15" opacity="0">${appear(a + 0.25)}<tspan fill="${t.accent}">${esc(L.footer.out)}</tspan></text>`;
  body += `<text x="30" y="126" font-size="16" opacity="0">${appear(a + 0.6)}${prompt(t)}${cursor(t.soft, a + 0.6)}</text>`;
  return svg(W, H, body);
}

for (const [lang, L] of Object.entries(TEXT)) {
  const sfx = lang === "pt" ? "" : "-en";
  const files = {
    [`terminal${sfx}.svg`]: terminal(L),
    [`editor${sfx}.svg`]: editor(L),
    [`rodape${sfx}.svg`]: footer(L),
  };
  L.sections.forEach((s) => (files[`h-${s[1]}${sfx}.svg`] = section(s)));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(new URL(name, OUT), content);
    console.log("assets/" + name);
  }
}
