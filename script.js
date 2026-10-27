(() => {
  "use strict";

  const COLUMNS = [
    { id: "todo",  name: "Por hacer",   color: "#ef4444" },
    { id: "doing", name: "En progreso", color: "#f59e0b" },
    { id: "review",name: "Revisión",    color: "#5b6cff" },
    { id: "done",  name: "Hecho",       color: "#22c55e" },
  ];

  const PRIORITY = {
    low:    { label: "Baja",  cls: "low" },
    medium: { label: "Media", cls: "medium" },
    high:   { label: "Alta",  cls: "high" },
  };

  const STORE = "kanban.tasks.v1";
  const board = document.getElementById("board");
  const modal = document.getElementById("modal");
  let tasks = load();
  let editingId = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return seed();
  }
  function save() { localStorage.setItem(STORE, JSON.stringify(tasks)); }
  function seed() {
    return [
      { id: uid(), title: "Diseñar la landing page", desc: "Hero, features y footer.", priority: "high", column: "todo" },
      { id: uid(), title: "Configurar el repositorio", desc: "Crear repo y ramas.", priority: "medium", column: "doing" },
      { id: uid(), title: "Revisar pull request #12", desc: "Feedback del equipo.", priority: "medium", column: "review" },
      { id: uid(), title: "Publicar documentación", desc: "", priority: "low", column: "done" },
    ];
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---------- Render ----------
  function render(filter = "") {
    board.innerHTML = "";
    const f = filter.trim().toLowerCase();
    COLUMNS.forEach(col => {
      const colTasks = tasks.filter(t => t.column === col.id &&
        (!f || t.title.toLowerCase().includes(f) || (t.desc || "").toLowerCase().includes(f)));

      const colEl = document.createElement("section");
      colEl.className = "column";
      colEl.innerHTML = `
        <div class="column-head">
          <div class="column-title"><span class="dot" style="background:${col.color}"></span>${col.name}</div>
          <span class="count">${colTasks.length}</span>
        </div>
        <div class="cards" data-col="${col.id}"></div>
        <button class="col-add" data-col="${col.id}">+ Añadir tarea</button>
      `;
      const cardsEl = colEl.querySelector(".cards");

      if (colTasks.length === 0) {
        const e = document.createElement("div");
        e.className = "empty";
        e.textContent = "Sin tareas";
        cardsEl.appendChild(e);
      }

      colTasks.forEach(t => cardsEl.appendChild(cardEl(t)));

      // Drag targets
      cardsEl.addEventListener("dragover", e => { e.preventDefault(); cardsEl.classList.add("drag-over"); });
      cardsEl.addEventListener("dragleave", () => cardsEl.classList.remove("drag-over"));
      cardsEl.addEventListener("drop", e => {
        e.preventDefault();
        cardsEl.classList.remove("drag-over");
        const id = e.dataTransfer.getData("text/plain");
        const t = tasks.find(x => x.id === id);
        if (t) { t.column = col.id; save(); render(document.getElementById("search").value); }
      });

      colEl.querySelector(".col-add").addEventListener("click", () => openModal(col.id));
      board.appendChild(colEl);
    });
  }

  function cardEl(t) {
    const el = document.createElement("article");
    el.className = `card p-${t.priority}`;
    el.draggable = true;
    const p = PRIORITY[t.priority];
    el.innerHTML = `
      <div class="card-title">${esc(t.title)}</div>
      ${t.desc ? `<div class="card-desc">${esc(t.desc)}</div>` : ""}
      <div class="card-foot">
        <span class="badge ${p.cls}">${p.label}</span>
        <div class="card-actions">
          <button class="icon-btn" data-act="edit" title="Editar">✎</button>
          <button class="icon-btn" data-act="del" title="Borrar">🗑</button>
        </div>
      </div>`;
    el.addEventListener("dragstart", e => { el.classList.add("dragging"); e.dataTransfer.setData("text/plain", t.id); });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
    el.querySelector('[data-act="edit"]').addEventListener("click", () => openModal(t.column, t));
    el.querySelector('[data-act="del"]').addEventListener("click", () => {
      tasks = tasks.filter(x => x.id !== t.id); save(); render(document.getElementById("search").value);
    });
    return el;
  }

  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  // ---------- Modal ----------
  const colSelect = document.getElementById("taskColumn");
  COLUMNS.forEach(c => { const o = document.createElement("option"); o.value = c.id; o.textContent = c.name; colSelect.appendChild(o); });

  function openModal(colId, task = null) {
    editingId = task ? task.id : null;
    document.getElementById("modalTitle").textContent = task ? "Editar tarea" : "Nueva tarea";
    document.getElementById("taskTitle").value = task ? task.title : "";
    document.getElementById("taskDesc").value = task ? task.desc : "";
    document.getElementById("taskPriority").value = task ? task.priority : "medium";
    colSelect.value = task ? task.column : colId;
    modal.classList.remove("hidden");
    setTimeout(() => document.getElementById("taskTitle").focus(), 50);
  }
  function closeModal() { modal.classList.add("hidden"); editingId = null; }

  document.getElementById("saveTask").addEventListener("click", () => {
    const title = document.getElementById("taskTitle").value.trim();
    if (!title) { document.getElementById("taskTitle").focus(); return; }
    const data = {
      title,
      desc: document.getElementById("taskDesc").value.trim(),
      priority: document.getElementById("taskPriority").value,
      column: colSelect.value,
    };
    if (editingId) {
      const t = tasks.find(x => x.id === editingId);
      Object.assign(t, data);
    } else {
      tasks.push({ id: uid(), ...data });
    }
    save(); closeModal(); render(document.getElementById("search").value);
  });
  document.getElementById("cancelTask").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  // ---------- Topbar ----------
  document.getElementById("fab").addEventListener("click", () => openModal("todo"));
  document.getElementById("search").addEventListener("input", e => render(e.target.value));
  document.getElementById("clearAll").addEventListener("click", () => {
    if (confirm("¿Borrar TODAS las tareas?")) { tasks = []; save(); render(); }
  });

  const themeBtn = document.getElementById("themeToggle");
  if (localStorage.getItem("kanban.theme") === "dark") { document.body.classList.add("dark"); themeBtn.textContent = "☀️"; }
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    themeBtn.textContent = dark ? "☀️" : "🌙";
    localStorage.setItem("kanban.theme", dark ? "dark" : "light");
  });

  render();
})();
