import moment from 'moment';

// Date and time utilities
export const formatDate = (date) => {
  return moment(date).format('MMM DD, YYYY');
};

export const formatDateTime = (date) => {
  return moment(date).format('MMM DD, YYYY HH:mm');
};

export const formatTimeFromNow = (date) => {
  return moment(date).fromNow();
};

export const formatDuration = (startTime, endTime) => {
  const duration = moment.duration(moment(endTime).diff(moment(startTime)));
  const days = duration.days();
  const hours = duration.hours();
  const minutes = duration.minutes();
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Currency utilities
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const parseCurrency = (currencyString) => {
  return parseFloat(currencyString.replace(/[$,]/g, ''));
};

// Auction status utilities
export const getAuctionStatus = (auction) => {
  const now = moment();
  const startTime = moment(auction.startTime);
  const endTime = moment(auction.endTime);

  if (auction.status === 'cancelled') {
    return { status: 'cancelled', label: 'Cancelled', color: 'red' };
  }

  if (auction.status === 'draft') {
    return { status: 'draft', label: 'Draft', color: 'gray' };
  }

  if (now.isBefore(startTime)) {
    return { 
      status: 'scheduled', 
      label: 'Scheduled', 
      color: 'blue',
      timeUntil: startTime.fromNow()
    };
  }

  if (now.isBetween(startTime, endTime)) {
    return { 
      status: 'active', 
      label: 'Active', 
      color: 'green',
      timeLeft: endTime.fromNow()
    };
  }

  if (now.isAfter(endTime)) {
    return { 
      status: 'ended', 
      label: 'Ended', 
      color: 'gray',
      endedAgo: endTime.fromNow()
    };
  }

  return { status: 'unknown', label: 'Unknown', color: 'gray' };
};

// Timer utilities
export const getRemainingTime = (endTime) => {
  const now = moment();
  const end = moment(endTime);
  
  if (now.isAfter(end)) {
    return { expired: true, timeLeft: '00:00:00' };
  }

  const duration = moment.duration(end.diff(now));
  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  let timeLeft = '';
  if (days > 0) {
    timeLeft = `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    timeLeft = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  const totalMinutes = duration.asMinutes();
  const isUrgent = totalMinutes <= 60; // Less than 1 hour remaining

  return {
    expired: false,
    timeLeft,
    isUrgent,
    totalSeconds: duration.asSeconds(),
    days,
    hours,
    minutes,
    seconds
  };
};

// Validation utilities
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateBidAmount = (amount, currentBid, increment) => {
  const numAmount = parseFloat(amount);
  const numCurrentBid = parseFloat(currentBid);
  const numIncrement = parseFloat(increment);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, message: 'Please enter a valid amount' };
  }
  
  const minimumBid = numCurrentBid + numIncrement;
  if (numAmount < minimumBid) {
    return { 
      valid: false, 
      message: `Minimum bid is ${formatCurrency(minimumBid)}` 
    };
  }
  
  return { valid: true };
};

// URL utilities
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '/api/placeholder/400/300';
  if (imagePath.startsWith('http')) return imagePath;
  return `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}${imagePath}`;
};

// Local storage utilities
export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// Debounce utility
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Array utilities
export const groupBy = (array, key) => {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
    return result;
  }, {});
};

// Error handling utilities
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Status badge utilities
export const getStatusBadgeClass = (status) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  switch (status.toLowerCase()) {
    case 'active':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'scheduled':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'ended':
      return `${baseClasses} bg-gray-100 text-gray-800`;
    case 'cancelled':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'draft':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

// Scroll utilities
export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const scrollToElement = (elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
