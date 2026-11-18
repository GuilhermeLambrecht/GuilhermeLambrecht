// Peças compartilhadas pelos geradores de SVG do perfil.

export const FONT = "ui-monospace,SFMono-Regular,'JetBrains Mono','Cascadia Code',Consolas,'Liberation Mono',Menlo,monospace";

export const THEMES = {
  dark: {
    bg: "#0d1117", panel: "#161b22", border: "#30363d", text: "#e6edf3", soft: "#c9d1d9", muted: "#8b949e",
    accent: "#22c55e", blue: "#58a6ff", cyan: "#79c0ff", purple: "#d2a8ff", orange: "#ffa657",
    yellow: "#e3b341", string: "#a5d6ff", red: "#ff7b72",
    levels: ["#30363d", "#0e4429", "#006d32", "#26a641", "#22c55e"],
  },
  light: {
    bg: "#ffffff", panel: "#f6f8fa", border: "#d0d7de", text: "#1f2328", soft: "#24292f", muted: "#656d76",
    accent: "#1a7f37", blue: "#0969da", cyan: "#0550ae", purple: "#8250df", orange: "#bc4c00",
    yellow: "#9a6700", string: "#0a3069", red: "#cf222e",
    levels: ["#d0d7de", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
};

export const USER = "guilherme";

// PREVIEW=1 zera os tempos das animações (útil para tirar print do estado final).
const T = (s) => (process.env.PREVIEW ? 0 : s);
export const HOST = "github";

export const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Janela de terminal: moldura, barra de título com os três botões e título centralizado. */
export function windowFrame(W, H, title, t, { bar = 40, radius = 12 } = {}) {
  return `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${radius}" fill="${t.bg}" stroke="${t.border}" stroke-width="2"/>
<path d="M1 ${radius + 1} a${radius} ${radius} 0 0 1 ${radius} -${radius} H${W - radius - 1} a${radius} ${radius} 0 0 1 ${radius} ${radius} V${bar} H1Z" fill="${t.panel}"/>
<rect x="1" y="${bar}" width="${W - 2}" height="1" fill="${t.border}"/>
<circle cx="22" cy="${bar / 2 + 1}" r="6" fill="#ff5f57"/><circle cx="41" cy="${bar / 2 + 1}" r="6" fill="#febc2e"/><circle cx="60" cy="${bar / 2 + 1}" r="6" fill="#28c840"/>
<text x="${W / 2}" y="${bar / 2 + 5}" text-anchor="middle" font-size="13" fill="${t.muted}">${esc(title)}</text>`;
}

/** Prompt do shell como tspans: guilherme@github:~$ */
export function prompt(t, path = "~") {
  return `<tspan fill="${t.accent}">${USER}@${HOST}</tspan><tspan fill="${t.muted}">:</tspan><tspan fill="${t.blue}">${esc(path)}</tspan><tspan fill="${t.muted}">$ </tspan>`;
}

/**
 * Texto "digitado": cada caractere vira um tspan que aparece num instante diferente.
 * Não depende da largura da fonte, então funciona com qualquer monoespaçada do visitante.
 */
export function typed(str, fill, start, cps = 16) {
  let out = "";
  [...str].forEach((ch, i) => {
    const at = T(start + i / cps).toFixed(2);
    out += `<tspan fill="${fill}" fill-opacity="0">${esc(ch)}<set attributeName="fill-opacity" to="1" begin="${at}s" fill="freeze"/></tspan>`;
  });
  return { svg: out, end: start + [...str].length / cps };
}

/** Elemento que surge (opacidade 0 → 1) num instante. */
export const appear = (at) => `<set attributeName="opacity" to="1" begin="${T(at).toFixed(2)}s" fill="freeze"/>`;

/** Cursor de bloco piscando, como tspan (acompanha o fim do texto, sem medir largura). */
export const cursor = (fill, begin = 0) =>
  `<tspan fill="${fill}" fill-opacity="0">▋<animate attributeName="fill-opacity" values="1;0" dur="1.1s" begin="${begin.toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/></tspan>`;

/** Quebra texto por número de caracteres (fonte monoespaçada). */
export function wrap(text, max) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

export const svg = (W, H, body, extraCss = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<style>text{white-space:pre}${extraCss}</style>
${body}
</svg>
`;
