'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/lib/supabaseAuthProvider';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  message: string;
  messageType: string;
  timestamp: any;
}

interface Session {
  id: string;
  skillTitle: string;
  teacherId: string;
  learnerId: string;
  teacherName: string;
  learnerName: string;
  status: string;
  participants: string[];
}

function ChatContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  const [conversations, setConversations] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // FIRST_EDIT_START: file upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  // FIRST_EDIT_END

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (sessionId && user) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchSessionData();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    } else {
      setSession(null);
      setMessages([]);
      setLoading(false);
    }
  }, [sessionId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/sessions');
      const result = await response.json();
      const list: Session[] = result.sessions || [];
      // Sort by most recent first using createdAt if present, fallback to id
      setConversations(list);
    } catch (e) {
      // ignore
    }
  };

  const fetchSessionData = async () => {
    try {
      const response = await fetch('/api/sessions');
      const result = await response.json();
      const s = (result.sessions as Session[] | undefined)?.find((x) => x.id === sessionId) || null;
      setSession(s);
    } catch (error) {
      // ignore
    }
  };

  const fetchMessages = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/chat?sessionId=${sessionId}`);
      const result = await response.json();
      
      if (response.ok) {
        setMessages(result.messages || []);
      }
    } catch (error) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId || sending) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: newMessage.trim(),
          messageType: 'text'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNewMessage('');
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        fetchMessages();
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (error) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startVideoCall = () => {
    if (session) {
      const meetingUrl = `/call?sessionId=${sessionId}`;
      window.open(meetingUrl, '_blank');
      
      // Send a video invite message with join URL
      fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: meetingUrl,
          messageType: 'video'
        }),
      });
    }
  };

  // FIRST_EDIT_START: handle file selection & send as message
  const onSelectFile = async (file: File | null) => {
    if (!file || !sessionId) return;
    try {
      setUploadingFile(true);
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/files/upload', { method: 'POST', body: fd });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson?.error || 'Upload failed');
      const fileUrl = upJson.fileUrl as string;
      const fileName = upJson.fileName as string;
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: fileUrl, messageType: 'file', fileName }),
      });
      // refresh
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchMessages();
    } catch {
      setError('Failed to send file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  // FIRST_EDIT_END

  const partnerName = session ? (session.teacherId === user?.id ? session.learnerName : session.teacherName) : '';
  const isTeacher = session ? session.teacherId === user?.id : false;

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-blue-50 to-teal-50 flex flex-col">
      {/* Fixed Messages Panel Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile: Back button and title */}
            <div className="flex items-center gap-3 md:hidden">
              <Link
                href="/sessions"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="material-symbols:arrow-back" width={20} className="text-gray-600" />
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                {session ? session.skillTitle : 'Messages'}
              </h1>
            </div>

            {/* Desktop: Full header */}
            <div className="hidden md:flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                {session && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Icon 
                      icon={isTeacher ? 'material-symbols:school' : 'material-symbols:lightbulb'} 
                      width={16} 
                    />
                    <span>{isTeacher ? 'Teaching' : 'Learning'} • with {partnerName}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {session && session.status === 'accepted' && (
                  <button
                    onClick={startVideoCall}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Icon icon="mdi:video" width={20} />
                    Video Call
                  </button>
                )}
                
                {session && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    session.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    session.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                    session.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </div>
                )}
                
                <Link href="/sessions" className="text-sm text-blue-600 hover:text-blue-700">New Session</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar (Desktop only) */}
        <aside className="hidden w-full max-w-[320px] shrink-0 border-r border-gray-200 bg-white/80 backdrop-blur-sm md:block">
          <div className="h-full overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No conversations yet.</div>
            ) : (
              conversations.map((c) => {
                const otherName = c.teacherId === user?.id ? c.learnerName : c.teacherName;
                const active = c.id === sessionId;
                return (
                  <Link
                    key={c.id}
                    href={`/chat?sessionId=${c.id}`}
                    className={`flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-slate-900">{otherName}</div>
                      <div className="truncate text-slate-500">{c.skillTitle}</div>
                    </div>
                    <Icon icon="mdi:chevron-right" width={18} className="text-slate-400" />
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile conversation selector */}
          {!session && (
            <div className="md:hidden bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-900 mb-3">Select a conversation</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="text-sm text-gray-600">No conversations yet.</div>
                ) : (
                  conversations.map((c) => {
                    const otherName = c.teacherId === user?.id ? c.learnerName : c.teacherName;
                    return (
                      <Link
                        key={c.id}
                        href={`/chat?sessionId=${c.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900">{otherName}</div>
                          <div className="truncate text-xs text-gray-500">{c.skillTitle}</div>
                        </div>
                        <Icon icon="mdi:chevron-right" width={16} className="text-gray-400" />
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4">
          {session ? (
            messages.length > 0 ? (
              messages.map((message, index) => {
                const isOwnMessage = message.senderId === user?.id;
                const isSystemMessage = message.messageType === 'system';
                
                // FIRST_EDIT_START: helper to detect image
                const isImageFile = message.messageType === 'file' && /\.(png|jpe?g|webp|gif)$/i.test((message as unknown as { fileName?: string }).fileName || '');
                // FIRST_EDIT_END
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className={`flex ${isOwnMessage && !isSystemMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {isSystemMessage ? (
                      <div className="max-w-md mx-auto">
                        <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-lg text-center">
                          {message.message}
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-1">
                          {message.timestamp && format(new Date(message.timestamp.seconds * 1000), 'HH:mm')}
                        </div>
                      </div>
                    ) : (
                      <div className={`max-w-md ${isOwnMessage ? 'ml-12' : 'mr-12'}`}>
                        <div className={`${
                          isOwnMessage 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-900 border border-gray-200'
                        } p-3 rounded-lg`}
                        >
                          {/* FIRST_EDIT_START: render file attachments differently */}
                          {message.messageType === 'file' ? (
                            <div className="space-y-2">
                              {isImageFile ? (
                                <img src={message.message} alt={(message as unknown as { fileName?: string }).fileName || 'Shared image'} className="rounded-lg max-h-64 object-contain" />
                              ) : (
                                <div className="flex items-center gap-3">
                                  <Icon icon="mdi:paperclip" width={18} />
                                  <span className="truncate text-sm">{(message as unknown as { fileName?: string }).fileName || 'Attachment'}</span>
                                </div>
                              )}
                              <a href={message.message} target="_blank" rel="noopener noreferrer" className={`${isOwnMessage ? 'text-white/90 underline' : 'text-blue-600 underline'} text-sm`}>Open</a>
                            </div>
                          ) : message.messageType === 'video' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Icon icon="mdi:video" width={18} />
                                <span className="text-sm">Video call invite</span>
                              </div>
                              <a href={message.message} target="_blank" rel="noopener noreferrer" className={`${isOwnMessage ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'} inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:opacity-90`}>
                                <Icon icon="mdi:video" width={16} />
                                Join Call
                              </a>
                            </div>
                          ) : (
                            <p className="text-sm">{message.message}</p>
                          )}
                          {/* FIRST_EDIT_END */}
                        </div>
                        <div className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                          {message.senderName} • {message.timestamp && format(new Date(message.timestamp.seconds * 1000), 'HH:mm')}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Icon icon="material-symbols:chat-bubble-outline" width={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation!</h3>
                <p className="text-gray-600">
                  Send your first message to {partnerName} about "{session.skillTitle}"
                </p>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-600">Select a conversation to start chatting</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-2 -mt-2">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

          {/* Message Input */}
          {session && session.status !== 'declined' && session.status !== 'cancelled' && (
            <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 md:p-4 sticky bottom-0 [padding-bottom:constant(safe-area-inset-bottom)] pb-[max(0px,env(safe-area-inset-bottom))]">
              <form onSubmit={sendMessage} className="flex items-center gap-2 md:gap-3">
                {/* File upload button */}
                <div>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => onSelectFile(e.target.files?.[0] || null)} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className={`p-2 md:p-3 rounded-lg border transition-colors ${uploadingFile ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50 text-gray-600 border-gray-300'}`}
                    title="Attach file"
                  >
                    {uploadingFile ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-b-transparent"></div>
                    ) : (
                      <Icon icon="mdi:paperclip" width={18} />
                    )}
                  </button>
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${partnerName}...`}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                    disabled={sending}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className={`p-2 md:p-3 rounded-lg transition-colors ${
                    sending || !newMessage.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-2 border-white border-b-transparent"></div>
                  ) : (
                    <Icon icon="material-symbols:send" width={18} className="md:w-5" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}