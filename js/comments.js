/* ============ 互动留言板 v2 ============
 * 两种模式（自动切换）：
 * 1) 云端正式模式：把 Supabase 的 URL 和 anon key 填进下方 CONFIG，
 *    留言就会存到云端数据库，所有访客的留言互通；采用"分页加载"，
 *    页面每次只渲染一页（默认 20 条），想看更多点"加载更多"，
 *    所以即使有几千条评论，网页内存占用也非常小、不会卡。
 * 2) 演示模式：没填配置时自动用本机浏览器存储，仅供预览体验。
 */
(function () {
  "use strict";

  /* ============ 配置区：接入云端时在这里填 ============ */
  var CONFIG = {
    supabaseUrl: "",   // 例：https://xxxx.supabase.co（Supabase 项目 URL）
    supabaseKey: "",   // 例：eyJhbGciOi...（anon public key）
    pageSize: 20       // 每页条数（分页省内存的关键，可按需调整）
  };
  /* ================================================== */

  var COOLDOWN_MS = 30000; /* 30 秒防刷 */
  var BANNED = ["垃圾广告", "加微信", "加vx", "赌博", "贷款", "代刷", "传销"];

  var DEMO_KEY = "yaxuan_comments_v1";
  var LIKED_KEY = "yaxuan_liked_v1";
  var COOLDOWN_KEY = "yaxuan_cd_v1";

  var SEED = [
    { id: "s1", text: "轩轩唱歌真的太好听了，人鱼主唱名不虚传！🫧", likes: 128, createdAt: Date.now() - 1000 * 60 * 60 * 26 },
    { id: "s2", text: "第一次认识他是《王牌对王牌》，笑容太治愈了，从此入坑~", likes: 96, createdAt: Date.now() - 1000 * 60 * 60 * 20 },
    { id: "s3", text: "《spr.》单曲循环一整天！春日限定也太好听了吧 🌸", likes: 74, createdAt: Date.now() - 1000 * 60 * 60 * 8 },
    { id: "s4", text: "希望轩轩越来越好，小海螺永远陪着你 💙", likes: 53, createdAt: Date.now() - 1000 * 60 * 60 * 3 }
  ];

  function isCloud() {
    return !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
  }
  function read(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function uid() { return "c" + Date.now() + Math.random().toString(36).slice(2, 7); }
  function authHeaders() {
    return { "apikey": CONFIG.supabaseKey, "Authorization": "Bearer " + CONFIG.supabaseKey };
  }
  function mapRow(r) {
    return { id: r.id, text: r.text, likes: r.likes, createdAt: new Date(r.created_at).getTime() };
  }
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

  /* ---------- 云端适配器（Supabase REST，分页） ---------- */
  var cloudStore = {
    list: function (sort, page) {
      var order = sort === "hot" ? "likes.desc,created_at.desc" : "created_at.desc";
      var url = CONFIG.supabaseUrl + "/rest/v1/comments?select=id,text,likes,created_at&order=" +
        encodeURIComponent(order) + "&limit=" + CONFIG.pageSize + "&offset=" + ((page - 1) * CONFIG.pageSize);
      return fetch(url, { headers: Object.assign({ "Prefer": "count=exact" }, authHeaders()) })
        .then(function (res) {
          if (!res.ok) throw new Error("读取留言失败");
          var total = 0;
          var range = res.headers.get("content-range") || "";
          var m = range.match(/\/(\d+)\s*$/);
          if (m) total = parseInt(m[1], 10);
          return res.json().then(function (rows) {
            return { rows: rows.map(mapRow), total: total };
          });
        });
    },
    add: function (text) {
      return fetch(CONFIG.supabaseUrl + "/rest/v1/comments", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json", "Prefer": "return=representation" }, authHeaders()),
        body: JSON.stringify({ text: text })
      }).then(function (res) {
        if (!res.ok) throw new Error("发送失败，请稍后再试");
        return res.json().then(function (rows) { return mapRow(rows[0]); });
      });
    },
    like: function (id) {
      return fetch(CONFIG.supabaseUrl + "/rest/v1/rpc/increment_likes", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
        body: JSON.stringify({ comment_id: id })
      }).then(function (res) {
        if (!res.ok) throw new Error("点赞失败");
      });
    }
  };

  /* ---------- 演示适配器（本机存储） ---------- */
  var demoStore = {
    list: function (sort, page) {
      var list = read(DEMO_KEY, null);
      if (!list || !list.length) { list = SEED.slice(); write(DEMO_KEY, list); }
      var sorted = list.slice().sort(function (a, b) {
        return sort === "hot" ? b.likes - a.likes || b.createdAt - a.createdAt : b.createdAt - a.createdAt;
      });
      var total = sorted.length;
      var start = (page - 1) * CONFIG.pageSize;
      return Promise.resolve({ rows: sorted.slice(start, start + CONFIG.pageSize), total: total });
    },
    add: function (text) {
      var list = read(DEMO_KEY, null) || [];
      var row = { id: uid(), text: text, likes: 0, createdAt: Date.now() };
      list.unshift(row);
      write(DEMO_KEY, list);
      return Promise.resolve(row);
    },
    like: function (id) {
      var list = read(DEMO_KEY, null) || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { list[i].likes += 1; write(DEMO_KEY, list); break; }
      }
      return Promise.resolve();
    }
  };

  var store = isCloud() ? cloudStore : demoStore;

  /* ---------- 页面元素 ---------- */
  var form = document.getElementById("cmtForm");
  var textarea = document.getElementById("cmtInput");
  var countEl = document.getElementById("cmtCount");
  var listEl = document.getElementById("cmtList");
  var loadMoreBtn = document.getElementById("loadMore");
  var sortBtns = document.querySelectorAll(".sort-btn");
  var charHint = document.getElementById("charHint");
  var noticeEl = document.getElementById("modeNotice");
  if (!form) return;

  var comments = [];   /* 已加载的留言（分页累积） */
  var total = 0;
  var page = 0;
  var sort = "new";
  var loading = false;
  var likedIds = read(LIKED_KEY, []);

  if (noticeEl) {
    if (isCloud()) {
      noticeEl.innerHTML = "<b>云端留言已开启：</b>所有访客的留言都保存在云端，大家都能看到；采用分页加载，页面每次只显示一页，省内存不卡顿。";
    } else {
      noticeEl.innerHTML = "<b>当前为演示模式：</b>留言和点赞只保存在你自己的浏览器里，方便预览体验。想开启云端留言（所有访客互通），按 README 注册 Supabase 后把配置发给我即可。";
    }
  }

  function saveLiked() { write(LIKED_KEY, likedIds); }

  function loadPage(nextPage) {
    if (loading) return;
    loading = true;
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "加载中…";
    }
    store.list(sort, nextPage).then(function (res) {
      if (nextPage === 1) comments = [];
      comments = comments.concat(res.rows);
      total = res.total;
      page = nextPage;
      render();
      loading = false;
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = "加载更多留言";
        loadMoreBtn.style.display = comments.length < total ? "" : "none";
      }
    }).catch(function (err) {
      loading = false;
      if (loadMoreBtn) { loadMoreBtn.disabled = false; loadMoreBtn.textContent = "加载更多留言"; }
      alert(err && err.message ? err.message : "加载失败，请刷新重试");
    });
  }

  function render() {
    countEl.textContent = "共 " + total + " 条留言";
    if (!comments.length) {
      listEl.innerHTML = '<div class="empty">还没有留言，来抢沙发吧～</div>';
      return;
    }
    listEl.innerHTML = comments.map(function (c) {
      var liked = likedIds.indexOf(c.id) > -1;
      return '<article class="cmt card"><div class="cmt-head"><span class="avatar">🎧</span><span class="anon">匿名小海螺</span><span class="time">' + fmtTime(c.createdAt) + "</span></div>" +
        '<div class="cmt-text">' + escapeHtml(c.text) + "</div>" +
        '<div class="cmt-foot"><button class="like-btn' + (liked ? " liked" : "") + '" data-id="' + c.id + '">' + (liked ? "❤️" : "🤍") + ' 赞 <span class="cnt">' + c.likes + "</span></button></div></article>";
    }).join("");

    listEl.querySelectorAll(".like-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.id;
        var idx = likedIds.indexOf(id);
        if (idx > -1) { alert("你已经点过赞啦～"); return; }
        store.like(id).then(function () {
          likedIds.push(id);
          saveLiked();
          for (var i = 0; i < comments.length; i++) {
            if (comments[i].id === id) { comments[i].likes += 1; break; }
          }
          render();
        }).catch(function (err) {
          alert(err && err.message ? err.message : "点赞失败");
        });
      });
    });
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
    if (!check.ok) { alert(check.msg); return; }
    store.add(check.text).then(function () {
      write(COOLDOWN_KEY, Date.now());
      textarea.value = "";
      charHint.textContent = "0 / 200";
      loadPage(1); /* 刷新第一页，让新留言出现 */
    }).catch(function (err) {
      alert(err && err.message ? err.message : "发送失败，请稍后再试");
    });
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
      loadPage(1);
    });
  });

  /* 加载更多 */
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", function () { loadPage(page + 1); });
  }

  loadPage(1);
})();
