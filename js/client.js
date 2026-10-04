// ---------- Shared state for the customer page ----------
const ICONS = {
  "Milk Shake & Ice Cream": "🥤",
  Falooda: "🍨",
  "Fresh Limes": "🍋",
  "Fruit Salad": "🍓",
  Mutton: "🍖",
  Fish: "🐟",
  Dinner: "🫓",
  Chinese: "🥡",
  "Fried Rice": "🍚",
  Noodles: "🍜",
};
const menuManager = new MenuManager();
const cartManager = new CartManager();
const orderManager = new OrderManager();
let currentCategory = "All";
let searchQuery = "";
let pendingCustomer = null;

document.addEventListener("DOMContentLoaded", initializeApp);

// This function starts the app: binds events, shows the cart, then loads and renders the menu.
async function initializeApp() {
  bindEvents();
  renderCart();
  await loadMenu();
}

// This function loads the menu with fetch() and renders it, or shows an error message.
async function loadMenu() {
  try {
    await menuManager.load();
    $("#loading").hidden = true;
    renderCategories();
    renderMenu();
    $("#priceNote").hidden = allItemsPriced();
    UIManager.toast("Menu loaded successfully");
  } catch (error) {
    console.error(error);
    $("#loading").textContent = "Unable to load menu. Please refresh the page.";
  }
}

// This function is a short helper that finds one element using a CSS selector.
function $(selector) {
  return document.querySelector(selector);
}

// This function returns true when every menu item has a real price (so the placeholder note can be hidden).
function allItemsPriced() {
  return !menuManager.items.some(isUnpricedItem);
}

// This function checks whether a menu item still has the placeholder price 0.
function isUnpricedItem(item) {
  return item.price === 0;
}

// ---------- Event binding ----------

// This function attaches every event listener of the page using named handler functions.
function bindEvents() {
  $("#search").addEventListener("input", handleSearch);
  $("#cartBtn").addEventListener("click", handleOpenCart);
  $("#heroCart").addEventListener("click", handleOpenCart);
  $("#closeCart").addEventListener("click", handleCloseCart);
  $("#overlay").addEventListener("click", handleCloseCart);
  $("#orderForm").addEventListener("submit", handleOrderSubmit);
  $("#cancelOrder").addEventListener("click", closeOrderModal);
  $("#ordersBtn").addEventListener("click", showOrders);
  document.addEventListener("keydown", handleKeydown);
}

// This function handles typing in the search box.
function handleSearch(event) {
  searchQuery = event.target.value;
  renderMenu();
}

// This function handles clicks on buttons that open the cart.
function handleOpenCart() {
  toggleCart(true);
}

// This function handles clicks that close the cart.
function handleCloseCart() {
  toggleCart(false);
}

// This function closes the cart when the Escape key is pressed.
function handleKeydown(event) {
  if (event.key === "Escape") toggleCart(false);
}

// This function opens or closes the slide-out cart drawer.
function toggleCart(open) {
  $("#drawer").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", String(!open));
  $("#overlay").hidden = !open;
  if (open) $("#closeCart").focus();
}

// ---------- Menu rendering ----------

// This function renders the category filter buttons.
function renderCategories() {
  $("#filters").textContent = "";
  const names = ["All", ...menuManager.categories.map(getCategoryName)];
  names.forEach(renderCategoryButton);
}

// This function returns the name of a category object.
function getCategoryName(category) {
  return category.category;
}

// This function creates one category filter button and adds it to the page.
function renderCategoryButton(name) {
  const button = UIManager.el(
    "button",
    "chip" + (name === currentCategory ? " active" : ""),
    name,
  );
  button.type = "button";
  button.dataset.cat = name;
  button.addEventListener("click", handleCategoryClick);
  $("#filters").appendChild(button);
}

// This function handles a click on a category button by filtering the menu.
function handleCategoryClick(event) {
  currentCategory = event.currentTarget.dataset.cat;
  renderCategories();
  renderMenu();
}

// This function renders the food cards for the current category and search text.
function renderMenu() {
  $("#grid").textContent = "";
  const items = menuManager.filter(currentCategory, searchQuery);
  $("#empty").hidden = items.length > 0;
  items.forEach(renderFoodCard);
}

// This function creates a food card and adds it to the menu grid.
function renderFoodCard(item) {
  $("#grid").appendChild(createFoodCard(item));
}

// This function builds the card element for a single food item.
function createFoodCard(item) {
  const card = UIManager.el("article", "card");
  card.append(
    UIManager.el("div", "icon", ICONS[item.category] || "🍽️"),
    UIManager.el("h3", "", item.name),
    UIManager.el("span", "cat", item.category),
    UIManager.el("div", "price", UIManager.money(item.price)),
  );
  card.append(createQuantitySelector(), createAddButton(item));
  return card;
}

// This function builds the [-] 1 [+] quantity selector of a food card.
function createQuantitySelector() {
  const box = UIManager.el("div", "qty");
  const minus = UIManager.el("button", "", "−");
  const plus = UIManager.el("button", "", "+");
  minus.type = "button";
  plus.type = "button";
  minus.setAttribute("aria-label", "Decrease");
  plus.setAttribute("aria-label", "Increase");
  minus.addEventListener("click", handleCardMinus);
  plus.addEventListener("click", handleCardPlus);
  box.append(minus, UIManager.el("span", "", "1"), plus);
  return box;
}

// This function builds the "Add to Cart" button of a food card.
function createAddButton(item) {
  const button = UIManager.el("button", "btn primary", "Add to Cart");
  button.type = "button";
  button.dataset.id = item.id;
  button.addEventListener("click", handleAddToCartClick);
  return button;
}

// This function lowers the quantity shown on a food card (minimum 1).
function handleCardMinus(event) {
  const number = event.currentTarget.parentElement.querySelector("span");
  const quantity = parseInt(number.textContent);
  if (quantity > 1) number.textContent = quantity - 1;
}

// This function raises the quantity shown on a food card.
function handleCardPlus(event) {
  const number = event.currentTarget.parentElement.querySelector("span");
  number.textContent = parseInt(number.textContent) + 1;
}

// This function reads the card quantity, adds the dish to the cart and resets the card quantity.
function handleAddToCartClick(event) {
  const button = event.currentTarget;
  const number = button.closest(".card").querySelector(".qty span");
  addToCart(button.dataset.id, parseInt(number.textContent));
  number.textContent = "1";
}

// ---------- Cart logic + rendering ----------

// This function adds a menu item (by id) to the cart and refreshes the cart display.
function addToCart(itemId, quantity) {
  const item = menuManager.findItem(itemId);
  if (!item) return;
  cartManager.addItem(item, quantity);
  renderCart();
  UIManager.toast("Added to cart");
}

// This function removes an item from the cart.
function removeFromCart(itemId) {
  cartManager.removeItem(itemId);
  renderCart();
  UIManager.toast("Item removed");
}

// This function increases the quantity of a cart item.
function increaseQuantity(itemId) {
  cartManager.increaseQuantity(itemId);
  renderCart();
}

// This function decreases the quantity of a cart item.
function decreaseQuantity(itemId) {
  cartManager.decreaseQuantity(itemId);
  renderCart();
}

// This function renders the cart count, the cart rows and the cart footer.
function renderCart() {
  $("#cartCount").textContent = cartManager.getTotalItems();
  $("#cartBody").textContent = "";
  $("#cartFoot").textContent = "";
  if (cartManager.cart.length === 0) {
    renderEmptyCart();
    return;
  }
  cartManager.cart.forEach(renderCartRow);
  renderCartFooter();
}

// This function shows the "Your cart is empty" message.
function renderEmptyCart() {
  const box = UIManager.el("div", "empty-cart");
  box.append(
    UIManager.el("h3", "", "Your cart is empty"),
    UIManager.el("p", "", "Add something delicious from our menu."),
  );
  const link = UIManager.el("a", "btn primary", "EXPLORE MENU");
  link.href = "#menu";
  link.addEventListener("click", handleCloseCart);
  box.appendChild(link);
  $("#cartBody").appendChild(box);
}

// This function creates one cart row and adds it to the cart drawer.
function renderCartRow(line) {
  const row = UIManager.el("div", "cart-row");
  const info = UIManager.el("div");
  info.append(
    UIManager.el("strong", "", line.name),
    UIManager.el("div", "muted", UIManager.money(line.price) + " each"),
  );
  row.append(
    info,
    createCartQuantity(line),
    UIManager.el("div", "sub", UIManager.money(line.price * line.quantity)),
    createRemoveButton(line),
  );
  $("#cartBody").appendChild(row);
}

// This function builds the quantity controls of a cart row.
function createCartQuantity(line) {
  const box = UIManager.el("div", "qty");
  const minus = UIManager.el("button", "", "−");
  const plus = UIManager.el("button", "", "+");
  minus.type = "button";
  plus.type = "button";
  minus.dataset.id = line.id;
  plus.dataset.id = line.id;
  minus.setAttribute("aria-label", "Decrease " + line.name);
  plus.setAttribute("aria-label", "Increase " + line.name);
  minus.addEventListener("click", handleCartMinus);
  plus.addEventListener("click", handleCartPlus);
  box.append(minus, UIManager.el("span", "", line.quantity), plus);
  return box;
}

// This function builds the remove (trash) button of a cart row.
function createRemoveButton(line) {
  const button = UIManager.el("button", "icon-btn", "🗑");
  button.type = "button";
  button.dataset.id = line.id;
  button.setAttribute("aria-label", "Remove " + line.name);
  button.addEventListener("click", handleCartRemove);
  return button;
}

// This function handles the [-] button of a cart row.
function handleCartMinus(event) {
  decreaseQuantity(event.currentTarget.dataset.id);
}

// This function handles the [+] button of a cart row.
function handleCartPlus(event) {
  increaseQuantity(event.currentTarget.dataset.id);
}

// This function handles the remove button of a cart row.
function handleCartRemove(event) {
  removeFromCart(event.currentTarget.dataset.id);
}

// This function renders the totals and the Clear Cart / Place Order buttons.
function renderCartFooter() {
  const foot = $("#cartFoot");
  const clear = UIManager.el("button", "btn ghost", "CLEAR CART");
  const place = UIManager.el("button", "btn primary", "PLACE ORDER");
  clear.type = "button";
  place.type = "button";
  clear.addEventListener("click", handleClearCart);
  place.addEventListener("click", handlePlaceOrderClick);
  foot.append(
    UIManager.el("div", "tot", "Total Items: " + cartManager.getTotalItems()),
    UIManager.el(
      "div",
      "tot big",
      "Grand Total: " + UIManager.money(cartManager.getTotal()),
    ),
    clear,
    place,
  );
}

// This function handles the Clear Cart button.
function handleClearCart() {
  cartManager.clearCart();
  renderCart();
  UIManager.toast("Cart cleared");
}

// This function handles the Place Order button by closing the cart and opening the order form.
function handlePlaceOrderClick() {
  toggleCart(false);
  openOrderModal();
}

// ---------- Order form ----------

// This function opens the order form dialog.
function openOrderModal() {
  $("#orderDialog").showModal();
  $("#cName").focus();
}

// This function closes the order form dialog.
function closeOrderModal() {
  $("#orderDialog").close();
}

// This function checks the customer name and returns an error message ("" when valid).
function validateCustomerName(name) {
  return name.length < 2 ? "Please enter your name (min 2 characters)." : "";
}

// This function checks the table number and returns an error message ("" when valid).
function validateTableNumber(table) {
  return /^[1-9]\d{0,2}$/.test(table)
    ? ""
    : "Enter a valid table number (1–999).";
}

// This function checks the optional phone number and returns an error message ("" when valid).
function validatePhone(phone) {
  return phone && !/^[0-9+\-\s]{7,15}$/.test(phone)
    ? "Enter a valid phone number."
    : "";
}

// This function reads and trims the values typed in the order form.
function readCustomerForm() {
  return {
    name: $("#cName").value.trim(),
    table: $("#cTable").value.trim(),
    phone: $("#cPhone").value.trim(),
    description: $("#cDesc").value.trim(),
  };
}

// This function validates all order form fields, shows the messages and returns true when everything is valid.
function validateOrderForm() {
  const customer = readCustomerForm();
  const nameError = validateCustomerName(customer.name);
  const tableError = validateTableNumber(customer.table);
  const phoneError = validatePhone(customer.phone);
  $("#eName").textContent = nameError;
  $("#eTable").textContent = tableError;
  $("#ePhone").textContent = phoneError;
  return !nameError && !tableError && !phoneError;
}

// This function handles submission of the order form: validate, then show the order summary.
function handleOrderSubmit(event) {
  event.preventDefault();
  if (!validateOrderForm()) return;
  if (cartManager.cart.length === 0) {
    UIManager.toast("Your cart is empty");
    return;
  }
  pendingCustomer = readCustomerForm();
  closeOrderModal();
  showOrderSummary();
}

// This function shows the order summary dialog with Cancel and Confirm buttons.
function showOrderSummary() {
  const body = $("#summaryBody");
  body.textContent = "";
  body.append(
    UIManager.el("h2", "", "Order Summary"),
    UIManager.el("p", "", "Customer: " + pendingCustomer.name),
    UIManager.el("p", "", "Table: " + pendingCustomer.table),
  );
  cartManager.cart.forEach(renderSummaryLine);
  body.append(
    UIManager.el(
      "p",
      "tot big",
      "Total: " + UIManager.money(cartManager.getTotal()),
    ),
    UIManager.el(
      "p",
      "muted",
      "Description: " + (pendingCustomer.description || "—"),
    ),
  );
  const actions = UIManager.el("div", "dlg-actions");
  const cancel = UIManager.el("button", "btn ghost", "Cancel");
  const confirm = UIManager.el("button", "btn primary", "Confirm Order");
  cancel.addEventListener("click", closeSummary);
  confirm.addEventListener("click", handleConfirmOrder);
  actions.append(cancel, confirm);
  body.appendChild(actions);
  $("#summaryDialog").showModal();
}

// This function adds one "Food xN — price" line to the order summary.
function renderSummaryLine(line) {
  const text = `${line.name} x${line.quantity} — ${UIManager.money(line.price * line.quantity)}`;
  $("#summaryBody").appendChild(UIManager.el("p", "line", text));
}

// This function closes the order summary dialog.
function closeSummary() {
  $("#summaryDialog").close();
}

// This function handles the Confirm Order button: create, save, clear the cart, show success.
function handleConfirmOrder() {
  const order = createOrder();
  saveOrder(order);
  clearCartAfterOrder();
  showOrderSuccess(order);
}

// This function creates the order object from the customer details and the current cart.
function createOrder() {
  return orderManager.createOrder(pendingCustomer, cartManager);
}

// This function saves the new order to localStorage so the kitchen can read it.
function saveOrder(order) {
  orderManager.saveOrder(order);
}

// This function clears the cart and the order form after an order has been placed.
function clearCartAfterOrder() {
  cartManager.clearCart();
  renderCart();
  pendingCustomer = null;
  $("#orderForm").reset();
  closeSummary();
}

// This function displays the "Order Placed" success dialog.
function showOrderSuccess(order) {
  const body = $("#successBody");
  body.textContent = "";
  const done = UIManager.el("button", "btn primary", "Continue Browsing");
  done.addEventListener("click", closeSuccess);
  body.append(
    UIManager.el("div", "check", "✓ ORDER PLACED"),
    UIManager.el("p", "", "Order ID: " + order.orderId),
    UIManager.el("p", "", "Table: " + order.tableNumber),
    UIManager.el("p", "", "Total: " + UIManager.money(order.totalAmount)),
    UIManager.el("p", "muted", "Your food order has been sent to the kitchen."),
    done,
  );
  $("#successDialog").showModal();
  UIManager.toast("Order placed successfully");
}

// This function closes the success dialog.
function closeSuccess() {
  $("#successDialog").close();
}

// ---------- My Orders ----------

// This function shows the "My Orders" dialog with every order stored in this browser.
function showOrders() {
  const body = $("#ordersBody");
  body.textContent = "";
  body.appendChild(UIManager.el("h2", "", "My Orders"));
  const allOrders = [
    ...orderManager.getOrders(),
    ...orderManager.getCompleted(),
  ].sort(sortOrdersByNewest);
  if (allOrders.length === 0)
    body.appendChild(UIManager.el("p", "muted", "No orders yet."));
  allOrders.forEach(renderOrderHistoryRow);
  const close = UIManager.el("button", "btn ghost", "Close");
  close.addEventListener("click", closeOrders);
  body.appendChild(close);
  $("#ordersDialog").showModal();
}

// This function creates one order row in the My Orders dialog.
function renderOrderHistoryRow(order) {
  const row = UIManager.el("div", "order-hist");
  row.append(
    UIManager.el("strong", "", `${order.orderId} · Table ${order.tableNumber}`),
    UIManager.el("div", "muted", UIManager.fmt(order.createdAt)),
    UIManager.el("div", "", order.items.map(formatItemText).join(", ")),
    UIManager.el(
      "div",
      "",
      `${UIManager.money(order.totalAmount)} · ${order.status}`,
    ),
  );
  $("#ordersBody").appendChild(row);
}

// This function formats an order item as "Name xQuantity".
function formatItemText(item) {
  return `${item.name} x${item.quantity}`;
}

// This function closes the My Orders dialog.
function closeOrders() {
  $("#ordersDialog").close();
}
