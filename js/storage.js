// Central localStorage keys shared by client.html and kitchen.html.
const KEYS = {
  menu: "hotel_menu",
  orders: "hotel_orders",
  completed: "hotel_completed_orders",
  cart: "hotel_cart",
};

class StorageManager {
  // This method reads and parses JSON from localStorage, returning an empty array if the data is missing or invalid.
  static get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
      console.warn("Invalid JSON in", key);
      return [];
    }
  }

  // This method converts data to JSON and saves it in localStorage.
  static save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // This method deletes one key from localStorage.
  static remove(key) {
    localStorage.removeItem(key);
  }
}
