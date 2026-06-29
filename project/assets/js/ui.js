// UI utilities
window.ui = {
  toggleClass: (element, className) => {
    if (!element) return;
    element.classList.toggle(className);
  },
};
