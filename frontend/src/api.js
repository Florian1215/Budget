const TOKEN_KEY = "budget_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

export class ApiError extends Error {
  constructor(message, data) {
    super(message);
    this.data = data;
  }
}

function flattenErrors(data) {
  if (!data) return "Something went wrong.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return Object.entries(data)
    .map(([k, v]) => `${k === "non_field_errors" ? "" : k + ": "}${[].concat(v).join(" ")}`)
    .join("\n");
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError("Your session has expired.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(flattenErrors(data), data);
  return data;
}

const qs = (params = {}) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  register: (data) => request("POST", "/auth/register/", data),
  login: (data) => request("POST", "/auth/login/", data),
  logout: () => request("POST", "/auth/logout/"),
  me: () => request("GET", "/auth/me/"),

  summary: (params) => request("GET", `/summary/${qs(params)}`),

  categories: (params) => request("GET", `/categories/${qs(params)}`),
  createCategory: (data) => request("POST", "/categories/", data),
  updateCategory: (id, data) => request("PATCH", `/categories/${id}/`, data),
  deleteCategory: (id) => request("DELETE", `/categories/${id}/`),

  transactions: (params) => request("GET", `/transactions/${qs(params)}`),
  createTransaction: (data) => request("POST", "/transactions/", data),
  deleteTransaction: (id) => request("DELETE", `/transactions/${id}/`),

  recurring: () => request("GET", "/recurring/"),
  createRecurring: (data) => request("POST", "/recurring/", data),
  updateRecurring: (id, data) => request("PATCH", `/recurring/${id}/`, data),
  deleteRecurring: (id) => request("DELETE", `/recurring/${id}/`),
};
