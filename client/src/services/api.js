import axios from "axios";

// Shared Axios client for all backend requests.
const API = axios.create({
  baseURL: "http://localhost:5000",
});

export default API;