import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  User as UserIcon, 
  Shield, 
  Building2, 
  CheckCheck,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api, Task, TaskComment, User } from '../services/api';
import './TaskChatDrawer.css';

interface TaskChatDrawerProps {
  task: Task | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onMessageSent?: () => void;
}

const TaskChatDrawer: React.FC<TaskChatDrawerProps> = ({
  task,
  currentUser,
  isOpen,
  onClose,
  onMessageSent
}) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Fetch comments
  const fetchComments = async (isInitial = false) => {
    if (!task?._id) return;
    try {
      if (isInitial) setLoading(true);
      const res = await api.getTaskComments(task._id);
      if (res.success) {
        setComments(res.data || []);
        if (isInitial) {
          setTimeout(() => scrollToBottom(false), 100);
        }
      }
    } catch (err: any) {
      console.error('Failed to load comments:', err);
      if (isInitial) setError('Failed to load messages.');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Fetch when drawer opens or task changes
  useEffect(() => {
    if (isOpen && task?._id) {
      fetchComments(true);
      setError(null);
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 250);

      // Auto-poll comments every 3.5 seconds
      const interval = setInterval(() => {
        fetchComments(false);
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [isOpen, task?._id]);

  // Scroll to bottom when comments list updates
  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom();
    }
  }, [comments.length]);

  // Auto-expand textarea height
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollH = inputRef.current.scrollHeight;
      const newHeight = Math.min(scrollH, 180);
      inputRef.current.style.height = `${Math.max(newHeight, 28)}px`;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    adjustTextareaHeight();
  };

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !task?._id || sending) return;

    const messageText = newMessage.trim();
    setSending(true);
    setError(null);

    try {
      const res = await api.addTaskComment(task._id, messageText);
      if (res.success) {
        setComments(res.data);
        setNewMessage('');
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
        }
        scrollToBottom();
        if (onMessageSent) onMessageSent();
      }
    } catch (err: any) {
      console.error('Failed to send comment:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Keydown handler: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Allow newline and expand height
      setTimeout(adjustTextareaHeight, 10);
    }
  };

  // Quick suggestion tags
  const handleQuickSuggestion = (text: string) => {
    setNewMessage(text);
    setTimeout(() => {
      adjustTextareaHeight();
      inputRef.current?.focus();
    }, 50);
  };

  if (!isOpen || !task) return null;

  // Format timestamp
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format relative Seen timestamp (Instagram/WhatsApp style)
  const formatSeenTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Seen';
    const readTime = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffSec = Math.max(0, Math.floor((now - readTime) / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Seen just now';
    if (diffMin === 1) return 'Seen 1m ago';
    if (diffMin < 60) return `Seen ${diffMin}m ago`;
    if (diffHour === 1) return 'Seen 1h ago';
    if (diffHour < 24) return `Seen ${diffHour}h ago`;

    const d = new Date(dateStr);
    return `Seen on ${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}`;
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', className: 'chat-role-super-admin', icon: <Shield size={10} /> };
      case 'department_admin':
        return { label: 'Dept Admin', className: 'chat-role-dept-admin', icon: <Building2 size={10} /> };
      case 'staff':
        return { label: 'Staff', className: 'chat-role-staff', icon: <UserIcon size={10} /> };
      default:
        return { label: 'Member', className: 'chat-role-member', icon: <UserIcon size={10} /> };
    }
  };

  const myId = (currentUser?._id || currentUser?.id)?.toString();
  const myUnivId = currentUser?.universityId?.toString();

  const creator: any = task.createdBy;
  const assignee: any = task.delegatedTo || task.assignedTo;

  const isMeCreator = Boolean(creator && (
    (creator._id || creator.id)?.toString() === myId ||
    (creator.universityId && creator.universityId === myUnivId)
  ));

  let counterpart: any = isMeCreator ? assignee : creator;
  if (!counterpart && assignee && ((assignee._id || assignee.id)?.toString() !== myId)) {
    counterpart = assignee;
  } else if (!counterpart && creator && ((creator._id || creator.id)?.toString() !== myId)) {
    counterpart = creator;
  }

  const counterpartName = counterpart?.name || (isMeCreator ? (task.delegatedTo ? 'Delegated Staff' : 'Department Admin') : 'Super Admin');
  const counterpartId = counterpart?.universityId || counterpart?.employeeId || '';
  const counterpartRole = counterpart?.role || (isMeCreator ? (task.delegatedTo ? 'staff' : 'department_admin') : 'super_admin');
  const counterpartRoleBadge = getRoleBadge(counterpartRole);

  return (
    <div className="task-chat-drawer-overlay" onClick={onClose}>
      <div className="task-chat-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="task-chat-header">
          <div className="task-chat-header-info">
            <div className="task-chat-badge-row">
              <span className="task-chat-id-tag">#{task.taskId || 'TASK'}</span>
              <span className={`task-chat-status-pill ${task.status}`}>
                {task.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 className="task-chat-task-title" title={task.title}>
              {task.title}
            </h2>
            <div className="task-chat-counterpart">
              <span className="counterpart-label">Talking with:</span>
              <div className="counterpart-chip">
                {counterpartRoleBadge.icon}
                <span className="counterpart-name">
                  {counterpartName}
                  {counterpartId ? ` (${counterpartId})` : ''}
                </span>
                <span className={`chat-role-badge ${counterpartRoleBadge.className}`}>
                  {counterpartRoleBadge.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="task-chat-header-actions">
            <button 
              className="task-chat-icon-btn" 
              onClick={() => fetchComments(true)} 
              title="Refresh messages"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
            <button className="task-chat-close-btn" onClick={onClose} title="Close Chat">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Help Banner */}
        <div className="task-chat-context-banner">
          <MessageSquare size={13} className="banner-icon" />
          <span>Task-specific direct discussion between Assignor and Assignee.</span>
        </div>

        {/* Chat Messages Body */}
        <div className="task-chat-body">
          {loading ? (
            <div className="task-chat-loading-state">
              <RefreshCw size={24} className="spinning" />
              <p>Loading discussion...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="task-chat-empty-state">
              <div className="empty-icon-circle">
                <MessageSquare size={28} />
              </div>
              <h3>No Messages Yet</h3>
              <p>Have questions or updates regarding this task? Start the discussion below.</p>
              
              <div className="task-chat-quick-suggestions">
                <div className="suggestion-label">
                  <Sparkles size={12} /> Quick Messages:
                </div>
                <button 
                  className="suggestion-pill"
                  onClick={() => handleQuickSuggestion('Sir, files have been uploaded for review. Please check.')}
                >
                  "Uploaded files for review"
                </button>
                <button 
                  className="suggestion-pill"
                  onClick={() => handleQuickSuggestion('Working on this task, will submit before deadline.')}
                >
                  "In progress, submitting soon"
                </button>
                <button 
                  className="suggestion-pill"
                  onClick={() => handleQuickSuggestion('Need clarification regarding the required format.')}
                >
                  "Need format clarification"
                </button>
              </div>
            </div>
          ) : (
            <div className="task-chat-message-list">
              {comments.map((msg, index) => {
                const myId = (currentUser?._id || currentUser?.id)?.toString();
                const myUnivId = currentUser?.universityId?.toString();
                const myEmail = currentUser?.email?.toLowerCase();

                const senderObj: any = typeof msg.sender === 'object' && msg.sender !== null ? msg.sender : null;
                const senderId = (senderObj?._id || senderObj?.id || msg.sender)?.toString();
                const senderUnivId = senderObj?.universityId?.toString();
                const senderEmail = senderObj?.email?.toLowerCase();

                const isMe = Boolean(
                  (myId && senderId && myId === senderId) ||
                  (myUnivId && senderUnivId && myUnivId === senderUnivId) ||
                  (myEmail && senderEmail && myEmail === senderEmail)
                );

                const isSeenByOther = Boolean(
                  msg.readAt ||
                  (msg.readBy && msg.readBy.some((uid: any) => {
                    const readerId = (uid?._id || uid?.id || uid)?.toString();
                    return readerId && readerId !== myId;
                  }))
                );

                const isLastMyMessage = isMe && (
                  index === comments.length - 1 ||
                  !comments.slice(index + 1).some(m => {
                    const mSender: any = m.sender;
                    const mSenderId = (mSender?._id || mSender?.id || m.sender)?.toString();
                    return mSenderId === myId;
                  })
                );

                // Check if date separator is needed
                const showDate = index === 0 || formatDateLabel(comments[index - 1].createdAt) !== formatDateLabel(msg.createdAt);

                return (
                  <React.Fragment key={msg._id || index}>
                    {showDate && (
                      <div className="chat-date-separator">
                        <span>{formatDateLabel(msg.createdAt)}</span>
                      </div>
                    )}
                    <div className={`chat-message-row ${isMe ? 'my-message' : 'other-message'}`}>
                      {!isMe && (
                        <div className="chat-avatar" title={msg.sender?.name || 'Member'}>
                          <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name || 'U')}&background=0284c7&color=ffffff&size=64`} 
                            alt="avatar" 
                          />
                        </div>
                      )}
                      <div className="chat-bubble-container">
                        {!isMe && (
                          <div className="chat-sender-header">
                            <span className="chat-sender-name">
                              {senderObj?.name || 'User'}
                              {(senderObj?.universityId || senderObj?.employeeId) && (
                                <span className="chat-sender-id"> ({senderObj?.universityId || senderObj?.employeeId})</span>
                              )}
                            </span>
                          </div>
                        )}

                        <div className="chat-bubble">
                          <p className="chat-text">{msg.message}</p>
                          <div className="chat-meta">
                            <span className="chat-time">{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>

                        {/* Instagram-style Seen Indicator */}
                        {isMe && isLastMyMessage && (
                          <div className={`chat-seen-indicator ${isSeenByOther ? 'seen' : 'delivered'}`}>
                            {isSeenByOther ? (
                              <>
                                <CheckCheck size={12} className="seen-check-icon" />
                                <span>{formatSeenTime(msg.readAt)}</span>
                              </>
                            ) : (
                              <>
                                <Check size={11} className="delivered-check-icon" />
                                <span>Delivered</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="task-chat-error-toast">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Bottom Input Area */}
        <div className="task-chat-footer">
          <form className="task-chat-input-form" onSubmit={handleSendMessage}>
            <textarea
              ref={inputRef}
              className="task-chat-textarea"
              placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
              value={newMessage}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
            />
            <button 
              type="submit" 
              className="task-chat-send-btn" 
              disabled={!newMessage.trim() || sending}
              title="Send Message"
            >
              {sending ? <RefreshCw size={16} className="spinning" /> : <Send size={16} />}
            </button>
          </form>
          <div className="task-chat-shortcuts">
            <span>Press <strong>Enter ↵</strong> to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskChatDrawer;
