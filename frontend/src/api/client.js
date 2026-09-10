import axios from "axios";
import { auth } from "../firebase.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Every request automatically carries the logged-in user's Firebase ID token, so the
// backend can resolve identity + role without any call site having to think about auth.
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Identity ---
export const getMe = () => apiClient.get("/auth/me").then((r) => r.data);
export const registerFarmer = (payload) => apiClient.post("/auth/register/farmer", payload).then((r) => r.data);
export const registerBuyer = (payload) => apiClient.post("/auth/register/buyer", payload).then((r) => r.data);
export const registerFpo = (payload) => apiClient.post("/auth/register/fpo", payload).then((r) => r.data);

// --- Farmers (scoped to the logged-in farmer) ---
export const listMyCropListings = () => apiClient.get("/farmers/listings").then((r) => r.data);
export const createCropListing = (payload) => apiClient.post("/farmers/listings", payload).then((r) => r.data);

// --- Buyers ---
export const listBuyerRequirements = (params) => apiClient.get("/buyers/requirements", { params }).then((r) => r.data);
export const createBuyerRequirement = (payload) => apiClient.post("/buyers/requirements", payload).then((r) => r.data);

// --- FPOs ---
export const listFPOs = () => apiClient.get("/fpos").then((r) => r.data);
export const listFPOPools = () => apiClient.get("/fpos/pools").then((r) => r.data);
export const createFPOPool = (payload) => apiClient.post("/fpos/pools", payload).then((r) => r.data);
export const addFPOPoolMember = (poolId, payload) =>
  apiClient.post(`/fpos/pools/${poolId}/add-member`, payload).then((r) => r.data);
export const getFpoPayoutLedger = (poolId) =>
  apiClient.get(`/fpos/pools/${poolId}/payout-ledger`).then((r) => r.data);

// --- Marketplace & Negotiations ---
export const listMarketplaceListings = (params) =>
  apiClient.get("/marketplace/listings", { params }).then((r) => r.data);
export const listMarketplaceOffers = () => apiClient.get("/marketplace/offers").then((r) => r.data);
export const submitMarketplaceOffer = (payload) => apiClient.post("/marketplace/offers", payload).then((r) => r.data);
export const counterMarketplaceOffer = (offerId, payload) =>
  apiClient.post(`/marketplace/offers/${offerId}/counter`, payload).then((r) => r.data);
export const acceptMarketplaceOffer = (offerId) =>
  apiClient.post(`/marketplace/offers/${offerId}/accept`).then((r) => r.data);
export const getBuyerTrust = (buyerId) =>
  apiClient.get(`/marketplace/buyer-trust/${buyerId}`).then((r) => r.data);

// --- Prices & Arbitrage ---
export const getCurrentPrice = (crop, params) =>
  apiClient.get(`/prices/${crop}`, { params }).then((r) => r.data);
export const getPriceHistory = (crop, params) =>
  apiClient.get(`/prices/${crop}/history`, { params }).then((r) => r.data);
export const getNearbyMandis = (crop, params) =>
  apiClient.get(`/prices/${crop}/nearby-mandis`, { params }).then((r) => r.data);
export const getMultiHorizonForecast = (crop) =>
  apiClient.get(`/prices/${crop}/forecast-multi-horizon`).then((r) => r.data);

// --- Sell Decision ---
export const getDecision = (payload) => apiClient.post("/decision/recommend", payload).then((r) => r.data);
export const compareNetRealization = (payload) =>
  apiClient.post("/decision/compare-net-realization", payload).then((r) => r.data);

// --- Quality Grading & e-Pramaan Certificates ---
export const analyzeCropQuality = (filename, file) => {
  const formData = new FormData();
  formData.append("filename", filename);
  if (file) formData.append("file", file);
  return apiClient
    .post("/quality/analyze", formData, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
};
export const generateQualityCertificate = (payload) =>
  apiClient.post("/quality/certificate", payload).then((r) => r.data);
export const getQualityCertificate = (certId) =>
  apiClient.get(`/quality/certificate/${certId}`).then((r) => r.data);

// --- Logistics, Warehouses & Pledge Finance ---
export const listWarehouses = (params) => apiClient.get("/logistics/warehouses", { params }).then((r) => r.data);
export const calculatePledgeLoan = (payload) => apiClient.post("/logistics/pledge-loan", payload).then((r) => r.data);
export const calculateTransport = (payload) =>
  apiClient.post("/logistics/calculate-transport", payload).then((r) => r.data);
export const evaluateStorage = (payload) =>
  apiClient.post("/logistics/evaluate-storage", payload).then((r) => r.data);

// --- Agentic Assistant ---
export const askAgent = (payload) => apiClient.post("/agent/query", payload).then((r) => r.data);

// --- Transactions & 4-Stage Escrow ---
export const listTransactions = () => apiClient.get("/transactions").then((r) => r.data);
export const advanceEscrowStage = (txnId) =>
  apiClient.post(`/transactions/${txnId}/advance-escrow`).then((r) => r.data);
export const getDigitalInvoice = (txnId) =>
  apiClient.get(`/transactions/${txnId}/invoice`).then((r) => r.data);

// --- Grievance & Dispute Redressal ---
export const listGrievances = (params) => apiClient.get("/grievances", { params }).then((r) => r.data);
export const getGrievanceStats = () => apiClient.get("/grievances/stats").then((r) => r.data);
export const createGrievance = (payload) => apiClient.post("/grievances", payload).then((r) => r.data);
export const resolveGrievance = (grievanceId, payload) =>
  apiClient.post(`/grievances/${grievanceId}/resolve`, payload).then((r) => r.data);

// --- Admin ---
export const getAdminMetrics = () => apiClient.get("/admin/metrics").then((r) => r.data);
export const getAdminDisputes = () => apiClient.get("/admin/disputes").then((r) => r.data);
