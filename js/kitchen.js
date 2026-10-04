// ---------- Shared state for the kitchen page ----------
const orderManager = new OrderManager();
let autoTimer = null; // holds the id of the single 5-second refresh interval
let currentFilter = "all";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", initializeApp);

// This function is a short helper that finds one element using a CSS selector.
function $(selector) {
  return document.querySelector(selector);
}

// This function starts the kitchen dashboard: events, clock, first render and auto-refresh.
function initializeApp() {
  bindEvents();
  setInterval(updateClock, 1000);
  updateClock();
  loadOrders();
  startAutoRefresh();
}

// ---------- Event binding ----------

// This function attaches every event listener of the page using named handler functions.
function bindEvents() {
  $("#search").addEventListener("input", handleSearch);
  document.querySelectorAll("#filters .chip").forEach(bindFilterButton);
  $("#autoBtn").addEventListener("click", handleAutoToggle);
  $("#refreshBtn").addEventListener("click", loadOrders);
  $("#clearBtn").addEventListener("click", openClearDialog);
  $("#noBtn").addEventListener("click", closeClearDialog);
  $("#yesBtn").addEventListener("click", handleConfirmClear);
  // The "storage" event fires when ANOTHER tab/window of the same origin changes localStorage,
  // so the kitchen sees new orders from client.html without waiting for the timer.
  window.addEventListener("storage", handleStorageChange);
}

// This function attaches the click listener to one filter button.
function bindFilterButton(button) {
  button.addEventListener("click", handleFilterClick);
}

// This function handles typing in the order search box.
function handleSearch(event) {
  searchQuery = event.target.value.trim().toLowerCase();
  loadOrders();
}

// This function handles a click on All / Pending / Completed.
function handleFilterClick(event) {
  currentFilter = event.currentTarget.dataset.f;
  document.querySelectorAll("#filters .chip").forEach(updateFilterButton);
  loadOrders();
}

// This function highlights the filter button that matches the current filter.
function updateFilterButton(button) {
  button.classList.toggle("active", button.dataset.f === currentFilter);
}

// This function refreshes the dashboard when orders change in another tab.
function handleStorageChange(event) {
  if (event.key === KEYS.orders || event.key === KEYS.completed) loadOrders();
}

// This function handles the Auto Refresh ON/OFF button.
function handleAutoToggle() {
  if (autoTimer) stopAutoRefresh();
  else startAutoRefresh();
}

// This function handles the Mark As Done button of an order card.
function handleMarkDone(event) {
  completeOrder(event.currentTarget.dataset.id);
}

// This function opens the "clear completed" confirmation dialog.
function openClearDialog() {
  $("#confirmDlg").showModal();
}

// This function closes the "clear completed" confirmation dialog.
function closeClearDialog() {
  $("#confirmDlg").close();
}

// This function removes today's completed orders after the user confirms.
function handleConfirmClear() {
  orderManager.clearCompletedToday();
  closeClearDialog();
  loadOrders();
  UIManager.toast("Completed orders cleared");
}

// ---------- Clock + auto refresh ----------

// This function shows the current date and time in the header.
function updateClock() {
  const now = new Date();
  $("#date").textContent = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  $("#time").textContent = now.toLocaleTimeString("en-US");
}

// This function starts exactly one 5-second refresh interval (clearing any old one first).
function startAutoRefresh() {
  clearInterval(autoTimer);
  autoTimer = setInterval(loadOrders, 5000);
  showAutoState(true);
}

// This function stops the refresh interval.
function stopAutoRefresh() {
  clearInterval(autoTimer);
  autoTimer = null;
  showAutoState(false);
}

// This function updates the Auto Refresh button text and aria-pressed state.
function showAutoState(isOn) {
  $("#autoBtn").textContent = "Auto Refresh: " + (isOn ? "ON" : "OFF");
  $("#autoBtn").setAttribute("aria-pressed", String(isOn));
}

// ---------- Kitchen data logic ----------

// This function returns all searchable text values of an order (ID, customer, table and food names).
function getSearchableValues(order) {
  return [
    order.orderId,
    order.customerName,
    order.tableNumber,
    ...order.items.map(getItemName),
  ];
}

// This function returns the name of an order item.
function getItemName(item) {
  return item.name;
}

// This function checks whether one text value contains the current search text.
function valueMatchesSearch(value) {
  return String(value).toLowerCase().includes(searchQuery);
}

// This function checks whether an order matches the current search text.
function orderMatchesSearch(order) {
  if (!searchQuery) return true;
  return getSearchableValues(order).some(valueMatchesSearch);
}

// This function loads pending orders from localStorage, newest first.
function getPendingOrders() {
  return orderManager.getOrders().sort(sortOrdersByNewest);
}

// This function loads today's completed orders from localStorage, newest first.
function getCompletedToday() {
  return orderManager
    .getCompleted()
    .filter(isCompletedToday)
    .sort(sortOrdersByCompleted);
}

// This function calculates today's sales from the completed orders.
function calculateTodaySales(completedOrders) {
  return completedOrders.reduce(addOrderAmount, 0);
}

// This function moves an order to the completed list and refreshes the dashboard.
function completeOrder(orderId) {
  orderManager.completeOrder(orderId);
  loadOrders();
  UIManager.toast("Order marked as completed");
}

// ---------- Rendering ----------

// This function reloads orders from localStorage and renders the whole dashboard.
function loadOrders() {
  const pending = getPendingOrders();
  const completed = getCompletedToday();
  renderStats(pending, completed);
  const showPending = currentFilter !== "completed";
  const showCompleted = currentFilter !== "pending";
  $("#incomingSec").hidden = !showPending;
  $("#doneSec").hidden = !showCompleted;
  renderKitchenOrders(pending, showPending);
  renderCompletedOrders(completed, showCompleted);
  $("#updated").textContent = new Date().toLocaleTimeString("en-US");
}

// This function renders the four summary cards at the top of the dashboard.
function renderStats(pending, completed) {
  $("#stats").textContent = "";
  const cards = [
    ["Total Orders", pending.length + completed.length],
    ["Pending", pending.length],
    ["Completed", completed.length],
    ["Sales Today", UIManager.money(calculateTodaySales(completed))],
  ];
  cards.forEach(renderStatCard);
}

// This function creates one summary card and adds it to the stats area.
function renderStatCard(card) {
  const box = UIManager.el("div", "stat");
  box.append(
    UIManager.el("span", "", card[0]),
    UIManager.el("strong", "", card[1]),
  );
  $("#stats").appendChild(box);
}

// This function renders the Incoming Orders column (or its empty state).
function renderKitchenOrders(pending, isVisible) {
  $("#incoming").textContent = "";
  const orders = isVisible ? pending.filter(orderMatchesSearch) : [];
  if (orders.length === 0) {
    const hasPending = pending.length > 0;
    renderEmptyState(
      $("#incoming"),
      hasPending ? "No matching orders" : "No pending orders",
      hasPending
        ? "Try a different search."
        : "New customer orders will appear here.",
    );
    return;
  }
  orders.forEach(renderIncomingOrder);
}

// This function renders the Sold Today column (or its empty state).
function renderCompletedOrders(completed, isVisible) {
  $("#completed").textContent = "";
  const orders = isVisible ? completed.filter(orderMatchesSearch) : [];
  if (orders.length === 0) {
    renderEmptyState($("#completed"), "No completed orders today.", "");
    return;
  }
  orders.forEach(renderCompletedOrder);
}

// This function adds one pending order card to the Incoming Orders column.
function renderIncomingOrder(order) {
  $("#incoming").appendChild(createKitchenOrderCard(order, false));
}

// This function adds one completed order card to the Sold Today column.
function renderCompletedOrder(order) {
  $("#completed").appendChild(createKitchenOrderCard(order, true));
}

// This function shows a title and message inside an empty column.
function renderEmptyState(container, title, message) {
  const box = UIManager.el("div", "empty");
  box.append(UIManager.el("h3", "", title), UIManager.el("p", "", message));
  container.appendChild(box);
}

// This function creates the kitchen order card for a single order (pending or completed).
function createKitchenOrderCard(order, isDone) {
  const card = UIManager.el("article", "order" + (isDone ? " done" : ""));
  const head = UIManager.el("div", "o-head");
  head.append(
    UIManager.el("strong", "", "ORDER #" + order.orderId),
    UIManager.el("span", "table-badge", "TABLE " + order.tableNumber),
  );
  card.append(
    head,
    UIManager.el("div", "muted", "Customer: " + order.customerName),
    UIManager.el("div", "muted", "Placed: " + UIManager.fmt(order.createdAt)),
  );
  if (isDone)
    card.appendChild(
      UIManager.el(
        "div",
        "muted",
        "Completed: " + UIManager.fmt(order.completedAt),
      ),
    );
  const items = UIManager.el("div", "items");
  items.append(...order.items.map(createItemRow));
  card.appendChild(items);
  if (order.description)
    card.appendChild(
      UIManager.el("div", "note", "Special Instructions: " + order.description),
    );
  card.appendChild(createOrderFooter(order, isDone));
  if (!isDone) card.appendChild(createDoneButton(order));
  return card;
}

// This function creates one "name  xQty  price" row for an order item.
function createItemRow(item) {
  const row = UIManager.el("div", "irow");
  row.append(
    UIManager.el("span", "", item.name),
    UIManager.el("span", "", "x" + item.quantity),
    UIManager.el("span", "", UIManager.money(item.price * item.quantity)),
  );
  return row;
}

// This function creates the footer of an order card with the total and the status badge.
function createOrderFooter(order, isDone) {
  const footer = UIManager.el("div", "o-foot");
  footer.append(
    UIManager.el("strong", "", "Total: " + UIManager.money(order.totalAmount)),
    UIManager.el(
      "span",
      "status " + (isDone ? "c" : "p"),
      isDone ? "COMPLETED" : order.status,
    ),
  );
  return footer;
}

// This function creates the MARK AS DONE button of a pending order.
function createDoneButton(order) {
  const button = UIManager.el("button", "btn primary", "MARK AS DONE");
  button.type = "button";
  button.dataset.id = order.orderId;
  button.addEventListener("click", handleMarkDone);
  return button;
}
