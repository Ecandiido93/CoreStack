const API_URL = "http://localhost:3001";

export async function api(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  return response.json();
}