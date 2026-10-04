// ---------- Small top-level helper functions used as array callbacks ----------

// This function adds one cart item's price x quantity to a running total (used with reduce).
function calculateItemTotal(total, item) {
  return total + item.price * item.quantity;
}

// This function adds one cart item's quantity to a running count (used with reduce).
function calculateItemCount(count, item) {
  return count + item.quantity;
}

// This function makes a copy of a cart item so an order does not share objects with the cart.
function copyCartItem(item) {
  return { ...item };
}

// This function returns the items of one menu category (used with flatMap).
function getCategoryItems(category) {
  return category.items;
}

// This function sorts orders from newest to oldest by creation time.
function sortOrdersByNewest(orderA, orderB) {
  return new Date(orderB.createdAt) - new Date(orderA.createdAt);
}

// This function sorts orders from newest to oldest by completion time.
function sortOrdersByCompleted(orderA, orderB) {
  return new Date(orderB.completedAt) - new Date(orderA.completedAt);
}

// This function checks whether an order was completed today.
function isCompletedToday(order) {
  return UIManager.isToday(order.completedAt);
}

// This function checks whether an order was NOT completed today (used when clearing today's completed orders).
function isNotCompletedToday(order) {
  return !isCompletedToday(order);
}

// This function adds one order's total amount to a running total (used with reduce).
function addOrderAmount(total, order) {
  return total + order.totalAmount;
}

// ---------- UI helpers ----------

class UIManager {
  // This method creates a DOM element with an optional CSS class and text (textContent keeps user input safe).
  static el(tag, cls, text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // This method formats a number as Indian rupees.
  static money(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
  }

  // This method formats an ISO date string like "04 Oct 2026, 10:35 AM".
  static fmt(iso) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  // This method checks whether an ISO date string falls on today's date.
  static isToday(iso) {
    return (
      Boolean(iso) && new Date(iso).toDateString() === new Date().toDateString()
    );
  }

  // This method shows a toast notification message.
  static toast(message) {
    let box = document.getElementById("toasts");
    if (!box) {
      box = UIManager.el("div");
      box.id = "toasts";
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    const toast = UIManager.el("div", "toast", message);
    box.appendChild(toast);
    setTimeout(UIManager.fadeToast, 2200, toast);
    setTimeout(UIManager.removeToast, 2600, toast);
  }

  // This method starts the fade-out animation of a toast.
  static fadeToast(toast) {
    toast.classList.add("out");
  }

  // This method removes a toast from the page.
  static removeToast(toast) {
    toast.remove();
  }
}

// ---------- Menu ----------

class MenuManager {
  // This constructor prepares empty category and item lists.
  constructor() {
    this.categories = [];
    this.items = [];
  }

  // This method loads menu data from the static JSON file and stores it.
  async load() {
    const response = await fetch("./data/menu.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    this.categories = await response.json();
    this.items = this.categories.flatMap(getCategoryItems);
    StorageManager.save(KEYS.menu, this.categories);
  }

  // This method finds one menu item by its id.
  findItem(id) {
    for (const item of this.items) {
      if (item.id === id) return item;
    }
    return null;
  }

  // This method returns items matching a category and a search text.
  filter(category, query) {
    const text = query.trim().toLowerCase();
    const result = [];
    for (const item of this.items) {
      const categoryMatches = category === "All" || item.category === category;
      const textMatches =
        !text ||
        item.name.toLowerCase().includes(text) ||
        item.category.toLowerCase().includes(text);
      if (categoryMatches && textMatches) result.push(item);
    }
    return result;
  }
}

// ---------- Cart ----------

class CartManager {
  // This constructor restores the saved cart from localStorage.
  constructor() {
    this.cart = StorageManager.get(KEYS.cart);
  }

  // This method saves the cart in localStorage.
  persist() {
    StorageManager.save(KEYS.cart, this.cart);
  }

  // This method finds one cart line by item id.
  findCartItem(id) {
    for (const line of this.cart) {
      if (line.id === id) return line;
    }
    return null;
  }

  // This method adds an item to the cart, merging duplicates and keeping quantity at least 1.
  addItem(item, qty = 1) {
    qty = Math.max(1, parseInt(qty) || 1);
    const existing = this.findCartItem(item.id);
    if (existing) existing.quantity += qty;
    else
      this.cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: qty,
      });
    this.persist();
  }

  // This method removes an item from the cart.
  removeItem(id) {
    const remaining = [];
    for (const line of this.cart) {
      if (line.id !== id) remaining.push(line);
    }
    this.cart = remaining;
    this.persist();
  }

  // This method increases the quantity of a cart item by one.
  increaseQuantity(id) {
    const line = this.findCartItem(id);
    if (line) line.quantity++;
    this.persist();
  }

  // This method decreases the quantity of a cart item by one, never below 1.
  decreaseQuantity(id) {
    const line = this.findCartItem(id);
    if (line && line.quantity > 1) line.quantity--;
    this.persist();
  }

  // This method counts all items in the cart.
  getTotalItems() {
    return this.cart.reduce(calculateItemCount, 0);
  }

  // This method calculates the grand total of the cart.
  getTotal() {
    return this.cart.reduce(calculateItemTotal, 0);
  }

  // This method empties the cart.
  clearCart() {
    this.cart = [];
    this.persist();
  }
}

// ---------- Orders ----------

class OrderManager {
  // This method returns all pending orders from localStorage.
  getOrders() {
    return StorageManager.get(KEYS.orders);
  }

  // This method returns all completed orders from localStorage.
  getCompleted() {
    return StorageManager.get(KEYS.completed);
  }

  // This method generates a unique order ID like ORD-20261004-001 (numbered per day).
  nextId() {
    const now = new Date();
    const stamp =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    const prefix = `ORD-${stamp}-`;
    let highest = 0;
    for (const order of [...this.getOrders(), ...this.getCompleted()]) {
      if (order.orderId.startsWith(prefix))
        highest = Math.max(highest, parseInt(order.orderId.split("-")[2]) || 0);
    }
    return prefix + String(highest + 1).padStart(3, "0");
  }

  // This method builds a new order object from customer details and the cart.
  createOrder(customer, cartManager) {
    return {
      orderId: this.nextId(),
      customerName: customer.name,
      tableNumber: customer.table,
      phone: customer.phone,
      description: customer.description,
      items: cartManager.cart.map(copyCartItem),
      totalItems: cartManager.getTotalItems(),
      totalAmount: cartManager.getTotal(),
      status: "PLACED",
      createdAt: new Date().toISOString(),
    };
  }

  // This method saves a new order to the pending orders in localStorage.
  saveOrder(order) {
    const orders = this.getOrders();
    orders.push(order);
    StorageManager.save(KEYS.orders, orders);
  }

  // This method moves an order from pending orders to completed orders.
  completeOrder(orderId) {
    const pending = this.getOrders();
    const stillPending = [];
    let finished = null;
    for (const order of pending) {
      if (order.orderId === orderId) finished = order;
      else stillPending.push(order);
    }
    if (!finished) return;
    finished.status = "COMPLETED";
    finished.completedAt = new Date().toISOString();
    const completed = this.getCompleted();
    completed.push(finished);
    StorageManager.save(KEYS.completed, completed);
    StorageManager.save(KEYS.orders, stillPending);
  }

  // This method removes today's completed orders but keeps older ones.
  clearCompletedToday() {
    StorageManager.save(
      KEYS.completed,
      this.getCompleted().filter(isNotCompletedToday),
    );
  }
}
