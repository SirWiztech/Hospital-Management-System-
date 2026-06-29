// Security service
export function isAuthenticated() {
  return Boolean(localStorage.getItem('authToken'));
}
