import axios from "axios";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Configuração do Supabase ausente.");
}

export const api = axios.create({
  baseURL: `${url}/rest/v1`,
  timeout: 15_000,
  headers: {
    apikey: key,
    "Content-Type": "application/json",
  },
});
