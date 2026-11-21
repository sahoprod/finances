// ---------- КОНСТАНТЫ ----------
const INCOME_CATS = ["💼 Зарплата", "🎓 Стипендия", "💻 Фриланс", "📈 Инвестиции", "🎁 Подарки", "📦 Прочее"];
const EXPENSE_CATS = ["🍽 Еда", "🚗 Транспорт", "🏠 Жильё", "🎉 Развлечения", "💊 Здоровье", "📚 Образование", "📦 Прочее"];
const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const STORAGE_KEY = "finances_records_v1";

// ---------- СОСТОЯНИЕ ----------
let currentType = "expense";
let records = [];

// ---------- ХРАНИЛИЩЕ ----------
function loadRecords() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { records = []; }
  records.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ---------- УТИЛИТЫ ----------
function formatMoney(n) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

// ---------- НАВИГАЦИЯ ----------
function showScreen(name) {
  document.getElementById("screen-add").style.display = name === "add" ? "block" : "none";
  document.getElementById("screen-history").style.display = name === "history" ? "block" : "none";
  document.getElementById("tab-add").classList.toggle("active", name === "add");
  document.getElementById("tab-history").classList.toggle("active", name === "history");
  if (name === "history") renderHistory();
  window.scrollTo(0, 0);
}

// ---------- ТИП ----------
function setType(t) {
  currentType = t;
  document.querySelectorAll("#seg-type button").forEach(b => {
    b.classList.toggle("active", b.dataset.type === t);
  });
  updateCategories();
}

function updateCategories() {
  const cats = currentType === "income" ? INCOME_CATS : EXPENSE_CATS;
  const sel = document.getElementById("inp-category");
  sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join("");
}

// ---------- ДОБАВЛЕНИЕ ----------
function addRecord() {
  const amount = parseFloat(document.getElementById("inp-amount").value.replace(",", "."));
  const date = document.getElementById("inp-date").value;
  const category = document.getElementById("inp-category").value;
  const comment = document.getElementById("inp-comment").value.trim();

  if (!amount || amount <= 0) { showToast("Введите сумму больше 0"); return; }
  if (!date) { showToast("Выберите дату"); return; }

  records.push({
    id: Date.now() + Math.random(),
    date, type: currentType === "income" ? "Доход" : "Расход",
    category, amount, comment
  });
  saveRecords();
  document.getElementById("inp-amount").value = "";
  document.getElementById("inp-comment").value = "";
  showToast("✓ Запись сохранена");
  updateDashboard();
}

// ---------- ДАШБОРД ----------
function updateDashboard() {
  const now = new Date();
  const curMonth = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
  let totalIn = 0, totalOut = 0, mIn = 0, mOut = 0;
  records.forEach(r => {
    if (r.type === "Доход") totalIn += r.amount; else totalOut += r.amount;
    if (r.date.startsWith(curMonth)) {
      if (r.type === "Доход") mIn += r.amount; else mOut += r.amount;
    }
  });
  document.getElementById("balance-val").textContent = formatMoney(totalIn - totalOut);
  document.getElementById("month-income").textContent = "+" + formatMoney(mIn);
  document.getElementById("month-expense").textContent = "−" + formatMoney(mOut);
}

// ---------- ИСТОРИЯ ----------
function renderHistory() {
  updateDashboard();
  const yearSel = document.getElementById("filter-year");
  const monthSel = document.getElementById("filter-month");

  const years = [...new Set(records.map(r => r.date.slice(0,4)))].sort().reverse();
  const months = [...new Set(records.map(r => parseInt(r.date.slice(5,7))))].sort((a,b) => a-b);

  const curY = yearSel.value || "all";
  const curM = monthSel.value || "all";

  yearSel.innerHTML = `<option value="all">Все годы</option>` +
    years.map(y => `<option value="${y}" ${y===curY?"selected":""}>${y}</option>`).join("");
  monthSel.innerHTML = `<option value="all">Все месяцы</option>` +
    months.map(m => `<option value="${m}" ${String(m)===curM?"selected":""}>${MONTHS_RU[m-1]}</option>`).join("");

  const selY = yearSel.value;
  const selM = monthSel.value;
  const filtered = records.filter(r => {
    if (selY !== "all" && r.date.slice(0,4) !== selY) return false;
    if (selM !== "all" && parseInt(r.date.slice(5,7)) !== parseInt(selM)) return false;
    return true;
  });

  const list = document.getElementById("list");
  if (!filtered.length) {
    list.innerHTML = `<div class="empty">Пока нет записей<br>Добавьте первую на вкладке «＋»</div>`;
    return;
  }
  list.innerHTML = filtered.map(r => {
    const isIncome = r.type === "Доход";
    const sign = isIncome ? "+" : "−";
    const cls = isIncome ? "income" : "expense";
    return `<div class="list-item ${cls}" onclick="openEdit(${r.id})">
      <div class="info">
        <div class="cat">${r.category}</div>
        <div class="meta">${r.date}${r.comment ? " · " + r.comment : ""}</div>
      </div>
      <div class="amt">${sign}${formatMoney(r.amount)}</div>
    </div>`;
  }).join("");
}

// ---------- РЕДАКТИРОВАНИЕ ----------
function openEdit(id) {
  const r = records.find(x => x.id === id);
  if (!r) return;
  const action = confirm(`Редактировать запись?\n\n${r.category}\n${r.date}\n${formatMoney(r.amount)}\n\nOK — редактировать, Отмена — удалить`);
  if (!action) {
    if (confirm("Удалить эту запись?")) {
      records = records.filter(x => x.id !== id);
      saveRecords();
      renderHistory();
      showToast("Запись удалена");
    }
    return;
  }
  const newAmount = prompt("Новая сумма:", r.amount);
  if (newAmount === null) return;
  const amt = parseFloat(String(newAmount).replace(",", "."));
  if (!amt || amt <= 0) { showToast("Некорректная сумма"); return; }
  r.amount = amt;
  const newComment = prompt("Комментарий:", r.comment);
  if (newComment !== null) r.comment = newComment.trim();
  saveRecords();
  renderHistory();
  showToast("✓ Обновлено");
}

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
function init() {
  document.getElementById("inp-date").value = todayStr();
  updateCategories();
  loadRecords();
  updateDashboard();
  renderHistory();
  // Регистрация service worker для офлайн-режима
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();