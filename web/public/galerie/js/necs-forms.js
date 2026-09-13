(() => {
  const todayNodes = document.querySelectorAll("[data-today]");
  const today = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  todayNodes.forEach((node) => {
    node.textContent = today;
  });

  const grid = document.getElementById("templateGrid");
  const search = document.getElementById("searchTemplates");
  const chips = document.querySelectorAll(".filter-chip");
  if (!grid) return;

  let activeFilter = "all";

  const applyFilters = () => {
    const q = (search?.value || "").trim().toLowerCase();
    grid.querySelectorAll(".template-card").forEach((card) => {
      const module = card.getAttribute("data-module") || "";
      const title = (card.getAttribute("data-title") || "").toLowerCase();
      const text = card.textContent.toLowerCase();
      const moduleOk =
        activeFilter === "all" ||
        module.toLowerCase().startsWith(activeFilter.toLowerCase()) ||
        module.toLowerCase().includes(activeFilter.toLowerCase());
      const searchOk = !q || title.includes(q) || text.includes(q);
      card.style.display = moduleOk && searchOk ? "" : "none";
    });
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      activeFilter = chip.getAttribute("data-filter") || "all";
      applyFilters();
    });
  });

  search?.addEventListener("input", applyFilters);
})();
