/* ============ 互动留言板（本地轻量版） ============
 * - 固定显示 10 条原始评论
 * - 访客可匿名发表留言，本页立即显示，有互动感
 * - 留言与点赞不会被保存：刷新页面后恢复为最初的 10 条
 * - 自带 10 秒防刷和敏感词过滤
 * 优点：零成本、零外部服务、好维护；以后想升级成"云端互通"再告诉我即可。
 */
(function () {
  "use strict";

  var COOLDOWN_MS = 10000; /* 10 秒防刷 */
  var BANNED = ["垃圾广告", "加微信", "加vx", "赌博", "贷款", "代刷", "传销"];

  var now = Date.now();
  var H = 3600000, D = 86400000;
  var SEED = [
    { id: "seed1",  text: "轩轩唱歌真的太好听了，人鱼主唱名不虚传！🫧", likes: 128, createdAt: now - 26 * H },
    { id: "seed2",  text: "第一次认识他是《王牌对王牌》，笑容太治愈了，从此入坑~", likes: 96, createdAt: now - 20 * H },
    { id: "seed3",  text: "《spr.》单曲循环一整天！春日限定也太好听了吧 🌸", likes: 74, createdAt: now - 8 * H },
    { id: "seed4",  text: "希望轩轩越来越好，小海螺永远陪着你 💙", likes: 53, createdAt: now - 3 * H },
    { id: "seed5",  text: "舞台上的亚轩闪闪发光，谁看了不迷糊啊！", likes: 41, createdAt: now - 26 * H - 2 * D },
    { id: "seed6",  text: "西装亚轩 yyds，妈呀也太帅了吧 😭", likes: 33, createdAt: now - 40 * H },
    { id: "seed7",  text: "看完《这是我的岛》彻底入坑，真实又可爱！", likes: 27, createdAt: now - 2 * D },
    { id: "seed8",  text: "声音太治愈了，晚上睡觉都在听他的歌 🎧", likes: 19, createdAt: now - 3 * D },
    { id: "seed9",  text: "从《音乐大师课》就喜欢上的小男孩，长大了更优秀！", likes: 14, createdAt: now - 4 * D },
    { id: "seed10", text: "《万水朝东》的话剧首秀超棒，期待更多作品！", likes: 8, createdAt: now - 5 * D }
  ];

  var comments = SEED.slice(); /* 初始 10 条原始评论 */
  var liked = {};              /* 本次浏览内点过赞的留言 id */
  var lastPost = 0;
  var sort = "new";
  var seq = 0;

  var form = document.getElementById("cmtForm");
  var textarea = document.getElementById("cmtInput");
  var countEl = document.getElementById("cmtCount");
  var listEl = document.getElementById("cmtList");
  var sortBtns = document.querySelectorAll(".sort-btn");
  var charHint = document.getElementById("charHint");
  var postTip = document.getElementById("postTip");
  if (!form) return;

  function uid() { seq += 1; return "c" + Date.now() + "_" + seq; }

  function fmtTime(t) {
    var diff = Date.now() - t;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + " 天前";
    var d = new Date(t);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function filterText(text) {
    var t = text.trim();
    if (!t) return { ok: false, msg: "先写点什么再发送吧～" };
    if (t.length > 200) return { ok: false, msg: "留言最长 200 字哦" };
    for (var i = 0; i < BANNED.length; i++) {
      if (t.indexOf(BANNED[i]) > -1) return { ok: false, msg: "留言包含敏感内容，已被拦截" };
    }
    return { ok: true, text: t };
  }

  function showTip(msg) {
    if (!postTip) return;
    postTip.textContent = msg;
    postTip.style.display = "";
    clearTimeout(showTip._t);
    showTip._t = setTimeout(function () { postTip.style.display = "none"; }, 3500);
  }

  function render() {
    var sorted = comments.slice().sort(function (a, b) {
      return sort === "hot" ? b.likes - a.likes || b.createdAt - a.createdAt : b.createdAt - a.createdAt;
    });
    countEl.textContent = "共 " + comments.length + " 条留言";
    if (!sorted.length) {
      listEl.innerHTML = '<div class="empty">还没有留言，来抢沙发吧～</div>';
      return;
    }
    listEl.innerHTML = sorted.map(function (c) {
      var isLiked = !!liked[c.id];
      return '<article class="cmt card"><div class="cmt-head"><span class="avatar">🎧</span><span class="anon">匿名小海螺</span><span class="time">' + fmtTime(c.createdAt) + "</span></div>" +
        '<div class="cmt-text">' + escapeHtml(c.text) + "</div>" +
        '<div class="cmt-foot"><button class="like-btn' + (isLiked ? " liked" : "") + '" data-id="' + c.id + '">' + (isLiked ? "❤️" : "🤍") + ' 赞 <span class="cnt">' + c.likes + "</span></button></div></article>";
    }).join("");

    listEl.querySelectorAll(".like-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.id;
        if (liked[id]) return;
        liked[id] = true;
        for (var i = 0; i < comments.length; i++) {
          if (comments[i].id === id) { comments[i].likes += 1; break; }
        }
        render();
      });
    });
  }

  /* 发送留言（仅本页显示，不保存） */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var wait = COOLDOWN_MS - (Date.now() - lastPost);
    if (wait > 0) {
      showTip("发送太频繁啦，请 " + Math.ceil(wait / 1000) + " 秒后再试～");
      return;
    }
    var check = filterText(textarea.value);
    if (!check.ok) { showTip(check.msg); return; }
    comments.unshift({ id: uid(), text: check.text, likes: 0, createdAt: Date.now() });
    lastPost = Date.now();
    textarea.value = "";
    if (charHint) charHint.textContent = "0 / 200";
    showTip("✅ 留言已发布");
    render();
  });

  /* 字数提示 */
  if (textarea && charHint) {
    textarea.addEventListener("input", function () {
      charHint.textContent = textarea.value.length + " / 200";
      if (textarea.value.length > 200) charHint.style.color = "#d9534f";
      else charHint.style.color = "";
    });
  }

  /* 排序切换 */
  sortBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (sort === btn.dataset.sort) return;
      sort = btn.dataset.sort;
      sortBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      render();
    });
  });

  render();
})();
