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
    if (!formData.title.trim()) return setError('Title is required');
    if (!formData.description.trim()) return setError('Description is required');
    if (!formData.category) return setError('Category is required');
    if (!formData.startingPrice || parseFloat(formData.startingPrice) <= 0) return setError('Starting price must be greater than 0');
    if (!formData.bidIncrement || parseFloat(formData.bidIncrement) <= 0) return setError('Bid increment must be greater than 0');
    if (!formData.startTime) return setError('Start time is required');
    if (!formData.endTime) return setError('End time is required');

    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    const now = new Date();

    if (startTime < now) return setError('Start time must be in the future');
    if (endTime <= startTime) return setError('End time must be after start time');

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

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  const getMinEndDateTime = () => {
    if (formData.startTime) {
      const startTime = new Date(formData.startTime);
      startTime.setMinutes(startTime.getMinutes() + 30);
      return startTime.toISOString().slice(0, 16);
    }
    return getMinDateTime();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Auction</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Type className="inline h-4 w-4 mr-1" />
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              placeholder="Auction title"
              required
              maxLength="200"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="inline h-4 w-4 mr-1" />
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="form-textarea"
              placeholder="Item details"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="inline h-4 w-4 mr-1" />
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Starting Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <IndianRupee className="inline h-4 w-4 mr-1" />
                Starting Price (₹)
              </label>
              <input
                type="number"
                name="startingPrice"
                value={formData.startingPrice}
                onChange={handleChange}
                step="1"
                min="1"
                className="form-input"
                placeholder="1000"
                required
              />
            </div>

            {/* Bid Increment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <IndianRupee className="inline h-4 w-4 mr-1" />
                Bid Increment (₹)
              </label>
              <input
                type="number"
                name="bidIncrement"
                value={formData.bidIncrement}
                onChange={handleChange}
                step="1"
                min="1"
                className="form-input"
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                min={getMinDateTime()}
                className="form-input"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  now.setMinutes(now.getMinutes() + 2);
                  setFormData(prev => ({ ...prev, startTime: now.toISOString().slice(0, 16) }));
                }}
                className="mt-2 text-xs text-primary-600 hover:text-primary-700"
              >
                Start in 2 minutes (test)
              </button>
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                End Date & Time
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                min={getMinEndDateTime()}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Auction'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateAuction;
