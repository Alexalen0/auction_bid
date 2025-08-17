import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, Clock, DollarSign, Award, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatTimeFromNow, getAuctionStatus } from '../utils/helpers';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';
import { createDemoUsers } from '../utils/createDemoUsers';

const Dashboard = () => {
  const { user, isSeller } = useAuth();
  const [stats, setStats] = useState({});
  const [recentAuctions, setRecentAuctions] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const promises = [];
      
      // Load recent auctions
      promises.push(apiService.auctions.getAll({ limit: 5 }));
      
      // Load user-specific data
      if (isSeller) {
        promises.push(apiService.auctions.getUserAuctions('selling'));
      }
      promises.push(apiService.bids.getUserBids());

      const results = await Promise.all(promises);
      
      setRecentAuctions(results[0].data.auctions);
      
      if (isSeller && results[1]) {
        const userAuctions = results[1].data.auctions;
        setStats(prev => ({
          ...prev,
          totalAuctions: userAuctions.length,
          activeAuctions: userAuctions.filter(a => a.status === 'active').length,
          endedAuctions: userAuctions.filter(a => a.status === 'ended').length
        }));
      }
      
      const userBids = isSeller ? results[2].data.bids : results[1].data.bids;
      setRecentBids(userBids.slice(0, 5));
      
      setStats(prev => ({
        ...prev,
        totalBids: userBids.length,
        activeBids: userBids.filter(b => b.auction.status === 'active').length
      }));
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your auctions and bids.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isSeller && (
          <>
            <div className="card">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Auctions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAuctions || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Auctions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAuctions || 0}</p>
                </div>
              </div>
            </div>
          </>
        )}
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bids</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBids || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <Award className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Bids</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeBids || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/"
              className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <TrendingUp className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-gray-700">Browse Active Auctions</span>
            </Link>
            
            {isSeller && (
              <Link
                to="/create-auction"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <Plus className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-700">Create New Auction</span>
              </Link>
            )}
            
            <Link
              to="/my-bids"
              className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-gray-700">View My Bids</span>
            </Link>
            
            {isSeller && (
              <Link
                to="/my-auctions"
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <Users className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-700">Manage My Auctions</span>
              </Link>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentBids.length > 0 ? (
              recentBids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Bid on "{bid.auction.title}"
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatTimeFromNow(bid.bidTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(bid.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getAuctionStatus(bid.auction).label}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Auctions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Auctions</h2>
          <Link
            to="/"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentAuctions.map((auction) => {
            const status = getAuctionStatus(auction);
            return (
              <div key={auction.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 line-clamp-1">
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
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {auction.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Current Bid</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(auction.currentHighestBid || auction.startingPrice)}
                    </p>
                  </div>
                  <Link
                    to={`/auction/${auction.id}`}
                    className="btn-primary text-xs px-3 py-1"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
