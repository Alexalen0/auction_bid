import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, token, isAuthenticated } = useAuth();

  useEffect(() => {
    const defaultSocketURL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3000';
    const socketURL = process.env.REACT_APP_SOCKET_URL || defaultSocketURL;

    if (isAuthenticated && (token || localStorage.getItem('token')) && user) {
      const authToken = token || localStorage.getItem('token');
      const newSocket = io(socketURL, {
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      const onConnect = () => {
        setConnected(true);
        newSocket.emit('getUnreadNotificationsCount');
      };

      const onDisconnect = () => setConnected(false);
      const onConnectError = (err) => setConnected(false);

      const onNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        toast.info(notification.message, { autoClose: 7000 });
      };

      const onUnreadCount = ({ count }) => setUnreadCount(count || 0);
      const onNewBid = (data) => {
        toast.success(`New bid placed: ₹${data.amount || data?.bid?.amount}`, { autoClose: 5000 });
      };

      newSocket.on('connect', onConnect);
      newSocket.on('disconnect', onDisconnect);
      newSocket.on('connect_error', onConnectError);
      newSocket.on('notification', onNotification);
      newSocket.on('unreadNotificationsCount', onUnreadCount);
      newSocket.on('newBid', onNewBid);

      setSocket(newSocket);

      return () => {
        newSocket.off('connect', onConnect);
        newSocket.off('disconnect', onDisconnect);
        newSocket.off('connect_error', onConnectError);
        newSocket.off('notification', onNotification);
        newSocket.off('unreadNotificationsCount', onUnreadCount);
        newSocket.off('newBid', onNewBid);
        newSocket.close();
      };
    } else {
      if (socket) socket.close();
      setSocket(null);
      setConnected(false);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, token, user?.id]);

  const value = {
    socket,
    connected,
    notifications,
    unreadCount,
    joinAuction: (auctionId) => socket?.emit('joinAuction', auctionId),
    leaveAuction: (auctionId) => socket?.emit('leaveAuction', auctionId),
    subscribeToTimer: (auctionId) => socket?.emit('subscribeToTimer', auctionId),
    unsubscribeFromTimer: (auctionId) => socket?.emit('unsubscribeFromTimer', auctionId),
    requestAuctionUpdate: (auctionId) => socket?.emit('requestAuctionUpdate', auctionId),
    markNotificationRead: (notificationId) => socket?.emit('markNotificationRead', notificationId),
    getNotifications: (page = 1, limit = 10) => socket?.emit('getNotifications', { page, limit })
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
