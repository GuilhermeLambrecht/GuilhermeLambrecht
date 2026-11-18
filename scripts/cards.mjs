// Gera os cartões dinâmicos do perfil (estatísticas, linguagens, projetos e mapa de contribuições)
// em PT/EN e tema claro/escuro, a partir da API GraphQL do GitHub.
//
// No GitHub Actions: node scripts/cards.mjs   (precisa de GITHUB_TOKEN e GH_USER)
// Localmente, sem token: MOCK=1 node scripts/cards.mjs   (dados de exemplo, só para ver o visual)
// Saída: dist/<cartao>-<pt|en>-<dark|light>.svg  → publicado no branch "output" pelo workflow.
import { mkdirSync, writeFileSync } from "node:fs";
import { THEMES, esc, windowFrame, wrap, svg, appear } from "./lib.mjs";

const LOGIN = process.env.GH_USER || "GuilhermeLambrecht";
const OUT = new URL("../dist/", import.meta.url);
const HIDE_LANGS = ["HTML", "CSS", "SCSS", "Blade"];

// Projetos em destaque. "repo" busca estrelas/linguagem/último push na API; sem "repo" o cartão é estático.
const PROJECTS = [
  {
    name: "AcePlay", path: "aceplay", url: "aceplay.com.br",
    desc: {
      pt: "Plataforma de agendamento de aulas de beach tennis e padel, conectando alunos e professores.",
      en: "Booking platform for beach tennis and padel lessons, connecting students and coaches.",
    },
    status: { pt: "em produção", en: "live" },
  },
  {
    name: "Emissor de NFS-e", nameEn: "NFS-e Issuer", path: "emissor-nfse",
    desc: {
      pt: "Sistema de emissão de notas fiscais de serviço desenvolvido para a Vocare Contabilidade.",
      en: "Service invoice (NFS-e) issuing system built for Vocare Contabilidade.",
    },
    status: { pt: "privado · uso interno", en: "private · internal use" },
  },
  {
    name: "Sistema de Gestão Vocare", nameEn: "Vocare Management System", path: "gestao-vocare",
    desc: {
      pt: "Registro de atividades e controle de tarefas por setor, integrado às outras plataformas da empresa.",
      en: "Activity logging and per-department task tracking, integrated with the company's other platforms.",
    },
    status: { pt: "privado · uso interno", en: "private · internal use" },
  },
  {
    name: "Lumen", path: "lumen", repo: "Lumen",
    desc: {
      pt: "Sistema de organização e planejamento de estudos.",
      en: "Study organization and planning system.",
    },
  },
];

const I18N = {
  pt: {
    locale: "pt-BR", dir: "~/projetos", log: "contribuicoes.log",
    months: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
    days: ["seg", "qua", "sex"],
    stats: { cmd: "--ultimo-ano", commits: "commits", prs: "pull_requests", issues: "issues", repos: "repositorios", stars: "estrelas", followers: "seguidores" },
    langsCmd: "--top 6",
    contrib: (n) => `${n} contribuições no último ano`,
    streak: (c, m) => `sequência atual: ${c} ${c === 1 ? "dia" : "dias"} · recorde: ${m} ${m === 1 ? "dia" : "dias"}`,
    less: "menos", more: "mais",
    updated: (d) => `atualizado ${d}`,
    ago: (n, u) => `há ${n} ${{ d: n === 1 ? "dia" : "dias", h: n === 1 ? "hora" : "horas", m: n === 1 ? "mês" : "meses" }[u]}`,
    today: "hoje",
  },
  en: {
    locale: "en-US", dir: "~/projects", log: "contributions.log",
    months: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
    days: ["mon", "wed", "fri"],
    stats: { cmd: "--last-year", commits: "commits", prs: "pull_requests", issues: "issues", repos: "repositories", stars: "stars", followers: "followers" },
    langsCmd: "--top 6",
    contrib: (n) => `${n} contributions in the last year`,
    streak: (c, m) => `current streak: ${c} ${c === 1 ? "day" : "days"} · longest: ${m} ${m === 1 ? "day" : "days"}`,
    less: "less", more: "more",
    updated: (d) => `updated ${d}`,
    ago: (n, u) => `${n} ${{ d: n === 1 ? "day" : "days", h: n === 1 ? "hour" : "hours", m: n === 1 ? "month" : "months" }[u]} ago`,
    today: "today",
  },
};

// ---------------------------------------------------------------- dados
async function fetchData() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN não definido (use MOCK=1 para testar localmente)");
  const repoFields = PROJECTS.filter((p) => p.repo)
    .map((p, i) => `p${i}: repository(owner: $login, name: "${p.repo}") { stargazerCount forkCount pushedAt primaryLanguage { name color } }`)
    .join("\n");
  const query = `query($login: String!) {
    user(login: $login) {
      followers { totalCount }
      pullRequests { totalCount }
      issues { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
        totalCount
        nodes { stargazerCount languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } } }
      }
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
        contributionCalendar { totalContributions weeks { contributionDays { date weekday contributionCount contributionLevel } } }
      }
    }
    ${repoFields}
  }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "profile-cards" },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  const u = json.data.user;

  const langs = {};
  for (const r of u.repositories.nodes)
    for (const e of r.languages.edges) {
      if (HIDE_LANGS.includes(e.node.name)) continue;
      langs[e.node.name] ??= { name: e.node.name, color: e.node.color, size: 0 };
      langs[e.node.name].size += e.size;
    }

  let ri = 0;
  const projects = PROJECTS.map((p) => (p.repo ? { ...p, live: json.data[`p${ri++}`] } : p));

  return {
    stats: {
      commits: u.contributionsCollection.totalCommitContributions,
      prs: u.pullRequests.totalCount,
      issues: u.issues.totalCount,
      repos: u.repositories.totalCount,
      stars: u.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0),
      followers: u.followers.totalCount,
    },
    langs: Object.values(langs).sort((a, b) => b.size - a.size),
    calendar: u.contributionsCollection.contributionCalendar,
    projects,
  };
}

function mockData() {
  const weeks = [];
  const start = new Date(Date.UTC(2025, 10, 16));
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * 864e5);
      const n = Math.max(0, Math.round(Math.sin(w / 4 + d) * 4 + Math.random() * 5 - 2));
      days.push({ date: date.toISOString().slice(0, 10), weekday: d, contributionCount: n,
        contributionLevel: ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"][Math.min(4, Math.ceil(n / 2))] });
    }
    weeks.push({ contributionDays: days });
  }
  return {
    stats: { commits: 842, prs: 37, issues: 12, repos: 11, stars: 3, followers: 24 },
    langs: [
      { name: "TypeScript", color: "#3178c6", size: 900 }, { name: "Python", color: "#3572A5", size: 420 },
      { name: "JavaScript", color: "#f1e05a", size: 260 }, { name: "PHP", color: "#4F5D95", size: 120 },
      { name: "Shell", color: "#89e051", size: 30 },
    ],
    calendar: { totalContributions: weeks.flatMap((w) => w.contributionDays).reduce((a, d) => a + d.contributionCount, 0), weeks },
    projects: PROJECTS.map((p) => (p.repo ? { ...p, live: { stargazerCount: 1, forkCount: 0, pushedAt: new Date(Date.now() - 3 * 864e5).toISOString(), primaryLanguage: { name: "TypeScript", color: "#3178c6" } } } : p)),
  };
}

// ---------------------------------------------------------------- utilidades
const fmt = (n, L) => Number(n).toLocaleString(L.locale);

function ago(iso, L) {
  const h = Math.floor((Date.now() - new Date(iso)) / 36e5);
  if (h < 1) return L.today;
  if (h < 24) return L.ago(h, "h");
  const d = Math.floor(h / 24);
  return d < 60 ? L.ago(d, "d") : L.ago(Math.floor(d / 30), "m");
}

function streaks(weeks) {
  const days = weeks.flatMap((w) => w.contributionDays).sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--; // hoje ainda pode estar em branco
  let current = 0;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;
  return { current, longest };
}

const CSS = `.f{opacity:0}`;

// ---------------------------------------------------------------- cartões
function statsCard(st, L, t) {
  const W = 480, H = 230;
  let body = windowFrame(W, H, "stats.sh", t);
  body += `<text x="22" y="70" font-size="13"><tspan fill="${t.accent}">$</tspan><tspan fill="${t.soft}"> gh stats </tspan><tspan fill="${t.orange}">${L.stats.cmd}</tspan></text>`;
  const rows = [
    ["commits", t.accent], ["prs", t.blue], ["issues", t.purple],
    ["repos", t.orange], ["stars", t.yellow], ["followers", t.cyan],
  ];
  rows.forEach(([k, c], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 22 + col * 226, y = 112 + row * 40;
    body += `<g class="f">${appear(0.2 + i * 0.12)}
<text x="${x}" y="${y}" font-size="12.5" fill="${t.muted}">${L.stats[k]}:</text>
<text x="${x + 206}" y="${y}" text-anchor="end" font-size="19" font-weight="700" fill="${c}">${fmt(st[k], L)}</text>
<rect x="${x}" y="${y + 10}" width="206" height="1" fill="${t.border}"/></g>`;
  });
  return svg(W, H, body, CSS);
}

function langsCard(langs, L, t) {
  const W = 480, H = 230, BW = W - 44;
  const top = langs.slice(0, 6);
  const total = top.reduce((a, b) => a + b.size, 0) || 1;
  let body = windowFrame(W, H, "langs.sh", t);
  body += `<text x="22" y="70" font-size="13"><tspan fill="${t.accent}">$</tspan><tspan fill="${t.soft}"> linguist </tspan><tspan fill="${t.orange}">${L.langsCmd}</tspan></text>`;
  body += `<defs><clipPath id="bar"><rect x="22" y="88" width="${BW}" height="10" rx="5"/></clipPath></defs><g clip-path="url(#bar)"><rect x="22" y="88" width="${BW}" height="10" fill="${t.border}"/>`;
  let x = 22;
  top.forEach((l, i) => {
    const w = (l.size / total) * BW;
    body += `<rect x="${x.toFixed(1)}" y="88" width="0" height="10" fill="${l.color || t.muted}"><animate attributeName="width" from="0" to="${w.toFixed(1)}" begin="${(0.2 + i * 0.1).toFixed(2)}s" dur=".5s" fill="freeze"/></rect>`;
    x += w;
  });
  body += `</g>`;
  top.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const lx = 22 + col * 226, ly = 136 + row * 32;
    const pct = ((l.size / total) * 100).toFixed(1).replace(".", L.locale === "pt-BR" ? "," : ".");
    body += `<g class="f">${appear(0.3 + i * 0.1)}<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${l.color || t.muted}"/>
<text x="${lx + 18}" y="${ly}" font-size="13" fill="${t.soft}">${esc(l.name)}</text>
<text x="${lx + 206}" y="${ly}" text-anchor="end" font-size="13" fill="${t.muted}">${pct}%</text></g>`;
  });
  return svg(W, H, body, CSS);
}

function projectCard(p, lang, L, t) {
  const W = 480, H = 200;
  const name = lang === "en" && p.nameEn ? p.nameEn : p.name;
  let body = windowFrame(W, H, `${L.dir}/${p.path}`, t);
  body += `<text x="22" y="76" font-size="19" font-weight="700"><tspan fill="${t.purple}">❯ </tspan><tspan fill="${t.text}">${esc(name)}</tspan></text>`;
  wrap(p.desc[lang], 54).slice(0, 3).forEach((line, i) => {
    body += `<text x="22" y="${106 + i * 21}" font-size="13" fill="${t.muted}">${esc(line)}</text>`;
  });
  const y = H - 22;
  body += `<rect x="1" y="${y - 22}" width="${W - 2}" height="1" fill="${t.border}"/>`;
  if (p.live) {
    const lv = p.live, pl = lv.primaryLanguage;
    body += `<text x="22" y="${y}" font-size="12.5">`
      + (pl ? `<tspan fill="${pl.color || t.muted}">●</tspan><tspan fill="${t.soft}"> ${esc(pl.name)}   </tspan>` : "")
      + `<tspan fill="${t.yellow}">★</tspan><tspan fill="${t.soft}"> ${lv.stargazerCount}   </tspan>`
      + `<tspan fill="${t.muted}">⑂ ${lv.forkCount}</tspan></text>`;
    body += `<text x="${W - 22}" y="${y}" text-anchor="end" font-size="12" fill="${t.muted}">${esc(L.updated(ago(lv.pushedAt, L)))}</text>`;
  } else {
    const isLive = !!p.url;
    body += `<text x="22" y="${y}" font-size="12.5"><tspan fill="${isLive ? t.accent : t.orange}">●</tspan><tspan fill="${t.soft}"> ${esc(p.status[lang])}</tspan></text>`;
    if (p.url) body += `<text x="${W - 22}" y="${y}" text-anchor="end" font-size="12" fill="${t.blue}">${esc(p.url)} ↗</text>`;
  }
  return svg(W, H, body);
}

// Dia sem contribuição = ponto; com contribuição = quadrado que cresce e acende conforme o nível.
function cellShape(cx, cy, lv, t) {
  if (!lv) return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.6" fill="${t.levels[0]}"/>`;
  const s = [0, 7, 9.5, 11.5, 13][lv];
  return `<rect x="${(cx - s / 2).toFixed(1)}" y="${(cy - s / 2).toFixed(1)}" width="${s}" height="${s}" rx="${lv === 4 ? 3 : 2}" fill="${t.levels[lv]}"/>`;
}

function contribCard(cal, L, t) {
  const weeks = cal.weeks, nW = weeks.length;
  const CELL = 16.5, X0 = 62, Y0 = 108;
  const gridW = nW * CELL;
  const W = 1000, H = Y0 + 7 * CELL + 92;
  const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const { current, longest } = streaks(weeks);

  let body = windowFrame(W, H, `${L.log} — ${LOGIN}`, t);
  body += `<text x="22" y="70" font-size="13.5"><tspan fill="${t.accent}">$</tspan><tspan fill="${t.soft}"> git log </tspan><tspan fill="${t.orange}">--since="1 year ago"</tspan><tspan fill="${t.soft}"> | </tspan><tspan fill="${t.purple}">heatmap</tspan></text>`;

  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = new Date(w.contributionDays[0].date + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth && i < nW - 2) {
      body += `<text x="${X0 + i * CELL}" y="${Y0 - 10}" font-size="11" fill="${t.muted}">${L.months[m]}</text>`;
      lastMonth = m;
    }
  });
  L.days.forEach((d, k) => {
    body += `<text x="${X0 - 12}" y="${Y0 + (1 + k * 2) * CELL + 12}" font-size="11" text-anchor="end" fill="${t.muted}">${d}</text>`;
  });

  weeks.forEach((w, i) => {
    let col = `<g class="f">${appear(0.15 + i * 0.035)}`;
    w.contributionDays.forEach((d) => {
      const lv = LEVEL[d.contributionLevel] ?? (d.contributionCount > 0 ? 2 : 0);
      const cx = X0 + i * CELL + CELL / 2, cy = Y0 + d.weekday * CELL + CELL / 2;
      col += cellShape(cx, cy, lv, t);
    });
    body += col + `</g>`;
  });

  // linha de varredura passando pelo mapa em loop
  body += `<defs><linearGradient id="sc" x1="0" x2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset="1" stop-color="${t.accent}" stop-opacity=".35"/></linearGradient>
<clipPath id="grid"><rect x="${X0}" y="${Y0}" width="${gridW}" height="${7 * CELL}"/></clipPath></defs>
<g clip-path="url(#grid)"><g><animateTransform attributeName="transform" type="translate" from="0 0" to="${gridW + 60} 0" begin="2.2s" dur="7s" repeatCount="indefinite"/>
<rect x="${X0 - 60}" y="${Y0}" width="58" height="${7 * CELL}" fill="url(#sc)"/><rect x="${X0 - 2}" y="${Y0}" width="2" height="${7 * CELL}" fill="${t.accent}"/></g></g>`;

  const fy = Y0 + 7 * CELL + 36;
  body += `<rect x="1" y="${fy - 22}" width="${W - 2}" height="1" fill="${t.border}"/>`;
  body += `<text x="22" y="${fy}" font-size="13.5" class="f">${appear(2.2)}<tspan fill="${t.accent}">✔ </tspan><tspan fill="${t.soft}">${esc(L.contrib(fmt(cal.totalContributions, L)))}</tspan></text>`;
  body += `<text x="22" y="${fy + 24}" font-size="13" class="f">${appear(2.4)}<tspan fill="${t.orange}">🔥 </tspan><tspan fill="${t.muted}">${esc(L.streak(current, longest))}</tspan></text>`;
  const lx = W - 22 - 5 * CELL - 40;
  body += `<text x="${lx - 8}" y="${fy}" text-anchor="end" font-size="12.5" fill="${t.muted}">${L.less}</text>`;
  for (let k = 0; k < 5; k++) body += cellShape(lx + k * CELL + CELL / 2, fy - 4.5, k, t);
  body += `<text x="${lx + 5 * CELL + 8}" y="${fy}" font-size="12.5" fill="${t.muted}">${L.more}</text>`;
  return svg(W, H, body, CSS);
}

// ---------------------------------------------------------------- main
const data = process.env.MOCK ? mockData() : await fetchData();
mkdirSync(OUT, { recursive: true });
let count = 0;
for (const [lang, L] of Object.entries(I18N)) {
  for (const [theme, t] of Object.entries(THEMES)) {
    const files = {
      stats: statsCard(data.stats, L, t),
      langs: langsCard(data.langs, L, t),
      contrib: contribCard(data.calendar, L, t),
    };
    data.projects.forEach((p, i) => (files[`project-${i + 1}`] = projectCard(p, lang, L, t)));
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(new URL(`${name}-${lang}-${theme}.svg`, OUT), content);
      count++;
    }
  }
}
console.log(`${count} cartões gerados em dist/ para @${LOGIN}`);
