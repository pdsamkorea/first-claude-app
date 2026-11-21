// 할 일 목록을 담는 배열. 각 항목: { id, text, done }
let todos = [];

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const status = document.getElementById("status");

// 할 일 추가
function addTodo(text) {
  todos.push({ id: Date.now(), text: text, done: false });
  render();
}

// 완료 ↔ 미완료 전환
function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  todo.done = !todo.done;
  render();
}

// 배열 내용을 화면에 그리기
function render() {
  list.innerHTML = "";

  if (todos.length === 0) {
    list.innerHTML = '<li class="empty">할 일이 없어요. 하나 추가해보세요!</li>';
  }

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const label = document.createElement("span");
    label.textContent = todo.text;

    li.append(checkbox, label);
    list.appendChild(li);
  });

  const remaining = todos.filter((t) => !t.done).length;
  status.textContent = `남은 할 일 ${remaining}개 / 전체 ${todos.length}개`;
}

// 폼 제출(추가 버튼 또는 Enter)
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === "") return;
  addTodo(text);
  input.value = "";
  input.focus();
});

render();
