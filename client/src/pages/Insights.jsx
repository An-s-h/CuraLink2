import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bell,
  MessageSquare,
  Users,
  TrendingUp,
  Reply,
  Heart,
  FileText,
  Beaker,
  UserPlus,
  ThumbsUp,
  CheckCircle2,
  Calendar,
  Filter,
  Send,
  Eye,
  User,
  Check,
  X,
} from "lucide-react";

export default function Insights() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("activity");
  const [insights, setInsights] = useState({
    notifications: [],
    unreadCount: 0,
    metrics: {},
  });
  const [followers, setFollowers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isPolling, setIsPolling] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    if (userData?._id || userData?.id) {
      loadInsights(userData._id || userData.id);
      loadConversations(userData._id || userData.id);
      if (userData.role === "researcher") {
        loadFollowers(userData._id || userData.id);
      }

      // Check if there's a conversation ID in URL params
      const conversationId = searchParams.get("conversation");
      if (conversationId) {
        selectConversation(conversationId);
      }
    } else {
      navigate("/signin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time polling for updates
  useEffect(() => {
    if (!user?._id && !user?.id) return;

    const userId = user._id || user.id;
    
    // Polling interval - check every 3 seconds for new messages/notifications
    const pollInterval = setInterval(() => {
      if (!isPolling) return;

      // Always refresh conversations list to see new conversations
      loadConversations(userId);

      // Refresh notifications
      loadInsights(userId).then(() => {
        // If we have a selected conversation, refresh its messages
        if (selectedConversation) {
          fetch(
            `${base}/api/messages/${userId}?conversationWith=${selectedConversation}`
          )
            .then((r) => r.json())
            .then((data) => {
              const newMessages = data.messages || [];
              // Only update if we got new messages (check by length or timestamp)
              setMessages((prevMessages) => {
                if (newMessages.length !== prevMessages.length) {
                  return newMessages;
                } else if (newMessages.length > 0) {
                  // Check if last message changed (new message arrived)
                  const lastNewMsg = newMessages[newMessages.length - 1];
                  const lastCurrentMsg = prevMessages[prevMessages.length - 1];
                  if (
                    !lastCurrentMsg ||
                    lastNewMsg._id?.toString() !== lastCurrentMsg._id?.toString()
                  ) {
                    return newMessages;
                  }
                }
                return prevMessages;
              });
            })
            .catch((err) => console.error("Error polling messages:", err));
        }
      });

      // Refresh followers for researchers
      if (user.role === "researcher") {
        loadFollowers(userId);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, [user, selectedConversation, isPolling, base]);

  // Pause polling when tab is hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function loadInsights(userId) {
    try {
      const response = await fetch(`${base}/api/insights/${userId}`);
      const data = await response.json();
      setInsights(data);
      setLoading(false);
      return data;
    } catch (error) {
      console.error("Error loading insights:", error);
      setLoading(false);
      return null;
    }
  }

  async function loadFollowers(userId) {
    try {
      const response = await fetch(`${base}/api/insights/${userId}/followers`);
      const data = await response.json();
      setFollowers(data.followers || []);
    } catch (error) {
      console.error("Error loading followers:", error);
    }
  }

  async function loadConversations(userId) {
    try {
      const response = await fetch(`${base}/api/messages/${userId}/conversations`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }

  async function selectConversation(otherUserId) {
    try {
      const userId = user?._id || user?.id;
      const response = await fetch(
        `${base}/api/messages/${userId}?conversationWith=${otherUserId}`
      );
      const data = await response.json();
      setMessages(data.messages || []);
      setSelectedConversation(otherUserId);
      setActiveTab("messages");
      
      // Mark messages as read
      await fetch(
        `${base}/api/messages/${userId}/conversation/${otherUserId}/read`,
        { method: "PATCH" }
      );

      // Update URL
      setSearchParams({ conversation: otherUserId });
      
      // Refresh insights to update unread count
      loadInsights(userId);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch(`${base}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?._id || user?.id,
          receiverId: selectedConversation,
          senderRole: user?.role,
          receiverRole: user?.role === "patient" ? "researcher" : "patient",
          body: newMessage,
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully!");
        setNewMessage("");
        // Immediately refresh the conversation
        const userId = user?._id || user?.id;
        await selectConversation(selectedConversation);
        await loadConversations(userId);
        // Refresh insights to update notification count
        await loadInsights(userId);
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  }

  async function markAsRead(notificationId) {
    try {
      await fetch(`${base}/api/insights/${notificationId}/read`, {
        method: "PATCH",
      });
      loadInsights(user?._id || user?.id);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch(`${base}/api/insights/${user?._id || user?.id}/read-all`, {
        method: "PATCH",
      });
      loadInsights(user?._id || user?.id);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case "new_reply":
      case "researcher_replied":
        return <Reply className="w-5 h-5 text-orange-600" />;
      case "new_follower":
        return <UserPlus className="w-5 h-5 text-amber-600" />;
      case "new_trial_match":
        return <Beaker className="w-5 h-5 text-orange-600" />;
      case "thread_upvoted":
      case "reply_upvoted":
        return <ThumbsUp className="w-5 h-5 text-amber-600" />;
      case "new_message":
        return <MessageSquare className="w-5 h-5 text-orange-600" />;
      case "patient_question":
        return <FileText className="w-5 h-5 text-orange-600" />;
      default:
        return <Bell className="w-5 h-5 text-orange-600" />;
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function handleNotificationClick(notification) {
    markAsRead(notification._id);
    
    if (notification.type === "new_message" && notification.relatedUserId) {
      const otherUserId = notification.relatedUserId._id || notification.relatedUserId.id || notification.relatedUserId;
      selectConversation(otherUserId.toString());
    } else if (notification.relatedItemType === "thread") {
      navigate(`/forums?threadId=${notification.relatedItemId}`);
    } else if (notification.relatedItemType === "trial") {
      navigate(`/trials`);
    }
  }

  const filteredNotifications = insights.notifications.filter((n) => {
    if (filterType === "all") return true;
    return n.type === filterType;
  });

  const groupedNotifications = filteredNotifications.reduce((acc, notif) => {
    const date = new Date(notif.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let group;
    if (date >= today) {
      group = "Today";
    } else if (date >= yesterday) {
      group = "Yesterday";
    } else if (date >= weekAgo) {
      group = "This Week";
    } else {
      group = "Older";
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(notif);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 pt-20 px-4">
        <div className="max-w-6xl mx-auto py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-orange-200 rounded w-1/4"></div>
            <div className="h-64 bg-white rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const userRole = user?.role;
  const selectedUser = selectedConversation 
    ? conversations.find(c => c.userId === selectedConversation)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold text-orange-900">
                  Insights & Activity
                </h1>
                {isPolling && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="hidden sm:inline">Live</span>
                  </div>
                )}
              </div>
              <p className="text-orange-700">
                Stay updated with your latest notifications and messages
              </p>
            </div>
            <div className="flex items-center gap-2">
              {insights.unreadCount > 0 && activeTab === "activity" && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => {
                  const userId = user?._id || user?.id;
                  if (userId) {
                    loadInsights(userId);
                    loadConversations(userId);
                    if (selectedConversation) {
                      selectConversation(selectedConversation);
                    }
                    if (user.role === "researcher") {
                      loadFollowers(userId);
                    }
                  }
                }}
                className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-all flex items-center gap-2"
                title="Refresh"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-orange-200">
            <button
              onClick={() => {
                setActiveTab("activity");
                setSelectedConversation(null);
                setSearchParams({});
              }}
              className={`px-6 py-3 font-medium transition-all relative ${
                activeTab === "activity"
                  ? "text-orange-600 border-b-2 border-orange-500"
                  : "text-orange-700 hover:text-orange-600"
              }`}
            >
              Activity
              {insights.unreadCount > 0 && activeTab === "activity" && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("messages");
                if (conversations.length > 0 && !selectedConversation) {
                  selectConversation(conversations[0].userId);
                }
              }}
              className={`px-6 py-3 font-medium transition-all relative ${
                activeTab === "messages"
                  ? "text-orange-600 border-b-2 border-orange-500"
                  : "text-orange-700 hover:text-orange-600"
              }`}
            >
              Messages
            </button>
            {userRole === "researcher" && (
              <button
                onClick={() => setActiveTab("followers")}
                className={`px-6 py-3 font-medium transition-all ${
                  activeTab === "followers"
                    ? "text-orange-600 border-b-2 border-orange-500"
                    : "text-orange-700 hover:text-orange-600"
                }`}
              >
                Followers ({followers.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab("metrics")}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === "metrics"
                  ? "text-orange-600 border-b-2 border-orange-500"
                  : "text-orange-700 hover:text-orange-600"
              }`}
            >
              Metrics
            </button>
          </div>
        </div>

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-2xl shadow-lg border border-orange-200 overflow-hidden">
            {/* Filter */}
            <div className="p-4 border-b border-orange-200 bg-orange-50/50 flex items-center gap-3 flex-wrap">
              <Filter className="w-4 h-4 text-orange-600" />
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterType === "all"
                    ? "bg-orange-500 text-white"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("new_reply")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterType === "new_reply"
                    ? "bg-orange-500 text-white"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
              >
                Replies
              </button>
              <button
                onClick={() => setFilterType("new_follower")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterType === "new_follower"
                    ? "bg-orange-500 text-white"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
              >
                Followers
              </button>
              <button
                onClick={() => setFilterType("new_message")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterType === "new_message"
                    ? "bg-orange-500 text-white"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                }`}
              >
                Messages
              </button>
            </div>

            {/* Notifications */}
            <div className="divide-y divide-orange-100 max-h-[600px] overflow-y-auto">
              {Object.keys(groupedNotifications).length === 0 ? (
                <div className="p-12 text-center">
                  <Bell className="w-16 h-16 text-orange-300 mx-auto mb-4" />
                  <p className="text-orange-700 font-medium text-lg mb-2">
                    No notifications yet
                  </p>
                  <p className="text-orange-600 text-sm">
                    Your activity and updates will appear here
                  </p>
                </div>
              ) : (
                Object.entries(groupedNotifications).map(([group, notifs]) => (
                  <div key={group}>
                    <div className="px-6 py-3 bg-orange-50/50 border-b border-orange-100">
                      <h3 className="font-semibold text-orange-800">{group}</h3>
                    </div>
                    {notifs.map((notif) => (
                      <div
                        key={notif._id}
                        className={`px-6 py-4 hover:bg-orange-50/50 transition-all cursor-pointer ${
                          !notif.read ? "bg-orange-50/30 border-l-4 border-orange-500" : ""
                        }`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-orange-900 mb-1">
                                  {notif.title}
                                </h4>
                                <p className="text-sm text-orange-700 mb-2">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-orange-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(notif.createdAt)}
                                  </span>
                                  {notif.relatedUserId && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {notif.relatedUserId.username || "Someone"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!notif.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif._id);
                                  }}
                                  className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-all"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages Tab - Chat Interface */}
        {activeTab === "messages" && (
          <div className="bg-white rounded-2xl shadow-lg border border-orange-200 overflow-hidden flex" style={{ height: "600px" }}>
            {/* Conversations List */}
            <div className="w-1/3 border-r border-orange-200 flex flex-col">
              <div className="p-4 border-b border-orange-200 bg-orange-50/50">
                <h3 className="font-semibold text-orange-900">Conversations</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-orange-300 mx-auto mb-3" />
                    <p className="text-orange-700 font-medium text-sm mb-1">
                      No conversations yet
                    </p>
                    <p className="text-orange-600 text-xs">
                      Start messaging from the dashboard
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.userId}
                      onClick={() => selectConversation(conv.userId)}
                      className={`p-4 border-b border-orange-100 cursor-pointer hover:bg-orange-50/50 transition-all ${
                        selectedConversation === conv.userId ? "bg-orange-100 border-l-4 border-orange-500" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                          {conv.username?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-orange-900 text-sm truncate">
                              {conv.username}
                            </h4>
                            {conv.unreadCount > 0 && (
                              <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-orange-600 truncate">
                            {conv.lastMessage.body}
                          </p>
                          <p className="text-xs text-orange-500 mt-1">
                            {formatDate(conv.lastMessage.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-orange-200 bg-orange-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                        {selectedUser?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-orange-900">
                          {selectedUser?.username || "User"}
                        </h3>
                        <p className="text-xs text-orange-600">
                          {selectedUser?.email || ""}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedConversation(null);
                        setSearchParams({});
                      }}
                      className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-orange-600" />
                    </button>
                  </div>

                  {/* Messages */}
                  <div 
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-orange-50/20"
                    id="messages-container"
                  >
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-orange-300 mx-auto mb-4" />
                        <p className="text-orange-700 font-medium">
                          No messages yet
                        </p>
                        <p className="text-orange-600 text-sm mt-1">
                          Start the conversation below
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        // Get sender ID - handle both populated and unpopulated cases
                        const senderId = msg.senderId?._id?.toString() || 
                                        msg.senderId?.id?.toString() || 
                                        msg.senderId?.toString() || 
                                        msg.senderId;
                        const currentUserId = (user?._id || user?.id)?.toString();
                        const isSender = senderId === currentUserId;
                        
                        return (
                          <div
                            key={msg._id || idx}
                            className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl p-3 ${
                                isSender
                                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                                  : "bg-orange-100 text-orange-900"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.body}
                              </p>
                              <p className={`text-xs mt-1 ${
                                isSender ? "text-orange-100" : "text-orange-600"
                              }`}>
                                {formatDate(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-orange-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-orange-300 mx-auto mb-4" />
                    <p className="text-orange-700 font-medium">
                      Select a conversation to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Followers Tab (Researchers only) */}
        {activeTab === "followers" && userRole === "researcher" && (
          <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-6">
            <h2 className="text-2xl font-bold text-orange-900 mb-6">
              Your Followers ({followers.length})
            </h2>
            {followers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-orange-300 mx-auto mb-4" />
                <p className="text-orange-700 font-medium text-lg mb-2">
                  No followers yet
                </p>
                <p className="text-orange-600 text-sm">
                  Share your expertise and people will start following you!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followers.map((follower) => (
                  <div
                    key={follower._id}
                    className="p-4 border-2 border-orange-100 rounded-xl hover:border-orange-300 transition-all bg-gradient-to-br from-orange-50 to-amber-50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {follower.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-orange-900 truncate">
                          {follower.username}
                        </h4>
                        <p className="text-xs text-orange-600">
                          {formatDate(follower.followedAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("messages");
                        selectConversation(follower._id);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-sm font-medium hover:from-orange-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
                    >
                      <MessageSquare className="w-4 h-4 inline mr-2" />
                      Message
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userRole === "patient" ? (
              <>
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-orange-600" />
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.threadsCreated || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Threads Created</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <Reply className="w-8 h-8 text-amber-600" />
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.repliesCreated || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Replies Posted</p>
                </div>
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <ThumbsUp className="w-8 h-8 text-orange-600" />
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.totalUpvotes || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Total Upvotes</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <Eye className="w-8 h-8 text-amber-600" />
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.threadViews || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Thread Views</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-orange-600" />
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.followers || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Followers</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <Beaker className="w-8 h-8 text-amber-600" />
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.trialsCreated || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Trials Created</p>
                </div>
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-orange-600" />
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.threadsCreated || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Threads Created</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <Reply className="w-8 h-8 text-amber-600" />
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.repliesCreated || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Replies Posted</p>
                </div>
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <ThumbsUp className="w-8 h-8 text-orange-600" />
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.totalUpvotes || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Total Upvotes</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <Heart className="w-8 h-8 text-amber-600" />
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-orange-900 mb-1">
                    {insights.metrics.trialFavorites || 0}
                  </h3>
                  <p className="text-orange-700 font-medium">Trial Favorites</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

