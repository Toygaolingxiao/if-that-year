/* 《如果那年》匿名埋点模块（v0.13.1）——默认关闭。事件表、开关方法与隐私口径见 docs/ANALYTICS.md。
   关闭时零网络、零行为变化：track() 立即返回，不入队、不读游戏状态、不碰主 RNG、不写任何存档。
   开启方式：部署方在加载本文件之前设置 window.IFY_ANALYTICS = { enabled: true, endpoint: "https://…" }；
   发送实现可插拔（cfg.send(endpoint, bodyString)），缺省走 navigator.sendBeacon、回落 fetch(keepalive)。
   收集口径：只有事件名与游戏内分类字段（年代/路线/年龄/结局类别），无种子原文、无玩家输入、无设备标识。 */
(function () {
  "use strict";
  var cfg = (typeof window !== "undefined" && window.IFY_ANALYTICS) || {};
  var enabled = cfg.enabled === true && typeof cfg.endpoint === "string" && cfg.endpoint.length > 0;
  var queue = [];
  var FLUSH_N = 10; // 攒满 10 条批量发送一次；页面隐藏时也会冲刷

  function send(batch) {
    if (!enabled || !batch.length) return;
    var body = JSON.stringify({ v: 1, sentAt: new Date().toISOString(), events: batch });
    try {
      if (typeof cfg.send === "function") { cfg.send(cfg.endpoint, body); return; } // 可插拔发送实现（如自建收集端）
      if (typeof navigator !== "undefined" && navigator.sendBeacon && navigator.sendBeacon(cfg.endpoint, body)) return;
      fetch(cfg.endpoint, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(function () {});
    } catch (e) { /* 埋点失败绝不影响游戏 */ }
  }
  function flush() { if (queue.length) { var b = queue; queue = []; send(b); } }

  var api = {
    enabled: enabled,
    track: function (name, props) {
      if (!enabled) return; // 关闭即无操作
      var ev = { name: name, at: new Date().toISOString() };
      if (props) for (var k in props) ev[k] = props[k];
      queue.push(ev);
      if (queue.length >= FLUSH_N) flush();
    },
    flush: flush
  };
  if (typeof window !== "undefined") {
    window.GAME_ANALYTICS = api;
    if (enabled) {
      window.addEventListener("pagehide", flush);
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });
    }
  }
})();
