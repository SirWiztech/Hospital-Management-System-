var LiquidEffect = {
  container: null,
  init: function(elementId) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;
    this.container.classList.add('liquid-ready');
  },
  destroy: function() {
    if (this.container) {
      this.container.classList.remove('liquid-ready');
      this.container = null;
    }
  }
};
