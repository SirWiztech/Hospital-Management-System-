// Route protection
window.guard = {
  requireAuth: () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'login.html';
    }
  },
};
