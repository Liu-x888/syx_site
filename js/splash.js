/* ============ 进入网站前的海底世界引导页 ============ */
(function () {
  "use strict";
  var splash = document.getElementById("splash");
  if (!splash) return;

  var done = false;
  try { done = sessionStorage.getItem("splashDone") === "1"; } catch (e) {}
  if (done) { if (splash.parentNode) splash.parentNode.removeChild(splash); return; }

  var enter = splash.querySelector(".splash-enter");
  var leaving = false;
  function leave() {
    if (leaving) return;
    leaving = true;
    try { sessionStorage.setItem("splashDone", "1"); } catch (e) {}
    splash.classList.add("leaving");
    setTimeout(function () {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 750);
  }
  if (enter) enter.addEventListener("click", leave);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") leave();
  });

  /* 2 秒后出现“点击进入” */
  setTimeout(function () { splash.classList.add("ready"); }, 2000);

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
