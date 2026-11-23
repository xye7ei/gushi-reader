(function () {
  var input = document.getElementById("toc-search");
  var status = document.getElementById("search-status");
  if (!input) return;

  var groups = Array.prototype.slice.call(document.querySelectorAll(".toc-group"));
  var entries = groups.map(function (group) {
    return {
      group: group,
      items: Array.prototype.slice.call(group.querySelectorAll("li")).map(function (li) {
        return {
          el: li,
          link: li.querySelector("a"),
          text: (li.getAttribute("data-q") || li.textContent || "").toLowerCase(),
        };
      }),
    };
  });

  function filter() {
    var raw = input.value.trim().toLowerCase();
    var terms = raw ? raw.split(/\s+/) : [];
    var matched = 0;

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var groupHits = 0;

      for (var j = 0; j < entry.items.length; j++) {
        var item = entry.items[j];
        var ok = true;
        for (var k = 0; k < terms.length; k++) {
          if (item.text.indexOf(terms[k]) === -1) {
            ok = false;
            break;
          }
        }
        item.el.hidden = !ok;
        if (ok) {
          groupHits++;
          matched++;
        }
      }

      entry.group.hidden = terms.length > 0 && groupHits === 0;
      if (terms.length > 0 && groupHits > 0) {
        entry.group.open = true;
      }
    }

    if (!status) return;
    if (!terms.length) {
      status.textContent = "";
    } else if (matched === 0) {
      status.textContent = "無符合詩歌";
    } else {
      status.textContent = "找到 " + matched + " 首";
    }
  }

  input.addEventListener("input", filter);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && input.value) {
      input.value = "";
      filter();
    } else if (e.key === "Enter") {
      var first = document.querySelector(".toc-list li:not([hidden]) a");
      if (first) first.click();
    }
  });

  /* ── Click Mask-Wipe Reveal & Settings ── */
  var DEFAULT_DUR = 2500;
  var DEFAULT_DELAY = 1250;
  var DEFAULT_BREATHE = true;
  var DEFAULT_PERIOD = 12;
  var DEFAULT_RANGE = 6;
  var MIN_MS = 0;
  var MAX_MS = 10000;
  var MIN_PERIOD = 2;
  var MAX_PERIOD = 60;
  var MIN_RANGE = 1;
  var MAX_RANGE = 30;
  var STORAGE_KEY = "tangshi300_scan_settings";

  var root = document.documentElement;
  var reader = document.getElementById("reader");
  var durRange = document.getElementById("scan-dur-range");
  var durNum = document.getElementById("scan-dur-num");
  var delayRange = document.getElementById("scan-delay-range");
  var delayNum = document.getElementById("scan-delay-num");
  var breatheToggle = document.getElementById("bg-breathe-toggle");
  var breatheOptions = document.getElementById("breathe-options");
  var periodRange = document.getElementById("breathe-period-range");
  var periodNum = document.getElementById("breathe-period-num");
  var rangeRange = document.getElementById("breathe-range-range");
  var rangeNum = document.getElementById("breathe-range-num");
  var resetRevealBtn = document.getElementById("reset-reveal");
  var resetSettingsBtn = document.getElementById("reset-settings");

  var settings = {
    dur: DEFAULT_DUR,
    delay: DEFAULT_DELAY,
    breathe: DEFAULT_BREATHE,
    period: DEFAULT_PERIOD,
    range: DEFAULT_RANGE,
  };

  function clampInt(val, min, max, fallback) {
    var n = Number(val);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function loadSettings() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        return {
          dur: clampInt(saved.dur, MIN_MS, MAX_MS, DEFAULT_DUR),
          delay: clampInt(saved.delay, MIN_MS, MAX_MS, DEFAULT_DELAY),
          breathe: typeof saved.breathe === "boolean" ? saved.breathe : DEFAULT_BREATHE,
          period: clampInt(saved.period, MIN_PERIOD, MAX_PERIOD, DEFAULT_PERIOD),
          range: clampInt(saved.range, MIN_RANGE, MAX_RANGE, DEFAULT_RANGE),
        };
      }
    } catch (err) {}
    return {
      dur: DEFAULT_DUR,
      delay: DEFAULT_DELAY,
      breathe: DEFAULT_BREATHE,
      period: DEFAULT_PERIOD,
      range: DEFAULT_RANGE,
    };
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {}
  }

  function applySettings(next, persist) {
    settings.dur = clampInt(next.dur, MIN_MS, MAX_MS, DEFAULT_DUR);
    settings.delay = clampInt(next.delay, MIN_MS, MAX_MS, DEFAULT_DELAY);
    settings.breathe = typeof next.breathe === "boolean" ? next.breathe : DEFAULT_BREATHE;
    settings.period = clampInt(next.period, MIN_PERIOD, MAX_PERIOD, DEFAULT_PERIOD);
    settings.range = clampInt(next.range, MIN_RANGE, MAX_RANGE, DEFAULT_RANGE);

    root.style.setProperty("--scan-dur", settings.dur + "ms");
    root.style.setProperty("--scan-delay", settings.delay + "ms");
    root.style.setProperty("--breathe-period", settings.period + "s");
    root.style.setProperty("--breathe-light-dim", settings.range + "%");
    root.style.setProperty("--breathe-light-bright", Math.min(100, settings.range * 12) + "%");
    root.style.setProperty("--breathe-dark-dim", Math.min(100, settings.range * 5) + "%");
    root.style.setProperty("--breathe-dark-bright", (settings.range * 1.2).toFixed(1) + "%");
    root.classList.toggle("bg-breathe", settings.breathe);

    if (durRange) durRange.value = String(settings.dur);
    if (durNum) durNum.value = String(settings.dur);
    if (delayRange) delayRange.value = String(settings.delay);
    if (delayNum) delayNum.value = String(settings.delay);
    if (periodRange) periodRange.value = String(settings.period);
    if (periodNum) periodNum.value = String(settings.period);
    if (rangeRange) rangeRange.value = String(settings.range);
    if (rangeNum) rangeNum.value = String(settings.range);
    if (breatheToggle) {
      breatheToggle.setAttribute("aria-pressed", String(settings.breathe));
      breatheToggle.textContent = settings.breathe ? "開啟" : "關閉";
    }
    if (breatheOptions) breatheOptions.hidden = !settings.breathe;
    if (persist) saveSettings();
  }

  function updateSetting(patch) {
    applySettings({
      dur: "dur" in patch ? patch.dur : settings.dur,
      delay: "delay" in patch ? patch.delay : settings.delay,
      breathe: "breathe" in patch ? patch.breathe : settings.breathe,
      period: "period" in patch ? patch.period : settings.period,
      range: "range" in patch ? patch.range : settings.range,
    }, true);
  }

  if (reader) {
    root.classList.add("js-reveal");

    reader.addEventListener("click", function (e) {
      if (window.getSelection && window.getSelection().toString()) return;
      var target = e.target;
      if (!target || !target.closest) return;

      var verse = target.closest(".verse");
      if (verse && !verse.classList.contains("is-revealed")) {
        verse.classList.add("is-revealed");
        return;
      }

      var poem = target.closest(".poem");
      if (poem) {
        var next = poem.querySelector(".verse:not(.is-revealed)");
        if (next) next.classList.add("is-revealed");
      }
    });
  }

  applySettings(loadSettings(), false);

  if (durRange && durNum) {
    durRange.addEventListener("input", function () { updateSetting({ dur: durRange.value }); });
    durNum.addEventListener("change", function () { updateSetting({ dur: durNum.value }); });
  }

  if (delayRange && delayNum) {
    delayRange.addEventListener("input", function () { updateSetting({ delay: delayRange.value }); });
    delayNum.addEventListener("change", function () { updateSetting({ delay: delayNum.value }); });
  }

  if (breatheToggle) {
    breatheToggle.addEventListener("click", function () {
      updateSetting({ breathe: !settings.breathe });
    });
  }

  if (periodRange && periodNum) {
    periodRange.addEventListener("input", function () { updateSetting({ period: periodRange.value }); });
    periodNum.addEventListener("change", function () { updateSetting({ period: periodNum.value }); });
  }

  if (rangeRange && rangeNum) {
    rangeRange.addEventListener("input", function () { updateSetting({ range: rangeRange.value }); });
    rangeNum.addEventListener("change", function () { updateSetting({ range: rangeNum.value }); });
  }

  if (resetRevealBtn && reader) {
    resetRevealBtn.addEventListener("click", function () {
      var revealed = reader.querySelectorAll(".verse.is-revealed");
      for (var i = 0; i < revealed.length; i++) {
        revealed[i].classList.remove("is-revealed");
      }
    });
  }

  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener("click", function () {
      applySettings({
        dur: DEFAULT_DUR,
        delay: DEFAULT_DELAY,
        breathe: DEFAULT_BREATHE,
        period: DEFAULT_PERIOD,
        range: DEFAULT_RANGE,
      }, true);
    });
  }

  /* ── Sidebar Swipe-Left to Hide / Edge Swipe-Right to Show ── */
  var sidebarToggle = document.getElementById("sidebar-toggle");
  var sidebar = document.getElementById("sidebar");

  if (sidebarToggle && sidebar) {
    var startX = 0;
    var startY = 0;
    var dragging = false;
    var lastDx = 0;
    var isNarrow = function () { return window.innerWidth <= 760; };

    sidebar.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      if (e.target && e.target.closest && e.target.closest('input[type="range"]')) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragging = false;
      lastDx = 0;
    }, { passive: true });

    sidebar.addEventListener("touchmove", function (e) {
      if (e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if (!dragging) {
        if (dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          dragging = true;
          sidebar.style.transition = "none";
        } else if (Math.abs(dy) > 12) {
          return;
        }
      }
      if (dragging) {
        var clamped = Math.max(-sidebar.offsetWidth, Math.min(0, dx));
        lastDx = clamped;
        if (isNarrow()) {
          sidebar.style.transform = "translateX(" + clamped + "px)";
        } else {
          sidebar.style.marginInlineStart = clamped + "px";
        }
      }
    }, { passive: true });

    function finishSidebarSwipe() {
      if (!dragging) return;
      dragging = false;
      sidebar.style.transition = "";
      sidebar.style.transform = "";
      sidebar.style.marginInlineStart = "";
      if (lastDx < -55) {
        sidebarToggle.checked = true;
      }
    }

    sidebar.addEventListener("touchend", finishSidebarSwipe, { passive: true });
    sidebar.addEventListener("touchcancel", finishSidebarSwipe, { passive: true });

    // Trackpad horizontal two-finger swipe left on sidebar
    var wheelSumX = 0;
    var wheelTimer = null;
    sidebar.addEventListener("wheel", function (e) {
      if (sidebarToggle.checked) return;
      if (e.target && e.target.closest && e.target.closest('input[type="range"]')) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.6) return;
      if (e.deltaX > 0) {
        wheelSumX += e.deltaX;
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(function () { wheelSumX = 0; }, 180);
        if (wheelSumX > 65) {
          wheelSumX = 0;
          sidebarToggle.checked = true;
        }
      }
    }, { passive: true });

    // On narrow screens, selecting a poem closes the drawer automatically
    sidebar.addEventListener("click", function (e) {
      if (isNarrow() && e.target && e.target.closest && e.target.closest(".toc-list a")) {
        sidebarToggle.checked = true;
      }
    });

    // Edge swipe right on reader to reopen hidden sidebar
    if (reader) {
      var edgeStartX = -1;
      var edgeStartY = 0;
      reader.addEventListener("touchstart", function (e) {
        if (!sidebarToggle.checked || e.touches.length !== 1) {
          edgeStartX = -1;
          return;
        }
        var x = e.touches[0].clientX;
        edgeStartX = x <= 36 ? x : -1;
        edgeStartY = e.touches[0].clientY;
      }, { passive: true });

      reader.addEventListener("touchend", function (e) {
        if (edgeStartX < 0 || !e.changedTouches.length) return;
        var dx = e.changedTouches[0].clientX - edgeStartX;
        var dy = e.changedTouches[0].clientY - edgeStartY;
        edgeStartX = -1;
        if (dx > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          sidebarToggle.checked = false;
        }
      }, { passive: true });
    }
  }
})();
