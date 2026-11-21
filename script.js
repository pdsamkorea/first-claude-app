// ============================================================
// 저장 / 불러오기 (브라우저 localStorage)
// ============================================================
const TODO_KEY = "todos-v1";
const SHOP_KEY = "shop-v1";

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 저장 공간 문제 등은 무시 (화면 동작은 계속됨)
  }
}

// 오늘 날짜를 YYYY-MM-DD (로컬 시간 기준)로
function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

let nextId = Date.now();
function newId() {
  return nextId++;
}

// ============================================================
// 탭 전환
// ============================================================
const tabs = document.querySelectorAll(".tab");
tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabs.forEach((b) => b.classList.toggle("active", b === btn));
    document.getElementById("tab-todo").hidden = btn.dataset.tab !== "todo";
    document.getElementById("tab-shop").hidden = btn.dataset.tab !== "shop";
  });
});

// ============================================================
// 할 일
// 각 항목: { id, text, done, created, due }
// ============================================================
let todos = load(TODO_KEY, []);

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const dueInput = document.getElementById("todo-due");
const list = document.getElementById("todo-list");
const status = document.getElementById("status");

function addTodo(text, due) {
  todos.push({ id: newId(), text: text, done: false, created: today(), due: due || "" });
  save(TODO_KEY, todos);
  renderTodos();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  todo.done = !todo.done;
  save(TODO_KEY, todos);
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  save(TODO_KEY, todos);
  renderTodos();
}

// 정렬: 미완료 먼저, 마감일 빠른 순(마감일 없으면 뒤), 나머지는 추가 순
function sortedTodos() {
  return todos.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });
}

function renderTodos() {
  list.innerHTML = "";

  if (todos.length === 0) {
    list.innerHTML = '<li class="empty">할 일이 없어요. 하나 추가해보세요!</li>';
  }

  const t0 = today();

  sortedTodos().forEach((todo) => {
    const li = document.createElement("li");
    const overdue = !todo.done && todo.due && todo.due < t0;
    li.className = "todo-item" + (todo.done ? " done" : "") + (overdue ? " overdue" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const body = document.createElement("div");
    body.className = "todo-body";

    const label = document.createElement("span");
    label.className = "todo-text";
    label.textContent = todo.text;

    const meta = document.createElement("small");
    meta.className = "todo-meta";
    let metaText = `작성 ${todo.created}`;
    if (todo.due) metaText += ` · 마감 ${todo.due}${overdue ? " (지남)" : ""}`;
    meta.textContent = metaText;

    body.append(label, meta);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn";
    del.title = "삭제";
    del.textContent = "✕";
    del.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, body, del);
    list.appendChild(li);
  });

  const remaining = todos.filter((t) => !t.done).length;
  status.textContent = `남은 할 일 ${remaining}개 / 전체 ${todos.length}개`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === "") return;
  addTodo(text, dueInput.value);
  input.value = "";
  dueInput.value = "";
  input.focus();
});

renderTodos();

// ============================================================
// 장보기
// shop = { mode: "pick" | "go", categories: [{ name, items: [{ id, name, selected, got }] }] }
//  - pick: 품목을 카테고리별로 보며 이번에 살 것을 선택
//  - go:   선택한 품목만 모아서 장바구니에 담으며 체크
// ============================================================
function defaultShop() {
  const mk = (name, items) => ({
    name: name,
    items: items.map((n) => ({ id: newId(), name: n, selected: false, got: false })),
  });
  return {
    mode: "pick",
    categories: [
      mk("🥬 채소", ["양파", "대파", "감자"]),
      mk("🍎 과일", ["사과", "바나나"]),
      mk("🍱 반찬", ["김치", "두부", "어묵"]),
      mk("🥩 정육·수산", ["계란", "닭가슴살", "삼겹살"]),
      mk("🥛 유제품", ["우유", "요거트", "치즈"]),
      mk("🍞 곡류", ["쌀", "식빵", "라면"]),
      mk("🧂 양념·소스", ["간장", "소금", "식용유"]),
      mk("🧴 생필품", ["휴지", "세제", "샴푸"]),
    ],
  };
}

let shop = load(SHOP_KEY, null) || defaultShop();

// 예전에 저장된 "채소·과일" 카테고리를 "채소" + "과일"로 나누기 (채소가 위)
(function splitVegetableFruit() {
  const idx = shop.categories.findIndex((c) => c.name === "🥬 채소·과일");
  if (idx === -1) return;
  const fruitNames = ["사과", "바나나", "귤", "오렌지", "딸기", "포도", "수박", "참외", "배", "복숭아", "키위", "블루베리", "레몬", "토마토"];
  const old = shop.categories[idx];
  const veg = { name: "🥬 채소", items: old.items.filter((i) => !fruitNames.includes(i.name)) };
  const fruit = { name: "🍎 과일", items: old.items.filter((i) => fruitNames.includes(i.name)) };
  shop.categories.splice(idx, 1, veg, fruit);
  save(SHOP_KEY, shop);
})();

// 카테고리 이름 앞에 이모지가 없으면 붙여서 통일 (키워드에 맞는 이모지, 없으면 📦)
const EMOJI_BY_KEYWORD = [
  ["간식", "🍫"], ["과자", "🍪"], ["음료", "🥤"], ["커피", "☕"], ["냉동", "🧊"],
  ["빵", "🥐"], ["해산물", "🐟"], ["수산", "🐟"], ["건강", "💊"], ["반려", "🐾"], ["주방", "🍳"],
];
function withEmoji(name) {
  const trimmed = name.trim();
  if (/^\p{Extended_Pictographic}/u.test(trimmed)) return trimmed;
  const hit = EMOJI_BY_KEYWORD.find(([kw]) => trimmed.includes(kw));
  return `${hit ? hit[1] : "📦"} ${trimmed}`;
}

// 저장된 카테고리 중 이모지가 없는 것에 이모지 붙이기
(function emojiForAll() {
  let changed = false;
  shop.categories.forEach((c) => {
    const fixed = withEmoji(c.name);
    if (fixed !== c.name) {
      c.name = fixed;
      changed = true;
    }
  });
  if (changed) save(SHOP_KEY, shop);
})();

// 예전에 저장된 "곡류·빵·면" 카테고리 이름을 "곡류"로 변경
(function renameGrains() {
  const cat = shop.categories.find((c) => c.name === "🍞 곡류·빵·면");
  if (!cat) return;
  cat.name = "🍞 곡류";
  save(SHOP_KEY, shop);
})();

// 예전에 저장된 데이터에 "반찬" 카테고리를 과일 바로 다음(3번째)에 한 번만 추가
(function addSideDishes() {
  if (shop.sideDishAdded) return;
  shop.sideDishAdded = true;
  if (!shop.categories.some((c) => c.name === "🍱 반찬")) {
    const fruitIdx = shop.categories.findIndex((c) => c.name === "🍎 과일");
    const at = fruitIdx === -1 ? Math.min(2, shop.categories.length) : fruitIdx + 1;
    const items = ["김치", "두부", "어묵"].map((n) => ({ id: newId(), name: n, selected: false, got: false }));
    shop.categories.splice(at, 0, { name: "🍱 반찬", items: items });
  }
  save(SHOP_KEY, shop);
})();
const shopRoot = document.getElementById("shop-root");

function saveShop() {
  save(SHOP_KEY, shop);
}

function allItems() {
  return shop.categories.flatMap((c) => c.items);
}

// 작은 DOM 헬퍼
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderShop() {
  shopRoot.innerHTML = "";
  if (shop.mode === "go") renderShopGo();
  else renderShopPick();
}

// ---- 품목 고르기 ----
function renderShopPick() {
  const selectedCount = allItems().filter((i) => i.selected).length;

  const bar = el("div", "shop-bar");
  bar.append(el("span", "status", `이번에 살 것 ${selectedCount}개 선택됨`));

  const go = el("button", "primary-btn", "🛒 장보러 가기");
  go.type = "button";
  go.disabled = selectedCount === 0;
  go.addEventListener("click", () => {
    allItems().forEach((i) => (i.got = false));
    shop.mode = "go";
    saveShop();
    renderShop();
  });
  bar.append(go);
  shopRoot.append(bar);

  shopRoot.append(el("p", "hint", "품목을 눌러 이번에 살 것을 선택하세요."));

  shop.categories.forEach((cat, ci) => {
    const section = el("section", "category");

    const head = el("div", "category-head");
    head.append(el("h2", "", cat.name));
    const delCat = el("button", "icon-btn", "✕");
    delCat.type = "button";
    delCat.title = "카테고리 삭제";
    delCat.addEventListener("click", () => {
      if (cat.items.length > 0 && !confirm(`"${cat.name}"와 안의 품목 ${cat.items.length}개를 삭제할까요?`)) return;
      shop.categories.splice(ci, 1);
      saveShop();
      renderShop();
    });
    head.append(delCat);
    section.append(head);

    const chips = el("div", "chips");
    cat.items.forEach((item, ii) => {
      const chip = el("span", "chip" + (item.selected ? " selected" : ""));

      const name = el("button", "chip-name", item.name);
      name.type = "button";
      name.addEventListener("click", () => {
        item.selected = !item.selected;
        saveShop();
        renderShop();
      });

      const x = el("button", "chip-x", "×");
      x.type = "button";
      x.title = "품목 삭제";
      x.addEventListener("click", () => {
        cat.items.splice(ii, 1);
        saveShop();
        renderShop();
      });

      chip.append(name, x);
      chips.append(chip);
    });
    if (cat.items.length === 0) chips.append(el("span", "hint", "품목이 없어요."));
    section.append(chips);

    const addForm = el("form", "inline-form");
    const addInput = el("input");
    addInput.type = "text";
    addInput.placeholder = "품목 추가";
    addInput.autocomplete = "off";
    addInput.dataset.cat = ci;
    const addBtn = el("button", "", "추가");
    addBtn.type = "submit";
    addForm.append(addInput, addBtn);
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = addInput.value.trim();
      if (name === "") return;
      cat.items.push({ id: newId(), name: name, selected: false, got: false });
      saveShop();
      renderShop();
      // 화면을 다시 그린 뒤에도 같은 카테고리 입력칸에 포커스를 유지 (연속 입력)
      const again = shopRoot.querySelector(`input[data-cat="${ci}"]`);
      if (again) again.focus();
    });
    section.append(addForm);

    shopRoot.append(section);
  });

  // 카테고리 추가
  const catForm = el("form", "inline-form new-category");
  const catInput = el("input");
  catInput.type = "text";
  catInput.placeholder = "새 카테고리 (예: 🍫 간식)";
  catInput.autocomplete = "off";
  const catBtn = el("button", "", "카테고리 추가");
  catBtn.type = "submit";
  catForm.append(catInput, catBtn);
  catForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = catInput.value.trim();
    if (name === "") return;
    shop.categories.push({ name: withEmoji(name), items: [] });
    saveShop();
    renderShop();
  });
  shopRoot.append(catForm);
}

// ---- 장보는 중 ----
function renderShopGo() {
  const items = allItems().filter((i) => i.selected);
  const got = items.filter((i) => i.got).length;

  const bar = el("div", "shop-bar");
  bar.append(el("span", "status", `담은 것 ${got}개 / ${items.length}개`));

  const back = el("button", "", "← 품목 다시 고르기");
  back.type = "button";
  back.addEventListener("click", () => {
    shop.mode = "pick";
    saveShop();
    renderShop();
  });
  bar.append(back);
  shopRoot.append(bar);

  shop.categories.forEach((cat) => {
    const catItems = cat.items.filter((i) => i.selected);
    if (catItems.length === 0) return;

    const section = el("section", "category");
    section.append(el("h2", "", cat.name));

    const ul = el("ul", "todo-list");
    catItems.forEach((item) => {
      const li = el("li", "todo-item" + (item.got ? " done" : ""));
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = item.got;
      cb.addEventListener("change", () => {
        item.got = cb.checked;
        saveShop();
        renderShop();
      });
      li.append(cb, el("span", "todo-text", item.name));
      ul.append(li);
    });
    section.append(ul);
    shopRoot.append(section);
  });

  const finish = el("button", "primary-btn wide", "✅ 장보기 완료");
  finish.type = "button";
  finish.addEventListener("click", () => {
    if (got < items.length && !confirm("아직 못 담은 품목이 있어요. 그래도 끝낼까요?")) return;
    allItems().forEach((i) => {
      i.selected = false;
      i.got = false;
    });
    shop.mode = "pick";
    saveShop();
    renderShop();
  });
  shopRoot.append(finish);
}

renderShop();

// ============================================================
// 백업 / 복원 (JSON 파일)
// ============================================================
document.getElementById("export-btn").addEventListener("click", () => {
  const data = { app: "first-claude-app", version: 1, todos: todos, shop: shop };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `todo-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
});

const importFile = document.getElementById("import-file");
document.getElementById("import-btn").addEventListener("click", () => importFile.click());

importFile.addEventListener("change", () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const okTodos = Array.isArray(data.todos);
      const okShop = data.shop && Array.isArray(data.shop.categories);
      if (!okTodos || !okShop) throw new Error("형식이 맞지 않아요");
      if (!confirm("현재 데이터를 백업 파일의 내용으로 덮어쓸까요?")) return;
      save(TODO_KEY, data.todos);
      save(SHOP_KEY, data.shop);
      location.reload();
    } catch (e) {
      alert("불러올 수 없는 파일이에요. 이 앱에서 내보낸 백업 파일인지 확인해주세요.");
    } finally {
      importFile.value = "";
    }
  };
  reader.readAsText(file);
});
