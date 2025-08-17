import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, IndianRupee, Type, FileText, Tag, ArrowLeft, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';

const CreateAuction = () => {
  const navigate = useNavigate();
  const { user, isSeller } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    startingPrice: '',
    bidIncrement: '',
    startTime: '',
    endTime: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Sports & Outdoors',
    'Books & Media', 'Collectibles', 'Art & Antiques', 'Other'
  ];

  // Check if user is a seller
  if (!isSeller) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Seller Account Required
        </h2>
        <p className="text-gray-600 mb-6">
          You need to have a seller account to create auctions.
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="btn-primary"
        >
          Update Profile
        </button>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (!formData.category) {
      setError('Category is required');
      return;
    }

    if (!formData.startingPrice || parseFloat(formData.startingPrice) <= 0) {
      setError('Starting price must be greater than 0');
      return;
    }

    if (!formData.bidIncrement || parseFloat(formData.bidIncrement) <= 0) {
      setError('Bid increment must be greater than 0');
      return;
    }

    if (!formData.startTime) {
      setError('Start time is required');
      return;
    }

    if (!formData.endTime) {
      setError('End time is required');
      return;
    }

    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    const now = new Date();

    if (startTime < now) {
      setError('Start time must be in the future');
      return;
    }

    if (endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      setLoading(true);
      
      const auctionData = {
        ...formData,
        startingPrice: parseFloat(formData.startingPrice),
        bidIncrement: parseFloat(formData.bidIncrement),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      };

      const response = await apiService.auctions.create(auctionData);
      
      // Redirect to the created auction
      navigate(`/auction/${response.data.auction.id}`);
      
    } catch (error) {
      console.error('Create auction error:', error);
      const message = error.response?.data?.message || 'Failed to create auction';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get minimum datetime for inputs
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // At least 5 minutes from now for immediate start
    return now.toISOString().slice(0, 16);
  };

  const getMinEndDateTime = () => {
    if (formData.startTime) {
      const startTime = new Date(formData.startTime);
      startTime.setMinutes(startTime.getMinutes() + 30); // At least 30 minutes after start
      return startTime.toISOString().slice(0, 16);
    }
    return getMinDateTime();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Create New Auction</h1>
        <p className="text-gray-600 mt-2">
          List your item and start accepting bids from buyers worldwide.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Type className="inline h-4 w-4 mr-1" />
                  Auction Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter a compelling title for your auction item"
                  required
                  maxLength="200"
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.title.length}/200 characters - Make it descriptive and appealing
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  className="form-textarea"
                  placeholder="Provide detailed information about the item, its condition, specifications, etc."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Starting Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <IndianRupee className="inline h-4 w-4 mr-1" />
                    Starting Price (₹) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      name="startingPrice"
                      value={formData.startingPrice}
                      onChange={handleChange}
                      step="1"
                      min="1"
                      className="form-input pl-10"
                      placeholder="1000"
                      required
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Minimum amount to start the auction
                  </p>
                </div>

                {/* Bid Increment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <IndianRupee className="inline h-4 w-4 mr-1" />
                    Bid Increment (₹) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      name="bidIncrement"
                      value={formData.bidIncrement}
                      onChange={handleChange}
                      step="1"
                      min="1"
                      className="form-input pl-10"
                      placeholder="100"
                      required
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Minimum amount each bid must increase
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Auction Start Date & Time *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      min={getMinDateTime()}
                      className="form-input pl-10"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() + 2); // Start in 2 minutes
                      setFormData(prev => ({ 
                        ...prev, 
                        startTime: now.toISOString().slice(0, 16) 
                      }));
                    }}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    Start in 2 minutes (for testing)
                  </button>
                  <p className="mt-1 text-sm text-gray-500">
                    When bidding should start
                  </p>
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Auction End Date & Time *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      min={getMinEndDateTime()}
                      className="form-input pl-10"
                      required
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    When bidding should end (at least 1 hour after start)
                  </p>
                </div>
              </div>

              {/* Duration Preview */}
              {formData.startTime && formData.endTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Auction Duration Preview</h4>
                  <div className="text-sm text-blue-700">
                    <p>Start: {new Date(formData.startTime).toLocaleString('en-IN')}</p>
                    <p>End: {new Date(formData.endTime).toLocaleString('en-IN')}</p>
                    <p className="font-medium mt-1">
                      Duration: {Math.round((new Date(formData.endTime) - new Date(formData.startTime)) / (1000 * 60 * 60))} hours
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Auction'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Sidebar - Tips */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tips for Success
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex items-start">
                <span className="font-medium text-green-600 mr-2">✓</span>
                Write a clear, descriptive title that highlights key features
              </p>
              <p className="flex items-start">
                <span className="font-medium text-green-600 mr-2">✓</span>
                Include detailed item condition and specifications
              </p>
              <p className="flex items-start">
                <span className="font-medium text-green-600 mr-2">✓</span>
                Set a competitive starting price to attract bidders
              </p>
              <p className="flex items-start">
                <span className="font-medium text-green-600 mr-2">✓</span>
                Choose appropriate auction duration (3-7 days recommended)
              </p>
              <p className="flex items-start">
                <span className="font-medium text-green-600 mr-2">✓</span>
                Select the most accurate category for better visibility
              </p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Auction Guidelines
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Auctions must start at least 30 minutes from now</p>
              <p>• Minimum auction duration is 1 hour</p>
              <p>• You cannot modify auctions once they start</p>
              <p>• All sales are final once auction ends</p>
              <p>• Payment processing will be handled automatically</p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Need Help?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Our seller support team is here to help you succeed.
            </p>
            <button className="btn-secondary text-sm w-full">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAuction;
