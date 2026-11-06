// [模块]《如果那年》付费功能「人生纪录典藏」（v0.33.0）：结算页的导出台。
// 式样定稿见 paid-spec/SPEC.md：只卖「把这一生留下来」——一份数据、两个壳（长图＋可打印纪录册）；
// 不卖改命、不卖好结局、不插广告。结算页现有的一切原样全免，本模块只在分享台之后加一行入口
// 和一个导出面板；水印只落在导出成品（预览长图/预览纪录册）上，游戏内画面与现有分享卡一概不动。
// 导出全程只读结算数据（与结算页/分享卡同一批函数取数），不碰落账、不消耗随机流。
(function (IFY) {
"use strict";
const CFG = window.IFY_KEEPSAKE || {};
const LS_KEY = "ify-keepsake-v1"; // 本机解锁记录：{unlocked:true, code, at}
const PENDING_KEY = "ify-keepsake-pending"; // 领码页带回的码（sessionStorage，自动解锁失败时的预填兜底）

// ---------- 本机权益 ----------
function keepsakeState() {
try { const v = JSON.parse(localStorage.getItem(LS_KEY)); if (v && v.unlocked) return v;} catch (e) {}
return { unlocked: false};
}
function keepsakeUnlocked() { return!!keepsakeState().unlocked;}
function saveUnlock(code) {
try { localStorage.setItem(LS_KEY, JSON.stringify({ unlocked: true, code: code || "", at: new Date().toISOString()}));} catch (e) {}
}

// ---------- 导出数据（唯一口径：长图与纪录册共用，数字只许从这里出） ----------
function parseTimeline() {
const v = typeof IFY.playerFacts === "function"? IFY.playerFacts(): null;
const log = v? v.mergedLog: (IFY.S.log || []);
const out = [];
for (const l of log) {
const m = String(l).match(/^(\d+) 岁 · ([\s\S]*)$/);
if (m) out.push({ age: +m[1], year: IFY.S.birthYear? IFY.S.birthYear + (+m[1]): null, text: m[2]});
}
return out;
}

// 大事记选材（确定性、无随机）：出身行打头，其余按「稀有＞人生大事词＞分岔抉择」取，
// 同岁只取一条；不足 6 件时从年表等距补足；总数约十件，按年龄排序。
const MILESTONE_WORDS = ["领证", "结婚", "孩子出生", "生了孩子", "买房", "买了房", "去世", "离世", "退休", "录取", "上岸", "开业", "上市", "离婚", "毕业", "下岗", "返聘", "出国", "回国", "搬家", "高考", "中考"];
function pickHighlights(timeline, origin) {
const scored = [];
for (const e of timeline) {
if (origin && e === origin) continue;
let score = 0;
if (e.text.includes("")) score = 100;
else if (MILESTONE_WORDS.some((w) => e.text.includes(w))) score = 80;
else if (e.age > 22 && e.text.includes("：") &&!e.text.includes("影子")) score = 60;
if (score) scored.push({ e, score});
}
scored.sort((a, b) => (b.score - a.score) || (a.e.age - b.e.age));
const picked = [], usedAges = new Set();
if (origin) { picked.push(origin); usedAges.add(origin.age);}
for (const { e} of scored) {
if (picked.length >= 10) break;
if (usedAges.has(e.age)) continue;
picked.push(e); usedAges.add(e.age);
}
if (picked.length < 6) {
const rest = timeline.filter((e) =>!usedAges.has(e.age));
const step = Math.max(1, Math.floor(rest.length / (6 - picked.length + 1)) || 1);
for (let i = step - 1; i < rest.length && picked.length < 6; i += step) { picked.push(rest[i]); usedAges.add(rest[i].age);}
}
return picked.sort((a, b) => a.age - b.age).slice(0, 10);
}

function buildKeepsakeData() {
const S = IFY.S;
const slots = IFY.settlementSlots();
const slotMap = {};
for (const [k, t] of slots) slotMap[k] = t;
// 住房变现（与 renderEnd 来历行同读法：玩家本人轨账本 settle 条的实际落账额取整，只读）
let houseGain = 0;
try {
const ent = typeof IFY.houseLedgerOf === "function"? IFY.houseLedgerOf(S).filter((e) => e.type === "settle").pop(): null;
houseGain = ent? Math.round(ent.actual): 0;
} catch (e) {}
const timeline = parseTimeline();
const origin = timeline.find((e) => e.age === 22 && e.text.startsWith("出身：")) || null;
// 影子小结：结构数从不受控 Track 的真实状态读（终龄/路线），句子用结算同源的终局句与第八槽
let shadowAge = null, shadowRoute = "";
try {
const f = typeof IFY.uncontrolledEntry === "function"? IFY.uncontrolledEntry(): null;
const B = f && f.entry && f.entry.state;
if (B) { shadowRoute = B.route? B.route.name: ""; if (B.death) shadowAge = B.death.age;}
} catch (e) {}
const shadowFinalLine = typeof IFY.uncontrolledFinalLine === "function"? IFY.uncontrolledFinalLine(): "";
const cmp = typeof IFY.shadowCompareLines === "function"? IFY.shadowCompareLines(): { main: "", others: []};
const era = (IFY.ERAS || []).find((e) => e.id === S.era);
const refl = IFY.playerMeta && IFY.playerMeta().reflections && IFY.playerMeta().reflections.length
? IFY.playerMeta().reflections[IFY.playerMeta().reflections.length - 1].text: "";
return {
v: 1,
seed: S.seedStr,
eraLabel: era? era.label: "",
routeName: S.route? S.route.name: "",
birthYear: S.birthYear || null,
finalAge: IFY.finalAge(),
death: S.death? { age: S.death.age, text: S.death.text}: null,
special: S.special? { tierLabel: IFY.TIER_LABEL[S.special.tier] || "", title: S.special.title, text: S.special.text}: null,
verdictText: IFY.verdict().text,
lifeTags: IFY.lifeTags(),
slots,
slotMap,
houseGain,
houseLine: houseGain > 0? `房子最后折了 ${houseGain}，添进这一生的钱里。`: "",
stats: IFY.STAT_META.map(([k, label]) => ({ key: k, label, value: Math.round(S.stats[k])})),
origin,
highlights: pickHighlights(timeline, origin),
timeline,
shadow: { finalAge: shadowAge, routeName: shadowRoute, finalLine: shadowFinalLine, slotText: slotMap["另一条路"] || "", compareMain: cmp.main || "", compareOthers: cmp.others || []},
reflection: refl,
};
}

// ---------- 长图（画布，与分享卡同一暖纸体系） ----------
function drawKeepsake(x, d, W) {
const s = W / 1080;
x.save();
x.scale(s, s);
const UW = 1080, MX = 90, CW = UW - MX * 2;
x.fillStyle = "#FAF8F4"; x.fillRect(0, 0, UW, 6000);
x.strokeStyle = "#DDD6C9"; x.lineWidth = 3;
x.textAlign = "left";
x.fillStyle = "#2F4A3C"; x.font = "34px " + IFY.SERIF;
x.fillText("人生RESTART：如果那年", MX, 108);
x.fillStyle = "#8A948C"; x.font = "26px monospace"; x.textAlign = "right";
x.fillText("种子 " + d.seed, UW - MX, 108); x.textAlign = "left";
const span = d.timeline.length? `${d.timeline[0].year || ""} — ${d.timeline[d.timeline.length - 1].year || ""}`.replace(/^ — | — $/g, ""): "";
x.fillStyle = "#8A948C"; x.font = "25px " + IFY.SANS;
x.fillText(`人生纪录典藏 · ${d.routeName}${span? " · " + span: ""}`, MX, 150);
let y = 176;
const rule = () => { x.strokeStyle = "#DDD6C9"; x.lineWidth = 2; x.beginPath(); x.moveTo(MX, y); x.lineTo(UW - MX, y); x.stroke();};
rule();
// 判词置顶
y += 30;
if (d.special) {
x.fillStyle = "#23211C"; x.font = "46px " + IFY.SERIF;
y = IFY.wrapText(x, "", MX, y + 46, CW, 64);
x.font = "40px " + IFY.SERIF;
y = IFY.wrapText(x, d.verdictText, MX, y + 8, CW, 62);
} else {
x.fillStyle = "#23211C"; x.font = "44px " + IFY.SERIF;
y = IFY.wrapText(x, d.verdictText, MX, y + 44, CW, 66);
}
x.fillStyle = "#8A948C"; x.font = "26px " + IFY.SANS;
y = IFY.wrapText(x, d.lifeTags, MX, y + 12, CW, 38);
if (d.death) {
x.fillStyle = "#23211C"; x.font = "28px " + IFY.SANS;
y = IFY.wrapText(x, `${d.death.age} 岁那年，你走了。${d.death.text}`, MX, y + 10, CW, 42);
}
y += 16; rule();
// 一生大事记
x.fillStyle = "#2F4A3C"; x.font = "32px " + IFY.SERIF;
y += 50; x.fillText("一生大事记", MX, y);
for (const h of d.highlights) {
x.fillStyle = "#8A948C"; x.font = "24px monospace";
y += 42; x.fillText(h.year? `${h.year} 年 · ${h.age} 岁`: `${h.age} 岁`, MX, y);
x.fillStyle = "#23211C"; x.font = "30px " + IFY.SANS;
y = IFY.wrapText(x, h.text, MX, y + 38, CW, 44) - 38 + 30;
}
y += 22; rule();
// 六维与落脚小结
x.fillStyle = "#2F4A3C"; x.font = "32px " + IFY.SERIF;
y += 50; x.fillText("六维 · 落脚", MX, y);
y += 16;
x.font = "28px " + IFY.SANS;
for (const st of d.stats) {
y += 46;
x.fillStyle = "#23211C"; x.fillText(st.label, MX, y);
x.fillStyle = "#DDD6C9"; x.fillRect(190, y - 16, 560, 14);
x.fillStyle = "#2F4A3C"; x.fillRect(190, y - 16, 560 * Math.max(0, Math.min(100, st.value)) / 100, 14);
x.fillStyle = "#23211C"; x.fillText(String(st.value), 780, y);
}
x.fillStyle = "#23211C"; x.font = "29px " + IFY.SANS;
if (d.slotMap["落脚"]) y = IFY.wrapText(x, d.slotMap["落脚"], MX, y + 48, CW, 44);
if (d.slotMap["钱"]) y = IFY.wrapText(x, d.slotMap["钱"], MX, y + 8, CW, 44);
if (d.houseLine) y = IFY.wrapText(x, d.houseLine, MX, y + 8, CW, 44);
y += 22; rule();
// 影子小结收尾
x.fillStyle = "#2F4A3C"; x.font = "32px " + IFY.SERIF;
y += 50; x.fillText("另一条路", MX, y);
x.fillStyle = "#23211C"; x.font = "29px " + IFY.SANS;
if (d.shadow.finalLine) y = IFY.wrapText(x, d.shadow.finalLine, MX, y + 44, CW, 44);
if (d.shadow.slotText) y = IFY.wrapText(x, d.shadow.slotText, MX, y + 8, CW, 44);
for (const o of d.shadow.compareOthers) y = IFY.wrapText(x, o, MX, y + 8, CW, 44);
// 页脚
const H = y + 196;
x.strokeStyle = "#DDD6C9"; x.lineWidth = 3; x.strokeRect(36, 36, UW - 72, H - 72);
x.fillStyle = "#2F4A3C"; x.font = "32px " + IFY.SERIF;
x.fillText("同样的运气，你会怎么选？", MX, H - 108);
x.fillStyle = "#8A948C"; x.font = "25px " + IFY.SANS;
x.fillText("if-that-year.pages.dev · 人生纪录典藏", MX, H - 62);
x.restore();
return H;
}

function drawWatermark(x, W, H) {
if (typeof x.setTransform === "function") x.setTransform(1, 0, 0, 1);
x.save();
x.globalAlpha = 0.12;
x.fillStyle = "#2F4A3C";
x.font = "42px " + IFY.SANS;
x.textAlign = "center";
x.translate(W / 2, H / 2);
x.rotate(-Math.PI / 7);
for (let yy = -H; yy < H; yy += 330) for (let xx = -W; xx < W; xx += 540) x.fillText("纪录典藏 · 预览", xx, yy);
x.restore();
}

// opts: {scale} 出图尺寸系数（1=全尺寸 1080 宽）；{watermark:true} 叠水印（预览专用）
function renderKeepsakeImage(d, opts) {
const scale = opts && opts.scale? opts.scale: 1;
const W = Math.round(1080 * scale);
const scratch = document.createElement("canvas");
scratch.width = W; scratch.height = 10;
const unitH = drawKeepsake(scratch.getContext("2d"), d, W);
const H = Math.ceil(unitH * scale);
const c = document.createElement("canvas");
c.width = W; c.height = H;
drawKeepsake(c.getContext("2d"), d, W);
if (opts && opts.watermark) drawWatermark(c.getContext("2d"), W, H);
return c;
}

// ---------- 纪录册（HTML：同数据＋全量年表，可打印） ----------
function yearAge(e) { return e.year? `${e.year} 年 · ${e.age} 岁`: `${e.age} 岁`;}
function buildKeepsakeBook(d) {
const esc = IFY.esc;
const slotRows = d.slots.map(([k, t]) => `<p class="slotline"><span class="slotk">${esc(k)}</span>${esc(t)}</p>`).join("");
const hl = d.highlights.map((h) => `<p class="book-ev"><span class="book-ya">${esc(yearAge(h))}</span>${esc(h.text)}</p>`).join("");
const tl = d.timeline.map((e) => `<p class="book-tl"><span class="book-ya">${esc(yearAge(e))}</span>${esc(e.text)}</p>`).join("");
const stats = d.stats.map((st) => `<div class="stat"><span>${esc(st.label)}</span><div class="bar"><i style="width:${Math.max(0, Math.min(100, st.value))}%"></i></div><b>${st.value}</b></div>`).join("");
return `<div class="book-page">
<p class="prodcredit">A TAKAE PRODUCTION</p>
<p class="eyebrow">人生RESTART</p>
<h1 class="gametitle">如果那年 · 一生纪录</h1>
<p class="book-meta">${esc(d.eraLabel)} · ${esc(d.routeName)} · 种子 ${esc(d.seed)}</p>
${d.special? `<div class="special"><p class="rare-tag">${esc(d.special.tierLabel)}</p><p class="special-title">${esc(d.special.title)}</p><p>${esc(d.special.text)}</p></div>`: ""}
<p class="verdict">${esc(d.verdictText)}</p>
<p class="lifetags">${esc(d.lifeTags)}</p>
${d.death? `<p>${d.death.age} 岁那年，你走了。${esc(d.death.text)}</p>`: ""}
<h3>一生大事记</h3>
${hl}
<h3>这一生</h3>
${slotRows}
${d.houseLine? `<p>${esc(d.houseLine)}</p>`: ""}
<h3>六维</h3>
<div class="stats">${stats}</div>
<h3>年表（全量）</h3>
${tl}
<h3>另一条路</h3>
${d.shadow.finalLine? `<p>${esc(d.shadow.finalLine)}</p>`: ""}
${d.shadow.slotText? `<p>${esc(d.shadow.slotText)}</p>`: ""}
${d.shadow.compareMain? `<p>${esc(d.shadow.compareMain)}</p>`: ""}
${d.shadow.compareOthers.map((o) => `<p>${esc(o)}</p>`).join("")}
${d.reflection? `<h3>你留给自己的话</h3><p class="refl">「${esc(d.reflection)}」</p>`: ""}
<p class="book-foot">同样的运气，你会怎么选？ · if-that-year.pages.dev · 人生纪录典藏</p>
</div>`;
}

function closeBook() {
const b = IFY.el("ify-book");
if (b) b.remove();
try {
document.body.classList.remove("has-book");
document.body.classList.remove("has-book-preview");
} catch (e) {}
}

function openBook(preview) {
closeBook();
const d = buildKeepsakeData();
const el = document.createElement("div");
el.className = "ify-book" + (preview? " preview": "");
el.setAttribute("id", "ify-book");
const wm = preview? `<div class="book-wm" aria-hidden="true">${"<span>纪录典藏 · 预览</span>".repeat(6)}</div>`: "";
el.innerHTML = `<div class="book-tools">
${preview? `<span class="hint">这是预览：订购后能打印、存成 PDF，这一版打不出来。</span>`: `<button type="button" class="ghost" id="book-print">打印 / 存成 PDF</button>`}
<button type="button" class="ghost" id="book-close">关上</button>
</div>` + buildKeepsakeBook(d) + wm;
IFY.app().appendChild(el);
try { document.body.classList.add(preview? "has-book-preview": "has-book");} catch (e) {}
const close = IFY.el("book-close");
if (close) close.addEventListener("click", closeBook);
const print = IFY.el("book-print");
if (print) print.addEventListener("click", () => { if (typeof window.print === "function") window.print();});
if (typeof el.scrollTo === "function") el.scrollTo(0, 0);
}

// ---------- 输码核验 ----------
const REASON_TEXT = {
not_found: "这个码没查到。看看是不是抄错了，码里没有 0、O、1 这几个字符。",
rate_limited: "刚才试得太多次了。过几分钟再输，这个码不会因此作废。",
unconfigured: "核验服务还没配好。先把码收好，等通道开通了再输，一样有效。",
};
async function verifyCode(code) {
let res;
try {
res = await fetch(CFG.verifyPath || "/api/verify-code", {
method: "POST",
headers: { "content-type": "application/json"},
body: JSON.stringify({ code}),
});
} catch (e) {
return { ok: false, reason: "network"};
}
let data = null;
try { data = await res.json();} catch (e) {}
if (data && data.ok) return { ok: true, state: data.state || ""};
if (res.status === 429) return { ok: false, reason: "rate_limited"};
if (res.status === 503) return { ok: false, reason: "unconfigured"};
return { ok: false, reason: (data && data.reason) || "not_found"};
}
function reasonText(reason) {
if (reason === "network") return "现在连不上核验服务。检查一下网络再试，码不会因为这次失败作废。";
return REASON_TEXT[reason] || REASON_TEXT.not_found;
}

// ---------- 结算页导出台 ----------
function downloadImage(canvas) {
const a = document.createElement("a");
a.download = "if-that-year-keepsake-" + IFY.S.seedStr + ".png";
a.href = canvas.toDataURL("image/png");
a.click();
}

function renderPanel() {
const panel = IFY.el("keepsake-panel");
if (!panel) return;
const esc = IFY.esc;
if (keepsakeUnlocked()) {
panel.innerHTML = `<div class="ks-block">
<p class="ks-intro">这台设备已经解锁了。这一局能导出，以后每一局走完都能导出。</p>
<div class="row">
<button type="button" class="primary" id="ks-dl">下载长图（无水印）</button>
<button type="button" class="ghost" id="ks-book">打开纪录册（可打印）</button>
</div>
<div class="cardpreview" id="ks-prevbox"></div>
</div>`;
const d = buildKeepsakeData();
const img = renderKeepsakeImage(d, { scale: 1});
img.className = "card-img";
const box = IFY.el("ks-prevbox");
box.innerHTML = ""; box.appendChild(img);
IFY.el("ks-dl").addEventListener("click", () => downloadImage(img));
IFY.el("ks-book").addEventListener("click", () => openBook(false));
return;
}
let pending = "";
try { pending = sessionStorage.getItem(PENDING_KEY) || "";} catch (e) {}
panel.innerHTML = `<div class="ks-block">
<p class="ks-intro">把这一生订成一册：一张长图（判词、大事记、六维、另一条路），加一本能打印的纪录册，年表是全的。买一次，这台设备以后每一局都能导出。</p>
<div class="row">
<button type="button" class="ghost" id="ks-preview">先看长图预览（带水印）</button>
<a class="ghost ks-buy" href="${esc(CFG.buyPage || "buy.html")}" target="_blank" rel="noopener">去订一册 · ¥${CFG.priceJPY} / ¥${CFG.priceCNY}</a>
</div>
<div class="cardpreview" id="ks-prevbox"></div>
<p class="picklab">已经有兑换码了？</p>
<div class="seedrow">
<input id="ks-code" type="text" placeholder="输入兑换码" autocomplete="off" value="${esc(pending)}">
<button type="button" class="primary" id="ks-unlock">用码解锁</button>
</div>
<p class="hint" id="ks-hint">${pending? "你从领码页带回的码已经填好了，点「用码解锁」就行。": ""}</p>
<p class="hint">付完款会跳到领码页，码很大，抄下来也行。码丢了，凭付款订单能补发；换了设备，拿码再输一次就行。</p>
<p class="hint">订完回到这一页，展开这一行就能导出——这一页先别关。</p>
</div>`;
IFY.el("ks-preview").addEventListener("click", () => {
const box = IFY.el("ks-prevbox");
box.innerHTML = "";
const img = renderKeepsakeImage(buildKeepsakeData(), { scale: 0.55, watermark: true});
img.className = "card-img";
box.appendChild(img);
const note = document.createElement("p");
note.className = "hint";
note.textContent = "这是带水印的预览。订购后是无水印的全尺寸长图，外加能打印的纪录册。";
box.appendChild(note);
});
IFY.el("ks-unlock").addEventListener("click", async () => {
const inp = IFY.el("ks-code");
const hint = IFY.el("ks-hint");
const code = (inp.value || "").trim();
if (!code) { hint.textContent = "先把码输进来。"; return;}
hint.textContent = "正在核验……";
const r = await verifyCode(code);
if (r.ok) {
saveUnlock(code);
try { sessionStorage.removeItem(PENDING_KEY);} catch (e) {}
refreshDesk();
const h2 = IFY.el("ks-hint");
if (h2) h2.textContent = "";
} else {
hint.textContent = reasonText(r.reason);
}
});
}

function refreshDesk() {
const line = IFY.el("keepsake-open");
if (!line) return;
line.textContent = keepsakeUnlocked()
? "这一生订成册子 · 已解锁，导出"
: `把这一生订成册子带走 · ¥${CFG.priceJPY} / ¥${CFG.priceCNY}`;
const panel = IFY.el("keepsake-panel");
if (panel &&!panel.hidden) renderPanel();
}

function mountKeepsakeDesk() {
const desk = IFY.app().querySelector(".sharedesk");
if (!desk || IFY.el("keepsake-line")) return;
desk.insertAdjacentHTML("afterend", `<p class="keepsake-line" id="keepsake-line"><button type="button" class="textlink" id="keepsake-open"></button></p><div class="keepsake-panel" id="keepsake-panel" hidden></div>`);
const btn = IFY.el("keepsake-open");
if (!btn) return;
btn.addEventListener("click", () => {
const p = IFY.el("keepsake-panel");
if (!p) return;
if (p.hidden) { renderPanel(); p.hidden = false;} else p.hidden = true;
});
refreshDesk();
}

// ---------- 领码页带回码：自动解锁（失败不打扰，码留作预填） ----------
try {
const kc = new URLSearchParams(location.search).get("kc");
if (kc &&!keepsakeUnlocked()) {
try { sessionStorage.setItem(PENDING_KEY, kc);} catch (e) {}
verifyCode(kc).then((r) => {
if (r.ok) {
saveUnlock(kc);
try { sessionStorage.removeItem(PENDING_KEY);} catch (e) {}
refreshDesk();
}
}).catch(() => {});
}
} catch (e) {}

// 在别的标签页完成订购/解锁时，本页展开着的导出台跟着刷新（结算页不用重开）
try {
window.addEventListener("storage", (e) => { if (e && e.key === LS_KEY) refreshDesk();});
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDesk();});
} catch (e) {}

Object.assign(IFY, { buildKeepsakeData, renderKeepsakeImage, buildKeepsakeBook, mountKeepsakeDesk, keepsakeUnlocked, verifyCode});
})(window.IFY);
