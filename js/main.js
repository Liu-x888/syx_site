/* ============ 全局交互 ============ */
(function () {
  "use strict";

  /* 顶部导航（移动端折叠） */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  /* 当前页导航高亮 */
  var page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    if (a.getAttribute("href") === page) a.classList.add("active");
  });

  /* 回到顶部 */
  var toTop = document.getElementById("toTop");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("show", window.scrollY > 400);
    });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* 滚动入场动画 */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* 首页数据渲染（简介档案 / 能力 / 数据条） */
  var profileInfo = document.getElementById("profileInfo");
  if (profileInfo && window.PROFILE) {
    profileInfo.innerHTML = window.PROFILE.facts.map(function (f) {
      return '<div class="info-row"><span class="il">' + f.label + '</span><span class="iv">' + f.value + (f.small ? "<small>" + f.small + "</small>" : "") + '</span></div>';
    }).join("");
  }
  var skillsGrid = document.getElementById("skillsGrid");
  if (skillsGrid && window.PROFILE) {
    skillsGrid.innerHTML = window.PROFILE.charm.map(function (b) {
      return '<span class="bubble-tag ' + b.size + '">' + b.text + '</span>';
    }).join("");
  }
  var statsRow = document.getElementById("statsRow");
  if (statsRow && window.PROFILE) {
    statsRow.innerHTML = window.PROFILE.stats.map(function (s) {
      return '<div class="stat reveal"><div class="num">' + s.num + '</div><div class="cap">' + s.cap + "</div></div>";
    }).join("");
  }
  var aboutText = document.getElementById("aboutText");
  if (aboutText && window.PROFILE) aboutText.textContent = window.PROFILE.about;

  /* 照片墙渲染 + 灯箱 */
  var galleryEl = document.getElementById("gallery");
  var lightbox = document.getElementById("lightbox");
  if (galleryEl && window.GALLERY) {
    galleryEl.innerHTML = window.GALLERY.map(function (g, i) {
      return '<figure class="g-item" data-index="' + i + '"><img src="' + g.src + '" alt="' + g.cap + '"><figcaption class="cap">' + g.cap + "</figcaption></figure>";
    }).join("");

    var cur = 0;
    function show(idx) {
      cur = (idx + window.GALLERY.length) % window.GALLERY.length;
      var g = window.GALLERY[cur];
      lightbox.querySelector("img").src = g.src;
      lightbox.querySelector(".lb-cap").textContent = g.cap + " · " + (cur + 1) + "/" + window.GALLERY.length;
    }
    galleryEl.addEventListener("click", function (e) {
      var item = e.target.closest(".g-item");
      if (!item) return;
      show(+item.dataset.index);
      lightbox.classList.add("open");
      document.body.style.overflow = "hidden";
    });
    lightbox.querySelector(".lb-close").addEventListener("click", close);
    lightbox.querySelector(".lb-prev").addEventListener("click", function () { show(cur - 1); });
    lightbox.querySelector(".lb-next").addEventListener("click", function () { show(cur + 1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
    });
    function close() {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
    }
  }

  /* 作品页：分类筛选 */
  var tabsWrap = document.getElementById("tabs");
  var worksWrap = document.getElementById("worksGrid");
  if (tabsWrap && worksWrap && window.WORKS_DATA) {
    var allWorks = [];
    var keys = ["music", "variety", "drama", "group"];
    var labels = { music: "🎵 个人音乐", variety: "📺 综艺", drama: "🎭 话剧", group: "👥 组合歌曲" };
    keys.forEach(function (k) {
      window.WORKS_DATA[k].forEach(function (w) { allWorks.push(Object.assign({ cat: k }, w)); });
    });

    function render(cat) {
      var list = cat === "all" ? allWorks : allWorks.filter(function (w) { return w.cat === cat; });
      worksWrap.innerHTML = list.map(function (w) {
        var chips = (w.highlights || []).map(function (h) { return '<span class="chip">' + h + "</span>"; }).join("");
        var meta = w.date ? '<div class="meta">' + w.date + " · " + (w.type || "") + "</div>" : '<div class="meta">' + (w.type || "") + "</div>";
        var title = w.qq ? '<a class="song-link" href="' + w.qq + '" target="_blank" rel="noopener" title="在 QQ 音乐打开这首歌">' + w.title + '<span class="qq-badge">QQ音乐 ↗</span></a>' : w.title;
        return '<article class="work card reveal"><span class="tag">' + labels[w.cat] + "</span><h3>" + title + "</h3>" + meta + "<p>" + w.desc + "</p>" + (chips ? '<div class="chip-row">' + chips + "</div>" : "") + "</article>";
      }).join("");
      /* 触发入场动画 */
      worksWrap.querySelectorAll(".reveal").forEach(function (el) {
        el.classList.add("in");
      });
    }
    tabsWrap.innerHTML = [["all", "全部"], ["music", "🎵 个人音乐"], ["variety", "📺 综艺"], ["drama", "🎭 话剧"], ["group", "👥 组合歌曲"]].map(function (t) {
      return '<button class="tab' + (t[0] === "all" ? " active" : "") + '" data-cat="' + t[0] + '">' + t[1] + "</button>";
    }).join("");
    tabsWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".tab");
      if (!btn) return;
      tabsWrap.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
      btn.classList.add("active");
      render(btn.dataset.cat);
    });
    render("all");
  }
})();
