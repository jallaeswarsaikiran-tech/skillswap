"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Brain, Heart } from 'lucide-react';

// Message type definition to allow optional bot-only fields
type Message = {
  id: number;
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
  confidence?: number;
  quickActions?: string[];
  followUp?: string;
  sentiment?: string;
};

// ================================================================
// Enhanced Frontend Component with Free AI
// ================================================================

const FreeAISkillSwapBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'bot',
      text: "👋 Hi! I'm your FREE AI assistant for SkillSwap! I use smart algorithms (not expensive APIs) to provide intelligent help. I can solve technical issues, guide you through the platform, and give personalized advice. What can I help you with?",
      timestamp: new Date(),
      confidence: 1.0
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState({});
  const messagesEndRef = useRef(null);

  // Load user context
  useEffect(() => {
    loadUserContext();
  }, []);

  const loadUserContext = async () => {
    try {
      const response = await fetch('/api/user/context');
      const context = await response.json();
      setUserContext(context);
    } catch (error) {
      console.log('Using anonymous context');
      setUserContext({ role: 'visitor', credits: 5 });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendToFreeAI = async (userMessage: string) => {
    setIsTyping(true);
    
    try {
      const response = await fetch('/api/ai/free-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          userContext: userContext,
          conversationHistory: messages.slice(-4)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const botMessage: Message = {
          id: Date.now(),
          type: 'bot',
          text: data.response.text,
          quickActions: data.response.quickActions,
          followUp: data.response.followUp,
          confidence: data.analysis.confidence,
          sentiment: data.analysis.sentiment,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('AI response failed');
      }
    } catch (error) {
      console.error('Free AI Error:', error);
      const fallbackMessage: Message = {
        id: Date.now(),
        type: 'bot',
        text: "I'm experiencing a brief hiccup, but I'm still here to help! 🤖\n\nTry asking about:\n• Profile setup issues\n• Video call problems\n• Credits and payments\n• Starting to teach\n• Taking exams\n\nWhat specific issue can I help solve?",
        quickActions: ['profile_help', 'video_help', 'credits_help'],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    await sendToFreeAI(inputText);
    setInputText('');
  };

  const handleQuickAction = (action) => {
    const actionQueries = {
      profile_help: "Help me with profile setup and photo upload",
      video_help: "Video calls are not working properly", 
      credits_help: "Explain the credits system",
      teaching_help: "I want to start teaching on the platform",
      exam_help: "How do I take certification exams",
      contact_support: "I need to contact human support",
      test_upload: "Test photo upload functionality",
      browse_skills: "Show me how to find skills to learn"
    };
    
    if (actionQueries[action]) {
      sendToFreeAI(actionQueries[action]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Removed unused getConfidenceColor helper

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Free AI Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 relative group"
        >
          <div className="flex items-center justify-center">
            <Brain className="w-6 h-6" />
            <Heart className="w-3 h-3 absolute -top-1 -right-1 text-red-400 animate-pulse" />
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            🆓 FREE AI Assistant - No Costs!
          </div>
        </button>
      )}

      {/* Enhanced Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-96 h-[500px] flex flex-col border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Brain className="w-8 h-8 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  SkillSwap AI <Heart className="w-4 h-4 text-red-300" />
                </h3>
                <p className="text-green-100 text-sm">100% FREE • Smart Algorithms</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-green-50 to-white">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-md shadow-md'
                      : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {message.text}
                  </div>
                  
                  {/* Confidence indicator for AI responses */}
                  {message.type === 'bot' && message.confidence && (
                    <div className="mt-2 flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${message.confidence > 0.8 ? 'bg-green-400' : message.confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                      <span className="text-xs text-gray-500">
                        {message.confidence > 0.8 ? 'High confidence' : message.confidence > 0.6 ? 'Medium confidence' : 'Learning from you'}
                      </span>
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  {message.quickActions && message.quickActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {message.quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickAction(action)}
                          className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs border border-green-200 hover:bg-green-100 transition-colors"
                        >
                          {action.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {message.followUp && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                      💝 {message.followUp}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">FREE AI thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything - it's completely FREE!"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full p-2 hover:from-green-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {/* Free indicator */}
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                💚 Completely FREE • No API costs • Smart algorithms
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeAISkillSwapBot;
