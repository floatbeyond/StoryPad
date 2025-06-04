import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Add this at the top
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const CollaborativeEditor = ({ 
  storyId, 
  chapterIndex, 
  value, 
  onChange, 
  placeholder,
  currentUser 
}) => {
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState(new Map());
  const textareaRef = useRef(null);
  const isRemoteChange = useRef(false);

  // User colors for different collaborators
  const userColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  // Get user color based on their ID
  const getUserColor = (userId) => {
    if (!userId) return userColors[0];
    return userColors[userId.charCodeAt(0) % userColors.length];
  };

  useEffect(() => {
    // Only connect if we have all required data
    if (!storyId || storyId === 'new' || !currentUser) {
      console.log('🔌 Skipping Socket.IO connection - missing data:', { storyId, currentUser });
      return;
    }

    console.log('🔌 Connecting to Socket.IO...', { storyId, currentUser });

    // Connect to WebSocket
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    // Handle connection
    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      
      // Join the story room
      newSocket.emit('join-story', {
        storyId,
        username: currentUser.username,
        userId: currentUser.id
      });
    });

    // Handle connection errors
    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    // Listen for text changes from other users
    newSocket.on('text-change', (data) => {
      console.log('📝 Received text change:', data);
      if (data.chapterIndex === chapterIndex) {
        isRemoteChange.current = true;
        onChange(data.content);
        
        // Reset flag after a short delay
        setTimeout(() => {
          isRemoteChange.current = false;
        }, 100);
      }
    });

    // Listen for cursor changes
    newSocket.on('cursor-change', (data) => {
      if (data.chapterIndex === chapterIndex) {
        setCursors(prev => new Map(prev.set(data.socketId, {
          position: data.position,
          username: data.username,
          userId: data.userId,
          color: getUserColor(data.userId)
        })));
      }
    });

    // Listen for user joined/left
    newSocket.on('user-joined', (user) => {
      console.log('👤 User joined:', user);
      setActiveUsers(prev => {
        // Remove existing user and add new one to avoid duplicates
        const filtered = prev.filter(u => u.userId !== user.userId);
        return [...filtered, user];
      });
    });

    newSocket.on('user-left', (user) => {
      console.log('👋 User left:', user);
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(user.socketId);
        return newCursors;
      });
    });

    newSocket.on('active-users', (users) => {
      console.log('👥 Active users:', users);
      setActiveUsers(users.filter(u => u.userId !== currentUser.id));
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting from Socket.IO');
      newSocket.disconnect();
    };
  }, [storyId, chapterIndex, currentUser]);

  // Handle text changes
  const handleTextChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Only send to others if this is a local change and we have a socket connection
    if (!isRemoteChange.current && socket && socket.connected) {
      console.log('📤 Sending text change to others');
      socket.emit('text-change', {
        content: newValue,
        chapterIndex: chapterIndex,
        storyId: storyId
      });
    }
  };

  // Handle cursor position changes
  const handleCursorChange = () => {
    if (textareaRef.current && socket && socket.connected) {
      const position = textareaRef.current.selectionStart;
      socket.emit('cursor-change', {
        position,
        chapterIndex: chapterIndex,
        storyId: storyId
      });
    }
  };

  return (
    <div className="relative">
      {/* Active users indicator */}
      {activeUsers.length > 0 && (
        <div className="flex items-center space-x-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-700">
            👥 {activeUsers.length} other{activeUsers.length !== 1 ? 's' : ''} editing:
          </span>
          <div className="flex space-x-2">
            {activeUsers.map((user) => (
              <span 
                key={user.userId}
                className="px-2 py-1 rounded-full text-white text-xs font-medium shadow-sm"
                style={{ backgroundColor: getUserColor(user.userId) }}
              >
                {user.username}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Text editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          className="input w-full relative z-10 font-mono"
          rows={15}
          placeholder={placeholder}
          value={value}
          onChange={handleTextChange}
          onSelect={handleCursorChange}
          onKeyUp={handleCursorChange}
          onMouseUp={handleCursorChange}
          style={{ 
            resize: 'vertical',
            lineHeight: '1.5',
            fontSize: '14px'
          }}
        />

        {/* Real-time typing indicator */}
        {isRemoteChange.current && (
          <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg z-20 animate-pulse">
            ✍️ Someone is typing...
          </div>
        )}
      </div>

      {/* Connection status and info */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4 text-gray-500">
          {/* Connection status */}
          <div className="flex items-center space-x-1">
            {socket?.connected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">Connected</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-600 font-medium">Disconnected</span>
              </>
            )}
          </div>

          {/* Active users count */}
          {activeUsers.length > 0 && (
            <span className="text-gray-600">
              • {activeUsers.length} other{activeUsers.length !== 1 ? 's' : ''} online
            </span>
          )}
        </div>

        {/* Story info */}
        <div className="text-gray-400">
          {storyId !== 'new' && (
            <span>Real-time collaboration enabled</span>
          )}
        </div>
      </div>

      {/* Debugging info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <div>Story ID: {storyId}</div>
          <div>Chapter: {chapterIndex}</div>
          <div>User: {currentUser?.username}</div>
          <div>Socket ID: {socket?.id}</div>
          <div>Active cursors: {cursors.size}</div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeEditor;