/* ===========================================================
   攝雕影光 · 交互脚本（数据驱动版）
   1. 当前页面导航高亮
   2. 作品预览灯箱（真实图片）
   3. 从 works_manifest.json 动态渲染作品卡片
   =========================================================== */

(function () {
  "use strict";

  /* ---------- 1. 导航高亮 ---------- */
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });

  /* ---------- 工具函数 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var PLAY_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var ARROW_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /* ---------- 单张卡片渲染 ---------- */
  function renderCard(item) {
    var file = esc(item.file);
    var title = esc(item.title);
    var ratio = esc(item.ratio);
    return (
      '<article class="work-card" data-title="' +
      title +
      '" data-file="' +
      file +
      '" data-ratio="' +
      ratio +
      '">' +
      '<div class="work-thumb">' +
      '<img class="work-thumb-img" src="' +
      file +
      '" alt="' +
      title +
      '" loading="lazy" />' +
      '<button class="play-btn" type="button" aria-label="预览 ' +
      title +
      '">' +
      PLAY_SVG +
      "</button>" +
      "</div>" +
      '<div class="work-meta">' +
      '<h3 class="work-title">' +
      title +
      "</h3>" +
      '<button class="arrow-btn" type="button" aria-label="查看 ' +
      title +
      '">' +
      ARROW_SVG +
      "</button>" +
      "</div>" +
      "</article>"
    );
  }

  /* ---------- 2. 预览灯箱（真实图片） ---------- */
  var lightbox = document.getElementById("lightbox");
  var lbImgEl = document.getElementById("lb-img-el");
  var lbTitle = document.getElementById("lb-title");
  var lbSub = document.getElementById("lb-sub");
  var lbClose = document.getElementById("lb-close");

  function openLightbox(card) {
    if (!lightbox) return;
    var file = card.getAttribute("data-file");
    var title = card.getAttribute("data-title") || "作品";
    var ratio = card.getAttribute("data-ratio") || "";
    if (lbImgEl) {
      lbImgEl.src = file || "";
      lbImgEl.alt = title;
    }
    if (lbTitle) lbTitle.textContent = title;
    if (lbSub) lbSub.textContent = ratio ? ratio + " 比例" : "预览";
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    if (lbImgEl) lbImgEl.src = "";
  }

  // 事件委托：卡片整体 / 预览按钮 / 箭头按钮 均可触发灯箱
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== "function") return;
    var card = t.closest(".work-card");
    if (card) {
      e.preventDefault();
      openLightbox(card);
    }
  });

  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });

  /* ---------- 3. 数据渲染 ---------- */
  function setFallback(el, msg) {
    if (!el) return;
    el.innerHTML = '<p class="works-empty">' + esc(msg) + "</p>";
  }

  // 首页：渲染 manifest.flat 全部 64 条
  function renderIndex(manifest) {
    var grid = document.getElementById("works-grid");
    var countEl = document.getElementById("works-count");
    var total = manifest.total || (manifest.flat ? manifest.flat.length : 0);
    if (countEl) countEl.textContent = "共 " + total + " 件";
    if (!grid) return;
    if (!manifest.flat || !manifest.flat.length) {
      setFallback(grid, "暂无作品数据");
      return;
    }
    grid.innerHTML = manifest.flat.map(renderCard).join("");
  }

  // 作品页：按 manifest.groups 分组（count 多到少，同名按 ratio 排序）
  function renderWorks(manifest) {
    var groupsEl = document.getElementById("works-groups");
    var totalEl = document.getElementById("works-total");
    var overviewEl = document.getElementById("works-overview");
    var groups = manifest.groups || {};
    var groupCount = Object.keys(groups).length;
    var total = manifest.total || 0;

    if (totalEl) totalEl.textContent = "共 " + total + " 件";
    if (overviewEl) {
      overviewEl.innerHTML =
        '<div class="ov-item"><span class="ov-num">' +
        total +
        '</span><span>件作品</span></div>' +
        '<div class="ov-item"><span class="ov-num">' +
        groupCount +
        '</span><span>种比例分组</span></div>';
    }
    if (!groupsEl) return;
    if (!groupCount) {
      setFallback(groupsEl, "暂无作品数据");
      return;
    }

    var keys = Object.keys(groups).sort(function (a, b) {
      var ga = groups[a];
      var gb = groups[b];
      if (gb.count !== ga.count) return gb.count - ga.count;
      return String(ga.ratio).localeCompare(String(gb.ratio), "zh");
    });

    groupsEl.innerHTML = keys
      .map(function (key) {
        var g = groups[key];
        var cards = (g.items || []).map(renderCard).join("");
        return (
          '<section class="work-group">' +
          '<div class="section-head"><h2>' +
          esc(g.ratio) +
          ' 比例</h2><span class="count">' +
          (g.count || (g.items ? g.items.length : 0)) +
          " 张</span></div>" +
          '<div class="works-grid">' +
          cards +
          "</div>" +
          "</section>"
        );
      })
      .join("");
  }

  function init(manifest) {
    if (!manifest) return;
    if (document.getElementById("works-grid")) renderIndex(manifest);
    if (document.getElementById("works-groups")) renderWorks(manifest);
  }

  /* ---------- 4. 拉取数据 ---------- */
  fetch("works_manifest.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(init)
    .catch(function (err) {
      console.error("作品数据加载失败：", err);
      var msg =
        "作品数据加载失败，请通过 HTTP 服务访问本站点（" +
        (err && err.message ? err.message : "未知错误") +
        "）";
      setFallback(document.getElementById("works-grid"), msg);
      setFallback(document.getElementById("works-groups"), msg);
    });
})();
