import axios from 'axios';

// Configure axios base URL for API calls
const defaultBase = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api';
axios.defaults.baseURL = process.env.REACT_APP_API_URL || defaultBase;

// API service for handling all HTTP requests
const apiService = {
  // Auction endpoints
  auctions: {
    getAll: (params = {}) => axios.get('/auctions', { params }),
    getById: (id) => axios.get(`/auctions/${id}`),
    create: (data) => axios.post('/auctions', data),
    update: (id, data) => axios.put(`/auctions/${id}`, data),
    delete: (id) => axios.delete(`/auctions/${id}`),
    getUserAuctions: (type = 'selling', status) => 
      axios.get('/auctions/user/my-auctions', { params: { type, status } }),
    makeDecision: (id, decision, counterOfferAmount) => 
      axios.post(`/auctions/${id}/decision`, { decision, counterOfferAmount }),
    respondToCounterOffer: (id, response) => 
      axios.post(`/auctions/${id}/counter-offer-response`, { response })
  },

  // Bid endpoints
  bids: {
    getForAuction: (auctionId, params = {}) => 
      axios.get(`/bids/${auctionId}`, { params }),
    place: (auctionId, amount) => 
      axios.post(`/bids/${auctionId}/place`, { amount }),
    getUserBids: (status) => 
      axios.get('/bids/user/my-bids', { params: { status } }),
    getUserBidHistory: (auctionId) => 
      axios.get(`/bids/${auctionId}/user-history`)
  },

  // Auth endpoints
  auth: {
    login: (email, password) => 
      axios.post('/auth/login', { email, password }),
    register: (userData) => 
      axios.post('/auth/register', userData),
    getProfile: () => 
      axios.get('/auth/profile'),
    updateProfile: (userData) => 
      axios.put('/auth/profile', userData)
  },

  // Admin endpoints
  admin: {
    getDashboard: () => 
      axios.get('/admin/dashboard'),
    getUsers: (params = {}) => 
      axios.get('/admin/users', { params }),
    toggleUserStatus: (id) => 
      axios.patch(`/admin/users/${id}/toggle-status`),
    getAuctions: (params = {}) => 
      axios.get('/admin/auctions', { params }),
    forceAuctionStatus: (id, status) => 
      axios.patch(`/admin/auctions/${id}/force-status`, { status }),
    getParticipants: (auctionId) => 
      axios.get(`/admin/auctions/${auctionId}/participants`),
    getActivities: (limit = 20) => 
      axios.get('/admin/activities', { params: { limit } }),
    updateAuctionStatuses: () => 
      axios.post('/admin/auctions/update-statuses'),
    getHealth: () => 
      axios.get('/admin/health')
  }
};

export default apiService;
