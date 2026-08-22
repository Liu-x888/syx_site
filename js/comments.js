/* ============ 留言板（演示模式） ============
 * 当前为演示模式：留言和点赞保存在“访客自己的浏览器”里，
 * 之后接入 Supabase 云端后，所有访客的留言会互通。
 * 存储适配器集中在底部，方便以后替换成云端版本。
 */
(function () {
  "use strict";

  var STORAGE_KEY = "yaxuan_comments_v1";
  var LIKED_KEY = "yaxuan_liked_v1";
  var COOLDOWN_KEY = "yaxuan_cd_v1";
  var COOLDOWN_MS = 30000; /* 30 秒防刷 */

  /* 敏感词过滤（可自行增删） */
  var BANNED = ["垃圾广告", "加微信", "加vx", "赌博", "贷款", "代刷", "传销"];

  var SEED = [
    { id: "s1", text: "轩轩唱歌真的太好听了，人鱼主唱名不虚传！🫧", likes: 128, createdAt: Date.now() - 1000 * 60 * 60 * 26 },
    { id: "s2", text: "第一次认识他是《王牌对王牌》，笑容太治愈了，从此入坑~", likes: 96, createdAt: Date.now() - 1000 * 60 * 60 * 20 },
    { id: "s3", text: "《spr.》单曲循环一整天！春日限定也太好听了吧 🌸", likes: 74, createdAt: Date.now() - 1000 * 60 * 60 * 8 },
    { id: "s4", text: "希望轩轩越来越好，小海螺永远陪着你 💙", likes: 53, createdAt: Date.now() - 1000 * 60 * 60 * 3 }
  ];

  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- 存储适配器：演示版（本机） ---------- */
  var store = {
    load: function () {
      var list = read(STORAGE_KEY, null);
      if (!list || !list.length) {
        list = SEED.slice();
        write(STORAGE_KEY, list);
      }
      return list;
    },
    save: function (list) { write(STORAGE_KEY, list); },
    likedIds: function () { return read(LIKED_KEY, []); },
    saveLiked: function (ids) { write(LIKED_KEY, ids); }
  };
  /* 以后接入云端时，把上面的 store 换成 fetch 请求即可 */

  /* ---------- 工具 ---------- */
  function uid() { return "c" + Date.now() + Math.random().toString(36).slice(2, 7); }

  function fmtTime(t) {
    var diff = Date.now() - t;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return Math.floor(diff / 60000) + " 分钟前";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " 小时前";
    if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + " 天前";
    var d = new Date(t);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
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

  /* ---------- 页面元素 ---------- */
  var form = document.getElementById("cmtForm");
  var textarea = document.getElementById("cmtInput");
  var countEl = document.getElementById("cmtCount");
  var listEl = document.getElementById("cmtList");
  var sortBtns = document.querySelectorAll(".sort-btn");
  var charHint = document.getElementById("charHint");
  if (!form) return;

  var comments = store.load();
  var likedIds = store.likedIds();
  var sort = "new"; /* new 最新 / hot 最热 */

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
      var liked = likedIds.indexOf(c.id) > -1;
      return '<article class="cmt card"><div class="cmt-head"><span class="avatar">🎧</span><span class="anon">匿名小海螺</span><span class="time">' + fmtTime(c.createdAt) + "</span></div>" +
        '<div class="cmt-text">' + escapeHtml(c.text) + "</div>" +
        '<div class="cmt-foot"><button class="like-btn' + (liked ? " liked" : "") + '" data-id="' + c.id + '">' + (liked ? "❤️" : "🤍") + ' 赞 <span class="cnt">' + c.likes + "</span></button></div></article>";
    }).join("");

    /* 重新绑定点赞 */
    listEl.querySelectorAll(".like-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.id;
        var c = comments.filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        var idx = likedIds.indexOf(id);
        if (idx > -1) {
          likedIds.splice(idx, 1);
          c.likes = Math.max(0, c.likes - 1);
        } else {
          likedIds.push(id);
          c.likes += 1;
        }
        store.save(comments);
        store.saveLiked(likedIds);
        render();
      });
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* 发送 */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var lastCd = read(COOLDOWN_KEY, 0);
    var wait = COOLDOWN_MS - (Date.now() - lastCd);
    if (wait > 0) {
      alert("发送太频繁啦，请 " + Math.ceil(wait / 1000) + " 秒后再试～");
      return;
    }
    var check = filterText(textarea.value);
    if (!check.ok) {
      alert(check.msg);
      return;
    }
    comments.unshift({ id: uid(), text: check.text, likes: 0, createdAt: Date.now() });
    store.save(comments);
    write(COOLDOWN_KEY, Date.now());
    textarea.value = "";
    charHint.textContent = "0 / 200";
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
      sort = btn.dataset.sort;
      sortBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      render();
    });
  });

  render();
})();
