// Authentication service
export async function login(email, password) {
  // TODO: Implement real login logic
  return { token: 'fake-token', email };
}

export async function logout() {
  localStorage.removeItem('authToken');
}
