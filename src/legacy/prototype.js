import { readSave, writeSave, importCode as importSaveCode } from '../app/save';
import { registerPwa } from '../app/pwa';

// =====================================================================
//  Spieldaten
// =====================================================================
const TYPES = {
  nest:     { name:'Nest',      unit:'sporen',  r:24, cap:[40,60,85],   rate:[0.8,1.15,1.6], def:[1,1.2,1.4],      value:20, desc:'Erzeugt stetig Sporen. Das Rückgrat jedes Schwarms – günstig und ausbaufähig.' },
  brut:     { name:'Brutnest',  unit:'drohnen', r:30, cap:[70,100,140], rate:[1.6,2.2,3.0],  def:[0.75,0.85,0.95], value:32, desc:'Doppelte Produktion, großer Vorrat, dafür verwundbar. Seine Drohnen sind schnell, aber schwach.' },
  bastion:  { name:'Bastion',   unit:'panzer',  r:26, cap:[50,70,95],   rate:[0.4,0.55,0.7], def:[2,2.6,3.2],      value:24, desc:'Angreifer zählen nur halb. Produziert langsam schwere Panzer, die viel aushalten und langsam ziehen.' },
  strom:    { name:'Strömung',  unit:'pfeile',  r:22, cap:[30,40,55],   rate:[0.2,0.3,0.4],  def:[1,1.1,1.2],      value:18, speedMul:[2,2.5,3], desc:'Alles, was von hier aufbricht, ist doppelt so schnell. Erzeugt flinke Pfeile.' },
  waechter: { name:'Wächter',   unit:'stachel', r:24, cap:[35,45,60],   rate:[0.5,0.6,0.7],  def:[1.2,1.4,1.6],    value:28, zapRange:[150,190,235], zapRate:[2.5,4,6], desc:'Ein Turm: beschießt feindliche Schwärme in Reichweite, auch solche, die nur vorbeiziehen. Ausbau erhöht Reichweite und Feuerrate.' },
  quelle:   { name:'Quelle',    unit:'orbs',    r:24, cap:[35,45,60],   rate:[0.5,0.6,0.7],  def:[1,1.1,1.2],      value:30, boost:[0.5,0.75,1.0], desc:'Verstärkt die Produktion aller direkt verbundenen eigenen Knoten um 50 %, ausgebaut bis 100 %.' },
};
const UNITS = {
  sporen:  { name:'Sporen',      str:1.0,  speed:1.0  },
  drohnen: { name:'Drohnen',     str:0.85, speed:1.25 },
  panzer:  { name:'Panzer',      str:1.7,  speed:0.7  },
  pfeile:  { name:'Pfeile',      str:0.9,  speed:1.6  },
  stachel: { name:'Stachel',     str:1.25, speed:0.95 },
  orbs:    { name:'Lichtkugeln', str:1.0,  speed:1.05 },
};
const TYPE_WEIGHTS = { nest:0.42, brut:0.16, bastion:0.14, strom:0.10, waechter:0.10, quelle:0.08 };
const ALL = Object.keys(TYPES);
const FACTIONS = [
  { name:'Wilde Knoten',   color:'#6f8494' },
  { name:'Goldschwarm',    color:'#ffc45a' },
  { name:'Purpurschwarm',  color:'#ff4f9a' },
  { name:'Grünschwarm',    color:'#7ee06a' },
  { name:'Violettschwarm', color:'#a27bff' },
];
const DIFF = { leicht:{ label:'Leicht', prod:0.85, ai:1.3 }, normal:{ label:'Normal', prod:1, ai:1 }, schwer:{ label:'Schwer', prod:1.15, ai:0.8 } };
const ABILITIES = {
  stoss:  { name:'Lichtstoß',  icon:'✦', cost:35, target:'own',   desc:'12 Einheiten erscheinen sofort an einem eigenen Knoten.' },
  frost:  { name:'Frostwelle', icon:'❄', cost:60, target:'enemy', desc:'Ein fremder Knoten friert 10 Sekunden ein und verliert 30 % seiner Einheiten.' },
  schild: { name:'Schild',     icon:'⬡', cost:45, target:'own',   desc:'Ein eigener Knoten verteidigt 8 Sekunden lang dreifach.' },
};
const SKILLS = [
  { id:'prod1',  branch:'Brut',  name:'Reiche Brut I',      desc:'+10 % Produktion',                          cost:1, req:null,    effect:{ prod:0.1 } },
  { id:'prod2',  branch:'Brut',  name:'Reiche Brut II',     desc:'+10 % Produktion',                          cost:2, req:'prod1', effect:{ prod:0.1 } },
  { id:'cap',    branch:'Brut',  name:'Weite Kammern',      desc:'+20 % Kapazität aller Knoten',              cost:2, req:'prod1', effect:{ cap:0.2 } },
  { id:'start',  branch:'Brut',  name:'Starker Auftakt',    desc:'+8 Einheiten zu Beginn jedes Levels',       cost:2, req:'cap',   effect:{ start:8 } },
  { id:'speed',  branch:'Sturm', name:'Schnelle Strömung',  desc:'+15 % Tempo aller Schwärme',                cost:1, req:null,    effect:{ speed:0.15 } },
  { id:'str1',   branch:'Sturm', name:'Scharfe Sporen I',   desc:'+10 % Angriffsstärke',                      cost:2, req:'speed', effect:{ str:0.1 } },
  { id:'str2',   branch:'Sturm', name:'Scharfe Sporen II',  desc:'+10 % Angriffsstärke',                      cost:3, req:'str1',  effect:{ str:0.1 } },
  { id:'flow',   branch:'Sturm', name:'Stetiger Fluss',     desc:'Routen schicken doppelt so oft Nachschub',  cost:2, req:'speed', effect:{ flow:1 } },
  { id:'def',    branch:'Fels',  name:'Dickes Riff',        desc:'+15 % Verteidigung',                        cost:1, req:null,    effect:{ def:0.15 } },
  { id:'cheap',  branch:'Fels',  name:'Kluge Baumeister',   desc:'Ausbau und Umbau kosten 25 % weniger',      cost:2, req:'def',   effect:{ cheap:0.25 } },
  { id:'range',  branch:'Fels',  name:'Weiter Blick',       desc:'+25 % Reichweite deiner Wächter',           cost:2, req:'def',   effect:{ range:0.25 } },
  { id:'energy', branch:'Fels',  name:'Seelenlicht',        desc:'+50 % Energie aus gefallenen Einheiten',    cost:2, req:'cheap', effect:{ energy:0.5 } },
  { id:'ab2',    branch:'Licht', name:'Frostwelle',         desc:ABILITIES.frost.desc,                        cost:3, req:null,    effect:{ ability:'frost' } },
  { id:'ab3',    branch:'Licht', name:'Schild',             desc:ABILITIES.schild.desc,                       cost:3, req:null,    effect:{ ability:'schild' } },
  { id:'en2',    branch:'Licht', name:'Tiefer Brunnen',     desc:'Fähigkeiten kosten 20 % weniger Energie',   cost:3, req:'ab2',   effect:{ abcost:0.2 } },
];
const CHAPTERS = [
  { name:'Der Schelf',  desc:'Flaches Wasser. Lerne Routen, Ausbau und die ersten Knotenarten.' },
  { name:'Das Riff',    desc:'Engstellen, Türme und Quellen. Zwei Gegner zugleich.' },
  { name:'Der Abgrund', desc:'Drei Schwärme, kein Licht. Alles, was du gelernt hast, zählt.' },
];
const T1 = ['nest'], T2 = ['nest','brut'], T3 = ['nest','brut','bastion'], T4 = ['nest','brut','bastion','strom'], T5 = ['nest','brut','bastion','strom','waechter'];
const CAMPAIGN = [
  { ch:0, name:'Erstes Leuchten',         nodes:7,  enemies:1, types:T1,  ai:3.4, obst:1, seed:11,  gar:12, prod:1.00, par:80,  text:'Tief unten im Abgrund leuchten Knoten. Wer alle hält, gewinnt.' },
  { ch:0, name:'Brutgrund',               nodes:9,  enemies:1, types:T2,  ai:3.0, obst:2, seed:23,  gar:14, prod:1.00, par:90,  newType:'brut', text:'Brutnester füllen sich doppelt so schnell. Nimm sie zuerst.' },
  { ch:0, name:'Ausbau',                  nodes:10, enemies:1, types:T2,  ai:2.8, obst:2, seed:29,  gar:16, prod:1.00, par:100, feature:'upgrade', text:'Tippe einen eigenen Knoten an: Für Einheiten kannst du ihn bis Stufe 3 ausbauen. Der Gegner tut das jetzt auch.' },
  { ch:0, name:'Riffkante',               nodes:10, enemies:1, types:T3,  ai:2.6, obst:3, seed:37,  gar:16, prod:1.02, par:110, newType:'bastion', text:'Bastionen halten Engstellen. Umgehe sie oder sammle genug Kraft.' },
  { ch:0, name:'Kalte Strömung',          nodes:11, enemies:1, types:T4,  ai:2.5, obst:3, seed:41,  gar:18, prod:1.04, par:120, newType:'strom', text:'Strömungsknoten verdoppeln das Tempo. Route deinen Nachschub hindurch.' },
  { ch:0, name:'Zwei Fronten',            nodes:12, enemies:2, types:T4,  ai:2.5, obst:3, seed:47,  gar:18, prod:1.04, par:150, feature:'split', text:'Zwei Gegner. Ein Knoten kann bis zu drei Routen halten und teilt seinen Abfluss gleichmäßig auf. Über die Reserve behältst du Verteidiger zurück.' },
  { ch:1, name:'Wachtposten',             nodes:12, enemies:2, types:T5,  ai:2.3, obst:4, seed:59,  gar:20, prod:1.06, par:150, newType:'waechter', text:'Wächter sind Türme: Sie beschießen alles Fremde in Reichweite. Führe keine Route durch ihr Feld.' },
  { ch:1, name:'Die Quelle',              nodes:13, enemies:2, types:ALL, ai:2.2, obst:4, seed:67,  gar:22, prod:1.08, par:120, newType:'quelle', text:'Eine Quelle verstärkt ihre Nachbarn. Wer sie hält, wächst schneller.' },
  { ch:1, name:'Umbau',                   nodes:13, enemies:2, types:ALL, ai:2.1, obst:4, seed:71,  gar:22, prod:1.08, par:127, feature:'convert', text:'Du kannst eigene Knoten für Einheiten in eine andere Art umbauen – zum Beispiel ein Nest an der Front in einen Wächter.' },
  { ch:1, name:'Schwarzes Riff',          nodes:14, enemies:2, types:ALL, ai:2.0, obst:5, seed:73,  gar:24, prod:1.10, par:135, text:'Viele Felsen, wenige Wege. Halte die Kreuzungen.' },
  { ch:1, name:'Enge Gassen',             nodes:15, enemies:2, types:ALL, ai:1.9, obst:6, seed:79,  gar:24, prod:1.10, par:142, text:'Fast alles läuft durch zwei Gassen. Wer dort einen Turm hat, gewinnt.' },
  { ch:1, name:'Gegenstrom',              nodes:15, enemies:2, types:ALL, ai:1.8, obst:5, seed:83,  gar:26, prod:1.12, par:150, text:'Die Gegner schicken ihre Schwärme durch Strömungen. Sei schneller.' },
  { ch:2, name:'Dreifront',               nodes:16, enemies:3, types:ALL, ai:1.75, obst:5, seed:89,  gar:26, prod:1.18, par:165, text:'Drei Schwärme. Lass sie sich gegenseitig zermürben, bevor du zuschlägst.' },
  { ch:2, name:'Tiefe Gräben',            nodes:17, enemies:3, types:ALL, ai:1.65, obst:6, seed:97,  gar:28, prod:1.20, par:172, text:'Lange Wege. Reserven an der Front sind hier wichtiger als überall sonst.' },
  { ch:2, name:'Stille Wasser',           nodes:17, enemies:3, types:ALL, ai:1.55, obst:6, seed:101, gar:28, prod:1.21, par:180, text:'Ruhig, bis einer den ersten Zug macht.' },
  { ch:2, name:'Das Leuchten erlischt',   nodes:18, enemies:3, types:ALL, ai:1.45, obst:6, seed:103, gar:30, prod:1.22, par:187, text:'Die Gegner starten mit ausgebauten Nestern. Deine Fähigkeiten entscheiden.', boss:true },
  { ch:2, name:'Abgrund',                 nodes:18, enemies:3, types:ALL, ai:1.35, obst:7, seed:113, gar:32, prod:1.24, par:195, text:'Kein Licht mehr außer deinem.' },
  { ch:2, name:'Der Grund',               nodes:20, enemies:3, types:ALL, ai:1.25, obst:7, seed:127, gar:34, prod:1.26, par:225, text:'Alles, was der Abgrund hat. Wer hier gewinnt, hat das Spiel gemeistert.', boss:true },
];
function endlessDef(n) {
  return { name:`Welle ${n}`, nodes:Math.min(22, 12 + n), enemies:n < 3 ? 2 : 3, types:ALL, ai:Math.max(0.8, 2.4 - n * 0.08), obst:3 + (n % 4),
           seed:500 + n * 37, gar:20 + n * 2, prod:Math.min(1.7, 1 + n * 0.035), par:200 + n * 10, endless:true, boss:n >= 6, text:`Welle ${n}. Die Gegner werden mit jeder Welle stärker; deine Fähigkeiten wachsen mit.` };
}
const DEMO = { name:'Demo', nodes:13, enemies:2, types:ALL, ai:2.0, obst:4, seed:1, gar:18, prod:1, par:999, demo:true };
const BASE_SPEED = 82, TAU = Math.PI * 2, UI_FONT = '"Avenir Next","Segoe UI","Helvetica Neue",Arial,sans-serif';

// =====================================================================
//  Hilfsfunktionen
// =====================================================================
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = s => document.querySelector(s);
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);

// =====================================================================
//  Spielstand und Fähigkeiten
// =====================================================================
const SAVE_KEY = 'tiefenlicht:save';
let save = readSave();
let P = {};
function computePerks() {
  P = { prod:0, cap:0, start:0, speed:0, str:0, flow:0, def:0, cheap:0, range:0, energy:0, abcost:0, abilities:new Set(['stoss']) };
  for (const id of save.spent) {
    const sk = SKILLS.find(s => s.id === id); if (!sk) continue;
    for (const k in sk.effect) { if (k === 'ability') P.abilities.add(sk.effect[k]); else P[k] += sk.effect[k]; }
  }
}
async function loadSave() { save = readSave(); computePerks(); }
async function persist() { writeSave(save); }
const exportCode = () => btoa(unescape(encodeURIComponent(JSON.stringify(save))));
function importCode(str) {
  const o = importSaveCode(str); if (!o) return false;
  save = { ...save, ...o }; computePerks(); persist(); return true;
}
const campaignUnlocked = () => { let u = 0; while (u < CAMPAIGN.length - 1 && save.stars[u]) u++; return u; };
const totalStars = () => Object.values(save.stars).reduce((s, v) => s + v, 0);

// =====================================================================
//  Audio (synthetisch, ohne Dateien)
// =====================================================================
const audio = {
  ctx:null, master:null, last:{},
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = save.sound ? 0.5 : 0; this.master.connect(this.ctx.destination);
      this.ambient();
    } catch (e) {}
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setEnabled(on) { save.sound = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05); },
  tone(freq, dur, type, vol, slide) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime); if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(vol || 0.2, c.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(c.currentTime + dur + 0.02);
  },
  noise(dur, vol, freq) {
    const c = this.ctx; if (!c) return;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 1;
    const g = c.createGain(); g.gain.value = vol || 0.15; src.connect(f); f.connect(g); g.connect(this.master); src.start();
  },
  play(name, minGap) {
    if (!this.ctx || !save.sound) return;
    const t = this.ctx.currentTime;
    if (minGap && this.last[name] && t - this.last[name] < minGap) return;
    this.last[name] = t;
    switch (name) {
      case 'click':   this.tone(880, 0.06, 'sine', 0.1); break;
      case 'send':    this.noise(0.18, 0.07, 900); this.tone(520, 0.12, 'sine', 0.05, 780); break;
      case 'route':   this.tone(660, 0.08, 'sine', 0.08); setTimeout(() => this.tone(990, 0.1, 'sine', 0.08), 60); break;
      case 'capture': this.tone(523, 0.18, 'sine', 0.16); setTimeout(() => this.tone(784, 0.3, 'sine', 0.16), 90); setTimeout(() => this.tone(1046, 0.4, 'triangle', 0.1), 180); break;
      case 'lost':    this.tone(220, 0.5, 'sawtooth', 0.1, 110); break;
      case 'upgrade': [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.12), i * 70)); break;
      case 'zap':     this.noise(0.08, 0.08, 2400); break;
      case 'clash':   this.noise(0.12, 0.06, 1600); break;
      case 'ability': this.tone(300, 0.5, 'sine', 0.14, 1200); this.noise(0.4, 0.05, 600); break;
      case 'frost':   this.tone(1400, 0.6, 'sine', 0.1, 300); this.noise(0.5, 0.05, 3000); break;
      case 'win':     [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, 'triangle', 0.14), i * 120)); break;
      case 'lose':    [440, 392, 349, 294].forEach((f, i) => setTimeout(() => this.tone(f, 0.6, 'sawtooth', 0.08), i * 220)); break;
      case 'error':   this.tone(200, 0.15, 'square', 0.06); break;
    }
  },
  ambient() {
    const c = this.ctx; if (!c) return;
    const g = c.createGain(); g.gain.value = 0.05;
    for (const [f, type] of [[55, 'sine'], [82.5, 'triangle']]) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g); o.start(); }
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    g.connect(this.master);
    const len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const ng = c.createGain(); ng.gain.value = 0.04; n.connect(f); f.connect(ng); ng.connect(this.master); n.start();
  },
};

// =====================================================================
//  Zustand
// =====================================================================
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W = 0, H = 0, S = 1, R = 0, dpr = 1;
let mode = 'menu', demo = false, levelKind = 'campaign', levelIndex = 0, L = DEMO;
let nodes = [], edges = [], adj = [], rocks = [], groups = [], particles = [], zaps = [], motes = [];
let running = false, paused = false, speed = 1, elapsed = 0, levelTime = 0, last = 0, hudTimer = 0, demoTimer = 0;
let drag = null, selected = null, pointer = { x:0, y:0 }, abilityMode = null, panelConv = false, sendMode = 0.5;
const SEND_MODES = [[0.25, '25 %'], [0.5, '50 %'], [0.75, '75 %'], [1, 'Alle']];
let aiTimers = {}, staticLayer = null, stats = { captured:0 }, energy = 0, tipTimer = null;

const X = n => n.nx * W, Y = n => n.ny * H;
const NR = n => TYPES[n.type].r * S * (1 + (n.level - 1) * 0.12);
const dist = (a, b) => Math.hypot(X(a) - X(b), Y(a) - Y(b));
const isPlayer = n => n.owner === 1 && !demo;
function stat(n, key) { const v = TYPES[n.type][key]; return Array.isArray(v) ? v[n.level - 1] : v; }
function capOf(n) { return stat(n, 'cap') * (isPlayer(n) ? 1 + P.cap : 1); }
function rateOf(n) {
  let r = stat(n, 'rate'); if (r <= 0 || n.frozen > 0) return 0;
  const q = adj[n.id].reduce((s, j) => s + (nodes[j].type === 'quelle' && nodes[j].owner === n.owner ? stat(nodes[j], 'boost') : 0), 0);
  r *= 1 + Math.min(1.5, q);
  if (isPlayer(n)) r *= 1 + P.prod; else if (n.owner > 1 || demo) r *= L.prod * DIFF[save.difficulty].prod;
  return r;
}
function defOf(n) { let d = stat(n, 'def'); if (isPlayer(n)) d *= 1 + P.def; if (n.shield > 0) d *= 3; return d; }
const upgradeCost = n => Math.ceil(20 * n.level * (isPlayer(n) ? 1 - P.cheap : 1));
const convertCost = n => Math.ceil(25 * (isPlayer(n) ? 1 - P.cheap : 1));
const rangeOf = n => stat(n, 'zapRange') * S * (isPlayer(n) ? 1 + P.range : 1);
const abilityCost = id => Math.ceil(ABILITIES[id].cost * (1 - P.abcost));

// =====================================================================
//  Graph
// =====================================================================
function bfsPath(from, to, allow) {
  const prev = new Array(nodes.length).fill(-1), seen = new Array(nodes.length).fill(false);
  seen[from] = true; const q = [from];
  while (q.length) {
    const v = q.shift(); if (v === to) break;
    for (const w of adj[v]) { if (seen[w]) continue; if (w !== to && allow && !allow(w)) continue; seen[w] = true; prev[w] = v; q.push(w); }
  }
  if (!seen[to]) return null;
  const path = []; for (let v = to; v !== -1; v = prev[v]) path.unshift(v);
  return path;
}
function connected(n, E) {
  const a = Array.from({ length:n }, () => []); for (const [p, q] of E) { a[p].push(q); a[q].push(p); }
  const seen = new Array(n).fill(false); seen[0] = true; const st = [0]; let c = 1;
  while (st.length) { const v = st.pop(); for (const w of a[v]) if (!seen[w]) { seen[w] = true; c++; st.push(w); } }
  return c === n;
}
function hopDistances(n, E, s) {
  const a = Array.from({ length:n }, () => []); for (const [p, q] of E) { a[p].push(q); a[q].push(p); }
  const d = new Array(n).fill(Infinity); d[s] = 0; const q = [s];
  while (q.length) { const v = q.shift(); for (const w of a[v]) if (d[w] === Infinity) { d[w] = d[v] + 1; q.push(w); } }
  return d;
}
function segCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((cx - ax) * dx + (cy - ay) * dy) / L2, 0, 1);
  return Math.hypot(ax + dx * t - cx, ay + dy * t - cy) < r;
}

// =====================================================================
//  Kartengenerator
// =====================================================================
function generateMap(d) {
  const rng = mulberry32((d.seed * 2654435761 >>> 0) ^ (d.nodes * 97));
  const minHops = d.nodes < 9 ? 2 : d.nodes < 13 ? 3 : 4;
  for (let attempt = 0; attempt < 90; attempt++) {
    const ns = [], rk = [];
    for (let i = 0; i < d.obst; i++) {
      const cx = 0.14 + rng() * 0.72, cy = 0.2 + rng() * 0.62, k = 2 + Math.floor(rng() * 3);
      for (let j = 0; j < k; j++) rk.push({ nx:cx + (rng() - 0.5) * 0.09, ny:cy + (rng() - 0.5) * 0.12, nr:0.028 + rng() * 0.03, c:i });
    }
    const rp = rk.map(r => ({ x:r.nx * W, y:r.ny * H, r:r.nr * R }));
    const minD = Math.max(92, Math.min(W, H) * 0.16) * (d.nodes > 14 ? 0.85 : 1);
    let tries = 0;
    while (ns.length < d.nodes && tries < 3000) {
      tries++;
      const nx = 0.06 + rng() * 0.88, ny = 0.16 + rng() * 0.7, x = nx * W, y = ny * H;
      if (rp.some(p => Math.hypot(p.x - x, p.y - y) < p.r + 42 * S)) continue;
      if (ns.some(n => Math.hypot(n.nx * W - x, n.ny * H - y) < minD)) continue;
      ns.push({ nx, ny });
    }
    if (ns.length < d.nodes) continue;
    const E = [];
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      const ax = ns[i].nx * W, ay = ns[i].ny * H, bx = ns[j].nx * W, by = ns[j].ny * H, len = Math.hypot(ax - bx, ay - by);
      if (len > Math.min(W, H) * 0.48) continue;
      const mx = (ax + bx) / 2, my = (ay + by) / 2, rr = len / 2; let ok = true;
      for (let k = 0; k < ns.length && ok; k++) if (k !== i && k !== j && Math.hypot(ns[k].nx * W - mx, ns[k].ny * H - my) < rr * 0.98) ok = false;
      if (!ok || rp.some(p => segCircle(ax, ay, bx, by, p.x, p.y, p.r + 8 * S))) continue;
      E.push([i, j]);
    }
    let keep = E.slice();
    for (const e of E.slice().sort(() => rng() - 0.5)) {
      if (rng() > 0.28) continue;
      const test = keep.filter(k => k !== e), deg = i => test.filter(k => k[0] === i || k[1] === i).length;
      if (deg(e[0]) < 2 || deg(e[1]) < 2) continue;
      if (connected(ns.length, test)) keep = test;
    }
    if (!connected(ns.length, keep)) continue;
    const order = ns.map((n, i) => i).sort((a, b) => ns[a].nx - ns[b].nx), starts = [order[0]];
    const dpx = (i, j) => Math.hypot((ns[i].nx - ns[j].nx) * W, (ns[i].ny - ns[j].ny) * H);
    while (starts.length < d.enemies + 1) {
      let best = -1, bd = -1;
      for (let i = 0; i < ns.length; i++) { if (starts.includes(i)) continue; const dd = Math.min(...starts.map(s => dpx(s, i))); if (dd > bd) { bd = dd; best = i; } }
      starts.push(best);
    }
    const hops = hopDistances(ns.length, keep, starts[0]);
    if (starts.slice(1).some(s => hops[s] < minHops)) continue;
    if (keep.filter(e => e[0] === starts[0] || e[1] === starts[0]).length < 2) continue;
    return { ns, rk, E:keep, starts, rng };
  }
  return null;
}
function generateMapSafe(d) {
  let cur = { ...d };
  for (let i = 0; i < 12; i++) { const m = generateMap(cur); if (m) return m; if (cur.obst > 0) cur.obst--; else cur.nodes = Math.max(5, cur.nodes - 1); cur.seed += 7; }
  return generateMap({ ...d, obst:0, nodes:6 });
}

// =====================================================================
//  Level aufbauen
// =====================================================================
function buildLevel() {
  const gen = generateMapSafe(L);
  nodes = gen.ns.map((p, id) => ({ id, nx:p.nx, ny:p.ny, type:'nest', level:1, owner:0, units:0, routes:[], reserve:0, rr:0, flowT:0, flash:0, zapAcc:0, frozen:0, shield:0, pulse:Math.random() * TAU }));
  edges = gen.E; rocks = gen.rk; adj = nodes.map(() => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const rng = gen.rng, allowed = L.types, wsum = allowed.reduce((s, t) => s + TYPE_WEIGHTS[t], 0);
  for (const n of nodes) {
    if (gen.starts.includes(n.id)) continue;
    let x = rng() * wsum;
    for (const t of allowed) { x -= TYPE_WEIGHTS[t]; if (x <= 0) { n.type = t; break; } }
    n.units = 2 + Math.floor(rng() * stat(n, 'cap') * 0.4);
  }
  gen.starts.forEach((id, k) => {
    const n = nodes[id];
    n.type = allowed.includes('brut') ? 'brut' : 'nest'; n.owner = k + 1; n.units = L.gar;
    if (k > 0 && L.boss) { n.level = 2; n.units = Math.round(L.gar * 1.3); }
    if (k === 0 && !demo) n.units += P.start;
    for (const j of adj[id]) if (!gen.starts.includes(j)) nodes[j].units = Math.min(nodes[j].units, 2 + Math.floor(rng() * L.gar * 0.35));
  });
  groups = []; particles = []; zaps = []; aiTimers = {};
  for (let f = demo ? 1 : 2; f <= L.enemies + 1; f++) aiTimers[f] = L.ai * (1.6 + rng() * 0.8);
  selected = null; drag = null; abilityMode = null; levelTime = 0; energy = 0; stats = { captured:0 }; demoTimer = 0;
  buildStatic(); buildLegend(); renderAbilities(); renderPanel(); updateHud();
}

// =====================================================================
//  Simulation
// =====================================================================
const strOf = g => UNITS[g.unit].str * (g.owner === 1 && !demo ? 1 + P.str : 1);
const power = g => g.n * strOf(g);
const incoming = (id, pred) => groups.reduce((s, g) => s + (g.to === id && pred(g) ? power(g) : 0), 0);
function speedFrom(n, owner, unit) {
  let s = BASE_SPEED * S * UNITS[unit].speed;
  if (n.type === 'strom' && n.owner === owner) s *= stat(n, 'speedMul');
  if (owner === 1 && !demo) s *= 1 + P.speed;
  return s;
}
function launch(n, path, k, sound) {
  k = Math.min(Math.floor(n.units), Math.floor(k));
  if (k < 1 || !path.length) return null;
  n.units -= k;
  const unit = TYPES[n.type].unit;
  const g = { owner:n.owner, n:k, unit, from:n.id, to:path[0], path:path.slice(1), t:0, x:X(n), y:Y(n), speed:speedFrom(n, n.owner, unit) };
  groups.push(g);
  if (sound) audio.play('send', 0.15);
  return g;
}
function gainEnergy(lost) { if (demo) return; energy = Math.min(100, energy + lost * 0.5 * (1 + P.energy)); }
function arrive(g) {
  const h = nodes[g.to];
  if (h.owner === g.owner) {
    if (g.path.length) { g.from = g.to; g.to = g.path.shift(); g.t = 0; g.speed = speedFrom(h, g.owner, g.unit); }
    else { h.units += g.n; g.n = 0; }
    return;
  }
  const pw = power(g), def = defOf(h), effDef = h.units * def;
  if (pw > effDef) {
    const remaining = (pw - effDef) / strOf(g);
    gainEnergy(h.units + (g.n - remaining));
    const prev = h.owner;
    h.owner = g.owner; h.units = remaining; h.routes = []; h.reserve = 0; h.flash = 1; h.frozen = 0; h.shield = 0;
    if (selected === h) { selected = null; renderPanel(); }
    burst(X(h), Y(h), FACTIONS[g.owner].color, 30);
    if (!demo) {
      if (g.owner === 1) { stats.captured++; audio.play('capture', 0.2); if (stats.captured === 1) tip('Erobert! Der Knoten produziert jetzt für dich.', 3000); }
      else if (prev === 1) audio.play('lost', 0.3);
    }
  } else {
    const killed = pw / def; h.units -= killed; gainEnergy(killed + g.n);
    sparks(g.x, g.y, FACTIONS[g.owner].color, FACTIONS[h.owner].color, g.n);
    if (!demo) audio.play('clash', 0.25);
  }
  g.n = 0;
}
function doUpgrade(n, free) {
  if (n.level >= 3) return false;
  const cost = free ? 0 : upgradeCost(n); if (n.units < cost) return false;
  n.units -= cost; n.level++; n.flash = 0.6;
  burst(X(n), Y(n), FACTIONS[n.owner].color, 14);
  if (isPlayer(n)) audio.play('upgrade');
  return true;
}
function doConvert(n, type) {
  if (type === n.type || !L.types.includes(type)) return false;
  const cost = convertCost(n); if (n.units < cost) return false;
  n.units -= cost; n.type = type; n.level = 1; n.flash = 0.6; n.zapAcc = 0;
  burst(X(n), Y(n), FACTIONS[n.owner].color, 14);
  if (isPlayer(n)) audio.play('upgrade');
  return true;
}
function useAbility(id, n) {
  const A = ABILITIES[id], cost = abilityCost(id);
  if (energy < cost || !P.abilities.has(id)) return false;
  if (A.target === 'own' && n.owner !== 1) return false;
  if (A.target === 'enemy' && n.owner === 1) return false;
  energy -= cost;
  if (id === 'stoss') { n.units += 12; burst(X(n), Y(n), '#ffffff', 26); audio.play('ability'); }
  if (id === 'frost') { n.frozen = 10; n.units *= 0.7; burst(X(n), Y(n), '#9fe4ff', 30); audio.play('frost'); }
  if (id === 'schild') { n.shield = 8; burst(X(n), Y(n), '#9fe4ff', 16); audio.play('ability'); }
  return true;
}

function update(dt) {
  elapsed += dt; levelTime += dt;
  const flowInterval = P.flow ? 0.2 : 0.4;
  for (const n of nodes) {
    n.flash = Math.max(0, n.flash - dt * 1.4); n.frozen = Math.max(0, n.frozen - dt); n.shield = Math.max(0, n.shield - dt);
    if (n.owner === 0) continue;
    const cap = capOf(n), r = rateOf(n);
    if (r > 0 && n.units < cap) n.units = Math.min(cap, n.units + r * dt);
    // Routen: der Überschuss über der Reserve fließt ab, gleichmäßig auf alle Routen verteilt
    if (n.routes.length && n.owner === 1) {
      n.flowT -= dt;
      if (n.flowT <= 0) {
        n.flowT = flowInterval;
        const avail = Math.floor(n.units - n.reserve * cap), k = n.routes.length;
        if (avail >= 1) {
          if (avail < k) { launch(n, n.routes[n.rr % k], avail); }
          else { const each = Math.floor(avail / k); let extra = avail - each * k; for (let i = 0; i < k; i++) launch(n, n.routes[(n.rr + i) % k], each + (extra-- > 0 ? 1 : 0)); }
          n.rr++;
        }
      }
    } else if (n.routes.length) n.routes = [];
  }
  for (const g of groups) {
    const a = nodes[g.from], b = nodes[g.to], d = Math.max(1, dist(a, b));
    g.t = Math.min(1, g.t + g.speed * dt / d);
    g.x = X(a) + (X(b) - X(a)) * g.t; g.y = Y(a) + (Y(b) - Y(a)) * g.t;
  }
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
    const a = groups[i], b = groups[j];
    if (a.owner === b.owner || a.n <= 0 || b.n <= 0 || !(a.from === b.to && a.to === b.from)) continue;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 14 * S) {
      const pa = power(a), pb = power(b);
      gainEnergy(Math.min(a.n, b.n) * 2 * 0.6);
      sparks((a.x + b.x) / 2, (a.y + b.y) / 2, FACTIONS[a.owner].color, FACTIONS[b.owner].color, Math.min(a.n, b.n));
      if (pa > pb) { a.n = (pa - pb) / strOf(a); b.n = 0; } else if (pb > pa) { b.n = (pb - pa) / strOf(b); a.n = 0; } else a.n = b.n = 0;
      if (!demo) audio.play('clash', 0.25);
    }
  }
  for (const n of nodes) {
    if (n.type !== 'waechter' || n.owner === 0 || n.frozen > 0) continue;
    n.zapAcc = Math.min(3, n.zapAcc + stat(n, 'zapRate') * dt);
    if (n.zapAcc < 1) continue;
    let best = null, bd = rangeOf(n);
    for (const g of groups) { if (g.owner === n.owner || g.n <= 0) continue; const dd = Math.hypot(g.x - X(n), g.y - Y(n)); if (dd < bd) { bd = dd; best = g; } }
    if (!best) continue;
    const dmg = Math.min(power(best), Math.floor(n.zapAcc)), killed = dmg / strOf(best);
    best.n -= killed; n.zapAcc -= dmg; gainEnergy(killed);
    zaps.push({ x1:X(n), y1:Y(n), x2:best.x, y2:best.y, life:0.16, color:FACTIONS[n.owner].color });
    sparks(best.x, best.y, FACTIONS[best.owner].color, null, killed);
    if (!demo) audio.play('zap', 0.1);
  }
  for (const g of groups) if (g.n > 0.05 && g.t >= 1) arrive(g);
  groups = groups.filter(g => g.n > 0.05);
  if (drag && drag.src.owner !== 1) drag = null;
  if (selected && selected.owner !== 1) { selected = null; renderPanel(); }

  for (const f in aiTimers) {
    const F = +f; if (!nodes.some(n => n.owner === F)) continue;
    aiTimers[f] -= dt;
    if (aiTimers[f] <= 0) { aiTimers[f] = L.ai * DIFF[save.difficulty].ai * (0.7 + Math.random() * 0.6); aiAct(F); }
  }
  const damp = Math.pow(0.05, dt);
  for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= damp; p.vy *= damp; }
  particles = particles.filter(p => p.life > 0);
  for (const z of zaps) z.life -= dt;
  zaps = zaps.filter(z => z.life > 0);

  if (demo) {
    const alive = new Set(nodes.filter(n => n.owner > 0).map(n => n.owner));
    if (alive.size <= 1) { demoTimer += dt; if (demoTimer > 4) startDemo(); }
    return;
  }
  const pAlive = nodes.some(n => n.owner === 1) || groups.some(g => g.owner === 1);
  const eAlive = nodes.some(n => n.owner > 1) || groups.some(g => g.owner > 1);
  if (!eAlive) finish(true); else if (!pAlive) finish(false);
}

// =====================================================================
//  Gegner-KI
// =====================================================================
function frontier(src, F) {
  const paths = new Map(), prev = new Map([[src.id, -1]]), q = [src.id];
  while (q.length) {
    const v = q.shift();
    for (const w of adj[v]) {
      if (nodes[w].owner === F) { if (!prev.has(w)) { prev.set(w, v); q.push(w); } }
      else if (!paths.has(w)) { const p = [w]; for (let u = v; u !== src.id; u = prev.get(u)) p.unshift(u); paths.set(w, p); }
    }
  }
  return paths;
}
function aiAct(F) {
  const mine = nodes.filter(n => n.owner === F); if (!mine.length) return;
  const aiUpg = demo || levelKind === 'endless' || levelIndex >= 2;
  const strF = 1;
  // Bedrohte Knoten verstärken
  for (const n of mine) {
    const threat = incoming(n.id, g => g.owner !== F);
    if (threat > 3 && threat > n.units * defOf(n) * 0.9) {
      const helper = adj[n.id].map(j => nodes[j]).filter(m => m.owner === F && m.units >= 6).sort((a, b) => b.units - a.units)[0];
      if (helper) { launch(helper, [n.id], Math.floor(helper.units * 0.6)); return; }
    }
  }
  // Ausbauen, wenn reich
  if (aiUpg && Math.random() < 0.45) {
    const cand = mine.filter(n => n.level < 3 && n.units >= upgradeCost(n) + 8 && n.units >= capOf(n) * 0.65).sort((a, b) => TYPES[b.type].value - TYPES[a.type].value)[0];
    if (cand) { doUpgrade(cand); return; }
  }
  // Umbau: reiches Nest an der Front wird Wächter oder Bastion
  if (aiUpg && L.types.includes('waechter') && Math.random() < 0.12) {
    const cand = mine.filter(n => n.type === 'nest' && n.units >= convertCost(n) + 10 && adj[n.id].some(j => nodes[j].owner !== F && nodes[j].owner !== 0))[0];
    if (cand && !adj[cand.id].some(j => nodes[j].owner === F && nodes[j].type === 'waechter')) { doConvert(cand, Math.random() < 0.6 ? 'waechter' : 'bastion'); return; }
  }
  // Angriff auf das lohnendste erreichbare Ziel
  let best = null, bs = -Infinity;
  const sources = mine.filter(n => n.units >= 8).sort((a, b) => b.units - a.units).slice(0, 4);
  for (const src of sources) {
    const u = UNITS[TYPES[src.type].unit], avail = Math.floor(src.units * 0.75), availPow = avail * u.str * strF;
    for (const [tid, path] of frontier(src, F)) {
      const t = nodes[tid], hops = path.length, def = defOf(t);
      const grow = t.owner > 0 ? rateOf(t) * hops * 1.6 / u.speed : 0;
      const defenders = (t.units + grow) * def + incoming(tid, g => g.owner === t.owner) - incoming(tid, g => g.owner === F);
      if (availPow <= defenders * 1.15 + 1) continue;
      const hostileTower = t.type === 'waechter' && t.owner > 0 ? 8 : 0;
      const score = TYPES[t.type].value + t.level * 6 + (t.owner === 1 ? 10 : 0) + (t.owner === 0 ? 5 : 0) - defenders * 0.7 - hops * 7 - hostileTower + Math.random() * 6;
      if (score > bs) { bs = score; best = { src, path, avail }; }
    }
  }
  if (best) { launch(best.src, best.path, best.avail); return; }
  const rich = mine.filter(n => n.units >= capOf(n) * 0.8).sort((a, b) => b.units - a.units)[0]; if (!rich) return;
  const front = mine.filter(n => n !== rich && adj[n.id].some(j => nodes[j].owner !== F)).sort((a, b) => a.units - b.units)[0]; if (!front) return;
  const p = bfsPath(rich.id, front.id, id => nodes[id].owner === F);
  if (p && p.length > 1) launch(rich, p.slice(1), Math.floor(rich.units * 0.5));
}

// =====================================================================
//  Effekte
// =====================================================================
function burst(x, y, color, k) {
  for (let i = 0; i < k; i++) {
    const a = Math.random() * TAU, sp = (50 + Math.random() * 140) * S, life = 0.5 + Math.random() * 0.6;
    particles.push({ x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, life, max:life, color, size:(1.4 + Math.random() * 2.2) * S });
  }
  if (particles.length > 700) particles.splice(0, particles.length - 700);
}
function sparks(x, y, c1, c2, k) {
  k = Math.min(10, 2 + Math.ceil(k / 2));
  for (let i = 0; i < k; i++) {
    const a = Math.random() * TAU, sp = (25 + Math.random() * 80) * S, life = 0.25 + Math.random() * 0.35;
    particles.push({ x:x + (Math.random() - 0.5) * 8 * S, y:y + (Math.random() - 0.5) * 8 * S, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, life, max:life, color:c2 && Math.random() < 0.5 ? c2 : c1, size:(0.9 + Math.random() * 1.4) * S });
  }
  if (particles.length > 700) particles.splice(0, particles.length - 700);
}

// =====================================================================
//  Rendering
// =====================================================================
const glows = {};
function glowSprite(color) {
  if (!glows[color]) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, rgba(color, 0.9)); grd.addColorStop(0.3, rgba(color, 0.35)); grd.addColorStop(1, rgba(color, 0));
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128); glows[color] = c;
  }
  return glows[color];
}
function glow(g, x, y, r, color, a) { g.globalAlpha = a; g.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r); g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r); g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
}
function pill(g, text, x, y, size, color) {
  g.font = `600 ${size}px ${UI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width + size * 0.9, h = size * 1.5;
  g.fillStyle = 'rgba(4,10,18,.72)'; roundRect(g, x - w / 2, y - h / 2, w, h, h / 2); g.fill();
  g.fillStyle = color || '#fff'; g.fillText(text, x, y + 0.5);
}
function poly(g, x, y, r, sides, rot) { g.beginPath(); for (let k = 0; k < sides; k++) { const a = rot + k * TAU / sides, xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.closePath(); }
function shapePath(g, x, y, r, T) { if (T === 'bastion') poly(g, x, y, r, 6, Math.PI / 6); else { g.beginPath(); g.arc(x, y, r, 0, TAU); } }

// Der Turm selbst: Plattform, Körper je nach Art, Stufenringe, Kern
function drawTower(g, x, y, r, T, C, own, t, level) {
  const s = r / 24, pulse = 0.5 + 0.5 * Math.sin(t * 2);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = 'rgba(6,14,24,.85)'; g.beginPath(); g.arc(x, y, r * 1.22, 0, TAU); g.fill();
  g.strokeStyle = rgba(C, 0.18); g.lineWidth = 1 * s; g.beginPath(); g.arc(x, y, r * 1.22, 0, TAU); g.stroke();
  for (let k = 1; k < level; k++) { g.strokeStyle = rgba(C, 0.55); g.lineWidth = 1.3 * s; g.beginPath(); g.arc(x, y, r * (1.09 + k * 0.065), 0, TAU); g.stroke(); }
  const body = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  body.addColorStop(0, '#12263a'); body.addColorStop(1, '#06101b');
  g.fillStyle = body; shapePath(g, x, y, r, T); g.fill();
  g.lineWidth = (T === 'bastion' ? 4.5 : 2.6) * s; g.strokeStyle = own ? C : rgba(C, 0.8); shapePath(g, x, y, r, T); g.stroke();
  if (T === 'nest') {
    g.strokeStyle = rgba(C, 0.35); g.lineWidth = 1.2 * s;
    for (const f of [0.78, 0.56]) { g.beginPath(); g.arc(x, y, r * f, 0, TAU); g.stroke(); }
    g.fillStyle = rgba(C, 0.6);
    for (let k = 0; k < 3; k++) { const a = t * 0.4 + k * TAU / 3; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.67, y + Math.sin(a) * r * 0.67, 1.6 * s, 0, TAU); g.fill(); }
  } else if (T === 'brut') {
    g.strokeStyle = rgba(C, 0.4); g.lineWidth = 1.4 * s; g.beginPath(); g.arc(x, y, r * 0.7, 0, TAU); g.stroke();
    g.strokeStyle = rgba(C, 0.55); g.lineWidth = 1.6 * s;
    for (let k = 0; k < 3; k++) { const a0 = -t * 0.8 + k * TAU / 3; g.beginPath(); g.arc(x, y, r * 0.42, a0, a0 + 1.4); g.stroke(); }
    for (let k = 0; k < 6; k++) {
      const a = t * 0.6 + k * Math.PI / 3, px = x + Math.cos(a) * r * 0.7, py = y + Math.sin(a) * r * 0.7;
      g.fillStyle = rgba(C, 0.9); g.beginPath(); g.arc(px, py, (2.6 + 0.6 * Math.sin(t * 3 + k)) * s, 0, TAU); g.fill();
    }
  } else if (T === 'bastion') {
    g.strokeStyle = rgba(C, 0.5); g.lineWidth = 1.8 * s; poly(g, x, y, r * 0.62, 6, Math.PI / 6); g.stroke();
    g.fillStyle = rgba(C, 0.9);
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, 2.2 * s, 0, TAU); g.fill(); }
    g.strokeStyle = rgba(C, 0.3); g.lineWidth = 1 * s; poly(g, x, y, r * 0.36, 6, Math.PI / 6); g.stroke();
  } else if (T === 'strom') {
    g.strokeStyle = rgba(C, 0.85); g.lineWidth = 2.4 * s;
    for (let k = 0; k < 3; k++) { const a0 = t * 2.6 + k * TAU / 3; g.beginPath(); g.arc(x, y, r * 0.62, a0, a0 + 1.15); g.stroke(); }
    g.strokeStyle = rgba(C, 0.45); g.lineWidth = 1.4 * s;
    for (let k = 0; k < 3; k++) { const a0 = -t * 1.8 + k * TAU / 3; g.beginPath(); g.arc(x, y, r * 0.36, a0, a0 + 1.4); g.stroke(); }
  } else if (T === 'waechter') {
    g.strokeStyle = rgba(C, 0.5); g.lineWidth = 1.4 * s; poly(g, x, y, r * 0.6, 4, 0); g.stroke();
    g.strokeStyle = rgba(C, 0.35); g.lineWidth = 1 * s;
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); g.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); g.stroke(); }
    const a = t * 1.8; g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = rgba(C, 0.95); roundRect(g, 0, -2.2 * s, r * 0.85, 4.4 * s, 2 * s); g.fill();
    g.fillStyle = '#07111c'; g.beginPath(); g.arc(0, 0, r * 0.24, 0, TAU); g.fill();
    g.restore();
  } else if (T === 'quelle') {
    g.strokeStyle = rgba(C, 0.5 + 0.35 * pulse); g.lineWidth = 1.6 * s;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * 0.3; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45); g.lineTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82); g.stroke(); }
    g.fillStyle = rgba(C, 0.9);
    for (let k = 0; k < 3; k++) { const a = t * 1.2 + k * TAU / 3; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, 1.8 * s, 0, TAU); g.fill(); }
  }
  g.fillStyle = rgba(C, 0.95); g.beginPath(); g.arc(x, y, r * 0.2 + (own ? pulse * 1.4 * s : 0), 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x - r * 0.05, y - r * 0.05, r * 0.07, 0, TAU); g.fill();
}
function drawUnit(g, x, y, ang, unit, C, s) {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = C;
  if (unit === 'sporen') { g.beginPath(); g.arc(0, 0, 1.5 * s, 0, TAU); g.fill(); }
  else if (unit === 'drohnen') { g.beginPath(); g.moveTo(2.6 * s, 0); g.lineTo(-1.6 * s, 2 * s); g.lineTo(-0.6 * s, 0); g.lineTo(-1.6 * s, -2 * s); g.closePath(); g.fill(); }
  else if (unit === 'panzer') { poly(g, 0, 0, 2.7 * s, 6, 0); g.fill(); g.fillStyle = 'rgba(0,0,0,.45)'; poly(g, 0, 0, 1.3 * s, 6, 0); g.fill(); }
  else if (unit === 'pfeile') { g.beginPath(); g.moveTo(4 * s, 0); g.lineTo(-3 * s, 1.1 * s); g.lineTo(-3 * s, -1.1 * s); g.closePath(); g.fill(); }
  else if (unit === 'stachel') { g.beginPath(); g.moveTo(3 * s, 0); g.lineTo(0.7 * s, 0.9 * s); g.lineTo(0, 3 * s); g.lineTo(-0.7 * s, 0.9 * s); g.lineTo(-3 * s, 0); g.lineTo(-0.7 * s, -0.9 * s); g.lineTo(0, -3 * s); g.lineTo(0.7 * s, -0.9 * s); g.closePath(); g.fill(); }
  else { g.beginPath(); g.arc(0, 0, 2 * s, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-0.5 * s, -0.5 * s, 0.7 * s, 0, TAU); g.fill(); }
  g.restore();
}
function typeIcon(T, size, level) {
  const c = document.createElement('canvas'); c.width = c.height = size * 2; c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d'); g.scale(2, 2);
  g.globalCompositeOperation = 'lighter'; glow(g, size / 2, size / 2, size * 0.62, FACTIONS[1].color, 0.5); g.globalCompositeOperation = 'source-over';
  drawTower(g, size / 2, size / 2, size * 0.33, T, FACTIONS[1].color, true, 1.2, level || 1);
  return c;
}
function buildStatic() {
  staticLayer = document.createElement('canvas'); staticLayer.width = Math.ceil(W * dpr); staticLayer.height = Math.ceil(H * dpr);
  const g = staticLayer.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#081527'); bg.addColorStop(1, '#03080f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const lg = g.createRadialGradient(W * 0.5, -H * 0.25, 0, W * 0.5, -H * 0.25, H * 1.05); lg.addColorStop(0, 'rgba(70,130,180,.22)'); lg.addColorStop(1, 'rgba(70,130,180,0)'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = (0.25 + Math.random() * 0.35) * Math.max(W, H);
    const fg = g.createRadialGradient(x, y, 0, x, y, r); fg.addColorStop(0, 'rgba(30,80,120,.10)'); fg.addColorStop(1, 'rgba(30,80,120,0)'); g.fillStyle = fg; g.fillRect(0, 0, W, H);
  }
  g.setLineDash([2, 8 * S]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(140,200,235,.3)'; g.lineCap = 'round';
  for (const [a, b] of edges) { g.beginPath(); g.moveTo(X(nodes[a]), Y(nodes[a])); g.lineTo(X(nodes[b]), Y(nodes[b])); g.stroke(); }
  g.setLineDash([]);
  const clusters = {};
  for (const r of rocks) (clusters[r.c] = clusters[r.c] || []).push({ x:r.nx * W, y:r.ny * H, r:r.nr * R });
  const unionPath = (cl, pad) => { g.beginPath(); for (const p of cl) { g.moveTo(p.x + p.r + pad, p.y); g.arc(p.x, p.y, p.r + pad, 0, TAU); } };
  for (const cl of Object.values(clusters)) {
    const cx = cl.reduce((s, p) => s + p.x, 0) / cl.length, cy = cl.reduce((s, p) => s + p.y, 0) / cl.length, ext = Math.max(...cl.map(p => Math.hypot(p.x - cx, p.y - cy) + p.r));
    g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 30 * S; g.fillStyle = '#07111c'; unionPath(cl, 5); g.fill(); g.restore();
    g.fillStyle = 'rgba(120,175,210,.2)'; unionPath(cl, 2.5); g.fill();
    const rg = g.createRadialGradient(cx - ext * 0.35, cy - ext * 0.4, ext * 0.05, cx, cy, ext); rg.addColorStop(0, '#152c44'); rg.addColorStop(1, '#091522'); g.fillStyle = rg; unionPath(cl, 0); g.fill();
    g.save(); unionPath(cl, 0); g.clip();
    for (const p of cl) for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, d = Math.random() * p.r * 0.95; g.fillStyle = Math.random() < 0.7 ? 'rgba(0,0,0,.22)' : 'rgba(150,200,230,.07)'; g.beginPath(); g.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.5 + Math.random() * 4, 0, TAU); g.fill(); }
    g.restore();
  }
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function initMotes() { motes = []; for (let i = 0; i < 120; i++) motes.push({ x:Math.random() * W, y:Math.random() * H, r:0.6 + Math.random() * 1.6, vy:4 + Math.random() * 10, ph:Math.random() * TAU, a:0.15 + Math.random() * 0.3 }); }
function drawAmbient(dt) {
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) glow(ctx, W * (0.5 + 0.32 * Math.sin(elapsed * 0.06 + k * 2.1)), H * (0.45 + 0.3 * Math.cos(elapsed * 0.045 + k * 1.7)), Math.min(W, H) * 0.55, '#2f7fb3', 0.08);
  ctx.globalCompositeOperation = 'source-over';
  for (const m of motes) {
    m.y -= m.vy * dt; m.x += Math.sin(elapsed * 0.5 + m.ph) * 6 * dt;
    if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
    ctx.fillStyle = `rgba(170,215,245,${m.a})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
  }
}
function polyline(g, ids) { g.beginPath(); ids.forEach((id, i) => { const n = nodes[id]; i ? g.lineTo(X(n), Y(n)) : g.moveTo(X(n), Y(n)); }); }
function drawPath(ids, color, alpha, offset) {
  if (ids.length < 2) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(color, 0.2); ctx.lineWidth = 9 * S; polyline(ctx, ids); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = rgba(color, 0.9); ctx.lineWidth = 2 * S;
  ctx.setLineDash([10 * S, 9 * S]); ctx.lineDashOffset = -elapsed * 46 * S + (offset || 0); polyline(ctx, ids); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = color;
  for (let i = 0; i < ids.length - 1; i++) {
    const a = nodes[ids[i]], b = nodes[ids[i + 1]], ang = Math.atan2(Y(b) - Y(a), X(b) - X(a)), mx = X(a) + (X(b) - X(a)) * 0.58, my = Y(a) + (Y(b) - Y(a)) * 0.58, s = 6 * S;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.8, s * 0.8); ctx.lineTo(-s * 0.3, 0); ctx.lineTo(-s * 0.8, -s * 0.8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function drawRoutes() {
  const C = FACTIONS[1].color;
  if (!demo) for (const n of nodes) if (n.owner === 1) n.routes.forEach((r, i) => drawPath([n.id, ...r], C, 1, i * 6));
  if (drag) {
    drawPath(drag.path, C, 0.75);
    const lastN = nodes[drag.path[drag.path.length - 1]];
    if (!nodeAt(pointer.x, pointer.y)) {
      ctx.save(); ctx.strokeStyle = rgba(C, 0.45); ctx.lineWidth = 1.5 * S; ctx.setLineDash([4 * S, 6 * S]);
      ctx.beginPath(); ctx.moveTo(X(lastN), Y(lastN)); ctx.lineTo(pointer.x, pointer.y); ctx.stroke(); ctx.restore();
    }
    const label = `${sendAmount(drag.src, drag.shift ? 1 : sendMode)} Einheiten`;
    pill(ctx, label, pointer.x, pointer.y - 26 * S, Math.round(12 * S), C);
  }
}
function drawNode(n) {
  const x = X(n), y = Y(n), r = NR(n), C = FACTIONS[n.owner].color, own = n.owner > 0, pulse = 0.5 + 0.5 * Math.sin(elapsed * 2 + n.pulse);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, r * (own ? 2.6 : 2.0), C, own ? 0.5 + 0.15 * pulse : 0.28);
  if (n.type === 'quelle' && own) glow(ctx, x, y, r * 3.6, C, 0.12 + 0.12 * pulse);
  if (n.type === 'waechter' && own) { ctx.strokeStyle = rgba(C, 0.14); ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.arc(x, y, rangeOf(n), 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  ctx.globalCompositeOperation = 'source-over';
  drawTower(ctx, x, y, r, n.type, C, own, elapsed + n.pulse, n.level);
  if (n.frozen > 0) {
    ctx.strokeStyle = `rgba(170,230,255,${0.5 + 0.3 * pulse})`; ctx.lineWidth = 2 * S; poly(ctx, x, y, r * 1.12, 6, elapsed * 0.4); ctx.stroke();
    ctx.fillStyle = 'rgba(170,230,255,.18)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(220,245,255,.9)';
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + elapsed * 0.4; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 1.12, 1.6 * S, 0, TAU); ctx.fill(); }
  }
  if (n.shield > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(160,230,255,${0.6 + 0.3 * pulse})`; ctx.lineWidth = 2.5 * S; poly(ctx, x, y, r * 1.3, 6, -elapsed * 0.8); ctx.stroke();
    glow(ctx, x, y, r * 2.2, '#9fe4ff', 0.3);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (n.flash > 0) { ctx.globalAlpha = n.flash; ctx.strokeStyle = C; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.arc(x, y, r + (1 - n.flash) * 46 * S, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  const src = drag ? nodes[drag.path[drag.path.length - 1]] : null;
  if (selected === n || (drag && drag.src === n)) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6 * S; ctx.setLineDash([6 * S, 5 * S]); ctx.lineDashOffset = -elapsed * 18;
    ctx.beginPath(); ctx.arc(x, y, r + 9 * S, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  } else if ((src && src !== n && nodeAt(pointer.x, pointer.y) === n) || (abilityMode && nodeAt(pointer.x, pointer.y) === n)) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.arc(x, y, r + 9 * S, 0, TAU); ctx.stroke();
  }
}
function drawGroup(g) {
  const C = FACTIONS[g.owner].color, a = nodes[g.from], b = nodes[g.to], U = g.unit;
  const ang = Math.atan2(Y(b) - Y(a), X(b) - X(a)), dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const big = U === 'panzer' || U === 'stachel', gap = (big ? 7.5 : 5.5) * S, n = Math.max(1, Math.round(g.n)), count = Math.min(n, big ? 14 : 18), traveled = g.t * dist(a, b) + NR(a) * 0.5;
  glow(ctx, g.x, g.y, (10 + Math.min(g.n, 40) * 0.4) * S, C, 0.55);
  for (let i = 0; i < count; i++) {
    const back = i * gap; if (back > traveled) break;
    const wob = U === 'drohnen' ? Math.sin(elapsed * 14 + i * 1.9) * 2.4 * S : U === 'pfeile' ? 0 : Math.sin(elapsed * 9 + i * 1.9) * 1.4 * S;
    const lane = ((i * 7) % 5 - 2) * (big ? 3.4 : 2.6) * S + wob;
    ctx.globalAlpha = 0.95 - i * 0.035;
    drawUnit(ctx, g.x - dx * back + nx * lane, g.y - dy * back + ny * lane, ang, U, C, S);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(g.x + dx * 2 * S, g.y + dy * 2 * S, 1.6 * S, 0, TAU); ctx.fill();
}
function drawEffects() {
  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const z of zaps) {
    const a = z.life / 0.16, mx = (z.x1 + z.x2) / 2 + (Math.random() - 0.5) * 12 * S, my = (z.y1 + z.y2) / 2 + (Math.random() - 0.5) * 12 * S;
    ctx.strokeStyle = rgba(z.color, a); ctx.lineWidth = 2.2 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(z.x1, z.y1); ctx.lineTo(mx, my); ctx.lineTo(z.x2, z.y2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`; ctx.lineWidth = 0.9 * S; ctx.stroke();
    glow(ctx, z.x2, z.y2, 14 * S, z.color, a);
  }
}
function draw(dt) {
  ctx.drawImage(staticLayer, 0, 0, W, H);
  drawAmbient(dt);
  drawRoutes();
  for (const n of nodes) drawNode(n);
  ctx.globalCompositeOperation = 'lighter';
  for (const g of groups) drawGroup(g);
  drawEffects();
  ctx.globalCompositeOperation = 'source-over';
  for (const n of nodes) pill(ctx, String(Math.floor(n.units)), X(n), Y(n) + NR(n) + 11 * S, Math.round(12 * S), n.owner === 1 && !demo ? '#fff' : 'rgba(255,255,255,.85)');
  for (const g of groups) if (g.n >= 1.5) { const a = nodes[g.from], b = nodes[g.to], ang = Math.atan2(Y(b) - Y(a), X(b) - X(a)); pill(ctx, String(Math.round(g.n)), g.x - Math.sin(ang) * 14 * S, g.y + Math.cos(ang) * 14 * S, Math.round(10 * S)); }
}

// =====================================================================
//  HUD, Panel, Fähigkeiten, Legende
// =====================================================================
function updateHud() {
  if (mode !== 'game') return;
  $('#levelLabel').textContent = levelKind === 'campaign' ? `${CHAPTERS[L.ch].name}, Level ${levelIndex + 1}: ${L.name}` : `Endlos, ${L.name}`;
  const counts = FACTIONS.map((f, i) => nodes.filter(n => n.owner === i).length), order = [1, 2, 3, 4, 0].filter(i => counts[i] > 0);
  $('#share').innerHTML = order.map(i => `<i style="width:${counts[i] / nodes.length * 100}%;background:${FACTIONS[i].color}" title="${FACTIONS[i].name}: ${counts[i]}"></i>`).join('');
  $('#energyVal').textContent = Math.floor(energy); $('#energyBar').style.width = energy + '%';
  for (const b of document.querySelectorAll('#abilities button')) { const id = b.dataset.ab; b.disabled = energy < abilityCost(id); b.setAttribute('aria-pressed', String(abilityMode === id)); }
  if (selected) renderPanel();
}
function renderAbilities() {
  const box = $('#abilities'); box.innerHTML = '';
  if (mode !== 'game' || demo) return;
  let i = 1;
  for (const id of ['stoss', 'frost', 'schild']) {
    if (!P.abilities.has(id)) continue;
    const A = ABILITIES[id], b = document.createElement('button'); b.dataset.ab = id; b.title = `${A.name}: ${A.desc} (Taste ${i})`;
    b.innerHTML = `<b>${A.icon}</b>${A.name}<small>${abilityCost(id)} Energie</small>`;
    b.addEventListener('click', () => toggleAbility(id)); box.appendChild(b); i++;
  }
}
function toggleAbility(id) {
  if (abilityMode === id) { abilityMode = null; }
  else if (energy >= abilityCost(id)) { abilityMode = id; tip(`${ABILITIES[id].name}: ${ABILITIES[id].target === 'own' ? 'Wähle einen eigenen Knoten.' : 'Wähle einen fremden Knoten.'}`, 3000); }
  else { audio.play('error'); tip(`Nicht genug Energie für ${ABILITIES[id].name}. Energie entsteht, wenn Einheiten fallen.`, 2500); }
  updateHud();
}
function renderPanel() {
  const panel = $('#nodePanel'), n = selected;
  if (!n || n.owner !== 1 || mode !== 'game' || demo) { panel.hidden = true; panelConv = false; return; }
  panel.hidden = false;
  const conv = L.types.filter(t => t !== n.type);
  panel.innerHTML = `<h4>${TYPES[n.type].name} <span>Stufe ${n.level}</span></h4>
    <div class="m">${Math.floor(n.units)} / ${Math.floor(capOf(n))} Einheiten, erzeugt ${UNITS[TYPES[n.type].unit].name}</div>
    <div class="row"><button id="pUp" ${n.level >= 3 || n.units < upgradeCost(n) ? 'disabled' : ''}>${n.level >= 3 ? 'Voll ausgebaut' : `Ausbauen (${upgradeCost(n)})`}</button><button id="pRes" title="Diese Menge bleibt als Verteidigung zurück">Reserve ${Math.round(n.reserve * 100)} %</button></div>
    <div class="row"><button id="pConv" aria-pressed="${panelConv}" ${conv.length ? '' : 'disabled'}>Umbauen (${convertCost(n)})</button><button id="pClear" ${n.routes.length ? '' : 'disabled'}>Routen löschen</button></div>
    ${panelConv ? `<div class="conv">${conv.map(t => `<button data-conv="${t}" ${n.units < convertCost(n) ? 'disabled' : ''} title="${TYPES[t].desc}">${TYPES[t].name}</button>`).join('')}</div>` : ''}
    <div class="routes">${n.routes.map((r, i) => `<div><span>Route ${i + 1}: ${TYPES[nodes[r[r.length - 1]].type].name}, ${r.length} ${r.length === 1 ? 'Schritt' : 'Schritte'}</span><button data-rm="${i}" title="Route entfernen">×</button></div>`).join('')}</div>`;
  panel.style.left = clamp(X(n) + NR(n) + 14, 8, W - 244) + 'px';
  panel.style.top = clamp(Y(n) - 40, 60, H - 250) + 'px';
  panel.querySelector('#pUp').addEventListener('click', () => { if (doUpgrade(n)) { tip(`${TYPES[n.type].name} auf Stufe ${n.level} ausgebaut.`, 2000); renderPanel(); } });
  panel.querySelector('#pRes').addEventListener('click', () => { n.reserve = (n.reserve + 0.25) % 1; audio.play('click'); renderPanel(); });
  panel.querySelector('#pConv').addEventListener('click', () => { panelConv = !panelConv; audio.play('click'); renderPanel(); });
  panel.querySelector('#pClear').addEventListener('click', () => { n.routes = []; audio.play('click'); tip('Routen gelöscht.', 1500); renderPanel(); });
  panel.querySelectorAll('[data-conv]').forEach(b => b.addEventListener('click', () => { if (doConvert(n, b.dataset.conv)) { panelConv = false; tip(`Umgebaut zu ${TYPES[n.type].name}.`, 2000); buildLegend(); renderPanel(); } }));
  panel.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { n.routes.splice(+b.dataset.rm, 1); audio.play('click'); renderPanel(); }));
}
function buildLegend() {
  const box = $('#legend'); box.innerHTML = '';
  for (const t of ALL.filter(t => nodes.some(n => n.type === t))) {
    const row = document.createElement('div'); row.className = 'lg'; row.appendChild(typeIcon(t, 40));
    const txt = document.createElement('div'); txt.innerHTML = `<b>${TYPES[t].name}</b><span>${TYPES[t].desc} Truppen: ${UNITS[TYPES[t].unit].name} (Stärke ${UNITS[TYPES[t].unit].str}, Tempo ${UNITS[TYPES[t].unit].speed}).</span>`;
    row.appendChild(txt); box.appendChild(row);
  }
}
function tip(text, ms) { const el = $('#tip'); el.textContent = text; el.classList.add('on'); clearTimeout(tipTimer); tipTimer = setTimeout(() => el.classList.remove('on'), ms || 4000); }

// =====================================================================
//  Eingabe
// =====================================================================
function sendAmount(n, frac) { const avail = Math.max(0, n.units - n.reserve * capOf(n)); return Math.max(avail >= 1 ? 1 : 0, Math.floor(avail * frac)); }
function setSendMode(m) { sendMode = m; renderSendbar(); }
function renderSendbar() {
  const bar = $('#sendbar'); bar.querySelectorAll('button').forEach(b => b.remove());
  for (const [m, label] of SEND_MODES) { const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', String(sendMode === m)); b.title = `Ziehen schickt sofort ${label === 'Alle' ? 'alle' : label} der verfügbaren Einheiten und legt die Route an`; b.addEventListener('click', () => { setSendMode(m); audio.play('click'); }); bar.appendChild(b); }
}
function nodeAt(x, y) { return nodes.find(n => Math.hypot(X(n) - x, Y(n) - y) <= NR(n) + 16 * S) || null; }
function addRoute(src, route) {
  const target = route[route.length - 1], i = src.routes.findIndex(r => r[r.length - 1] === target);
  const isNew = i < 0;
  if (i >= 0) src.routes[i] = route; else { if (src.routes.length >= 3) src.routes.shift(); src.routes.push(route); }
  src.flowT = 0;
  if (isNew) audio.play('route', 0.2);
  return isNew;
}
document.addEventListener('pointerdown', () => { audio.init(); audio.resume(); }, { passive:true });
cv.addEventListener('pointerdown', e => {
  if (mode !== 'game' || !running || paused) return;
  pointer = { x:e.clientX, y:e.clientY };
  const hit = nodeAt(pointer.x, pointer.y);
  if (abilityMode) {
    if (hit && useAbility(abilityMode, hit)) { abilityMode = null; updateHud(); }
    else { audio.play('error'); tip('Kein gültiges Ziel für diese Fähigkeit.', 1800); }
    return;
  }
  if (hit && hit.owner === 1) { drag = { src:hit, path:[hit.id], shift:e.shiftKey }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} }
  else { selected = null; renderPanel(); }
});
cv.addEventListener('pointermove', e => {
  pointer = { x:e.clientX, y:e.clientY };
  if (!drag) return;
  const hit = nodeAt(pointer.x, pointer.y); if (!hit) return;
  const path = drag.path, lastId = path[path.length - 1]; if (hit.id === lastId) return;
  const idx = path.indexOf(hit.id); if (idx >= 0) { path.length = idx + 1; return; }
  const p = bfsPath(lastId, hit.id); if (p) for (const id of p.slice(1)) if (!path.includes(id)) path.push(id);
});
cv.addEventListener('pointerup', e => {
  pointer = { x:e.clientX, y:e.clientY };
  if (!drag) return;
  const { src, path, shift } = drag; drag = null;
  if (path.length >= 2) {
    // Every drawn path becomes a persistent route and immediately sends the selected share.
    const k = sendAmount(src, shift ? 1 : sendMode);
    const sent = launch(src, path.slice(1), k, true);
    const isNew = addRoute(src, path.slice(1));
    stats.sends = (stats.sends || 0) + 1;
    if (isNew && src.routes.length > 1) tip(`Route ${src.routes.length} von 3 gesetzt – der Nachschub teilt sich auf.`, 3000);
    else if (stats.sends <= 2) tip(sent ? `${k} Einheiten unterwegs, die Route bleibt: Alles über der Reserve fließt nach. Ziehe erneut, um sofort mehr zu schicken.` : 'Route gesetzt. Sobald Einheiten da sind, fließen sie nach.', 3800);
    else if (!sent) tip('Route gesetzt, gerade keine Einheiten zum Senden.', 1500);
    renderPanel();
    return;
  }
  selected = selected === src ? null : src; panelConv = false; renderPanel();
  if (selected) audio.play('click');
});
cv.addEventListener('contextmenu', e => {
  e.preventDefault();
  const hit = nodeAt(e.clientX, e.clientY);
  if (hit && hit.owner === 1 && hit.routes.length) { hit.routes = []; tip('Routen gelöscht.', 1500); renderPanel(); }
});
addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') { drag = null; abilityMode = null; if (selected) { selected = null; renderPanel(); } updateHud(); }
  if (mode !== 'game') return;
  if (e.key === ' ' && running) { e.preventDefault(); togglePause(); }
  if (e.key.toLowerCase() === 'f') toggleSpeed();
  const km = { q:0.25, w:0.5, e:0.75, r:1 }[e.key.toLowerCase()]; if (km !== undefined) setSendMode(km);
  const ids = ['stoss', 'frost', 'schild'].filter(id => P.abilities.has(id));
  if (['1', '2', '3'].includes(e.key) && ids[+e.key - 1] && running && !paused) toggleAbility(ids[+e.key - 1]);
});
$('#legendBtn').addEventListener('click', () => { const b = $('#legend'); b.hidden = !b.hidden; $('#legendBtn').setAttribute('aria-pressed', String(!b.hidden)); });
$('#speedBtn').addEventListener('click', toggleSpeed);
$('#pauseBtn').addEventListener('click', () => { if (running) togglePause(); });
function isTouch() { return !!(window.matchMedia && matchMedia('(pointer:coarse)').matches); }
function toggleFullscreen(auto) {
  const el = document.documentElement, fs = document.fullscreenElement || document.webkitFullscreenElement;
  if (fs) { if (!auto) (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) { if (!auto) tip('Vollbild wird hier nicht unterstützt. Auf dem iPhone: Teilen → „Zum Home-Bildschirm", dann startet Tiefenlicht bildschirmfüllend.', 6000); return; }
  Promise.resolve(req.call(el, { navigationUI:'hide' })).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }).catch(() => { if (!auto) tip('Vollbild wurde vom Browser abgelehnt.', 2500); });
}
$('#fsBtn').addEventListener('click', () => toggleFullscreen(false));
function toggleSpeed() { speed = speed === 1 ? 2 : 1; $('#speedBtn').textContent = `Tempo ${speed}×`; $('#speedBtn').setAttribute('aria-pressed', String(speed === 2)); }
function togglePause() { paused ? resumePlay() : showScreen('pause'); }

// =====================================================================
//  Bildschirme
// =====================================================================
function hideScreen() { $('#screen').hidden = true; }
function showScreen(kind) {
  const card = $('#card'); card.className = 'card';
  const pts = save.points, stars = totalStars();
  const level = (kind, i) => `<button class="lv ${i > campaignUnlocked() ? 'locked' : ''}" data-play="${i}" ${i > campaignUnlocked() ? 'disabled' : ''}><b>${i + 1}. ${CAMPAIGN[i].name}</b><small>${save.stars[i] ? `<span class="stars">${starStr(save.stars[i])}</span>` : (i > campaignUnlocked() ? 'Gesperrt' : 'Offen')} · ${CAMPAIGN[i].enemies} Gegner</small></button>`;
  let h = '';
  if (kind === 'menu') {
    h = `<h1>Tiefenlicht</h1><p class="sub">Ein Strategiespiel um leuchtende Knoten im Abgrund</p>
      <div class="menu"><button class="primary" data-go="campaign">Kampagne</button><button data-go="endless">Endlos</button><button data-go="skills">Fähigkeiten ${pts ? `(${pts} Punkte frei)` : ''}</button><button data-go="settings">Einstellungen</button><button data-go="howto">Anleitung</button><button id="mFs">Vollbild</button></div>
      <div class="meta">${stars} von ${CAMPAIGN.length * 3} Sternen, beste Endlos-Welle ${save.endlessBest}, Schwierigkeit ${DIFF[save.difficulty].label}</div>`;
  } else if (kind === 'campaign') {
    card.className = 'card wide';
    h = `<h2>Kampagne</h2><p class="sub">${stars} Sterne gesammelt. Schneller als die Zielzeit bringt drei Sterne, Sterne werden zu Fähigkeitspunkten.</p>`;
    CHAPTERS.forEach((c, ci) => { h += `<div class="chapter"><h3>Kapitel ${ci + 1}: ${c.name} <span class="meta">${c.desc}</span></h3><div class="lvgrid">${CAMPAIGN.map((l, i) => l.ch === ci ? level('c', i) : '').join('')}</div></div>`; });
    h += `<div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'skills') {
    card.className = 'card wide';
    const branches = [...new Set(SKILLS.map(s => s.branch))];
    h = `<h2>Fähigkeiten</h2><p class="sub">${pts} Punkte verfügbar. Jeder Stern in der Kampagne und jede neue Endlos-Welle bringt einen Punkt. Alles wirkt dauerhaft.</p><div class="tree">`;
    for (const b of branches) {
      h += `<div class="branch"><h3>${b}</h3>`;
      for (const sk of SKILLS.filter(s => s.branch === b)) {
        const owned = save.spent.includes(sk.id), open = !sk.req || save.spent.includes(sk.req), can = !owned && open && pts >= sk.cost;
        h += `<button class="sk ${owned ? 'owned' : ''}" data-skill="${sk.id}" ${can ? '' : 'disabled'}><b>${sk.name}</b><small>${sk.desc}</small><span class="cost">${owned ? 'Freigeschaltet' : open ? `${sk.cost} ${sk.cost === 1 ? 'Punkt' : 'Punkte'}` : `Braucht: ${SKILLS.find(s => s.id === sk.req).name}`}</span></button>`;
      }
      h += '</div>';
    }
    h += `</div><div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'settings') {
    h = `<h2>Einstellungen</h2>
      <div class="setrow"><span>Sound</span><button id="sSound" aria-pressed="${save.sound}">${save.sound ? 'An' : 'Aus'}</button></div>
      <div class="setrow"><span>Vollbild beim Levelstart (Touchgeräte)</span><button id="sFs" aria-pressed="${save.autoFs !== false}">${save.autoFs !== false ? 'An' : 'Aus'}</button></div>
      <div class="setrow"><span>Schwierigkeit</span><span>${Object.keys(DIFF).map(k => `<button data-diff="${k}" aria-pressed="${save.difficulty === k}">${DIFF[k].label}</button>`).join(' ')}</span></div>
      <div class="setrow" style="display:block"><span>Spielstand-Code (zum Sichern oder Übertragen)</span><textarea id="sCode" spellcheck="false">${exportCode()}</textarea>
      <div class="actions"><button id="sImport">Code laden</button><button id="sReset">Fortschritt löschen</button></div></div>
      <div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'howto') {
    h = `<h2>Anleitung</h2>
      <ul><li><b>Senden:</b> Ziehe von einem eigenen Knoten über verbundene Knoten. Sofort geht die Hälfte der verfügbaren Einheiten los, und die Route bleibt bestehen: Alles über der Reserve fließt automatisch nach. Ziehe erneut, um sofort wieder die Hälfte zu schicken. Unten links (oder <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd>) wählst du 25 bis 100 %, <kbd>Shift</kbd> + Ziehen schickt alles.</li>
      <li><b>Routen:</b> Bis zu drei Routen je Knoten teilen den Nachschub. Im Knotenmenü legst du die Reserve fest und entfernst Routen; Rechtsklick löscht alle.</li>
      <li><b>Knotenmenü:</b> Eigenen Knoten antippen: Ausbau bis Stufe 3, Reserve, Umbau in eine andere Art, Routen verwalten. Rechtsklick löscht alle Routen.</li>
      <li><b>Kampf:</b> Angriffsstärke der Truppen gegen Einheiten × Verteidigung des Knotens. Bleibt etwas übrig, wechselt der Knoten die Seite.</li>
      <li><b>Truppen:</b> Jede Knotenart erzeugt eigene Truppen: Drohnen sind schnell und schwach, Panzer stark und langsam, Pfeile am schnellsten.</li>
      <li><b>Energie</b> entsteht, wenn Einheiten fallen. Damit zündest du Fähigkeiten (Tasten <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>).</li>
      <li><b>Tasten:</b> <kbd>Leertaste</kbd> Pause, <kbd>F</kbd> Tempo, <kbd>R</kbd> Neustart, <kbd>Esc</kbd> Abbrechen.</li></ul>
      <div class="actions"><button data-go="menu">Zurück</button></div>`;
  } else if (kind === 'intro') {
    running = false; paused = false;
    h = `<h2>${L.name}</h2><p class="sub">${levelKind === 'campaign' ? `Kapitel ${L.ch + 1}: ${CHAPTERS[L.ch].name}, Level ${levelIndex + 1} von ${CAMPAIGN.length}` : 'Endlos'} · ${L.enemies === 1 ? 'ein Gegner' : L.enemies + ' Gegner'} · Zielzeit ${fmtTime(L.par)}</p>`;
    if (levelKind === 'campaign' && levelIndex === 0) h += `<ul><li>Ziehe vom goldenen Knoten zu einem Nachbarn: Die Hälfte deiner Einheiten bricht sofort auf, und die Route bleibt – alles, was nachwächst, fließt weiter. Ziehe erneut, um sofort mehr zu schicken.</li><li>Fremde Knoten werden angegriffen; ist deine Stärke größer, gehören sie dir.</li><li>Nur gepunktete Linien sind Wege. Felsen trennen das Netz.</li></ul>`;
    else h += `<p>${L.text}</p>`;
    if (L.newType) h += `<div class="new"><div class="icon"></div><div><b>Neu: ${TYPES[L.newType].name}</b><span>${TYPES[L.newType].desc}</span></div></div>`;
    if (L.feature === 'upgrade') h += `<div class="new"><div class="icon" data-lv="3"></div><div><b>Neu: Ausbau</b><span>Tippe einen eigenen Knoten an und zahle Einheiten, um ihn auf Stufe 2 und 3 zu bringen: mehr Produktion, mehr Vorrat, mehr Verteidigung.</span></div></div>`;
    if (L.feature === 'split') h += `<div class="new"><div><b>Neu: Geteilte Routen und Reserve</b><span>Ziehe mehrere Routen von einem Knoten (bis zu drei); der Nachschub wird aufgeteilt. Im Knotenmenü legst du eine Reserve fest, die zur Verteidigung bleibt und nicht abfließt. Mit Shift + Ziehen schickst du sofort alles.</span></div></div>`;
    if (L.feature === 'convert') h += `<div class="new"><div><b>Neu: Umbau</b><span>Im Knotenmenü kannst du eine andere Knotenart wählen. Der Knoten fällt dabei auf Stufe 1 zurück.</span></div></div>`;
    h += `<div class="actions"><button class="primary" id="go">Level starten</button><button data-go="${levelKind === 'campaign' ? 'campaign' : 'menu'}">Zurück</button></div>`;
  } else if (kind === 'win') {
    const st = stats.stars;
    h = `<h2>Der Abgrund leuchtet golden</h2><p class="sub">${L.name} geschafft</p>
      <div class="stats"><div><b class="stars">${starStr(st)}</b>${st === 3 ? 'unter Zielzeit' : st === 2 ? 'nah an der Zielzeit' : 'geschafft'}</div><div><b>${fmtTime(levelTime)}</b>Zeit (Ziel ${fmtTime(L.par)})</div><div><b>${stats.captured}</b>erobert</div><div><b>+${stats.gained}</b>Punkte</div></div>
      <div class="actions"><button class="primary" id="next">${levelKind === 'campaign' ? (levelIndex + 1 < CAMPAIGN.length ? 'Nächstes Level' : 'Kampagne geschafft – zur Übersicht') : 'Nächste Welle'}</button><button id="again">Nochmal</button>${save.points ? '<button data-go="skills">Fähigkeiten</button>' : ''}<button data-go="menu">Menü</button></div>`;
  } else if (kind === 'lose') {
    const winner = FACTIONS[nodes.find(n => n.owner > 1)?.owner || 2];
    h = `<h2>Der Goldschwarm ist erloschen</h2><p class="sub">${L.name}</p>
      <p>Der <span class="swatch" style="background:${winner.color}"></span>${winner.name} hat deinen letzten Knoten eingenommen. Tipp: Halte an der Front eine Reserve, bau Wächter an Kreuzungen und sammle Energie für einen Schild, wenn ein großer Schwarm anrückt.</p>
      <div class="actions"><button class="primary" id="again">Nochmal versuchen</button>${save.points ? '<button data-go="skills">Fähigkeiten</button>' : ''}<button data-go="${levelKind === 'campaign' ? 'campaign' : 'menu'}">Zurück</button></div>`;
  } else if (kind === 'pause') {
    paused = true;
    h = `<h2>Pause</h2><p class="sub">${L.name}, ${fmtTime(levelTime)} gespielt</p><div class="actions"><button class="primary" id="go">Weiter</button><button id="again">Neu starten</button><button data-go="menu">Aufgeben</button></div>`;
  }
  card.innerHTML = h;
  if (kind === 'intro') { card.querySelectorAll('.icon').forEach(el => el.replaceWith(typeIcon(L.newType || 'nest', 56, +el.dataset.lv || 1))); card.querySelector('#go').addEventListener('click', resumePlay); }
  if (kind === 'pause') card.querySelector('#go').addEventListener('click', resumePlay);
  if (kind === 'win') card.querySelector('#next').addEventListener('click', () => { if (levelKind === 'campaign') { if (levelIndex + 1 < CAMPAIGN.length) prepareLevel('campaign', levelIndex + 1); else toMenu('campaign'); } else prepareLevel('endless', levelIndex + 1); });
  card.querySelectorAll('#again').forEach(b => b.addEventListener('click', () => prepareLevel(levelKind, levelIndex)));
  card.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { audio.play('click'); const g = b.dataset.go; if (g === 'endless') prepareLevel('endless', Math.max(1, save.endlessBest + 1)); else toMenu(g); }));
  card.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => { audio.play('click'); prepareLevel('campaign', +b.dataset.play); }));
  card.querySelectorAll('[data-skill]').forEach(b => b.addEventListener('click', () => { const sk = SKILLS.find(s => s.id === b.dataset.skill); if (save.points >= sk.cost && !save.spent.includes(sk.id)) { save.points -= sk.cost; save.spent.push(sk.id); computePerks(); persist(); audio.play('upgrade'); showScreen('skills'); } }));
  if (kind === 'menu') card.querySelector('#mFs').addEventListener('click', () => toggleFullscreen(false));
  if (kind === 'settings') {
    card.querySelector('#sFs').addEventListener('click', () => { save.autoFs = save.autoFs === false; persist(); showScreen('settings'); audio.play('click'); });
    card.querySelector('#sSound').addEventListener('click', () => { audio.init(); audio.setEnabled(!save.sound); persist(); showScreen('settings'); audio.play('click'); });
    card.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { save.difficulty = b.dataset.diff; persist(); showScreen('settings'); audio.play('click'); }));
    card.querySelector('#sImport').addEventListener('click', () => { if (importCode(card.querySelector('#sCode').value)) { audio.play('upgrade'); showScreen('menu'); } else { audio.play('error'); tip('Der Code ist ungültig.', 2000); } });
    card.querySelector('#sReset').addEventListener('click', () => { if (confirm('Wirklich allen Fortschritt löschen?')) { save = { ...readSave(), stars:{}, endlessBest:0, points:0, spent:[], sound:save.sound, difficulty:save.difficulty }; computePerks(); persist(); showScreen('settings'); } });
  }
  $('#screen').hidden = false;
  const first = card.querySelector('.primary'); if (first) first.focus();
}

// =====================================================================
//  Ablauf
// =====================================================================
function setGameUi(on) { $('#hud').hidden = !on; $('#abilities').hidden = !on; $('#sendbar').hidden = !on; if (!on) { $('#nodePanel').hidden = true; $('#legend').hidden = true; $('#legendBtn').setAttribute('aria-pressed', 'false'); } }
function startDemo() { demo = true; mode = 'menu'; L = { ...DEMO, seed:Math.floor(Math.random() * 1e6) }; buildLevel(); running = true; paused = false; setGameUi(false); }
function toMenu(screen) { if (mode !== 'menu' || !demo) startDemo(); showScreen(screen || 'menu'); }
function prepareLevel(kind, i) {
  levelKind = kind; levelIndex = i; L = kind === 'campaign' ? CAMPAIGN[i] : endlessDef(i);
  demo = false; mode = 'game'; buildLevel(); setGameUi(true); showScreen('intro');
}
function startLevel() { buildLevel(); resumePlay(); }
function resumePlay() {
  if (isTouch() && save.autoFs !== false) toggleFullscreen(true);
  hideScreen(); renderSendbar(); running = true; paused = false; setGameUi(true);
  if (levelTime < 0.01) tip(levelKind === 'campaign' && levelIndex === 0 ? 'Ziehe vom goldenen Knoten zu einem Nachbarn – die Hälfte bricht auf, der Rest fließt nach.' : `${L.name}: ${nodes.length} Knoten, ${L.enemies === 1 ? 'ein Gegner' : L.enemies + ' Gegner'}. Zielzeit ${fmtTime(L.par)}.`, 4500);
}
function finish(won) {
  if (!running) return;
  running = false; abilityMode = null;
  if (won) {
    const st = levelTime <= L.par ? 3 : levelTime <= L.par * 1.6 ? 2 : 1; let gained = 0;
    if (levelKind === 'campaign') { const prev = save.stars[levelIndex] || 0; if (st > prev) { gained = st - prev; save.stars[levelIndex] = st; } }
    else if (levelIndex > save.endlessBest) { gained = 1; save.endlessBest = levelIndex; }
    save.points += gained; stats.stars = st; stats.gained = gained; persist(); audio.play('win');
  } else audio.play('lose');
  showScreen(won ? 'win' : 'lose');
}

// =====================================================================
//  Größe und Schleife
// =====================================================================
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; R = Math.min(W, H);
  cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); S = clamp(Math.min(W, H) / 760, 0.62, 1.2);
  initMotes(); if (nodes.length) { buildStatic(); renderPanel(); }
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000) || 0; last = now;
  if (running && !paused) for (let i = 0; i < speed; i++) update(dt);
  if (staticLayer) draw(dt);
  if ((hudTimer += dt) > 0.25) { hudTimer = 0; updateHud(); }
  requestAnimationFrame(loop);
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200)); if (window.visualViewport) visualViewport.addEventListener('resize', resize);
resize();
loadSave().then(() => { startDemo(); showScreen('menu'); requestAnimationFrame(loop); registerPwa(); });

window.TL = { prepareLevel, resumePlay, update, draw, aiAct, addRoute, launch, doUpgrade, doConvert, useAbility, finish, endlessDef, importCode, exportCode, computePerks, CAMPAIGN, SKILLS,
  get nodes() { return nodes; }, get groups() { return groups; }, get edges() { return edges; }, get running() { return running; }, get L() { return L; }, get save() { return save; }, set save(v) { save = v; }, get energy() { return energy; }, set energy(v) { energy = v; }, get demo() { return demo; }, get mode() { return mode; } };
