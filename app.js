"use strict";

/* ============================================================
 * Calculadora de Ponto Q – TBJ NPN
 * Topologias de base:
 *   fixa  : VBB —RB— Base
 *   fixa1 : VCC —RB— Base                (polarização fixa com fonte única)
 *   realim: Coletor —RB— Base            (realimentação do coletor)
 *   div1 : VCC —R1— Base —R2— GND   (divisor com fonte única)
 *   div2 : VBB —R1— Base —R2— GND   (divisor com fonte própria na base)
 * Coletor: VCC —RC— Coletor | Emissor —RE— GND
 * Os divisores são reduzidos ao equivalente de Thévenin (V_TH, R_TH).
 * PNP: mesmo circuito com fontes invertidas (−V_CC, −V_BB). A análise é idêntica
 * usando módulos (V_EB, V_EC); só a exibição troca sinais e nomes.
 * ============================================================ */

const $ = (id) => document.getElementById(id);
let PNP = false;

const TOPOS = [
  { id: "fixa",   name: "Polarização fixa",          sub: "Fonte V<sub>BB</sub> na base + R<sub>B</sub>" },
  { id: "fixa1",  name: "Fixa – fonte única",         sub: "R<sub>B</sub> ligado a V<sub>CC</sub>" },
  { id: "div1",   name: "Divisor de tensão",          sub: "R<sub>1</sub>/R<sub>2</sub> com fonte única V<sub>CC</sub>" },
  { id: "div2",   name: "Divisor com fonte na base",  sub: "R<sub>1</sub>/R<sub>2</sub> alimentados por V<sub>BB</sub>" },
  { id: "realim", name: "Realimentação do coletor",   sub: "R<sub>B</sub> do coletor para a base" },
];

const PRESETS = {
  fixa1:  { topo: "fixa1", vcc: 12, rb: 240, rb_u: "1e3", rc: 2.2, rc_u: "1e3", re: 0, re_u: "1e3", beta: 50 },
  realim: { topo: "realim", vcc: 10, rb: 250, rb_u: "1e3", rc: 4.7, rc_u: "1e3", re: 1.2, re_u: "1e3", beta: 90 },
  div1:  { topo: "div1", vcc: 12, r1: 10, r1_u: "1e3", r2: 10, r2_u: "1e3", rc: 0, rc_u: "1e3", re: 5.3, re_u: "1e3", beta: 100 },
  div2:  { topo: "div2", vbb: 5, vcc: 12, r1: 10, r1_u: "1e3", r2: 4.7, r2_u: "1e3", rc: 2.2, rc_u: "1e3", re: 1, re_u: "1e3", beta: 150 },
  ativa: { topo: "fixa", vbb: 5, vcc: 12, rb: 430, rb_u: "1e3", rc: 5.6, rc_u: "1e3", re: 0, re_u: "1e3", beta: 100 },
  sat:   { topo: "fixa", vbb: 5, vcc: 12, rb: 47,  rb_u: "1e3", rc: 2.2, rc_u: "1e3", re: 0, re_u: "1e3", beta: 100 },
  corte: { topo: "fixa", vbb: 0.5, vcc: 12, rb: 100, rb_u: "1e3", rc: 2.2, rc_u: "1e3", re: 0, re_u: "1e3", beta: 100 },
  re:    { topo: "fixa", vbb: 5, vcc: 15, rb: 220, rb_u: "1e3", rc: 2.2, rc_u: "1e3", re: 1, re_u: "1e3", beta: 120 },
};

/* ---------- desenho dos circuitos (SVG) ---------- */
const ZIG_V = (x, y0, y1) => {               // resistor vertical de y0 até y1
  const h = (y1 - y0) / 8, pts = [`${x},${y0}`];
  for (let i = 1; i < 8; i++) pts.push(`${x + (i % 2 ? -8 : 8)},${y0 + h * i}`);
  pts.push(`${x},${y1}`);
  return `<polyline points="${pts.join(" ")}"/>`;
};
const ZIG_H = (x0, x1, y) => {               // resistor horizontal de x0 até x1
  const w = (x1 - x0) / 8, pts = [`${x0},${y}`];
  for (let i = 1; i < 8; i++) pts.push(`${x0 + w * i},${y + (i % 2 ? -8 : 8)}`);
  pts.push(`${x1},${y}`);
  return `<polyline points="${pts.join(" ")}"/>`;
};
const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="2.5" class="fill"/>`;
const BAT = (x, yTop, yBot, neg = false) =>  // fonte CC: placa longa (+) em cima; invertida se neg
  L(x, yTop, x, 120) +
  `<line x1="${x - (neg ? 7 : 12)}" y1="120" x2="${x + (neg ? 7 : 12)}" y2="120"${neg ? "" : ' class="thick"'}/>` +
  `<line x1="${x - (neg ? 12 : 7)}" y1="136" x2="${x + (neg ? 12 : 7)}" y2="136"${neg ? ' class="thick"' : ""}/>` +
  L(x, 136, x, yBot);
const TXT = (x, y, main, sub = "") =>
  `<text x="${x}" y="${y}">${main}${sub ? `<tspan font-size="0.7em" dy="3">${sub}</tspan>` : ""}</text>`;

function circuitSVG(topo, { rc = true, re = true, pnp = PNP } = {}) {
  let w = "", t = "";
  const V = pnp ? "−V" : "V";
  // transistor (base em x=140, coletor/emissor em x=165); seta para fora (NPN) ou para dentro (PNP)
  w += `<circle cx="155" cy="90" r="22"/><line x1="140" y1="76" x2="140" y2="104" class="thick"/>`;
  w += L(140, 84, 165, 68) + L(140, 96, 165, 112);
  w += pnp ? `<polygon points="150,102.4 158.9,103.3 154.6,110.1" class="fill"/>`
           : `<polygon points="165,112 155,111 160,104" class="fill"/>`;
  // coletor → R_C → V_CC
  w += L(165, 68, 165, 55) + (rc ? ZIG_V(165, 55, 21) : L(165, 55, 165, 21)) + L(165, 21, 165, 12);
  w += L(165, 12, 230, 12) + BAT(230, 12, 200, pnp);
  if (rc) t += TXT(178, 42, "R", "C");
  t += TXT(238, 112, V, "CC");
  // emissor → R_E → GND
  w += L(165, 112, 165, 135) + (re ? ZIG_V(165, 135, 169) : L(165, 135, 165, 169)) + L(165, 169, 165, 200);
  w += L(165, 200, 230, 200);
  if (re) t += TXT(178, 156, "R", "E");

  if (topo === "fixa") {
    w += BAT(30, 90, 200, pnp) + L(30, 90, 50, 90) + ZIG_H(50, 110, 90) + L(110, 90, 140, 90) + L(30, 200, 165, 200);
    t += TXT(0, 112, V, "BB") + TXT(70, 74, "R", "B");
  } else if (topo === "fixa1") {
    w += L(100, 12, 165, 12) + DOT(165, 12) + L(100, 12, 100, 30) + ZIG_V(100, 30, 70) + L(100, 70, 100, 90) + L(100, 90, 140, 90);
    t += TXT(112, 52, "R", "B");
  } else if (topo === "div1" || topo === "div2") {
    w += L(80, 12, 80, 30) + ZIG_V(80, 30, 70) + L(80, 70, 80, 120) + L(80, 90, 140, 90) + DOT(80, 90);
    w += ZIG_V(80, 120, 160) + L(80, 160, 80, 200) + L(80, 200, 165, 200);
    t += TXT(92, 52, "R", "1") + TXT(92, 144, "R", "2");
    if (topo === "div1") w += L(80, 12, 165, 12) + DOT(165, 12);
    else { w += L(80, 12, 30, 12) + BAT(30, 12, 200, pnp) + L(30, 200, 80, 200); t += TXT(0, 112, V, "BB"); }
  } else if (topo === "realim") {
    w += DOT(165, 60) + L(165, 60, 120, 60) + ZIG_H(120, 60, 60) + L(60, 60, 60, 90) + L(60, 90, 140, 90);
    t += TXT(80, 46, "R", "B");
  }
  t += TXT(140, 222, "GND");
  return `<svg viewBox="0 0 272 230" role="img" aria-hidden="true"><g class="wire">${w}</g><g class="lbl">${t}</g></svg>`;
}

function renderPicker() {
  const cur = document.querySelector('input[name="topo"]:checked')?.value || "fixa";
  $("picker").innerHTML = TOPOS.map((tp) => `
    <label class="pick">
      <input type="radio" name="topo" value="${tp.id}" ${tp.id === cur ? "checked" : ""} />
      <span class="box">${circuitSVG(tp.id)}<b>${tp.name}</b><small>${tp.sub}</small></span>
    </label>`).join("");
}

/* ---------- formatação em notação de engenharia ---------- */
const PREFIX = [
  [1e0, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"],
];
function eng(value, unit, digits = 3) {
  if (!Number.isFinite(value)) return "∞ " + unit;
  if (value === 0) return "0 " + unit;
  const abs = Math.abs(value);
  if (abs >= 1e3) {
    const big = abs >= 1e6 ? [1e6, "M"] : [1e3, "k"];
    return fmt(value / big[0], digits) + " " + big[1] + unit;
  }
  for (const [mult, p] of PREFIX) {
    if (abs >= mult * 0.9995) return fmt(value / mult, digits) + " " + p + unit;
  }
  return fmt(value / 1e-12, digits) + " p" + unit;
}
function fmt(x, digits) {
  return Number(x.toPrecision(digits)).toLocaleString("pt-BR", { maximumFractionDigits: 6 }).replace("-", "−");
}

/* ---------- leitura das entradas ---------- */
function num(id) {
  const el = $(id);
  const v = el.value.trim() === "" ? NaN : Number(el.value);
  return v;
}
function topology() {
  return document.querySelector('input[name="topo"]:checked').value;
}
function readInputs() {
  const topo = topology();
  const p = {
    topo,
    r1: num("r1") * Number($("r1_u").value),
    r2: num("r2") * Number($("r2_u").value),
    vbb: num("vbb"),
    vcc: num("vcc"),
    rb: num("rb") * Number($("rb_u").value),
    rc: num("rc") * Number($("rc_u").value),
    re: (num("re") || 0) * Number($("re_u").value),
    beta: num("beta"),
    vbe: num("vbe"),
    vcesat: num("vcesat"),
    pmax: $("pmax").value.trim() === "" ? null : num("pmax") / 1000,
  };
  const errors = [];
  const bad = new Set();
  const need = (cond, id, msg) => { if (!cond) { errors.push(msg); bad.add(id); } };
  if (topo === "fixa" || topo === "div2") need(Number.isFinite(p.vbb), "vbb", "Informe V_BB.");
  need(Number.isFinite(p.vcc) && p.vcc > 0, "vcc", "V_CC deve ser positivo (transistor NPN).");
  if (topo === "fixa" || topo === "fixa1" || topo === "realim") need(Number.isFinite(p.rb) && p.rb >= 0, "rb", "R_B deve ser ≥ 0.");
  else {
    need(Number.isFinite(p.r1) && p.r1 > 0, "r1", "R_1 deve ser > 0.");
    need(Number.isFinite(p.r2) && p.r2 > 0, "r2", "R_2 deve ser > 0.");
  }
  need(Number.isFinite(p.rc) && p.rc >= 0, "rc", "R_C deve ser ≥ 0.");
  need(Number.isFinite(p.re) && p.re >= 0, "re", "R_E deve ser ≥ 0.");
  need(Number.isFinite(p.beta) && p.beta > 0, "beta", "β deve ser positivo.");
  need(Number.isFinite(p.vbe) && p.vbe >= 0, "vbe", "V_BE deve ser ≥ 0.");
  need(Number.isFinite(p.vcesat) && p.vcesat >= 0 && p.vcesat < (p.vcc || Infinity), "vcesat", "V_CE(sat) deve estar entre 0 e V_CC.");
  if (p.pmax !== null) need(Number.isFinite(p.pmax) && p.pmax > 0, "pmax", "P_D(max) deve ser positivo.");
  // equivalente visto pela base
  if (topo === "fixa") { p.vth = p.vbb; p.rth = p.rb; }
  else if (topo === "fixa1" || topo === "realim") { p.vth = p.vcc; p.rth = p.rb; }
  else {
    p.vsrc = topo === "div1" ? p.vcc : p.vbb;
    p.vth = p.vsrc * p.r2 / (p.r1 + p.r2);
    p.rth = p.r1 * p.r2 / (p.r1 + p.r2);
  }
  if (errors.length === 0 && topo !== "realim" && p.rth === 0 && p.re === 0 && p.vth > p.vbe)
    { errors.push("Com R_B = 0 e R_E = 0 a corrente de base seria infinita. Use R_B > 0."); bad.add("rb"); }
  if (errors.length === 0 && p.rc === 0 && p.re === 0)
    { errors.push("Com R_C = 0 e R_E = 0 não existe reta de carga (I_C(sat) infinita)."); bad.add("rc"); }

  for (const id of ["vbb", "vcc", "rb", "r1", "r2", "rc", "re", "beta", "vbe", "vcesat", "pmax"])
    $(id).classList.toggle("bad", bad.has(id));
  return { p, errors };
}

/* ---------- análise CC ---------- */
function solve(p) {
  if (p.topo === "realim") return solveFeedback(p);
  const { vth: vbb, rth: rb, vcc, rc, re, beta, vbe, vcesat } = p;
  const div = p.topo === "div1" || p.topo === "div2";
  const V = div ? "V<sub>TH</sub>" : p.topo === "fixa1" ? "V<sub>CC</sub>" : "V<sub>BB</sub>";
  const R = div ? "R<sub>TH</sub>" : "R<sub>B</sub>";
  const reff = rc + re * (beta + 1) / beta;       // resistência vista pela malha de saída (região ativa)
  const icsat = (vcc - vcesat) / reff;            // extremo da reta de carga em V_CE = V_CE(sat)
  const icsatIdeal = vcc / reff;                  // interseção com o eixo I_C (V_CE = 0)
  const r = { reff, icsat, icsatIdeal, steps: [] };

  if (div) {
    const src = p.topo === "div1" ? "V<sub>CC</sub>" : "V<sub>BB</sub>";
    r.steps.push(`Thévenin da base: <code>V<sub>TH</sub> = ${src}·R<sub>2</sub>/(R<sub>1</sub>+R<sub>2</sub>)</code> = ${fmt(p.vsrc, 4)}·${eng(p.r2, "Ω")}/(${eng(p.r1, "Ω")}+${eng(p.r2, "Ω")}) = <b>${eng(vbb, "V")}</b>; &nbsp;<code>R<sub>TH</sub> = R<sub>1</sub> ∥ R<sub>2</sub></code> = <b>${eng(rb, "Ω")}</b>`);
    if (re > 0) {
      const ok = beta * re >= 10 * p.r2;
      r.steps.push(`Critério da análise aproximada: <code>β·R<sub>E</sub> ≥ 10·R<sub>2</sub></code> → ${eng(beta * re, "Ω")} ${ok ? "≥" : "&lt;"} ${eng(10 * p.r2, "Ω")}: ${ok ? "divisor “firme”, V<sub>B</sub> ≈ V<sub>TH</sub> (a análise exata abaixo confirma)." : "o divisor é carregado pela base; é necessária a análise exata (usada abaixo)."}`);
    }
  }

  // 1) Corte: junção BE não polarizada diretamente
  if (vbb <= vbe) {
    Object.assign(r, { region: "corte", ib: 0, ic: 0, ie: 0, vce: vcc, vbeQ: vbb });
    r.steps.push(`${V} = ${eng(vbb, "V")} ≤ V<sub>BE(on)</sub> = ${eng(vbe, "V")} → a junção base-emissor não conduz.`);
    r.steps.push(`I<sub>B</sub> = I<sub>C</sub> = I<sub>E</sub> = 0 e V<sub>CE</sub> = V<sub>CC</sub> = ${eng(vcc, "V")} → <b>CORTE</b>.`);
    return finish(r, p);
  }

  // 2) Supõe região ativa
  const ib = (vbb - vbe) / (rb + (beta + 1) * re);
  const ic = beta * ib;
  const ie = (beta + 1) * ib;
  const vce = vcc - ic * rc - ie * re;
  r.steps.push(
    `Malha base-emissor: <code>I<sub>B</sub> = (${V} − V<sub>BE</sub>) / (${R} + (β+1)·R<sub>E</sub>)</code> = (${fmt(vbb, 4)} − ${fmt(vbe, 4)}) / (${eng(rb, "Ω")} + ${fmt(beta + 1, 4)}·${eng(re, "Ω")}) = <b>${eng(ib, "A")}</b>`
  );
  r.steps.push(`<code>I<sub>C</sub> = β·I<sub>B</sub></code> = ${fmt(beta, 4)} · ${eng(ib, "A")} = <b>${eng(ic, "A")}</b>; &nbsp;<code>I<sub>E</sub> = (β+1)·I<sub>B</sub></code> = <b>${eng(ie, "A")}</b>`);
  r.steps.push(`Malha coletor-emissor: <code>V<sub>CE</sub> = V<sub>CC</sub> − I<sub>C</sub>·R<sub>C</sub> − I<sub>E</sub>·R<sub>E</sub></code> = <b>${eng(vce, "V")}</b>`);

  if (vce >= vcesat) {
    Object.assign(r, { region: "ativa", ib, ic, ie, vce, vbeQ: vbe });
    r.steps.push(`V<sub>CE</sub> ≥ V<sub>CE(sat)</sub> = ${eng(vcesat, "V")} → hipótese confirmada: <b>REGIÃO ATIVA</b>.`);
    return finish(r, p);
  }

  // 3) Saturação: V_CE = V_CE(sat) e β deixa de valer. Resolve as duas malhas:
  //    I_B(R_B+R_E) + I_C·R_E       = V_BB − V_BE
  //    I_B·R_E      + I_C(R_C+R_E)  = V_CC − V_CE(sat)
  r.steps.push(`V<sub>CE</sub> calculado (${eng(vce, "V")}) &lt; V<sub>CE(sat)</sub> → hipótese inválida: o transistor está <b>SATURADO</b>. Refazendo com V<sub>CE</sub> = V<sub>CE(sat)</sub>:`);
  const a11 = rb + re, a12 = re, b1 = vbb - vbe;
  const a21 = re, a22 = rc + re, b2 = vcc - vcesat;
  const det = a11 * a22 - a12 * a21;
  let ibS = (b1 * a22 - a12 * b2) / det;
  let icS = (a11 * b2 - a21 * b1) / det;
  if (!Number.isFinite(ibS) || !Number.isFinite(icS)) { ibS = ib; icS = (vcc - vcesat) / (rc || 1e-12); }
  icS = Math.max(icS, 0);
  ibS = Math.max(ibS, 0);
  Object.assign(r, { region: "sat", ib: ibS, ic: icS, ie: ibS + icS, vce: vcesat, vbeQ: vbe });
  r.steps.push(`<code>I<sub>B</sub>(${R}+R<sub>E</sub>) + I<sub>C</sub>·R<sub>E</sub> = ${V} − V<sub>BE</sub></code> e <code>I<sub>B</sub>·R<sub>E</sub> + I<sub>C</sub>(R<sub>C</sub>+R<sub>E</sub>) = V<sub>CC</sub> − V<sub>CE(sat)</sub></code>`);
  r.steps.push(`→ I<sub>B</sub> = <b>${eng(ibS, "A")}</b>, I<sub>C</sub> = <b>${eng(icS, "A")}</b>, I<sub>E</sub> = <b>${eng(ibS + icS, "A")}</b>; β<sub>forçado</sub> = ${fmt(icS / ibS, 3)} &lt; β = ${fmt(beta, 4)}`);
  return finish(r, p);
}

// Realimentação do coletor: por R_C circula I_C + I_B = I_E
//   V_CC = I_E·R_C + I_B·R_B + V_BE + I_E·R_E  →  I_B = (V_CC − V_BE) / (R_B + (β+1)(R_C+R_E))
function solveFeedback(p) {
  const { vcc, rb, rc, re, beta, vbe, vcesat } = p;
  const reff = (rc + re) * (beta + 1) / beta;
  const r = { reff, icsat: (vcc - vcesat) / reff, icsatIdeal: vcc / reff, steps: [] };
  if (vcc <= vbe) {
    Object.assign(r, { region: "corte", ib: 0, ic: 0, ie: 0, vce: vcc, vbeQ: vcc });
    r.steps.push(`V<sub>CC</sub> = ${eng(vcc, "V")} ≤ V<sub>BE(on)</sub> → a junção base-emissor não conduz → <b>CORTE</b>.`);
    return finish(r, p);
  }
  const ib = (vcc - vbe) / (rb + (beta + 1) * (rc + re));
  const ic = beta * ib, ie = (beta + 1) * ib;
  const vce = vcc - ie * (rc + re);
  r.steps.push(`Em R<sub>C</sub> circula I<sub>C</sub> + I<sub>B</sub> = I<sub>E</sub>. Malha V<sub>CC</sub> → R<sub>C</sub> → R<sub>B</sub> → BE → R<sub>E</sub>: <code>V<sub>CC</sub> = I<sub>E</sub>·R<sub>C</sub> + I<sub>B</sub>·R<sub>B</sub> + V<sub>BE</sub> + I<sub>E</sub>·R<sub>E</sub></code>`);
  r.steps.push(`<code>I<sub>B</sub> = (V<sub>CC</sub> − V<sub>BE</sub>) / (R<sub>B</sub> + (β+1)(R<sub>C</sub>+R<sub>E</sub>))</code> = (${fmt(vcc, 4)} − ${fmt(vbe, 4)}) / (${eng(rb, "Ω")} + ${fmt(beta + 1, 4)}·${eng(rc + re, "Ω")}) = <b>${eng(ib, "A")}</b>`);
  r.steps.push(`<code>I<sub>C</sub> = β·I<sub>B</sub></code> = <b>${eng(ic, "A")}</b>; &nbsp;<code>I<sub>E</sub> = (β+1)·I<sub>B</sub></code> = <b>${eng(ie, "A")}</b>`);
  r.steps.push(`<code>V<sub>CE</sub> = V<sub>CC</sub> − I<sub>E</sub>(R<sub>C</sub>+R<sub>E</sub>)</code> = <b>${eng(vce, "V")}</b> &nbsp;(confere: V<sub>CE</sub> = V<sub>BE</sub> + I<sub>B</sub>·R<sub>B</sub> = ${eng(vbe + ib * rb, "V")})`);
  r.steps.push(`Como V<sub>CE</sub> = V<sub>BE</sub> + I<sub>B</sub>·R<sub>B</sub> ≥ V<sub>BE</sub> &gt; V<sub>CE(sat)</sub>, este circuito não satura: <b>REGIÃO ATIVA</b>. A realimentação reduz a sensibilidade de I<sub>C</sub> a variações de β.`);
  Object.assign(r, { region: "ativa", ib, ic, ie, vce: Math.max(vce, vcesat), vbeQ: vbe });
  return finish(r, p);
}

function finish(r, p) {
  const { vbb, vcc, rb, rc, re, topo } = p;
  r.vE = r.ie * re;
  r.vC = r.vE + r.vce;
  r.vB = r.vE + r.vbeQ;
  r.pd = r.vce * r.ic + r.vbeQ * r.ib;
  const irc = topo === "realim" ? r.ie : r.ic;   // na realimentação, R_C conduz I_C + I_B
  r.prc = irc * irc * rc;
  r.pre = r.ie * r.ie * re;
  if (topo === "fixa") {
    r.prb = r.ib * r.ib * rb;
    r.pin = vcc * r.ic + vbb * r.ib;
  } else if (topo === "fixa1" || topo === "realim") {
    r.prb = r.ib * r.ib * rb;
    r.pin = vcc * r.ie;
  } else {
    r.ir1 = (p.vsrc - r.vB) / p.r1;
    r.ir2 = r.vB / p.r2;
    r.pr1 = r.ir1 * r.ir1 * p.r1;
    r.pr2 = r.ir2 * r.ir2 * p.r2;
    r.pin = topo === "div1" ? vcc * (r.ic + r.ir1) : vbb * r.ir1 + vcc * r.ic;
    r.steps.push(`Divisor: V<sub>B</sub> = ${eng(r.vB, "V")}, <code>I<sub>R1</sub> = (${topo === "div1" ? "V<sub>CC</sub>" : "V<sub>BB</sub>"} − V<sub>B</sub>)/R<sub>1</sub></code> = ${eng(r.ir1, "A")}, <code>I<sub>R2</sub> = V<sub>B</sub>/R<sub>2</sub></code> = ${eng(r.ir2, "A")} (I<sub>R1</sub> = I<sub>R2</sub> + I<sub>B</sub>)`);
  }
  r.pdmaxCircuit = (vcc * vcc) / (4 * r.reff); // máximo de V_CE·I_C ao longo da reta de carga (em V_CE = V_CC/2)
  r.steps.push(`Reta de carga CC: <code>I<sub>C</sub> = (V<sub>CC</sub> − V<sub>CE</sub>) / ${topo === "realim" ? "((R<sub>C</sub>+R<sub>E</sub>)·(β+1)/β)" : "(R<sub>C</sub> + R<sub>E</sub>·(β+1)/β)"}</code>; corta os eixos em V<sub>CE</sub> = ${eng(vcc, "V")} e I<sub>C</sub> = ${eng(r.icsatIdeal, "A")}.`);
  r.steps.push(`Potência no transistor: <code>P<sub>D</sub> = V<sub>CE</sub>·I<sub>C</sub> + V<sub>BE</sub>·I<sub>B</sub></code> = ${eng(r.vce * r.ic, "W")} + ${eng(r.vbeQ * r.ib, "W")} = <b>${eng(r.pd, "W")}</b>`);
  return r;
}

/* ---------- renderização dos resultados ---------- */
const REGION = {
  ativa: { badge: "Região ativa", cls: "ativa" },
  sat:   { badge: "Saturação",    cls: "sat" },
  corte: { badge: "Corte",        cls: "corte" },
};

function renderResults(r, p) {
  const reg = REGION[r.region];
  const st = $("status");
  st.className = "status " + reg.cls;
  $("badge").textContent = reg.badge;

  let txt;
  if (r.region === "ativa") {
    const pos = r.vce / p.vcc; // 1 = corte, 0 = saturação
    const pct = Math.round((1 - pos) * 100);
    txt = `Operação normal como amplificador. O ponto Q está a ${pct}% do caminho entre o corte e a saturação`;
    if (pos > 0.4 && pos < 0.6) txt += " — bem centrado na reta de carga (máxima excursão simétrica).";
    else if (pos <= 0.4) txt += " — próximo da saturação; o sinal pode ser ceifado no semiciclo que aumenta I_C.";
    else txt += " — próximo do corte; o sinal pode ser ceifado no semiciclo que diminui I_C.";
  } else if (r.region === "sat") {
    txt = `I_C ficou limitado pelo circuito externo (β·I_B = ${eng(p.beta * r.ib, "A")} > I_C(sat)). ${PNP ? "V_EC ≈ V_EC(sat)" : "V_CE ≈ V_CE(sat)"}: o transistor funciona como chave fechada.`;
  } else {
    txt = PNP
      ? "Não há corrente de base suficiente para polarizar a junção EB. O transistor funciona como chave aberta (V_EC = |V_CC|)."
      : "Não há corrente de base suficiente para polarizar a junção BE. O transistor funciona como chave aberta (V_CE = V_CC).";
  }
  $("status_txt").textContent = txt;

  $("qval").textContent = PNP
    ? `(V_ECQ = ${eng(r.vce, "V")} ; I_CQ = ${eng(r.ic, "A")})  ·  V_CEQ = ${eng(-r.vce, "V")}`
    : `(V_CEQ = ${eng(r.vce, "V")} ; I_CQ = ${eng(r.ic, "A")})`;
  $("ib").textContent = eng(r.ib, "A");
  $("ic").textContent = eng(r.ic, "A");
  $("ie").textContent = eng(r.ie, "A");
  $("vce").textContent = eng(r.vce, "V");
  $("vbe_r").textContent = eng(r.vbeQ, "V");
  $("icsat").textContent = eng(r.icsat, "A");
  const sg = PNP ? -1 : 1; // no PNP com fontes negativas, todas as tensões de nó são negativas
  $("nodes").textContent = `${fmt(sg * r.vC, 3)} / ${fmt(sg * r.vE, 3)} / ${fmt(sg * r.vB, 3)} V`;
  $("bforced").textContent = r.ib > 0 ? fmt(r.ic / r.ib, 4) : "—";

  $("pd").textContent = eng(r.pd, "W");
  $("prc").textContent = eng(r.prc, "W");
  if (r.prb !== undefined) $("prb").textContent = eng(r.prb, "W");
  else {
    $("pr12").textContent = `${eng(r.pr1, "W")} / ${eng(r.pr2, "W")}`;
    $("thev").textContent = `${eng(p.vth, "V")} / ${eng(p.rth, "Ω")}`;
    $("ir12").textContent = `${eng(r.ir1, "A")} / ${eng(r.ir2, "A")}`;
  }
  $("pre").textContent = eng(r.pre, "W");
  $("pin").textContent = eng(r.pin, "W");
  $("pdmax").textContent = eng(r.pdmaxCircuit, "W");

  const w = $("pwarn");
  if (p.pmax !== null && r.pd > p.pmax) {
    w.hidden = false;
    w.textContent = `⚠ P_D = ${eng(r.pd, "W")} excede o limite do transistor (${eng(p.pmax, "W")}).`;
  } else if (p.pmax !== null && r.pdmaxCircuit > p.pmax) {
    w.hidden = false;
    w.textContent = `⚠ O ponto Q atual é seguro, mas em algum ponto da reta de carga a dissipação chega a ${eng(r.pdmaxCircuit, "W")}, acima de P_D(max) = ${eng(p.pmax, "W")}.`;
  } else {
    w.hidden = true;
  }

  let steps = r.steps;
  if (PNP) {
    steps = steps.map((s) => s
      .replaceAll("V<sub>BE", "V<sub>EB").replaceAll("V<sub>CE", "V<sub>EC")
      .replaceAll("→ BE →", "→ EB →").replaceAll("junção base-emissor", "junção emissor-base"));
    steps.unshift(`<b>Transistor PNP</b> com fontes −V<sub>CC</sub>${p.topo === "fixa" || p.topo === "div2" ? " e −V<sub>BB</sub>" : ""}: a análise é a mesma do NPN usando <b>módulos</b> (V<sub>EB</sub> no lugar de V<sub>BE</sub>, V<sub>EC</sub> no lugar de V<sub>CE</sub>). As correntes têm sentido oposto: I<sub>E</sub> entra pelo emissor, I<sub>B</sub> e I<sub>C</sub> saem pela base e pelo coletor. Assim V<sub>CE</sub> = −V<sub>EC</sub> e V<sub>BE</sub> = −V<sub>EB</sub>.`);
  }
  $("steps").innerHTML = steps.map((s) => `<li>${s}</li>`).join("");
}

function renderErrors(errors) {
  $("status").className = "status corte";
  $("badge").textContent = "Erro";
  $("status_txt").textContent = errors.join(" ");
  for (const id of ["qval", "ib", "ic", "ie", "vce", "vbe_r", "icsat", "nodes", "bforced", "thev", "ir12", "pd", "prc", "prb", "pr12", "pre", "pin", "pdmax"])
    $(id).textContent = "—";
  $("pwarn").hidden = true;
  $("steps").innerHTML = "";
  if (window.Plotly) Plotly.purge("plot");
}

/* ---------- gráfico ---------- */
function niceStep(x) {
  if (!(x > 0)) return 1e-6;
  const e = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / e;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * e;
}
function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderPlot(r, p) {
  if (!window.Plotly) return;
  const VL = PNP ? "V_EC" : "V_CE";
  const { vcc, beta, vcesat } = p;
  const mA = 1e3;
  const xMax = vcc * 1.08;
  const yMax = Math.max(r.icsatIdeal, r.ic) * 1.2 * mA;
  const knee = Math.max(vcesat / 3, 0.02);
  const N = 160;
  const xs = Array.from({ length: N + 1 }, (_, i) => (i / N) * xMax);
  const curve = (ib) => xs.map((v) => beta * ib * (1 - Math.exp(-v / knee)) * mA);

  const text = css("--text"), muted = css("--muted"), border = css("--border");
  const accent = css("--accent"), sat = css("--sat"), cut = css("--cut"), ok = css("--ok");
  const qColor = r.region === "ativa" ? ok : r.region === "sat" ? sat : cut;

  const traces = [];

  // família de curvas I_C × V_CE para passos de I_B
  const step = niceStep(r.icsatIdeal / beta / 5);
  for (let k = 1; k <= 12; k++) {
    const ib = k * step;
    if (beta * ib * mA > yMax * 0.98) break;
    traces.push({
      x: xs, y: curve(ib), mode: "lines", type: "scatter",
      line: { color: muted, width: 1 }, opacity: 0.55,
      name: `I_B = ${eng(ib, "A")}`, showlegend: false,
      hovertemplate: `I_B = ${eng(ib, "A")}<br>${VL} = %{x:.2f} V<br>I_C = %{y:.3f} mA<extra></extra>`,
    });
    const lastY = beta * ib * mA;
    traces.push({
      x: [xMax], y: [lastY], mode: "text", text: [eng(ib, "A")], textposition: "middle left",
      textfont: { color: muted, size: 10 }, showlegend: false, hoverinfo: "skip",
    });
  }

  // curva de I_BQ (destacada)
  if (r.ib > 0) {
    traces.push({
      x: xs, y: curve(r.ib), mode: "lines", type: "scatter",
      line: { color: accent, width: 2, dash: "dot" },
      name: `I_BQ = ${eng(r.ib, "A")}`,
      hovertemplate: `I_BQ = ${eng(r.ib, "A")}<br>${VL} = %{x:.2f} V<br>I_C = %{y:.3f} mA<extra></extra>`,
    });
  }

  // reta de carga CC
  traces.push({
    x: [0, vcc], y: [r.icsatIdeal * mA, 0], mode: "lines", type: "scatter",
    line: { color: accent, width: 3 }, name: "Reta de carga CC",
    hovertemplate: `${VL} = %{x:.2f} V<br>I_C = %{y:.3f} mA<extra>Reta de carga</extra>`,
  });

  // hipérbole de potência
  if ($("show_hyper").checked) {
    const P = p.pmax !== null ? p.pmax : r.pd > 0 ? r.vce * r.ic : null;
    if (P) {
      const hx = xs.filter((v) => v > 0);
      traces.push({
        x: hx, y: hx.map((v) => (P / v) * mA), mode: "lines", type: "scatter",
        line: { color: cut, width: 1.5, dash: "dash" },
        name: p.pmax !== null ? `P_D(max) = ${eng(P, "W")}` : `P = ${VL}·I_C = ${eng(P, "W")}`,
        hovertemplate: `${VL} = %{x:.2f} V<br>I_C = %{y:.3f} mA<extra>Hipérbole de potência</extra>`,
      });
    }
  }

  // ponto Q
  traces.push({
    x: [r.vce], y: [r.ic * mA], mode: "markers+text", type: "scatter",
    marker: { size: 14, color: qColor, line: { color: css("--card"), width: 2 } },
    text: ["Q"], textposition: "top right", textfont: { color: qColor, size: 15 },
    name: "Ponto Q",
    hovertemplate: `<b>Ponto Q</b><br>${VL}Q = ${eng(r.vce, "V")}<br>I_CQ = ${eng(r.ic, "A")}<br>I_BQ = ${eng(r.ib, "A")}<br>P_D = ${eng(r.pd, "W")}<extra></extra>`,
  });

  // linhas de projeção do Q
  const shapes = [
    { type: "rect", xref: "x", yref: "paper", x0: 0, x1: vcesat, y0: 0, y1: 1, fillcolor: sat, opacity: 0.12, line: { width: 0 }, layer: "below" },
    { type: "rect", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 0, y1: yMax * 0.025, fillcolor: cut, opacity: 0.12, line: { width: 0 }, layer: "below" },
    { type: "line", x0: r.vce, x1: r.vce, y0: 0, y1: r.ic * mA, line: { color: qColor, width: 1, dash: "dot" } },
    { type: "line", x0: 0, x1: r.vce, y0: r.ic * mA, y1: r.ic * mA, line: { color: qColor, width: 1, dash: "dot" } },
  ];
  const annotations = [
    { x: vcesat / 2, y: 1, xref: "x", yref: "paper", text: "Saturação", showarrow: false, textangle: -90, xanchor: "center", yanchor: "top", font: { color: sat, size: 11 } },
    { x: 1, y: yMax * 0.025, xref: "paper", yref: "y", text: "Corte", showarrow: false, xanchor: "right", yanchor: "bottom", font: { color: cut, size: 11 } },
  ];

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: text, family: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
    margin: { l: 60, r: 20, t: 50, b: 50 },
    xaxis: { title: `${VL} (V)`, range: [0, xMax], gridcolor: border, zerolinecolor: muted },
    yaxis: { title: "I_C (mA)", range: [0, yMax], gridcolor: border, zerolinecolor: muted },
    legend: { orientation: "h", x: 0, y: 1.02, yanchor: "bottom" },
    hovermode: "closest",
    shapes, annotations,
  };
  Plotly.react("plot", traces, layout, { responsive: true, displaylogo: false, locale: "pt-BR" });
}

/* ---------- ciclo principal ---------- */
function setPolarity(pnp) {
  PNP = pnp;
  document.querySelectorAll("[data-pol-tab]").forEach((b) =>
    b.setAttribute("aria-selected", String((b.dataset.polTab === "pnp") === pnp))
  );
  document.querySelectorAll("[data-pol]").forEach((el) =>
    el.classList.toggle("offp", el.dataset.pol !== (pnp ? "pnp" : "npn"))
  );
  document.title = `Calculadora de Ponto Q – TBJ ${pnp ? "PNP" : "NPN"}`;
  try { history.replaceState(null, "", pnp ? "#pnp" : "#npn"); } catch (_) {}
  renderPicker();
  update();
}

function applyTopology() {
  const t = topology();
  document.querySelectorAll("[data-show]").forEach((el) =>
    el.classList.toggle("off", !el.dataset.show.split(" ").includes(t))
  );
}

function drawCircuit(p) {
  $("circuit").innerHTML = circuitSVG(p.topo, { rc: p.rc > 0, re: p.re > 0 });
}

function update() {
  applyTopology();
  const { p, errors } = readInputs();
  drawCircuit(p);
  if (errors.length) return renderErrors(errors);
  const r = solve(p);
  renderResults(r, p);
  renderPlot(r, p);
}

function init() {
  renderPicker();
  $("picker").addEventListener("change", update);
  document.querySelectorAll("[data-pol-tab]").forEach((b) =>
    b.addEventListener("click", () => setPolarity(b.dataset.polTab === "pnp"))
  );
  const form = $("form");
  form.addEventListener("input", (e) => {
    if (e.target.id === "beta_slider") $("beta").value = e.target.value;
    if (e.target.id === "beta") $("beta_slider").value = e.target.value;
    update();
  });
  form.addEventListener("change", update);
  form.addEventListener("submit", (e) => e.preventDefault());
  $("show_hyper").addEventListener("change", update);

  document.querySelectorAll("[data-preset]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const ps = PRESETS[btn.dataset.preset];
      for (const [k, v] of Object.entries(ps)) {
        if (k === "topo") document.querySelector(`input[name="topo"][value="${v}"]`).checked = true;
        else $(k).value = v;
      }
      $("beta_slider").value = ps.beta;
      update();
    })
  );

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", update);
  if (!window.Plotly) {
    $("plotly-js").addEventListener("load", update);
    $("plotly-js").addEventListener("error", () => {
      $("plot").innerHTML = '<p class="hint">Não foi possível carregar a biblioteca de gráficos (verifique a conexão).</p>';
    });
  }
  setPolarity(location.hash === "#pnp");
}

document.addEventListener("DOMContentLoaded", init);
