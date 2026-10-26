/* ============ 全局交互 ============ */
(function () {
  "use strict";

  /* 顶部导航（始终显示，无需折叠菜单） */

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
      var thumb = g.thumb || g.src;
      var small = g.small || thumb;
      var fallback = g.fallback || g.src;
      var loading = i < 4 ? ' fetchpriority="high"' : ' loading="lazy"';
      var size = g.w && g.h ? ' width="' + g.w + '" height="' + g.h + '"' : "";
      return '<figure class="g-item" data-index="' + i + '" role="button" tabindex="0" aria-label="查看照片：' + g.cap + '">' +
        '<picture><source media="(max-width: 640px)" srcset="' + small + '">' +
        '<img src="' + thumb + '" data-fallback="' + fallback + '" alt="' + g.cap + '"' + size + ' decoding="async"' + loading + '></picture>' +
        '<figcaption class="cap">' + g.cap + "</figcaption></figure>";
    }).join("");

    galleryEl.querySelectorAll(".g-item img").forEach(function (img) {
      img.addEventListener("error", function () {
        var fallback = img.getAttribute("data-fallback");
        if (fallback && img.getAttribute("src") !== fallback) {
          img.setAttribute("src", fallback);
        }
      });
    });

    var cur = 0;
    var loadToken = 0;
    var touchStartX = null;
    var lastTrigger = null;
    var lightboxImg = lightbox.querySelector("img");

    function show(idx) {
      cur = (idx + window.GALLERY.length) % window.GALLERY.length;
      var g = window.GALLERY[cur];
      var thumb = g.thumb || g.src;
      var full = g.src || thumb;
      var token = ++loadToken;

      lightboxImg.src = thumb;
      lightboxImg.alt = g.cap;
      lightbox.querySelector(".lb-cap").textContent = g.cap + " · " + (cur + 1) + "/" + window.GALLERY.length;

      if (full && full !== thumb) {
        var loader = new Image();
        loader.onload = function () {
          if (token === loadToken) lightboxImg.src = full;
        };
        loader.onerror = function () {
          if (token === loadToken && g.fallback) lightboxImg.src = g.fallback;
        };
        loader.src = full;
      }
    }
    function openAt(idx, trigger) {
      lastTrigger = trigger || null;
      show(idx);
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      lightbox.querySelector(".lb-close").focus();
    }
    galleryEl.addEventListener("click", function (e) {
      var item = e.target.closest(".g-item");
      if (!item) return;
      openAt(+item.dataset.index, item);
    });
    galleryEl.addEventListener("keydown", function (e) {
      var item = e.target.closest(".g-item");
      if (!item || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      openAt(+item.dataset.index, item);
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
    lightbox.addEventListener("touchstart", function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (touchStartX === null) return;
      var distance = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(distance) < 45) return;
      show(cur + (distance < 0 ? 1 : -1));
    }, { passive: true });
    function close() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      if (lastTrigger) lastTrigger.focus();
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

    /* 手机/电脑使用不同 QQ 音乐入口：手机直达歌曲，电脑用搜索页（网页版歌曲页在部分浏览器会一直转圈） */
    var isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent);
    function qqUrl(w) {
      if (w.mid) {
        if (isMobile) return "https://y.qq.com/n/ryqq/songDetail/" + w.mid;
        return "https://y.qq.com/n/ryqq/search?w=" + encodeURIComponent(w.title.replace(/《|》/g, "") + " 宋亚轩");
      }
      return w.qq || "";
    }
    var qqHint = isMobile
      ? "手机点开若弹出「打开QQ音乐」，点一下即可直达这首歌"
      : "电脑打开的是QQ音乐搜索页，点第一条结果即为本歌曲";
    function render(cat) {
      var list = cat === "all" ? allWorks : allWorks.filter(function (w) { return w.cat === cat; });
      worksWrap.innerHTML = list.map(function (w) {
        var chips = (w.highlights || []).map(function (h) { return '<span class="chip">' + h + "</span>"; }).join("");
        var meta = w.date ? '<div class="meta">' + w.date + " · " + (w.type || "") + "</div>" : '<div class="meta">' + (w.type || "") + "</div>";
        var u = qqUrl(w);
        var title = u ? '<a class="song-link" href="' + u + '" target="_blank" rel="noopener" title="在 QQ 音乐打开这首歌">' + w.title + '<span class="qq-badge">QQ音乐 ↗</span></a>' : w.title;
        var qqBtn = u ? '<a class="qq-go-btn" href="' + u + '" target="_blank" rel="noopener">🎧 去QQ音乐听</a><p class="qq-hint">' + qqHint + "</p>" : "";
        return '<article class="work card reveal' + (u ? " work-qq" : "") + '"' + (u ? ' data-qq="' + u + '"' : "") + '><span class="tag">' + labels[w.cat] + "</span><h3>" + title + "</h3>" + meta + "<p>" + w.desc + "</p>" + (chips ? '<div class="chip-row">' + chips + "</div>" : "") + qqBtn + "</article>";
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
    worksWrap.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var card = e.target.closest(".work-qq");
      if (card && card.dataset.qq) window.open(card.dataset.qq, "_blank", "noopener");
    });
    render("all");
  }
})();
