       /* =========================
   Research Update (SAFE)
   ========================= */

   (async function RU_init() {
    try {
        const listEl = document.getElementById("research-update-list");
        if (!listEl) return;

        const url = "data/researchData.json"; // ✅ projects.html 기준 상대경로 (가장 안정적)
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Research data load failed: ${res.status}`);

        const buf = await res.arrayBuffer();
        const text = new TextDecoder("utf-8").decode(buf).replace(/^\uFEFF/, "");
        const raw = JSON.parse(text);

        const list = Array.isArray(raw) ? raw : [raw];

        // ✅ Research Update 카드 자체 최신순(dateISO) 정렬
        list.sort((a, b) => {
            const ta = Date.parse(a.dateISO || a.date || "") || 0;
            const tb = Date.parse(b.dateISO || b.date || "") || 0;
            return tb - ta; // 최신 먼저
        });

        RU_renderList(list);

        RU_handleDeepLink(list);

        // ✅ 로드/렌더 완료 뒤 스크롤 & 상세 오픈 처리
        window.addEventListener("load", () => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    RU_applyRouting(list);
                });
            });
        });

    } catch (e) {
        console.warn("[ResearchUpdate] init failed:", e);
    }
})();

function RU_applyRouting(list) {
    const params = new URL(location.href).searchParams;

    // 1) view=research면 섹션으로 강제 스크롤
    if (params.get("view") === "research") {
        const sec = document.getElementById("research-update");
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // 2) research=<id>면 해당 아이템 상세 자동 오픈
    const id = params.get("research");
    if (id) {
        const found = list.find(x => String(x.id) === String(id));
        if (found) RU_openDetail(found);
    }
}

/* ---------- render list ---------- */
function RU_renderList(list) {
    const el = document.getElementById("research-update-list");
    el.innerHTML = "";

    list.forEach(item => {
        const title = item.menuTitle || item.title || "Untitled";
        const desc = item.desc || "";
        const thumb = item.thumbnail || "";

        const card = document.createElement("article");
        card.className =
            "group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md cursor-pointer";

        card.innerHTML = `
<div class="flex gap-4">
<div class="flex-1 min-w-0">
  <h3 class="text-lg font-bold text-slate-900 group-hover:text-blue-700">
    ${title}
  </h3>
  <p class="mt-2 text-sm text-slate-600 line-clamp-2">
    ${desc}
  </p>
  <div class="mt-3 text-sm font-semibold text-blue-700">
    View details →
  </div>
</div>
${thumb ? `
  <div class="hidden md:block w-[120px] h-[80px] rounded-xl overflow-hidden border shrink-0">
    <img src="${thumb}" onerror="this.src='assets/images/placeholder.jpg'" class="w-full h-full object-cover" />
  </div>` : ""}
</div>
`;

        card.addEventListener("click", () => {
            // ✅ 클릭 시 URL도 맞춰줌(새로고침해도 유지)
            const next = new URL(location.href);
            next.searchParams.set("view", "research");
            next.searchParams.set("research", item.id);
            history.replaceState({}, "", next.toString());

            RU_openDetail(item);
            document.getElementById("research-update")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        el.appendChild(card);
    });
}

/* ---------- open detail ---------- */
function RU_openDetail(item) {
    const el = document.getElementById("research-update-detail");
    if (!el) return;

    function RU_assetUrl(p) {
        const basePath = location.pathname.replace(/\/[^\/]*$/, "");
        const clean = String(p || "").trim().replace(/^\//, "");
        return clean ? `${basePath}/${clean}` : "";
    }

    const researchList = Array.isArray(item.research) ? item.research : [];

    el.classList.remove("hidden");
    el.innerHTML = `
<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<div class="flex justify-between items-start gap-4">
<div class="min-w-0">
  <h3 class="text-2xl font-extrabold break-words">
    ${item.title || ""}
  </h3>
  ${item.desc ? `<p class="mt-2 text-slate-600">${item.desc}</p>` : ""}
</div>
<button id="ru-close"
  class="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 shrink-0">
  Close
</button>
</div>

${researchList.length ? `
<div class="mt-8 space-y-12">
  ${researchList.map(r => `
    <section>
      <h4 class="text-xl font-bold">${r.title || ""}</h4>
      ${r.date ? `<p class="mt-1 text-sm text-slate-500">${r.date}</p>` : ""}

      ${r.desc ? `
        <div class="mt-4 text-slate-700 whitespace-pre-line">
          ${r.desc}
        </div>` : ""}

      ${Array.isArray(r.images) && r.images.length > 0 ? `
<div class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
${r.images.map(src => `
  <div class="rounded-xl overflow-hidden border bg-slate-100">
    <img src="${RU_assetUrl(src)}"
         alt="Research image"
         class="w-full h-full object-cover transition-transform duration-300 ease-in-out transform origin-center hover:scale-110"
         loading="lazy"
         onerror="this.src='assets/images/placeholder.jpg'" />
  </div>
`).join("")}
</div>
` : ""}


    </section>
  `).join("")}
</div>
` : ""}
</div>
`;

    document.getElementById("ru-close").onclick = () => {
        el.classList.add("hidden");
        el.innerHTML = "";
        const next = new URL(location.href);
        next.searchParams.delete("research");
        history.replaceState({}, "", next.toString());
    };
}

function normalizeId(v) {
    return String(v ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " "); // 연속 공백 정리
}

/* ---------- deep link ---------- */
function RU_handleDeepLink(list) {
    const params = new URL(location.href).searchParams;

    if (params.get("view") === "research") {
        document.getElementById("research-update")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const rawId = params.get("research");
    if (!rawId) return;

    const id = normalizeId(decodeURIComponent(rawId));

    const found = list.find(x => normalizeId(x.id) === id);
    if (found) RU_openDetail(found);
    else console.warn("[ResearchUpdate] id not found:", rawId, "normalized:", id);
}

(function handleResearchView() {
    const view = new URL(location.href).searchParams.get("view");
    if (view === "research") {
        window.addEventListener("load", () => {
            document
                .getElementById("research-update")
                ?.scrollIntoView({ behavior: "smooth" });
        });
    }
})();

// ===== Force scroll to Research Update (See all 대응) =====
(function forceScrollToResearch() {
    const params = new URL(location.href).searchParams;
    if (params.get("view") !== "research") return;

    // 모든 렌더링이 끝난 뒤 스크롤 보장
    window.addEventListener("load", () => {
        // 한 프레임 더 기다림 (DOM 안정화)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const target = document.getElementById("research-update");
                if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            });
        });
    });
})();


(function () {
    const btn = document.getElementById("projectsMegaBtn");
    const panel = document.getElementById("projectsMegaPanel");
    const closeBtn = document.getElementById("projectsMegaClose");

    if (!btn || !panel) return;

    function openMenu() {
        panel.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
        panel.classList.add("hidden");
        btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        panel.classList.contains("hidden") ? openMenu() : closeMenu();
    });

    closeBtn?.addEventListener("click", closeMenu);

    // 바깥 클릭 시 닫기
    document.addEventListener("click", (e) => {
        if (!panel.contains(e.target) && !btn.contains(e.target)) {
            closeMenu();
        }
    });

    // ESC로 닫기
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu();
    });
})();