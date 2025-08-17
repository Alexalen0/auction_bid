import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, DollarSign, User, ArrowLeft, Gavel, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { formatCurrency, formatDateTime, getAuctionStatus } from '../utils/helpers';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';

const AuctionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [placingBid, setPlacingBid] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAuctionData();
  }, [id]);

  useEffect(() => {
    if (auction && socket) {
      console.log('🔌 Joining auction room:', id);
      // Join auction room
      socket.emit('joinAuction', id);

      // Listen for new bids (support both payload shapes)
      const onNewBid = (payload) => {
        const bid = payload?.bid || payload; // server may send {bid,...} or flat
        const payloadAuctionId = payload?.auctionId || bid?.auctionId;
        console.log('🔔 New bid received:', payload);

        if (!bid) return;

        setBids((prev) => [bid, ...prev]);

        if (parseInt(payloadAuctionId) === parseInt(id)) {
          setAuction((prev) => ({
            ...prev,
            currentHighestBid: bid.amount,
            bidCount: (prev?.bidCount || 0) + 1,
          }));
        }
      };

      const onAuctionEnded = (auctionData) => {
        console.log('🏁 Auction ended:', auctionData);
        if ((auctionData.id || auctionData.auctionId) === parseInt(id)) {
          setAuction((prev) => ({ ...prev, status: 'ended' }));
        }
      };

      socket.on('newBid', onNewBid);
      socket.on('auctionEnded', onAuctionEnded);

      return () => {
        console.log('🔌 Leaving auction room:', id);
        socket.off('newBid', onNewBid);
        socket.off('auctionEnded', onAuctionEnded);
        socket.emit('leaveAuction', id);
      };
    }
  }, [auction, socket, id]);

  useEffect(() => {
    if (auction && auction.status === 'active') {
      const timer = setInterval(() => {
        const now = new Date();
        const end = new Date(auction.endTime);
        const diff = end - now;

        if (diff <= 0) {
          setTimeLeft('Auction Ended');
          clearInterval(timer);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [auction]);

  const loadAuctionData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Loading auction data for ID:', id);
      
      const [auctionResponse, bidsResponse] = await Promise.all([
        apiService.auctions.getById(id),
        apiService.bids.getForAuction(id)
      ]);

      console.log('✅ Auction response:', auctionResponse.data);
      console.log('✅ Bids response:', bidsResponse.data);

      setAuction(auctionResponse.data.auction);
      setBids(bidsResponse.data.bids);
      
      // Set initial bid amount to minimum required bid
      const currentBid = auctionResponse.data.auction.currentHighestBid || auctionResponse.data.auction.startingPrice;
      const minimumNextBid = currentBid + auctionResponse.data.auction.bidIncrement;
      setBidAmount(minimumNextBid.toString());
      
    } catch (error) {
      console.error('❌ Failed to load auction data:', error);
      console.error('❌ Error details:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to load auction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    
    console.log('🔄 Attempting to place bid:', {
      bidAmount,
      isAuthenticated,
      auctionId: auction.id,
      userId: user?.id,
      isOwner
    });
    
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    if (isOwner) {
      setError('You cannot bid on your own auction');
      return;
    }

    const minBid = (auction.currentHighestBid || auction.startingPrice) + auction.bidIncrement;
    if (!bidAmount || parseFloat(bidAmount) < minBid) {
      setError(`Bid amount must be at least ${formatCurrency(minBid)}`);
      return;
    }

    try {
      setPlacingBid(true);
      setError('');
      
      console.log('🔄 Making API call to place bid...');
      const response = await apiService.bids.place(id, parseFloat(bidAmount));
      console.log('✅ Bid placed successfully:', response.data);
      
      // The real-time update should come via Socket.IO, but also reload data as fallback
      setTimeout(async () => {
        await loadAuctionData();
      }, 1000);
      
      // Clear bid amount and set new minimum
      const newMinimum = parseFloat(bidAmount) + auction.bidIncrement;
      setBidAmount(newMinimum.toString());
      
    } catch (error) {
      console.error('❌ Failed to place bid:', error);
      const message = error.response?.data?.message || 'Failed to place bid. Please try again.';
      setError(message);
    } finally {
      setPlacingBid(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Auction not found</h2>
        <p className="text-gray-600 mt-2">The auction you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary mt-4"
        >
          Back to Auctions
        </button>
      </div>
    );
  }

  const status = getAuctionStatus(auction);
  const isOwner = user?.id === auction.sellerId;
  const canBid = status.status === 'active' && !isOwner && isAuthenticated;
  const highestBidder = bids.length > 0 ? bids[0] : null;
  const isWinning = highestBidder && user?.id === highestBidder.bidderId;

  // Enhanced debug logging
  console.log('🔍 Auction Debug Info:', {
    auctionId: auction.id,
    auctionStatus: status.status,
    statusObject: status,
    isOwner,
    isAuthenticated,
    canBid,
    userId: user?.id,
    sellerId: auction.sellerId,
    userRole: user?.role,
    auctionStartTime: auction.startTime,
    auctionEndTime: auction.endTime,
    currentTime: new Date().toISOString(),
    'Bidding Conditions': {
      'status === active': status.status === 'active',
      '!isOwner': !isOwner,
      'isAuthenticated': isAuthenticated,
      'Final canBid': canBid
    }
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-200"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Auction Header */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{auction.title}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                status.status === 'active' ? 'bg-green-100 text-green-800' :
                status.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {status.label}
              </span>
            </div>

            {/* Auction Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Current Bid</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(auction.currentHighestBid || auction.startingPrice)}
                </p>
              </div>
              
              <div className="text-center">
                <Gavel className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Starting Price</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(auction.startingPrice)}
                </p>
              </div>
              
              <div className="text-center">
                <User className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Total Bids</p>
                <p className="text-lg font-semibold text-gray-900">
                  {auction.bidCount || 0}
                </p>
              </div>
              
              <div className="text-center">
                <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {status.status === 'active' ? 'Time Left' : 'End Time'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {status.status === 'active' ? timeLeft : formatDateTime(auction.endTime)}
                </p>
              </div>
            </div>

            {/* Status Messages */}
            {status.status === 'ended' && highestBidder && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Auction Ended</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      {isWinning ? 'Congratulations! You won this auction.' : 
                       `Won by ${highestBidder.bidder.firstName} ${highestBidder.bidder.lastName} with a bid of ${formatCurrency(highestBidder.amount)}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isWinning && status.status === 'active' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <Gavel className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-800">You're Winning!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      You currently have the highest bid.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{auction.description}</p>
            </div>
          </div>

          {/* Seller Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="font-medium text-gray-900">
                  {auction.seller.firstName} {auction.seller.lastName}
                </p>
                <p className="text-sm text-gray-600">{auction.seller.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bidding Section */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Gavel className="h-5 w-5 mr-2 text-primary-600" />
              {canBid ? 'Place Your Bid' : 'Bidding Status'}
            </h3>

            {/* Debug Info - Remove in production */}
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
              <p><strong>Debug Info:</strong></p>
              <p>Status: {status.status}</p>
              <p>Is Owner: {isOwner ? 'Yes' : 'No'}</p>
              <p>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
              <p>Can Bid: {canBid ? 'Yes' : 'No'}</p>
              <p>User Role: {user?.role || 'None'}</p>
              <p>User ID: {user?.id || 'None'}</p>
              <p>Seller ID: {auction.sellerId}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {canBid ? (
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bid Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={((auction.currentHighestBid || auction.startingPrice) + auction.bidIncrement)}
                      step="1"
                      className="form-input pl-8"
                      placeholder="Enter bid amount"
                      disabled={placingBid}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum bid: {formatCurrency((auction.currentHighestBid || auction.startingPrice) + auction.bidIncrement)}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={placingBid}
                  className="btn-primary w-full disabled:opacity-50 flex items-center justify-center"
                >
                  {placingBid ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Placing Bid...
                    </>
                  ) : (
                    <>
                      <Gavel className="h-4 w-4 mr-2" />
                      Place Bid
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                {!isAuthenticated && (
                  <>
                    <p className="text-gray-600 mb-4">You need to be logged in to place bids.</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="btn-primary w-full"
                    >
                      Login to Bid
                    </button>
                  </>
                )}
                {isAuthenticated && isOwner && (
                  <p className="text-gray-600">You cannot bid on your own auction.</p>
                )}
                {isAuthenticated && !isOwner && status.status !== 'active' && (
                  <p className="text-gray-600">
                    {status.status === 'scheduled' ? 'This auction has not started yet.' : 'This auction has ended.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bid History */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bid History ({bids.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bids.length > 0 ? (
                bids.map((bid, index) => (
                  <div
                    key={bid.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(bid.amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        by {bid.bidder.firstName} {bid.bidder.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      {index === 0 && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Highest
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(bid.bidTime)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No bids yet</p>
              )}
            </div>
          </div>

          {/* Auction Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Auction Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Start Time:</span>
                <span className="text-gray-900">{formatDateTime(auction.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">End Time:</span>
                <span className="text-gray-900">{formatDateTime(auction.endTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="text-gray-900">{auction.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">{formatDateTime(auction.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetail;
