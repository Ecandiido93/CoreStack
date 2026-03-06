"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

const API = process.env.NEXT_PUBLIC_API_URL;

function maskToken(token: string | null) {
  if (!token) return "N/A";
  return token.slice(0, 10) + "..." + token.slice(-6);
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accessTokenExpires, setAccessTokenExpires] = useState<string | null>(
    null
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [refreshTokenExpires, setRefreshTokenExpires] = useState<string | null>(
    null
  );
  const [refreshFamilyId, setRefreshFamilyId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setAccessToken(token);

    // Chama o backend para buscar dados do usuário
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        if (token) {
          try {
            const decoded: any = jwtDecode(token);
            if (decoded.exp) {
              setAccessTokenExpires(new Date(decoded.exp * 1000).toISOString());
            }
          } catch {
            setAccessTokenExpires(null);
          }
        }
      });

    const storedRefresh = localStorage.getItem("refreshToken");
    if (storedRefresh) setRefreshToken(storedRefresh);
  }, []);

  async function handleRefresh() {
    try {
      const storedRefresh = localStorage.getItem("refreshToken");

      const res = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert("Erro ao renovar token");
        return;
      }

      // Salva novos tokens no localStorage
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      // Atualiza estado dos tokens
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      // Decodifica a validade do access token
      try {
        const decoded: any = jwtDecode(data.accessToken);
        setAccessTokenExpires(decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null);
      } catch {
        setAccessTokenExpires(null);
      }

      // Atualiza hash parcial e validade do refresh token se vier do backend
      setRefreshToken(data.refreshTokenHash || maskToken(data.refreshToken));
      setRefreshTokenExpires(data.refreshTokenExpires || null);
      setRefreshFamilyId(data.familyId || "N/A");

      alert("Token renovado com sucesso!");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    const storedRefresh = localStorage.getItem("refreshToken");

    await fetch(`${API}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    });

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    window.location.href = "/login";
  }

  return (
    <div className="max-w-xl mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {user && (
        <div className="mb-6 space-y-2">
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Nome:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      )}

      <div className="mb-6 space-y-3">
        {/* Access Token */}
        <div>
          <p><strong>Access Token:</strong></p>
          <div className="bg-gray-100 p-2 rounded text-sm break-all">
            {maskToken(accessToken)}
          </div>
          <p className="text-sm text-gray-500">
            Validade: {accessTokenExpires ? new Date(accessTokenExpires).toLocaleString() : "N/A"}
          </p>
        </div>

        {/* Refresh Token */}
        <div>
          <p><strong>Refresh Token:</strong></p>
          <div className="bg-gray-100 p-2 rounded text-sm break-all">
            {maskToken(refreshToken)}
          </div>
          <p className="text-sm text-gray-500">
            Validade: {refreshTokenExpires ? new Date(refreshTokenExpires).toLocaleString() : "Será carregado ao atualizar"}
          </p>
          <p className="text-sm text-gray-500">
            Family ID: {refreshFamilyId || "Será carregado ao atualizar"}
          </p>
          <p className="text-xs text-gray-400 italic">
            *O refresh token será carregado assim que você clicar em "Refresh"
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleRefresh}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Refresh Token
        </button>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}