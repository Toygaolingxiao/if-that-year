// [模块]《如果那年》引擎分片：呈现层——年度/分岔/稀有/危机画面与文本状态变体解析。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  function renderRare(r) {
    IFY.curKind = "rare";
    IFY.S.flatCarry = null; // 稀有年不是平年：挂起的平年只留在流水账里
    IFY.S.usedRare.push(r.id);
    IFY.rec("rare", r.id, { set: r.set || null });
    if (r.set) IFY.S.flags[r.set] = true; // 呈现即立旗（v0.11.0 起覆盖有选项事件：去世旗等必立旗靠它保证）
    IFY.applyState(r); // v0.12.0：状态流转与立旗同一时机
    if (!r.choices) { IFY.applyEffects(r.effects); } else IFY.S.lastDelta = "";
    const rtext = procText(r); // v0.20.0 M2：呈现走变体解析（textState/textForm），与 sim 记录口径一致
    IFY.S.log.push(`${IFY.S.age} 岁 · 【稀有】${rtext}`);
    IFY.app().innerHTML = `<section class="card rare">${IFY.head("这一年不太一样")}
      <p class="rare-tag">稀有事件</p><p class="body">${IFY.esc(rtext)}</p>${IFY.deltaLine()}
      ${r.choices ? `<div class="choices">${r.choices.map((c, i) => `<button class="choice" data-i="${i}">${IFY.esc(c.label)}</button>`).join("")}</div><div id="echo"></div>`
                  : `<button class="primary" id="cont">过一年</button>`}</section>`;
    IFY.finishRender();
    if (!r.choices) { IFY.save(); IFY.el("cont").addEventListener("click", IFY.advance); IFY.armAuto(rtext); return; }
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = r.choices[Number(b.dataset.i)];
      IFY.choiceBeat(b, () => {
        IFY.applyEffects(c.effects);
        if (c.set) IFY.S.flags[c.set] = true;
        IFY.applyState(c);
        IFY.rec("rare", r.id, { choice: c.label, set: c.set || null, fx: IFY.S.lastDelta });
        document.querySelector(".choices").remove();
        IFY.el("echo").innerHTML = `${IFY.deltaLine()}<p class="pickednote">已选「${IFY.esc(c.label)}」</p><p class="echo">${IFY.esc(echoText(c))}</p><button class="primary" id="cont">过一年</button>`;
        IFY.save(); IFY.el("cont").addEventListener("click", IFY.advance);
      });
    }));
  }

  // 文本状态变体（v0.19.0 三相，通用形状）：条目可带 textState、选项可带 echoState，形状同为 { 域: { 状态值: 文本 } }——
  // 按本局当前状态逐域查，命中即用变体，未命中回落原文（text / echo）。不限于 spouse 域，任何注册域都可作键；
  // 字段形状在 tools/validate-state.js 登记核对。与分岔专用的 labelBySpouse/echoBySpouse 并存（分岔仍走 spouseText）。
  function stateVariant(map, fallback) {
    if (map) for (const [dom, variants] of Object.entries(map)) { const v = variants && variants[IFY.S.state[dom]]; if (v != null) return v; }
    return fallback;
  }

  // 活计形态变体（v0.20.0 M2）：textForm/echoForm 形状 { 形态: 文本 }，解析点与 textState 同一机制——
  // 先取状态域变体，再按本局 formOf() 取形态变体；当前形态无变体时回落上一层原文，两层互不覆盖。
  function formVariant(map, fallback) {
    if (!map) return fallback;
    const f = typeof IFY.formOf === "function" ? IFY.formOf() : "employee";
    return map[f] != null ? map[f] : fallback;
  }

  function echoText(c) { return formVariant(c && c.echoForm, stateVariant(c && c.echoState, (c && c.echo) || "")); }

  // 选项标签形态变体（v0.20.0 M2 收尾）：labelForm 形状同 echoForm——先按 spouse 变体取标签，
  // 再按本局形态覆盖；无变体回落 spouse 口径。分岔按钮、流水账、未选支记录共用此读法，结算 chosenOfFork 按变体集合反查。
  function labelText(c) { return formVariant(c && c.labelForm, IFY.spouseText(c, "label")); }

  function formText(item) { return formVariant(item && item.textForm, stateVariant(item && item.textState, (item && item.text) || "")); }

  function procText(item) { return formText(item); }

  function renderFork(fork) {
    IFY.curKind = "fork";
    IFY.S.flatCarry = null; // 分岔年不是平年：挂起的平年只留在流水账里（22–38 合并纪律）
    const covPrefix = fork.age === 45 && IFY.S.covenant && IFY.S.covenant.kind === "wait" ? `<p>七年前在 38 岁挂起的那份账，今天到期。</p>` : ""; // 立约到期点呈现
    const careNow = IFY.S.parents ? ((IFY.S.parents.dad.stage === "care" && IFY.S.state.dad === "alive") || (IFY.S.parents.mom.stage === "care" && IFY.S.state.mom === "alive")) : !!IFY.S.flags.care_stage;
    const forkText = fork.age === 52 && careNow && fork.textCare ? fork.textCare : formText(fork); // v0.18.0 审计急修：textCare 只认「正在照护且父母尚在」——旧 care_stage 旗在父母离世后仍留着，不能让 52 岁分岔对孤儿说「你已经在照护里了」 // fork52 与父母进程对齐（v0.18.0）：进程已到照护段时文本随动 // v0.19.0 审计急修：非照护段文本走 textState 分版（只剩一位父母时按在世的那位说）
    const GATE_KEYS = ["require", "forbid", "all", "any", "state", "stateAll", "stateNot", "era", "eraIn", "minYear", "route", "routeIn", "forbidRoute", "chain"];
    let vis = fork.choices.map((c, i) => [c, i]).filter(([c]) => !GATE_KEYS.some((k) => k in c) || IFY.met(c)); // 选项级门（v0.18.0）：带门的选项按本局事实显隐（如 fork52 排班选项只给有兄弟姐妹的人）
    if (!vis.length) vis = fork.choices.map((c, i) => [c, i]);
    IFY.app().innerHTML = `<section class="card">${IFY.head()}<h2>${IFY.esc(fork.title)}</h2>${covPrefix}<p>${IFY.esc(forkText)}</p>
      <div class="choices">${vis.map(([c, i]) => `<button class="choice" data-i="${i}">${IFY.esc(labelText(c))}</button>`).join("")}</div></section>`;
    IFY.finishRender();
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const c = fork.choices[Number(b.dataset.i)];
      IFY.choiceBeat(b, () => {
        IFY.applyEffects(c.effects);
        if (c.set) IFY.S.flags[c.set] = true;
        IFY.applyState(c);
        IFY.applyTempDelta(c.temp); // 温度接点（v0.17.0）：选项可带 temp 增减，只改质地字段
        if (fork.age === 38) IFY.registerCovenant(c);
        fork.choices.forEach((o) => { if (o !== c) IFY.S.unchosen.push({ kind: "fork", age: fork.age, label: labelText(o) }); });
        IFY.S.log.push(`${fork.age} 岁 · ${fork.title.split("·")[1].trim()}：${labelText(c)}`);
        IFY.rec("fork", fork.id || ("fork" + fork.age), { choice: labelText(c), set: c.set || null, fx: IFY.S.lastDelta });
        IFY.S.pendingFork = { age: fork.age, label: labelText(c), echo: echoText({ ...c, echo: IFY.spouseText(c, "echo") }) || null }; // §3.3 复述拍：先存下，续玩回到这一拍而不是重选
        IFY.save();
        renderForkEcho();
        IFY.mountStream();
      });
    }));
  }

  // §3.3 完整版（v0.10.0）：分岔选后不直接进下一年，先留一拍专属回响（文案在 events.js 各分岔选项的 echo 字段；旧存档无 echo 时回落最小版复述）。
  function renderForkEcho() {
    IFY.curKind = "fork";
    const pf = IFY.S.pendingFork;
    IFY.app().innerHTML = `<section class="card">${IFY.head()}${IFY.deltaLine()}<p class="echo">${IFY.esc(pf.echo || ("你选了「" + pf.label + "」"))}</p><button class="primary" id="cont">过一年</button></section>`;
    IFY.finishRender();
    IFY.el("cont").addEventListener("click", () => { IFY.S.pendingFork = null; IFY.save(); IFY.advance(); });
  }

  function renderCrisis(c) {
    IFY.curKind = "crisis";
    IFY.S.flatCarry = null; // 危机年不是平年：挂起的平年只留在流水账里
    if (c.key === "health") { IFY.S.healthCrisisSeen = true; IFY.save(); }
    IFY.app().innerHTML = `<section class="card crisis">${IFY.head("身体和日子，都得当回事")}<h2>${IFY.S.age} 岁 · ${IFY.esc(c.title)}</h2><p>${IFY.esc(c.text)}</p>
      <div class="choices">${c.choices.map((ch, i) => `<button class="choice" data-i="${i}">${IFY.esc(ch.label)}</button>`).join("")}</div><div id="echo"></div></section>`;
    IFY.finishRender();
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const ch = c.choices[Number(b.dataset.i)];
      IFY.choiceBeat(b, () => {
        IFY.applyEffects(ch.effects); IFY.S.crisisUsed[c.key] = true;
        if (ch.set) IFY.S.flags[ch.set] = true; IFY.applyState(ch); // v0.12.0：与其它选项路径统一（现行危机数据未用 set/setState，防未来内容轮）
        IFY.S.log.push(`${IFY.S.age} 岁 · ${c.title}：${ch.label}`);
        IFY.rec("crisis", c.key, { choice: ch.label, set: ch.set || null, fx: IFY.S.lastDelta });
        document.querySelector(".choices").remove();
        IFY.el("echo").innerHTML = `${IFY.deltaLine()}<p class="pickednote">已选「${IFY.esc(ch.label)}」</p><p class="echo">${IFY.esc(echoText(ch))}</p><button class="primary" id="cont">过一年</button>`;
        IFY.save(); IFY.el("cont").addEventListener("click", IFY.advance);
      });
    }));
  }

  function renderEventYear(plan) {
    IFY.curKind = "year";
    // 内容判定已收进调度层（v0.20.0 M2）：planYear() 按五层仲裁给出本年计划，本函数只呈现。
    // 无计划调用（旧调用点）时现算一份，口径同一。
    const p = plan || IFY.planYear();
    // 温度平淡年出口（v0.17.0）：平淡与否由调度层按 rhythm derive 判定（plan.kind === "flat"），
    // 本层不再自行掷骰。平淡年不抽事件卡：流水账记一行带具体细节的平淡，数值至多 ±1；
    // 死亡判定仍在 advance() 里逐年走，温度不碰死亡率（红线）。
    if (p.kind === "flat") {
      const f = p.flat;
      IFY.S.flatYears = (IFY.S.flatYears || 0) + 1;
      IFY.S.flatCarry = null;
      IFY.applyEffects(f.effects);
      IFY.S.log.push(`${IFY.S.age} 岁 · ${f.text}`);
      IFY.rec("flat", "flat_adult", { text: f.text });
      IFY.app().innerHTML = `<section class="card">${IFY.head()}<p class="body">${IFY.esc(f.text)}</p>${IFY.deltaLine()}<button class="primary" id="cont">过一年</button></section>`;
      IFY.finishRender();
      IFY.save(); IFY.el("cont").addEventListener("click", IFY.advance);
      IFY.armAuto(f.text);
      return;
    }
    if (p.kind === "micro") {
      // 平年微文本（L4 风味填充）：年份不再被静默跳过；抽哪条已由调度层定（p.microIdx）
      const idx = p.microIdx;
      if (!IFY.S.microUsed.includes(idx)) IFY.S.microUsed.push(idx);
      const microText = IFY.D.micro[idx];
      IFY.S.log.push(`${IFY.S.age} 岁 · ${microText}`);
      IFY.rec("micro", "micro", { text: microText });
      // 22–38 相邻平年合并（v0.17.0）：前一年先挂起（只入流水账），下一年同为平年则两行同卡呈现，省一屏；
      // 合并只动呈现——抽取、随机流、死亡判定全不变（模拟口径与旧版一致），总时长不涨。
      if (IFY.S.flatCarry) {
        const carryText = IFY.S.flatCarry.text;
        IFY.S.flatCarry = null;
        IFY.app().innerHTML = `<section class="card">${IFY.head()}<p class="body">${IFY.esc(carryText)}</p><p class="body">${IFY.esc(microText)}</p><p class="hint">这两年都没什么大事，一并记在这里。</p><button class="primary" id="cont">过一年</button></section>`;
        IFY.finishRender();
        IFY.save(); IFY.el("cont").addEventListener("click", IFY.advance);
        IFY.armAuto(microText);
        return;
      }
      if (IFY.S.age >= IFY.START_AGE && IFY.S.age <= 37) {
        IFY.S.flatCarry = { age: IFY.S.age, text: microText };
        IFY.save();
        IFY.advance(); // 挂起本年直接进下一年：下一年是平年合并呈现，不是平年则本年只留在流水账里
        return;
      }
      IFY.app().innerHTML = `<section class="card">${IFY.head()}<p class="body">${IFY.esc(microText)}</p><button class="primary" id="cont">过一年</button></section>`;
      IFY.finishRender();
      IFY.save(); IFY.el("cont").addEventListener("click", IFY.advance);
      IFY.armAuto(microText);
      return;
    }
    const e = p.event; // kind === "event"（L2 链推进或 L3 saliency，plan.layer 标明）
    IFY.S.flatCarry = null; // 事件年：挂起的平年只留在流水账里
    IFY.S.usedEvents.push(e.id);
    if (e.set) IFY.S.flags[e.set] = true; // 顶层 set 呈现即立（v0.9.2 补齐普通事件路径；v0.11.0 起覆盖有选项事件：去世旗等必立旗靠它保证）
    IFY.applyState(e); // v0.12.0：状态流转与立旗同一时机
    if (!e.choices) { IFY.applyEffects(e.effects); } else IFY.S.lastDelta = "";
    IFY.rec("event", e.id, { set: e.set || null, fx: !e.choices ? IFY.S.lastDelta : null });
    const etext = procText(e); // v0.20.0 M2：呈现走变体解析（textState/textForm），与 sim 记录口径一致
    IFY.S.log.push(`${IFY.S.age} 岁 · ${etext}`);
    IFY.app().innerHTML = `<section class="card">${IFY.head()}<p class="body">${IFY.esc(etext)}</p>${IFY.deltaLine()}
      ${e.choices ? `<div class="choices">${e.choices.map((c, i) => `<button class="choice" data-i="${i}">${IFY.esc(c.label)}</button>`).join("")}</div><div id="echo"></div>`
                  : `<button class="primary" id="cont">过一年</button>`}</section>`;
    IFY.finishRender();
    if (!e.choices) { IFY.save(); IFY.el("cont").addEventListener("click", IFY.advance); IFY.armAuto(etext); return; }
    const chooseEventChoice = (c, autoSelected) => {
      IFY.clearAuto();
      IFY.applyEffects(c.effects);
      if (c.set) IFY.S.flags[c.set] = true;
      IFY.applyState(c);
      IFY.rec("event", e.id, { choice: c.label, set: c.set || null, fx: IFY.S.lastDelta });
      if (autoSelected) IFY.S.log.push(`${IFY.S.age} 岁 · 自动选：${c.label}`);
      document.querySelector(".choices").remove();
      IFY.el("echo").innerHTML = `${IFY.deltaLine()}${autoSelected ? `<p class="autonote">自动推进 · 已选「${IFY.esc(c.label)}」</p>` : `<p class="pickednote">已选「${IFY.esc(c.label)}」</p>`}<p class="echo">${IFY.esc(echoText(c))}</p><button class="primary" id="cont">过一年</button>`;
      IFY.save(); IFY.el("cont").addEventListener("click", IFY.advance);
      if (autoSelected) IFY.armAuto(echoText(c) || c.label, IFY.advance, "advance");
    };
    document.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      IFY.choiceBeat(b, () => chooseEventChoice(e.choices[Number(b.dataset.i)], false));
    }));
    // §4.3 全程自动选分两段：主计时到点先预高亮被选按钮 400ms（玩家可点任意处夺回手动），再执行选择
    IFY.armAuto(etext, () => {
      const idx = Math.floor(IFY.rng() * e.choices.length);
      const btns = document.querySelectorAll(".choices .choice");
      btns.forEach((o, j) => {
        o.disabled = true;
        o.classList.toggle("picked", j === idx);
        o.classList.toggle("faded", j !== idx);
      });
      IFY.autoPhase2 = setTimeout(() => { IFY.autoPhase2 = null; chooseEventChoice(e.choices[idx], true); }, 400);
    }, "choice");
  }
  Object.assign(IFY, { renderRare, stateVariant, formVariant, formText, echoText, labelText, procText, renderFork, renderForkEcho, renderCrisis,
    renderEventYear });
})(window.IFY);
