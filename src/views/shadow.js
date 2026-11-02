// [模块]《如果那年》引擎分片：呈现层——影子瞥视。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // ---------- 影子瞥视：先给标题，点开才看全文；不看的计数从此是真的 ----------
  function shadowRoute() { const first = IFY.S.unchosen.find((u) => u.kind === "route"); return IFY.D.shadows[first.id]; }

  function shadowStageText(stage) {
    const variants = shadowRoute().stages[stage];
    return variants[Math.floor(IFY.rng() * variants.length)];
  }

  // 影子代价三选一（v0.10.0）：按种子+路线名哈希定值，同一局内结算页与分享卡取同一行；存量字符串原样返回。
  function shadowCostText(sh) {
    if (!sh) return "";
    const c = sh.cost;
    if (!Array.isArray(c)) return c || "";
    if (c.length === 1) return c[0];
    let h = 2166136261;
    const s = String((IFY.S && IFY.S.seed) || "") + ":" + sh.name;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return c[Math.abs(h) % c.length];
  }

  function shadowFinalText(sh) {
    const finals = sh && sh.stages && sh.stages[2];
    if (!Array.isArray(finals) || !finals.length) return "";
    return finals.find((t) => !(IFY.S.shadowSeenTexts || []).includes(t)) || finals[0] || "";
  }

  // 结算页与发帖文案共用同一组对照行：主影子拼入结局与代价，其余未选路线按 routes 原序各出一行。
  function shadowCompareLines() {
    if (!IFY.S || !Array.isArray(IFY.S.unchosen)) return { main: "", others: [] };
    const routeEntries = IFY.S.unchosen.filter((u) => u && u.kind === "route");
    if (!routeEntries.length) return { main: "", others: [] };
    const mainEntry = routeEntries[0];
    const mainShadow = IFY.D.shadows && IFY.D.shadows[mainEntry.id];
    const mainFinal = shadowFinalText(mainShadow);
    const main = mainShadow && mainShadow.name && mainFinal && mainShadow.cost
      ? `另一条路（${mainShadow.name}）也走完了它的一生。${mainFinal}${shadowCostText(mainShadow)}` : "";
    const routeOrder = new Map(IFY.D.routes.map((r, i) => [r.id, i]));
    const others = routeEntries.slice(1)
      .sort((a, b) => (routeOrder.has(a.id) ? routeOrder.get(a.id) : Number.MAX_SAFE_INTEGER)
        - (routeOrder.has(b.id) ? routeOrder.get(b.id) : Number.MAX_SAFE_INTEGER))
      .map((entry) => {
        const sh = IFY.D.shadows && IFY.D.shadows[entry.id];
        const final = shadowFinalText(sh);
        return sh && sh.name && final ? `${sh.name}：${final}` : "";
      }).filter(Boolean);
    return { main, others };
  }

  function renderGlimpse(stage) {
    IFY.curKind = "glimpse";
    IFY.S.flatCarry = null; // 瞥视年不是平年：挂起的平年只留在流水账里
    const sh = shadowRoute();
    const text = shadowStageText(stage); // 先抽定，点不点开都是这一条（但只有点开才显示）
    IFY.app().innerHTML = `<section class="card glimpse">${IFY.head()}
      <h2>${IFY.S.age} 岁 · 另一条路上的你</h2>
      <p class="teaser">${IFY.esc(sh.name)}，今年：${IFY.esc(sh.teaser[stage])}</p>
      <p class="hint">细节只给你看一眼。看，还是不看，你自己定——不看的那几次，结算时会记着。</p>
      <div class="row"><button class="primary" id="look">看细节</button><button class="ghost" id="skip">不看，继续过日子</button></div>
      <div id="detail"></div></section>`;
    IFY.finishRender();
    IFY.el("skip").addEventListener("click", () => { IFY.S.glimpsesSkipped += 1; IFY.ANA.track("glimpse", { age: IFY.S.age, seen: false }); IFY.S.log.push(`${IFY.S.age} 岁 · 没有去看另一条路`); IFY.rec("glimpse", "skip"); IFY.advance(); });
    IFY.el("look").addEventListener("click", () => {
      IFY.S.glimpsesSeen += 1; IFY.ANA.track("glimpse", { age: IFY.S.age, seen: true });
      (IFY.S.shadowSeenTexts = IFY.S.shadowSeenTexts || []).push(text);
      IFY.rec("glimpse", "seen", { text });
      IFY.S.log.push(`${IFY.S.age} 岁 · 影子：${text}`);
      // 童年记号的影子回响（v0.17.0）：每局第一次看瞥视时附一句「两条路上共同的事实」——童年不进影子锚点，只留共同事实
      let markLine = "";
      if (IFY.PRO && IFY.S.prologue && !IFY.S.prologue.shadowMarkShown && (IFY.S.marks || []).length) {
        const mk = IFY.PRO.marks[IFY.S.marks[0].id];
        if (mk) { markLine = mk.shadow; IFY.S.prologue.shadowMarkShown = true; IFY.S.log.push(`${IFY.S.age} 岁 · ${mk.shadow}`); }
      }
      IFY.el("detail").innerHTML = `<p class="body">「${IFY.esc(text)}」</p>${markLine ? `<p class="body">${IFY.esc(markLine)}</p>` : ""}
        <label class="refl-label">给现实里的自己留一句话（会出现在你的结算里）<input id="refl" type="text" maxlength="60" placeholder="一句就好"></label>
        <div class="row"><button class="primary" id="cont">记下，继续</button><button class="ghost" id="cont2">不写了，继续</button></div>`;
      document.querySelector(".row").remove();
      const done = () => { const v = (IFY.el("refl").value || "").trim(); if (v) IFY.S.reflections.push({ age: IFY.S.age, text: v }); IFY.advance(); };
      IFY.el("cont").addEventListener("click", done);
      IFY.el("cont2").addEventListener("click", IFY.advance);
      IFY.save();
    });
  }
  Object.assign(IFY, { shadowRoute, shadowStageText, shadowCostText, shadowFinalText, shadowCompareLines, renderGlimpse });
})(window.IFY);
