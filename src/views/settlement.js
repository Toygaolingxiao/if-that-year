// [模块]《如果那年》引擎分片：呈现层——结算（判词、标签、特殊结局、九槽、结算页）。独立模块（包装器 + window.IFY 共享命名空间），加载顺序见 index.html。
(function (IFY) {
  "use strict";
  // ---------- 结算 ----------
  function verdict() {
    if (IFY.S._verdict) return IFY.S._verdict;
    // 并列打破（v0.11.0）：同值维度用本局 rng 随机定序，不再按固定键序隐式优先
    const sorted = Object.entries(IFY.S.stats).map(([k, v]) => [k, v, IFY.rng()]).sort((a, b) => (b[1] - a[1]) || (a[2] - b[2]));
    const top = sorted[0][0], bottom = sorted[sorted.length - 1][0];
    // F1/F2（v0.17.0）：片段先按 needs 对本局事实过滤再抽；过滤后为空回落中性片段（无 needs 者），事实不许将就
    const pickF = (pool) => {
      if (!Array.isArray(pool)) return { text: pool, idx: 0 };
      let cands = pool.map((f, i) => [f, i]).filter(([f]) => IFY.factOk(typeof f === "string" ? null : f.needs));
      if (!cands.length) cands = pool.map((f, i) => [f, i]).filter(([f]) => typeof f === "string" || !f.needs);
      if (!cands.length) cands = pool.map((f, i) => [f, i]);
      const [f, i] = cands[Math.floor(IFY.rng() * cands.length)];
      return { text: typeof f === "string" ? f : f.t, idx: i };
    };
    const tF = pickF(IFY.D.verdictTop[top]), cF = pickF(IFY.D.verdictCost[bottom]);
    IFY.S._verdict = { text: tF.text + cF.text, top, bottom, topIdx: tF.idx, costIdx: cF.idx };
    return IFY.S._verdict;
  }

  // ---------- 事实标签行（v0.11.0） ----------
  // 只从本局事实取材，三段为限、纯描述：①路线与人生形状（迁徙旗标优先于路线默认）②一条最有分量的轨迹（按下方优先级取第一条有旗标/日志证据的，无证据不生成）③晚年与家庭收尾。
  // 无稀有度、无档位；不复述特殊结局名；纯函数（不耗 rng），同局在结算页与分享卡恒一致。
  function lifeTags() {
    const F = IFY.S.flags, used = IFY.S.usedEvents, out = [];
    const trail = IFY.residenceTrail(); // v0.18.0：形状段改读实际居所轨迹（账本里的路线起点与迁徙记录），不再只凭路线与旗标
    let shape = "";
    if (trail.final === "home" && trail.spans.city + trail.spans.abroad >= 5) shape = "最后回了老家";
    else if (F.back_home_stay) shape = "最后回了老家";
    else if (F.stayed_city) shape = "在异乡扎下根";
    else if (F.moved_city) shape = "换过城市生活";
    else if (F.near_family) shape = "守在家人近处";
    else if (F.often_back) shape = "一直没断了回老家的路";
    else shape = { corp: "去大城市闯过", home: "留在家乡过日子", abroad: "去远方生活过", study: "多读了几年书", gap: "停过一年再出发" }[IFY.S.route.id] || "";
    if (shape) out.push(shape);
    const traj = [
      [used.includes("p11_054"), "送走过一条狗"],
      [used.includes("p5_044") || used.includes("p13_055"), "送走过一只猫"],
      [!!F.care_self, "把工作放一放，回去陪过父母"],
      [!!F.laid_off, "下过岗，又重新站住"],
      [!!F.xiahai, "下过海"],
      [!!F.exam_landed, "考进过体制内"],
      [!!F.stock_2008, "在六千点那年跟过风"],
      [!!F.crypto_old, "早年倒腾过一阵币"],
      [!!F.stall_breakfast, "摆过早点摊"],
      [!!F.kid_abroad, "把孩子送到了国外"],
      [!!F.two_cities, "过过两地奔波的日子"],
      [!!F.long_dist, "和对方两地过"],
      [!!(F.side_business || F.side_start || F.side_job), "正职之外干过副业"]
    ];
    let t2 = "";
    for (const [ok, label] of traj) if (ok) { t2 = label; break; }
    if (!t2 && IFY.finalAge() >= 55) {
      const HOB = { hobby_calligraphy: "书法", hobby_photo: "摄影", hobby_fishing: "钓鱼", hobby_garden: "种菜", hobby_music: "音乐", hobby_run: "跑步", hobby_cook: "做饭", hobby_badminton: "羽毛球" };
      const hk = Object.keys(HOB).find((k) => F[k]);
      if (hk) t2 = HOB[hk] + "陪了大半辈子";
    }
    if (!t2 && IFY.S.state && IFY.S.state.dog !== "none") t2 = "养过一条狗"; // v0.12.0：旗标时代 dog_home 立后不清（在养/已离世都算养过），状态读法等价取 ≠none
    if (!t2 && F.bought_house) t2 = "供过一套房";
    if (t2) out.push(t2);
    const res = trail.final === "home" ? "家乡" : trail.final === "abroad" ? "异国" : "异乡"; // v0.18.0：「终老在异国」只在居所轨迹终点确为异国时才写
    let close = "";
    const ST = IFY.S.state || {}; // v0.12.0：收尾段改读状态矩阵（原旗标读法在离异/丧偶后因旗不清会误判，现按当前状态）
    if (ST.spouse === "widowed") close = "老伴先走，最后一段自己过";
    else if (ST.spouse === "divorced" && ST.kids === "has") close = "后来一个人把孩子带大";
    else if (ST.spouse === "divorced") close = "后来一个人过";
    else if (ST.spouse === "partnered" && F.kid_abroad) close = "和老伴相伴，儿女在远方";
    else if (ST.spouse === "partnered" && ST.kids === "has") close = "和老伴、儿女一起走完";
    else if (ST.spouse === "partnered") close = "和老伴走完这一生";
    else if (ST.kids === "has") close = "儿女陪着走完";
    else if (ST.spouse === "single") close = "一个人走完这一生";
    else close = IFY.S.death ? "最后住在" + res : "终老在" + res;
    out.push(close);
    return out.join(" · ");
  }

  // 分岔「本局选了哪一项」（结算年表与差一步共用同一读法：查本局日志行）
  // 日志行写的是呈现口径的标签（spouse 变体 / 形态 labelForm 变体），反查须把变体集合一并认下，只认原文会漏掉变体局。
  function chosenOfFork(f) {
    const variants = (c) => [c.label, ...Object.values(c.labelBySpouse || {}), ...Object.values(c.labelForm || {})];
    const line = IFY.S.log.find((l) => l.startsWith(`${f.age} 岁 · `) && f.choices.some((c) => variants(c).some((v) => v && l.endsWith(`：${v}`))));
    return line ? line.slice(line.lastIndexOf("：") + 1) : "";
  }

  // ---------- 职业轨迹（v0.20.0 M2 结算事实对账）：入行旗按行当归组读账本 ----------
  // 医护一线四旗同源（med_work 乡镇线 / med_hosp 入行拍 + nurse_work/img_work 分科支）归一组，
  // 不按旗数误判漂移；其余入行旗各算一行当。改行类事实（数控再培训/新产线再培训/下海）单列：
  // 任一命中即不再算「一辈子一行」。跳槽（job_hop）只换东家不换行当，不入改行列（登记于 slots 审表）。
  const OCC_MED = ["med_work", "med_hosp", "nurse_work", "img_work"];
  const OCC_SINGLE = ["factory_work", "craft_work", "miner_work", "fab_work", "shop_work", "gig_work", "courier_work", "farm_work", "teach_work", "acct_work", "care_work", "write_work", "heavy_work", "dev_work", "press_work", "driver_taxi", "fin_work", "truck_work", "took_over_job", "exam_landed"];
  const OCC_CHANGE = ["p20_cnc_retrain", "p20_newline_trained", "xiahai"];
  // 账本里的明确转行事实（v0.20.1 返修）：条目本身没有入行旗，但正文就是一次换行当——
  // p2_022「转行一年，新工作的收入只有原来的六成」、p17_015「你转行去了房产中介」。
  const OCC_CHANGE_FACTS = ["p2_022", "p17_015"];
  function occupationTrail() {
    const F = IFY.S.flags || {};
    const lines = [];
    if (OCC_MED.some((f) => F[f])) lines.push("med");
    for (const f of OCC_SINGLE) if (F[f]) lines.push(f);
    // 入行旗之外的成段行当（v0.20.1 返修，审计 run-03）：网贷地推立的是经历旗 p19_p2p_in、不在入行旗表里，
    // 此前不计数——run-03 这类「地推几年又去做批发」的局因此被误判单行当。地推/销售单列一组。
    if (F.p19_p2p_in) lines.push("p19_p2p_in");
    // 副业形态（v0.20.1 返修）：已有主行当时，副业是第二摊活儿，算另一行——不再算「一辈子就干这一行」。
    if (lines.length && (F.side_start || F.side_job || F.side_business)) lines.push("side");
    const change = OCC_CHANGE.filter((f) => F[f]);
    for (const id of OCC_CHANGE_FACTS) if (typeof IFY.hasFact === "function" ? IFY.hasFact(id) : F[id]) change.push(id);
    const ages = IFY.S.flagAges || {};
    let entryAge = null;
    for (const f of [...OCC_MED, ...OCC_SINGLE]) if (F[f] && typeof ages[f] === "number") entryAge = entryAge == null ? ages[f] : Math.min(entryAge, ages[f]);
    return {
      lines, change, entryAge,
      drift: lines.length >= 2 || change.length > 0,
      single: lines.length === 1 && !change.length && (entryAge == null || entryAge <= 42),
      none: lines.length === 0,
    };
  }

  // ---------- 年表「差一步」（v0.20.0 M2）：只差一项的未落定结局与未遇分岔 ----------
  // 计算只读既有求值（met/evidenceCount/unmetConditions），不掷骰、不改状态；文案按回望口径写，
  // 数值门写具体数（结算后回望、防迷路）。差两项以上、未走过的普通事件，一律不显示。
  function flagStepLabel(flag) {
    const ms = IFY.REG && IFY.REG.milestones ? IFY.REG.milestones[flag] : null;
    for (const id of (ms && ms.setters) || []) {
      const r = (IFY.D.rare || []).find((x) => x.id === id);
      if (r && r.label) return r.label;
    }
    return null;
  }
  function missText(d) {
    const name = (k) => { const m = (IFY.STAT_META || []).find(([kk]) => kk === k); return m ? m[1] : k; };
    switch (d.kind) {
      case "stat": return d.gt !== undefined && d.gt != null ? `${name(d.stat)}没过 ${d.gt}` : `${name(d.stat)}没压到 ${d.lt} 以下`;
      case "flag": { const lb = flagStepLabel(d.flag); return lb ? `还没走到那一步：${lb}` : "有段经历没赶上"; }
      case "anyFlag": { for (const f of d.flags) { const lb = flagStepLabel(f); if (lb) return `还没走到那一步：${lb}`; } return "有段经历没赶上"; }
      case "forbidFlag": return "有件事先定下了，路就岔开了";
      case "state":
        if (d.dom === "spouse" && d.need.includes("partnered")) return "身边得有个人陪着";
        if (d.dom === "kids" && d.need.includes("has")) return "得有孩子";
        if (d.dom === "kids" && d.need.includes("none")) return "孩子的事得定下来不要";
        if (d.dom === "workPhase" && d.need.includes("retired")) return "得先退下来";
        return "眼下的情形差了一项";
      case "stateNot": return "眼下的情形差了一项";
      case "route": case "routeIn": { const r = (IFY.D.routes || []).find((x) => x.id === (Array.isArray(d.need) ? d.need[0] : d.need)); return `差走另一条路：得是「${r ? r.name : "另一条"}」那条线`; }
      case "forbidRoute": return "差走另一条路：你走的这条线到不了那里";
      case "chain": { const r = (IFY.D.rare || []).find((x) => x.id === d.chain); return r && r.label ? `前头那件事没遇上：${r.label}` : "前头那件事没遇上"; }
      case "ctx": return "有段经历没赶上";
      case "parents": return "父母都不在了";
      case "kidAge": case "kidAgeMax": return "孩子年纪没对上";
      case "flagAge": return "有件事过去太久了";
      case "rehireAfter": return "退了以后没再回去做过半截";
      case "era": case "eraIn": return "那是另一代人的事";
      case "minYear": return "年份还没到";
      default: return "就差一项";
    }
  }
  function forkUnmet(f) {
    const u = [];
    const S = IFY.S;
    if (f.route && S.route.id !== f.route) { const r = (IFY.D.routes || []).find((x) => x.id === f.route); u.push(`差走另一条路：这个岔口只在「${r ? r.name : "另一条"}」那条线上`); }
    if (f.forbidRoute && S.route.id === f.forbidRoute) u.push("差走另一条路：你走的这条线，到不了这个岔口");
    if (f.forbid && S.flags[f.forbid]) u.push(f.forbid === "bought_house" ? "那年已经买了房，这个岔口没再出现" : "有件事先定下了，这个岔口没再出现");
    if (f.anyParentAlive && S.state.dad !== "alive" && S.state.mom !== "alive") u.push("父母都不在了，这个岔口没等到");
    if (f.state) for (const [dom, v] of Object.entries(f.state)) {
      const vals = Array.isArray(v) ? v : [v];
      if (!vals.includes(S.state[dom])) u.push(dom === "kids" ? "孩子的事，那年已经定了" : dom === "spouse" ? "身边人的情形不一样" : "情形差了一项");
    }
    return u;
  }
  function nearMisses() {
    const out = [];
    if (!IFY.S || !IFY.S.route) return out;
    const endAge = IFY.finalAge();
    const sp = specialEnding();
    for (const e of IFY.D.endings || []) {
      if (sp && e.id === sp.id) continue; // 本局落定的不算差一步
      if (IFY.met(e) && IFY.evidenceCount(e) >= 2) continue; // 条件证据全满只是没排上档位的，不算差
      const u = IFY.unmetConditions(e);
      if (u.unmet.length === 1 && u.evidenceMissing <= 1) out.push({ kind: "ending", id: e.id, title: e.title, age: endAge, miss: missText(u.unmet[0]), evMiss: u.evidenceMissing });
    }
    const faced = (IFY.D.forks || []).filter((f) => (!IFY.S.death || f.age < IFY.S.death.age) && (!f.state || chosenOfFork(f)));
    for (const f of IFY.D.forks || []) {
      if (IFY.S.death ? f.age >= IFY.S.death.age : f.age > endAge) continue; // 没活到那个岁数的岔口不算差一步
      if (faced.includes(f)) continue;
      const u = forkUnmet(f);
      if (u.length === 1) out.push({ kind: "fork", age: f.age, title: f.title || "", miss: u[0] });
    }
    const ends = out.filter((n) => n.kind === "ending");
    const forks = out.filter((n) => n.kind === "fork").sort((a, b) => a.age - b.age);
    return [...ends, ...forks].slice(0, 6); // 不展示全图：最多六个剪影
  }

  function specialEnding() {
    // F3/F4（v0.17.0）：met() 条件之外还须凑满 2 个独立证据点（evidence，见 src/content/rare/synergy.js）；凑不满就不出——一局可以没有特殊结局
    const hits = (IFY.D.endings || []).filter((e) => IFY.met(e) && IFY.evidenceCount(e) >= 2);
    if (!hits.length) return null;
    hits.sort((a, b) => IFY.TIER_ORDER[a.tier] - IFY.TIER_ORDER[b.tier]);
    return hits[0];
  }

  // ---------- 结算纵轴立轴图（VISUAL-DESIGN 第四节裁定 + UX-MOTION §9.2 生长仪式） ----------
  // 纵轴恒为 22→80 岁：走过的线居中成脊只画到实际终年，早夭的留白就是信息；未选支流按分岔序号左右交替。
  function settlementMapHtml() {
    const end = IFY.finalAge();
    const W = Math.min(460, Math.max(300, (window.innerWidth || 360) - 56));
    const cx = W / 2, pxY = 11, topPad = 34;
    const Y = (a) => topPad + (a - IFY.START_AGE) * pxY;
    const H = Y(IFY.MAX_AGE) + 30;
    const GROW_S = 1.05, GROW_DELAY = 0.36;
    // 标签按可用宽度截断：宽度单位（半角 0.55 / 全角 1）×字号 ≈ 实际像素，原型实测口径
    const units = (s) => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) < 256 ? 0.55 : 1), 0);
    const fitW = (t) => {
      const maxU = (W / 2 - 18) / 11.5;
      if (units(t) <= maxU) return t;
      let s = t;
      while (s.length && units(s + "…") > maxU) s = s.slice(0, -1);
      return s + "…";
    };
    const chosenOf = chosenOfFork;
    const faced = (IFY.D.forks || []).filter((f) => (!IFY.S.death || f.age < IFY.S.death.age) && (!f.state || chosenOf(f))); // v0.16.0：带门分岔没触发过的，不进结算对照（无门分岔照旧）
    let g = `<line x1="${cx}" y1="${Y(IFY.START_AGE)}" x2="${cx}" y2="${Y(IFY.MAX_AGE)}" stroke="#DDD6C9" stroke-width="1.5"/>`;
    g += `<path class="mapspine" style="--gd:${GROW_DELAY}s" pathLength="100" d="M ${cx} ${Y(IFY.START_AGE)} L ${cx} ${Y(end)}" fill="none" stroke="#2F4A3C" stroke-width="3" stroke-linecap="round"/>`;
    const labels = [];
    let prevBd = -1;
    faced.forEach((f, fi) => {
      const side = fi % 2 === 0 ? -1 : 1; // 分岔序号定侧：左右交替，横向偏移不编码好坏
      const y0 = Y(f.age);
      let bd = GROW_DELAY + ((f.age - IFY.START_AGE) / Math.max(1, end - IFY.START_AGE)) * GROW_S;
      if (prevBd >= 0) bd = Math.max(bd, prevBd + 0.09); // 早年分岔密集：延迟加 90ms 最小间隔下限，保住「依次」感（原型验证对策）
      prevBd = bd;
      IFY.S.unchosen.filter((u) => u.kind === "fork" && u.age === f.age).forEach((u, j) => {
        const dx = side * (84 + j * 42), dy = (6 + j * 2.5) * pxY;
        g += `<path class="mapbranch" style="--bd:${bd.toFixed(2)}s" d="M ${cx} ${y0} Q ${cx + dx * 0.72} ${y0 + dy * 0.5} ${cx + dx} ${y0 + dy}" fill="none" stroke="#8A948C" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round"/><circle cx="${cx + dx}" cy="${y0 + dy}" r="2" fill="#8A948C" opacity=".45"/>`;
      });
      g += `<circle cx="${cx}" cy="${y0}" r="4" fill="#2F4A3C"/>`;
      const chosen = chosenOf(f);
      if (chosen) labels.push(`<text class="maplab" style="--bd2:${(bd + 0.1).toFixed(2)}s" x="${cx - side * 12}" y="${y0 + 4}" font-size="11.5" fill="#6E6A5E" text-anchor="${side === 1 ? "end" : "start"}">${IFY.esc(fitW(`${f.age} 岁 · ${chosen}`))}</text>`);
    });
    g += `<circle cx="${cx}" cy="${Y(IFY.START_AGE)}" r="4.5" fill="#2F4A3C"/>`;
    labels.push(`<text class="maplab" style="--bd2:.4s" x="${cx + 12}" y="${Y(IFY.START_AGE) + 4}" font-size="11.5" fill="#6E6A5E">22 岁 · ${IFY.esc(IFY.S.route.name)}</text>`);
    g += `<circle cx="${cx}" cy="${Y(end)}" r="4.5" fill="#2F4A3C"/>`;
    labels.push(`<text class="maplab" style="--bd2:${(GROW_DELAY + GROW_S + 0.1).toFixed(2)}s" x="${cx - 12}" y="${Y(end) + 4}" font-size="11.5" fill="#6E6A5E" text-anchor="end">${end} 岁</text>`);
    if (end < IFY.MAX_AGE) labels.push(`<text x="${cx + 12}" y="${Y(IFY.MAX_AGE) + 4}" font-size="11" fill="#A39C8B">80 岁</text>`);
    // 差一步剪影层（v0.20.0 M2）：空心虚线圈 + 既有灰的虚线支，与已走节点（实心松绿）可区分；不新造配色
    nearMisses().forEach((n, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const y0 = Y(Math.min(n.age, IFY.MAX_AGE));
      const dx = side * 84, dy = n.kind === "ending" ? -34 : 30;
      const yy = Math.max(Y(IFY.START_AGE) + 8, Math.min(Y(IFY.MAX_AGE) - 4, y0 + dy));
      g += `<path class="mapbranch" style="--bd:${(GROW_DELAY + GROW_S + 0.15 + i * 0.09).toFixed(2)}s" d="M ${cx} ${y0} Q ${cx + dx * 0.72} ${(y0 + yy) / 2} ${cx + dx} ${yy}" fill="none" stroke="#8A948C" stroke-width="1.5" stroke-dasharray="3 4" stroke-linecap="round" opacity=".6"/><circle class="mapnear" cx="${cx + dx}" cy="${yy}" r="4" fill="none" stroke="#8A948C" stroke-width="1.5" stroke-dasharray="3 3" opacity=".75"/>`;
      const lab = n.kind === "ending" ? `差一步 · ${n.title}：${n.miss}` : `差一步 · ${n.age} 岁：${n.miss}`;
      labels.push(`<text class="maplab" style="--bd2:${(GROW_DELAY + GROW_S + 0.25 + i * 0.09).toFixed(2)}s" x="${cx + dx + (side === 1 ? 9 : -9)}" y="${yy + 4}" font-size="11" fill="#A39C8B" text-anchor="${side === 1 ? "start" : "end"}">${IFY.esc(fitW(lab))}</text>`);
    });
    return `<div class="mapwrap" id="mapwrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="这一生的分岔图">${g}${labels.join("")}</svg></div>`;
  }

  // 「活过的人生」记录页（§B3）：已活到的给名与日期，未活到的只给一句线索；无完成度、无稀有度、无奖励（§B2.4 禁止项）
  function renderLives() {
    IFY.curKind = "lives";
    IFY.clearAutoContext();
    IFY.app().classList.remove("playwrap");
    const rec = IFY.loadLives();
    const lived = (list, key) => list.filter((x) => rec[key][x.id]).sort((a, b) => (rec[key][a.id] < rec[key][b.id] ? -1 : 1));
    const unlived = (list, key) => list.filter((x) => !rec[key][x.id]);
    const le = lived(IFY.D.endings, "endings"), ue = unlived(IFY.D.endings, "endings");
    const lr = lived(IFY.D.rare, "rares"), ur = unlived(IFY.D.rare, "rares");
    IFY.app().innerHTML = `<section class="card">
      <h2>你活过的人生</h2>
      <p>结局活过 ${le.length} 种，稀有际遇撞过 ${lr.length} 件。每一种，都只是众多人生里的一种。</p>
      <h3>结局</h3>
      ${le.map((e) => `<p class="liverow"><b>${IFY.esc(e.title)}</b><span>${IFY.esc(rec.endings[e.id])}</span></p>`).join("")}
      ${ue.map((e) => `<p class="clue">${IFY.esc(e.clue || "")}</p>`).join("")}
      <h3>稀有际遇</h3>
      ${lr.map((r) => `<p class="liverow"><b>${IFY.esc(r.label || r.name)}</b><span>${IFY.esc(rec.rares[r.id])}</span></p>`).join("")}
      ${ur.map((r) => `<p class="clue">${IFY.esc(r.clue || "")}</p>`).join("")}
      <p class="hint">这份记录只存在这台设备的浏览器里，清掉浏览器数据就没了。</p>
      <div class="row">
        <button class="ghost" id="backstart">回开局</button>
        <button class="ghost" id="clearlives">清空记录</button>
      </div>
    </section>`;
    IFY.el("backstart").addEventListener("click", IFY.renderStart);
    let armed = false;
    IFY.el("clearlives").addEventListener("click", () => {
      if (!armed) { armed = true; IFY.el("clearlives").textContent = "再点一次，真的清空"; return; }
      try { localStorage.removeItem(IFY.LIVES_KEY); } catch (e) {}
      IFY.livesCache = { v: 1, endings: {}, rares: {} };
      renderLives();
    });
  }

  // ---------- 子女在场判定（v0.20.1 返修，审计 run-02）：「孩子在跟前长大」类句子要有孩子实际出场记录 ----------
  // 口径：账本（S.ledger）里 kind=event/rare/proc 的记录，其条目定义带 kids=has 状态门
  // （state 或 stateAll 的 kids 含 has）或带 kidMin 门，且落账年龄在孩子长大期间
  // （kidsAt 起 18 年内；kidsAt 缺失的旧存档回落为不限年）——计数 ≥1 才算在场。
  // run-02 的形状正是反例：39–58 岁零出场、59 岁才冒出来买房（那时孩子按账已成年），不算「在跟前长大」。
  function kidPresenceCount() {
    const led = Array.isArray(IFY.S.ledger) ? IFY.S.ledger : [];
    if (!led.length || !IFY.D || !Array.isArray(IFY.D.events)) return 0;
    const byId = new Map(IFY.D.events.map((e) => [e.id, e]));
    const kidsAt = typeof IFY.S.kidsAt === "number" ? IFY.S.kidsAt : null;
    let n = 0;
    for (const e of led) {
      if (e.kind !== "event" && e.kind !== "rare" && e.kind !== "proc") continue;
      const def = byId.get(e.id);
      if (!def) continue;
      const gateHas = (o) => o && o.kids !== undefined && [].concat(o.kids).includes("has");
      if (!gateHas(def.state) && !gateHas(def.stateAll) && def.kidMin == null) continue;
      if (kidsAt != null && typeof e.age === "number" && e.age - kidsAt > 18) continue;
      n++;
    }
    return n;
  }

  // ---------- 结算九槽（v0.18.0，地基 §4.6/§4.7）：九个槽位全读状态与账本拼装 ----------
  // 落脚/陪伴/钱/手艺事业/子女线/父母线/没办完的事/影子代价/认领句；认领句（玩家在瞥视时留下的话）原样入槽；
  // 判词退为九槽之后的收尾一行。平淡轨（没撞上什么大事的一生）在认领槽有「平淡而完整」的写法。
  function settlementSlots() {
    const F = IFY.S.flags, ST = IFY.S.state || {};
    const trail = IFY.residenceTrail();
    const slots = [];
    let s1;
    if (trail.final === "home" && trail.spans.city + trail.spans.abroad >= 5) s1 = `在外头住了${trail.spans.city + trail.spans.abroad}年，最后还是回了老家落脚。`;
    else if (trail.final === "abroad") s1 = `最后落脚在异国，在那边住了${trail.spans.abroad}年。`;
    else if (trail.final === "city" && IFY.S.route && IFY.S.route.id === "home") s1 = `后来出了家乡，在外头落了脚，一住${trail.spans.city}年。`;
    else if (trail.final === "home") s1 = "最后落脚在老家这边，住的还是熟门熟路的地方。";
    else s1 = "最后落脚在住惯了的这座城。";
    slots.push(["落脚", s1]);
    let s2;
    if (ST.spouse === "partnered") s2 = "另一半陪着走到了最后。吵过，也和好过，饭还是一起吃。";
    else if (ST.spouse === "widowed") s2 = "另一半先走了一步。最后一段路，是自己走完的。";
    else if (ST.spouse === "divorced") s2 = "中间那段婚姻散了。后来的日子，各过各的。";
    else if (ST.spouse === "dating") s2 = "身边一直有个人，没领证，也没散，就这么处到了老。";
    else if (ST.spouse === "single") s2 = "这一生没和谁凑成一对。日子自己过，饭自己吃，也过来了。";
    else s2 = "没遇上要凑成一对的人。一个人，也把日子过完了。";
    slots.push(["陪伴", s2]);
    const m = IFY.S.stats.money;
    let s3;
    if (F.bought_house) s3 = m >= 60 ? "房子供下来了，手里还留着余钱，够花。" : "供下了一套房，钱多半填进了房子里，日子紧巴巴地过。";
    else if (m >= 70) s3 = "没买房，手里的钱倒是攒下了，够用，还有富余。";
    else if (m >= 40) s3 = "钱不多不少，够日常开销。遇上大事帮不上，小日子能过。";
    else if (m >= 20) s3 = "手头一直紧。钱这事，操心了一辈子。";
    else s3 = "到最后也没攒下什么。好在饭还吃得上，觉还睡得着。";
    slots.push(["钱", s3]);
    const g = IFY.S.stats.growth;
    const occ = occupationTrail(); // v0.20.0 M2：事业槽先读职业轨迹——「一辈子就干这一行」只许真单一行当贯穿的局出
    let s4;
    if (F.traj_ipo || F.traj_funded) s4 = "事业做到过上市那一步，锣声听过，名字也上过报。";
    else if (F.side_business || F.side_job || F.side_start) s4 = g >= 60 ? "正职之外还干出过一份副业，后来成了日子里的一块。" : "正职之外试过副业，成没成另说，手没闲着。";
    else if (g >= 75) s4 = occ.none ? "手里的事干到了顶。碰上难事，身边的人会先来问你。" : "手里的活儿干到了顶。行里的人碰上难事，会来问你。";
    else if (g >= 50) s4 = occ.drift ? "干过的活儿不止一样。中间换过行当，新活儿从头学起，饭碗换了几次，都端住了。" : occ.single ? "一辈子就干这一行。活儿拿得出手，饭吃得安稳。" : "手里的活儿拿得出手，饭吃得安稳。";
    else if (g >= 30) s4 = "活儿干得不算出色，胜在没出过大错。一天一天，也就过来了。";
    else s4 = "没在活儿上争过什么高低。日子过得平，活儿也干得平。";
    slots.push(["手艺事业", s4]);
    let s5;
    if (F.late_parent) s5 = "孩子来得晚。别人抱孙辈的年纪，你还在给孩子开家长会。";
    else if (ST.kids === "has") s5 = F.kid_abroad ? "孩子大了，去了远方。逢年过节，电话那头热闹。" : kidPresenceCount() >= 1 ? "孩子在跟前长大，一年一年，也长成了大人。" : "孩子的事落定之后，日子还是照常往下过。逢年过节，电话里多说几句。";
    else if (ST.kids === "none") s5 = IFY.S.covenant && IFY.S.covenant.kind === "none" ? "孩子的事，38 岁那年就定下了：不要。后来照着这个安排过。" : "这一生没要孩子。屋里清静，日子是另一种过法。";
    else s5 = "孩子的事一直没正式定下来。拖着拖着，就到了这岁数。";
    slots.push(["子女", s5]);
    const dadD = ST.dad === "dead", momD = ST.mom === "dead";
    let s6;
    if (dadD && momD) s6 = F.care_self ? "爸妈都送走了。需要人那几年，你回去陪过一阵。" : F.care_hired ? "爸妈都送走了。走之前请了人照护，你管钱，也管事。" : F.care_rotate ? "爸妈都送走了。需要人那几年，兄妹几个排着班，一人陪一段。" : "爸妈都送走了。最后那一程，赶上了。";
    else if (dadD) s6 = "爸先走了，妈还在。逢年过节，先给妈打电话。";
    else if (momD) s6 = "妈先走了，爸还在。老两口剩一个，屋里空了一半。";
    else s6 = "到这一生走完，爸妈都还健在。这样的情形，不多。";
    slots.push(["父母", s6]);
    let s7;
    if (F.cov_solo_done && ST.kids === "undecided") s7 = "38 岁挂起的那份账，45 岁你一个人对完了。孩子的事没落定，可那份约不算悬着了。";
    else if (IFY.S.covenant && IFY.S.covenant.kind === "wait" && ST.kids === "undecided") s7 = "38 岁挂起的那份账，到最后也没正式对完。";
    else if (F.late_tried && !F.late_parent) s7 = "想要孩子那几年，试过，也跑过医院，最后没等来。这事放下了，就是偶尔还想起。";
    else if ((IFY.playerMeta().glimpsesSkipped || 0) >= 2) s7 = "另一条路有几回摆在眼前，你都没去细看。不知道的，就让它不知道下去。"; // v0.21 WP1：瞥视计数改读 session.meta（蓝图 3.1）
    else if (F.renting && !F.bought_house) s7 = "买房的事提过几回，最后没办成，一直租着住。";
    else s7 = "没什么悬着的大事。该办的办了，办不了的，也放下了。";
    slots.push(["没办完的事", s7]);
    const mainU = (IFY.S.unchosen || []).find((u) => u.kind === "route");
    const sh = mainU && IFY.D.shadows ? IFY.D.shadows[mainU.id] : null;
    const cost = sh ? IFY.shadowCostText(sh).replace(/^代价也清楚：/, "") : "";
    slots.push(["另一条路", cost ? `没走的那条路，代价在那边：${cost}` : "没走的那几条路，各有各的走法，没法放在一起称。"]);
    const reflArr = IFY.playerMeta().reflections || []; const refl = reflArr.length ? reflArr[reflArr.length - 1].text : ""; // v0.21 WP1：第九槽 reflections 改读 session.meta（蓝图 3.1）
    const flatLife = !(IFY.S.usedRare || []).length && (Array.isArray(IFY.S.ledger) ? IFY.S.ledger.filter((e) => e.kind === "event").length : 99) < 30;
    slots.push(["你留的话", refl ? `「${refl}」` : flatLife ? "这一生没留下认领的话。平淡是平淡，可一年一年都是真的——平淡，也是完整的一生。" : "这一生没留下认领的话。就这么走完了。"]);
    return slots;
  }

  function renderEnd() {
    IFY.curKind = "end";
    IFY.clearAutoContext();
    IFY.app().classList.remove("playwrap");
    IFY.clearSave();
    const v = verdict();
    const sp = specialEnding();
    IFY.S.special = sp;
    IFY.ANA.track("game_complete", { era: IFY.S.era, route: IFY.S.route.id, endAge: IFY.finalAge(), death: !!IFY.S.death, ending: sp ? sp.id : "none", tier: sp ? sp.tier : "none" });
    const livesNew = IFY.recordLives(sp ? sp.id : null, IFY.S.usedRare || []); // 活过记录：落盘 + 本局新纪录（§B3）
    IFY.recordDayAndLife(); // 留存记录（v0.15.0）：日子表 + 最近一局回看，与活过记录同一落点、互不相干
    const shadowLines = IFY.shadowCompareLines();
    const covLine = IFY.covenantSettleLine(); // fork38 立约的结算对账行（v0.17.0）：没有立过约就不出
    // 自动推进提示（v0.17.0 定案）：默认关的玩家，完局后只在这页提示一次可开平年自动；提示过就落 prefs，不再重复
    const showAutoHint = IFY.prefs.mode === "off" && !IFY.prefs.autoHintSeen;
    if (showAutoHint) { IFY.prefs.autoHintSeen = true; IFY.savePrefs(); }
    const skippedLine = IFY.playerMeta().glimpsesSkipped ? `<p>你有 ${IFY.playerMeta().glimpsesSkipped} 次没有去细看另一条路。这样也好，有些事不知道，更睡得着。</p>` : ""; // v0.21 WP1：瞥视计数改读 meta
    const reflHtml = IFY.playerMeta().reflections.length
      ? `<h3>你留给自己的话</h3>` + IFY.playerMeta().reflections.map((r) => `<p class="refl">「${IFY.esc(r.text)}」（${r.age} 岁）</p>`).join("") : ""; // v0.21 WP1：reflections 改读 meta
    IFY.app().innerHTML = `<section class="card">${IFY.head(null, true)}
      <div class="rev" style="--d:0s">
      <h2>${IFY.finalAge()} 岁 · 这一局走完了</h2>
      ${IFY.S.death ? `<p>这一生停在了 ${IFY.S.death.age} 岁：${IFY.esc(IFY.S.death.text)}</p>` : ""}
      ${sp ? `<div class="special"><p class="rare-tag">${IFY.TIER_LABEL[sp.tier]}</p><p class="special-title">${IFY.esc(sp.title)}</p><p>${IFY.esc(sp.text)}</p></div>` : ""}
      </div>
      <div class="rev" style="--d:.12s">
      <p class="lifetags">${IFY.esc(lifeTags())}</p>
      ${settlementSlots().map(([k, t]) => `<p class="slotline"><span class="slotk">${IFY.esc(k)}</span>${IFY.esc(t)}</p>`).join("")}
      <p class="verdict">${IFY.esc(v.text)}</p>
      <p>你走了这条路：${IFY.esc(IFY.S.route.name)}。</p>
      ${covLine ? `<p>${IFY.esc(covLine)}</p>` : ""}
      </div>
      <div class="rev" style="--d:.24s">
      ${livesNew.newEnding ? `<p class="livesnew">这种人生，你第一次活到。</p>` : (livesNew.newRare ? `<p class="livesnew">这件稀罕事，你这回头一次撞上。</p>` : "")}
      ${shadowLines.main ? `<p>${IFY.esc(shadowLines.main)}</p>` : ""}
      ${shadowLines.others.length ? `<h3>其他几条路</h3>${shadowLines.others.map((line) => `<p>${IFY.esc(line)}</p>`).join("")}` : ""}
      ${skippedLine}
      ${reflHtml}
      </div>
      ${settlementMapHtml()}
      <div class="rev" style="--d:.55s">
      <h3>这一生，年表</h3>
      <div class="timeline">${IFY.S.log.map((l) => { const m = l.match(/^(\d+) 岁 · ([\s\S]*)$/); const yr = m && IFY.S.birthYear ? `${IFY.S.birthYear + (+m[1])} 年 · ` : ""; return `<p>${IFY.esc(yr + l)}</p>`; }).join("")}</div>
      </div>
      <div class="row">
        <button class="ghost" id="copylink">复制同局链接（给朋友玩同一种子）</button>
      </div>
      <div class="sharedesk">
        <h3>把这一生寄出去</h3>
        <label class="refl-label">给这一生留一句话（可选）
          <input id="shareline" type="text" maxlength="60" placeholder="一句就好，会出现在发帖文案的开头" value="${IFY.playerMeta().reflections.length ? IFY.esc(IFY.playerMeta().reflections[0].text) : ""}">
        </label>
        <label class="refl-label"><input type="checkbox" id="cardrefl"> 把这句话印到分享卡上（只有你勾选才会印）</label>
        <p class="setlab">卡面</p>
        <div class="segpicks" id="cardtype">
          <button type="button" class="segbtn sel" data-type="verdict"><b>判词卡</b><small>判词 + 分岔路图 + 六维</small></button>
          <button type="button" class="segbtn" data-type="log"><b>流水账卡</b><small>公元年轴 + 关键节点 + 六维</small></button>
        </div>
        <p class="setlab">尺寸</p>
        <div class="segpicks" id="cardratio">
          <button type="button" class="segbtn sel" data-ratio="45">4:5</button>
          <button type="button" class="segbtn" data-ratio="916">9:16</button>
        </div>
        <div class="cardpreview" id="cardpreview"></div>
        <div class="row">
          <button class="primary" id="share">分享这张卡</button>
          <button class="ghost" id="saveimg">保存图片</button>
          <button class="ghost" id="copytext">复制发帖文案</button>
        </div>
        <details class="sharetext">
          <summary>发帖文案预览</summary>
          <p class="sharetext-body" id="sharetext"></p>
        </details>
      </div>
      <div class="row">
        <button class="primary" id="again-same">同种子再来一局（换选择）</button>
        <button class="ghost" id="again-new">随机种子新开一局</button>
      </div>
      ${showAutoHint ? `<p class="hint">这一局是手动过完的。开局页和游戏里都能把「自动推进」设成平年——没有抉择的年份会自己往前走，分岔和要紧事还是会停下来等你。</p>` : ""}
      <p class="hint">种子码：${IFY.esc(IFY.S.seedStr)}。朋友打开同局链接，就是和你完全相同的运气——他选得不一样，会走成什么样？</p>
    </section>`;
    IFY.finishRender();
    // §1.2/§9.2 揭示与生长都可跳过：点结算页任意处立即全显
    const endSec = IFY.app().querySelector("section.card");
    if (endSec) endSec.addEventListener("click", () => {
      endSec.classList.add("shown");
      const mw = IFY.el("mapwrap"); if (mw) mw.classList.add("shown");
    });
    IFY.el("again-same").addEventListener("click", () => location.assign(IFY.sameSeedUrl()));
    IFY.el("again-new").addEventListener("click", () => location.assign(location.pathname));
    IFY.el("copylink").addEventListener("click", async () => {
      IFY.ANA.track("share_click", { action: "copy_link" });
      const url = IFY.sameSeedUrl();
      try { await navigator.clipboard.writeText(url); IFY.el("copylink").textContent = "已复制，去发给他"; }
      catch (e) { IFY.el("copylink").textContent = url; }
    });
    // ---------- 分享台接线：切换版式/尺寸即重绘预览 ----------
    let cardType = "verdict", cardRatio = "45";
    const refreshCard = () => {
      IFY.currentCanvas = IFY.buildCard(cardType, cardRatio);
      IFY.currentCanvas.className = "card-img";
      const box = IFY.el("cardpreview");
      box.innerHTML = "";
      box.appendChild(IFY.currentCanvas);
      IFY.el("sharetext").textContent = IFY.shareCopy();
    };
    const pickDesk = (id, isType) => {
      const box = IFY.el(id);
      box.querySelectorAll(".segbtn").forEach((b) => b.addEventListener("click", () => {
        box.querySelectorAll(".segbtn").forEach((o) => o.classList.remove("sel"));
        b.classList.add("sel");
        if (isType) cardType = b.dataset.type; else cardRatio = b.dataset.ratio;
        refreshCard();
      }));
    };
    pickDesk("cardtype", true);
    pickDesk("cardratio", false);
    IFY.el("shareline").addEventListener("input", () => {
      IFY.el("sharetext").textContent = IFY.shareCopy();
      if (IFY.el("cardrefl").checked) refreshCard(); // 勾选了印卡，改字要即时重绘
    });
    IFY.el("cardrefl").addEventListener("change", refreshCard);
    IFY.el("share").addEventListener("click", () => { IFY.ANA.track("share_click", { action: "share" }); IFY.shareCurrent(); });
    IFY.el("saveimg").addEventListener("click", () => { IFY.ANA.track("share_click", { action: "save_image" }); IFY.downloadCurrent(); });
    IFY.el("copytext").addEventListener("click", async () => {
      IFY.ANA.track("share_click", { action: "copy_text" });
      try { await navigator.clipboard.writeText(IFY.shareCopy()); IFY.el("copytext").textContent = "已复制，去粘贴吧"; }
      catch (e) { IFY.el("copytext").textContent = "复制失败，展开下面的文案预览手动复制"; }
    });
    refreshCard();
  }
  Object.assign(IFY, { verdict, lifeTags, specialEnding, settlementMapHtml, renderLives, settlementSlots, renderEnd, occupationTrail, kidPresenceCount, nearMisses, chosenOfFork });
})(window.IFY);
