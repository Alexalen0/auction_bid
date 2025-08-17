import React, { useState } from 'react';
import { DollarSign, TrendingUp, IndianRupee } from 'lucide-react';
import { formatCurrency, validateBidAmount } from '../../utils/helpers';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';

const BidForm = ({ auction, currentHighestBid, onBidPlaced, disabled }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minimumBid = (parseFloat(currentHighestBid) || parseFloat(auction.startingPrice)) + parseFloat(auction.bidIncrement);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (disabled) {
      toast.error('Bidding is not available right now');
      return;
    }

    const validation = validateBidAmount(bidAmount, currentHighestBid || auction.startingPrice, auction.bidIncrement);
    
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiService.bids.place(auction.id, parseFloat(bidAmount));
      
      if (response.data.bid) {
        toast.success('Bid placed successfully!');
        setBidAmount('');
        
        if (onBidPlaced) {
          onBidPlaced(response.data.bid);
        }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to place bid';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickBid = (amount) => {
    setBidAmount(amount.toString());
  };

  const quickBidAmounts = [
    minimumBid,
    minimumBid + parseFloat(auction.bidIncrement),
    minimumBid + (parseFloat(auction.bidIncrement) * 2),
    minimumBid + (parseFloat(auction.bidIncrement) * 5)
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Place Your Bid</h3>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Current Highest Bid:</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(currentHighestBid || auction.startingPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span>Minimum Next Bid:</span>
          <span className="font-medium text-green-600">
            {formatCurrency(minimumBid)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IndianRupee className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            step="1"
            min={minimumBid}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={`Minimum ${formatCurrency(minimumBid)}`}
            className="input-field pl-10"
            disabled={disabled || isSubmitting}
            required
          />
        </div>

        {/* Quick Bid Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {quickBidAmounts.map((amount, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleQuickBid(amount)}
              className="btn-secondary text-xs py-2"
              disabled={disabled || isSubmitting}
            >
              {formatCurrency(amount)}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={disabled || isSubmitting || !bidAmount}
          className="w-full btn-primary py-3 text-lg font-semibold"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="spinner"></div>
              <span>Placing Bid...</span>
            </div>
          ) : (
            `Place Bid ${bidAmount ? formatCurrency(bidAmount) : ''}`
          )}
        </button>
      </form>

      {disabled && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            {auction.status === 'ended' 
              ? 'This auction has ended' 
              : 'Bidding is currently unavailable'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default BidForm;
