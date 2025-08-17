import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Users } from 'lucide-react';
import { getRemainingTime, formatCurrency } from '../../utils/helpers';

const AuctionTimer = ({ endTime, onExpire, className = '' }) => {
  const [timeData, setTimeData] = useState(() => getRemainingTime(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeData = getRemainingTime(endTime);
      setTimeData(newTimeData);

      if (newTimeData.expired && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  if (timeData.expired) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <Clock className="h-5 w-5" />
        <span className="font-medium">Auction Ended</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${timeData.isUrgent ? 'text-red-600 animate-pulse' : 'text-gray-600'} ${className}`}>
      <Clock className="h-5 w-5" />
      <span className="font-medium">
        {timeData.timeLeft}
      </span>
      {timeData.isUrgent && (
        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
          Ending Soon!
        </span>
      )}
    </div>
  );
};

export default AuctionTimer;
