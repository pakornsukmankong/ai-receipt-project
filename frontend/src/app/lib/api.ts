import axios, { type InternalAxiosRequestConfig } from "axios";
import { getSupabase } from "./supabase";

export interface ApiError extends Error {
  status: number;
  code: string;
  data?: Record<string, unknown>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Interceptor: auto-attach auth token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Interceptor: normalize error responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || "เกิดข้อผิดพลาด";
      const enhancedError = new Error(message) as ApiError;
      enhancedError.status = error.response.status;
      enhancedError.code = error.response.data?.code;
      enhancedError.data = error.response.data;
      return Promise.reject(enhancedError);
    }
    if (error.request) {
      const networkError = new Error("NETWORK_ERROR") as ApiError;
      networkError.status = 0;
      networkError.code = "NETWORK_ERROR";
      return Promise.reject(networkError);
    }
    return Promise.reject(error);
  }
);

export default api;
