const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Cookie HttpOnly vai automaticamente — sem body, sem localStorage
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // envia o cookie HttpOnly
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
      return null;
    }

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function api(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // sempre inclui cookies nas requisições
  });

  // Se 401, tenta renovar via cookie e reenviar
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
    }
  }

  return response;
}
