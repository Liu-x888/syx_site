/* ============ 进入网站前的海底世界引导页 ============ */
(function () {
  "use strict";
  var splash = document.getElementById("splash");
  if (!splash) return;

  var enter = splash.querySelector(".splash-enter");
  var leaving = false;
  var timer = null;

  function hideSplash() {
    splash.style.display = "none";
    splash.classList.remove("ready");
    splash.classList.remove("leaving");
  }
  function showSplash(replay) {
    leaving = false;
    splash.style.display = "";
    splash.classList.remove("leaving");
    clearTimeout(timer);
    if (replay) {
      splash.classList.remove("ready");
      timer = setTimeout(function () { splash.classList.add("ready"); }, 2000);
    } else {
      splash.classList.add("ready");
    }
  }
  function leave() {
    if (leaving) return;
    leaving = true;
    try { sessionStorage.setItem("splashDone", "1"); } catch (e) {}
    splash.classList.add("leaving");
    timer = setTimeout(hideSplash, 750);
  }

  /* 本标签页若已进入过，直接隐藏（避免闪烁） */
  var done = false;
  try { done = sessionStorage.getItem("splashDone") === "1"; } catch (e) {}
  if (done) { hideSplash(); }
  else { showSplash(true); }

  if (enter) enter.addEventListener("click", leave);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      if (splash.style.display !== "none" && !splash.classList.contains("leaving")) leave();
    }
  });

  /* 供导航栏“返回导航页”按钮调用：重新播放引导动画 */
  window.showSplash = function () { showSplash(true); };

  /* 背景图加载失败时退化为主题色渐变 */
  var bg = splash.querySelector(".splash-bg");
  if (bg) {
    var probe = new Image();
    probe.onerror = function () {
      bg.style.backgroundImage = "none";
      splash.style.background = "linear-gradient(180deg,#E1F5FA 0%,#A9E3F2 50%,#63C5DE 100%)";
    };
    probe.src = bg.getAttribute("data-bg") || "";
  }
})();
