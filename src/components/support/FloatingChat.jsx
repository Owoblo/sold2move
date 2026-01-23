import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Minimize2,
  Maximize2,
  User,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { supabase } from '../../lib/customSupabaseClient';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useTheme } from '../../contexts/ThemeContext';

const FloatingChat = () => {
  const { user, session } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);

      // Count unread admin messages
      const unread = (data || []).filter(m => m.sender === 'admin' && !m.read_at).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch and subscribe
  useEffect(() => {
    if (user?.id) {
      fetchMessages();

      // Subscribe to new messages
      const channel = supabase
        .channel('support_messages_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'support_messages',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setMessages(prev => [...prev, payload.new]);
              if (payload.new.sender === 'admin' && !isOpen) {
                setUnreadCount(prev => prev + 1);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, fetchMessages, isOpen]);

  // Mark messages as read when opening chat
  useEffect(() => {
    if (isOpen && user?.id && unreadCount > 0) {
      const markAsRead = async () => {
        await supabase
          .from('support_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('sender', 'admin')
          .is('read_at', null);

        setUnreadCount(0);
      };
      markAsRead();
    }
  }, [isOpen, user?.id, unreadCount]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !user?.id || sending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);

    // Optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      sender: 'user',
      message: messageText,
      created_at: new Date().toISOString(),
      status: 'sending',
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          sender: 'user',
          message: messageText,
          metadata: {
            user_email: user.email,
            user_name: user.user_metadata?.full_name || user.email,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages(prev => prev.map(m =>
        m.id === tempMessage.id ? data : m
      ));
    } catch (err) {
      console.error('Error sending message:', err);
      // Mark message as failed
      setMessages(prev => prev.map(m =>
        m.id === tempMessage.id ? { ...m, status: 'failed' } : m
      ));
    } finally {
      setSending(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Don't render if not logged in
  if (!user) return null;

  const chatContent = (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 ${
          isOpen
            ? 'scale-0 opacity-0'
            : 'scale-100 opacity-100 hover:scale-110'
        } ${
          isLight
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        }`}
        aria-label="Open support chat"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          isOpen
            ? 'scale-100 opacity-100'
            : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
            isMinimized ? 'h-14' : 'h-[500px]'
          } w-[380px] max-w-[calc(100vw-48px)] ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-charcoal-800 border-white/10'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between p-4 ${
              isLight
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`p-2 rounded-full ${isLight ? 'bg-white/20' : 'bg-white/10'}`}>
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-current" />
              </div>
              <div>
                <h3 className="font-semibold">Support Chat</h3>
                <p className="text-xs opacity-80">We typically reply within 1 hour</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMinimize}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={toggleChat}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div
                className={`flex-1 overflow-y-auto p-4 space-y-4 ${
                  isLight ? 'bg-slate-50' : 'bg-charcoal-900/50'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className={`p-4 rounded-full mb-4 ${isLight ? 'bg-emerald-100' : 'bg-primary/10'}`}>
                      <MessageCircle className={`h-8 w-8 ${isLight ? 'text-emerald-600' : 'text-primary'}`} />
                    </div>
                    <h4 className="font-semibold mb-1">Start a conversation</h4>
                    <p className="text-sm text-muted-foreground max-w-[200px]">
                      Have a question? We're here to help!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          msg.sender === 'user'
                            ? isLight
                              ? 'bg-emerald-600 text-white rounded-br-md'
                              : 'bg-primary text-primary-foreground rounded-br-md'
                            : isLight
                              ? 'bg-white border border-slate-200 rounded-bl-md'
                              : 'bg-charcoal-700 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 text-xs ${
                            msg.sender === 'user'
                              ? 'justify-end opacity-80'
                              : 'justify-start text-muted-foreground'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {msg.sender === 'user' && (
                            msg.status === 'sending' ? (
                              <Loader2 className="h-3 w-3 animate-spin ml-1" />
                            ) : msg.status === 'failed' ? (
                              <AlertCircle className="h-3 w-3 text-red-300 ml-1" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 ml-1" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={sendMessage}
                className={`p-4 border-t ${
                  isLight ? 'bg-white border-slate-200' : 'bg-charcoal-800 border-white/10'
                }`}
              >
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type a message..."
                    className={`flex-1 ${
                      isLight
                        ? 'border-slate-200 focus:border-emerald-500'
                        : 'border-white/10'
                    }`}
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputValue.trim() || sending}
                    className={isLight ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );

  // Render in portal to avoid z-index issues
  return createPortal(chatContent, document.body);
};

export default FloatingChat;
