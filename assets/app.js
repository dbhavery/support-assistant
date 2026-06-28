/* Page behaviour: Lenis smooth scroll, GSAP reveals + rule draws, active
 * method row, and the self-playing footnoted transcript (from the real KB). */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Lenis, wired to ScrollTrigger ────────────────────────────────────────
  if (window.Lenis && !reduce) {
    var lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1 });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var el = document.querySelector(a.getAttribute("href"));
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -20 }); }
      });
    });
  }

  // ── Reveals, rule draws, active method row ───────────────────────────────
  var h1 = document.getElementById("h1");
  if (window.gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    if (h1) requestAnimationFrame(function () { h1.classList.add("lit"); });
    gsap.utils.toArray(".reveal").forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 88%" } });
    });
    gsap.utils.toArray("hr.rule").forEach(function (el) {
      gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 94%" } });
    });
    gsap.utils.toArray(".spec .row").forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 62%", end: "bottom 48%",
        onToggle: function (s) { el.classList.toggle("on", s.isActive); } });
    });
  } else {
    if (h1) h1.classList.add("lit");
    document.querySelectorAll(".reveal").forEach(function (el) { el.style.opacity = 1; el.style.transform = "none"; });
  }

  // ── Self-playing footnoted transcript ────────────────────────────────────
  var ts = document.getElementById("ts"), refsEl = document.getElementById("refs");
  if (!ts) return;

  var SCRIPT = [
    { q: "What's your return policy?", src: "returns-policy.md",
      a: "You can return most items within 60 days of delivery for a full refund, as long as they're unused with original tags. We email you a prepaid label." },
    { q: "How much is overnight shipping?", src: "shipping-policy.md",
      a: "Overnight is $29.95 and arrives the next business day if you order before 12pm PT. Standard Ground is free on orders over $75." },
    { q: "This is the second time I've asked. Frustrating.", src: "contact-and-hours.md", escalate: true, frustrated: true,
      a: "I'm sorry, that's genuinely frustrating. Let me get a person on it now, and I'm passing them this whole conversation so you won't repeat anything. You can also reach the team at 1-800-555-0142, Mon-Fri 8am-6pm PT." },
  ];

  function add(cls, mk, html) {
    var r = document.createElement("div"); r.className = "qa " + cls;
    r.innerHTML = '<div class="mk">' + (mk || "") + '</div><div class="' + (cls === "sys" ? "sys" : "tx") + '">' + (html || "") + "</div>";
    ts.appendChild(r); return r;
  }
  function rise(node) { if (window.gsap) gsap.to(node, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }); else { node.style.opacity = 1; node.style.transform = "none"; } }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function type(node, text) { var t = node.querySelector(".tx"); for (var i = 0; i <= text.length; i++) { t.textContent = text.slice(0, i); await wait(24); } }

  async function run() {
    if (reduce) {
      var q0 = add("q", "Q"); q0.querySelector(".tx").textContent = SCRIPT[0].q; q0.style.opacity = 1; q0.style.transform = "none";
      var a0 = add("ans", "A", SCRIPT[0].a + '<sup>1</sup>'); a0.style.opacity = 1; a0.style.transform = "none";
      refsEl.innerHTML = '<span class="h">Source</span>1 · ' + SCRIPT[0].src; return;
    }
    while (true) {
      for (var s = 0; s < SCRIPT.length; s++) {
        var step = SCRIPT[s], n = s + 1;
        var q = add("q", "Q"); rise(q); await type(q, step.q); await wait(320);
        var sysText = step.frustrated ? "sensing frustration · bringing in a human …" : "retrieving · " + step.src + " …";
        var sys = add("sys", "", sysText); rise(sys); await wait(820); sys.remove();
        var a = add("ans", step.escalate ? "!" : "A", step.a + '<sup>' + n + '</sup>');
        if (step.escalate) a.querySelector(".mk").style.color = "var(--red)";
        rise(a);
        refsEl.innerHTML = '<span class="h">Source</span>' + n + ' · ' + step.src + (step.escalate ? '  ·  escalated to a human, full context' : '');
        if (!step.escalate) { await wait(900); var ok = add("sys", "", "did that solve it?  ·  resolved"); rise(ok); }
        await wait(step.escalate ? 3000 : 2100);
        if (window.gsap) await new Promise(function (r) { gsap.to(ts.children, { opacity: 0, y: -6, duration: 0.4, stagger: 0.03, ease: "power2.in", onComplete: r }); });
        ts.innerHTML = ""; refsEl.innerHTML = "";
      }
    }
  }
  run();
})();
