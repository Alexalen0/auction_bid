import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, DollarSign, TrendingUp, Users } from 'lucide-react';
import { formatCurrency, formatTimeFromNow, getAuctionStatus } from '../utils/helpers';
import apiService from '../services/apiService';

const Home = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('endTime');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Sports & Outdoors',
    'Books & Media', 'Collectibles', 'Art & Antiques', 'Other'
  ];

  useEffect(() => {
    loadAuctions();
  }, [searchTerm, categoryFilter, statusFilter, sortBy, currentPage]);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        search: searchTerm,
        category: categoryFilter,
        status: statusFilter,
        sortBy: sortBy
      };

      const response = await apiService.auctions.getAll(params);
      setAuctions(response.data.auctions);
      setTotalPages(Math.ceil(response.data.total / 12));
    } catch (error) {
      console.error('Failed to load auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadAuctions();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setStatusFilter('');
    setSortBy('endTime');
    setCurrentPage(1);
  };

  const AuctionCard = ({ auction }) => {
    const status = getAuctionStatus(auction);
    
    return (
      <div className="card hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
            {auction.title}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status.status === 'active' ? 'bg-green-100 text-green-800' :
            status.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status.label}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {auction.description}
        </p>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-gray-600">Current Bid</span>
            </div>
            <span className="font-bold text-green-600">
              {formatCurrency(auction.currentHighestBid || auction.startingPrice)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-sm text-gray-600">Starting Price</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(auction.startingPrice)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-purple-600 mr-1" />
              <span className="text-sm text-gray-600">Bids</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {auction.bidCount || 0}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-600 mr-1" />
              <span className="text-sm text-gray-600">
                {status.status === 'active' ? 'Ends' : 'Ended'}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatTimeFromNow(auction.endTime)}
            </span>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Seller</p>
              <p className="text-sm font-medium text-gray-900">
                {auction.seller.firstName} {auction.seller.lastName}
              </p>
            </div>
            <Link
              to={`/auction/${auction.id}`}
              className="btn-primary text-sm px-4 py-2"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Live Auction Platform
        </h1>
        <p className="text-xl text-gray-600">
          Discover amazing items and place your bids in real-time
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search auctions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
            >
              <option value="endTime">End Time</option>
              <option value="startTime">Start Time</option>
              <option value="currentHighestBid">Current Bid</option>
              <option value="bidCount">Most Bids</option>
              <option value="createdAt">Newest</option>
            </select>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="btn-primary flex-1"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="btn-secondary px-4"
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Auctions Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : auctions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-4 py-2 text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <TrendingUp className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No auctions found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search criteria or check back later for new auctions.
          </p>
          <button
            onClick={resetFilters}
            className="btn-primary"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
