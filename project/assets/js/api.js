// API utilities
const API = {
  get: async (url) => {
    const res = await fetch(url, { method: 'GET' });
    return res.json();
  },
  post: async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

window.API = API;
