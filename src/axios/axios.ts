import axios from "axios";

// Relative API URLs use the host serving the app in development and production.
const client = axios.create();
client.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && typeof window !== "undefined") window.location.assign("/login");
  return Promise.reject(error);
});
export default client;
