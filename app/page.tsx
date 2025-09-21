'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabaseAuthProvider';
import SkillSwapAIAssistant from './components/SkillSwapAIAssistant';
import { ArrowUp, ArrowDown, Lightbulb, Link as LinkIcon, HandHeart, GraduationCap } from 'lucide-react';

const SkillSwap = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const { isAuthenticated } = useAuth();

  const testimonials = [
    {
      name: "Sarah Johnson",
      skill: "Photography",
      text: "Amazing platform! I learned guitar in exchange for teaching photography. The community is so supportive and welcoming.",
      avatar: "👩‍💼"
    },
    {
      name: "Mike Chen", 
      skill: "Coding",
      text: "Found the perfect language exchange partner. Now I'm fluent in Spanish and helped someone learn JavaScript!",
      avatar: "👨‍💻"
    },
    {
      name: "Emma Davis",
      skill: "Art",
      text: "Teaching art while learning music production has been incredible. The skill swap model works perfectly!",
      avatar: "👩‍🎨"
    }
  ];

  const popularSkills = [
    { name: "Coding", icon: "💻", category: "Technology" },
    { name: "Music", icon: "🎵", category: "Arts" },
    { name: "Photography", icon: "📸", category: "Creative" },
    { name: "Languages", icon: "🌍", category: "Communication" },
    { name: "Art", icon: "🎨", category: "Creative" },
    { name: "Cooking", icon: "👨‍🍳", category: "Lifestyle" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <nav className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <ArrowUp className="w-4 h-4 text-white absolute top-2 left-3" />
                  <ArrowDown className="w-4 h-4 text-orange-400 absolute bottom-2 right-3" />
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Skill Swap
              </span>
            </div>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="bg-gray-800 text-white px-6 py-2 rounded-full hover:bg-gray-700 transition-all duration-300 hover:scale-105"
            >
              How it Works
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute animate-bounce top-10 left-10 w-8 h-8 bg-white rounded-full"></div>
          <div className="absolute animate-bounce delay-1000 top-20 right-20 w-6 h-6 bg-orange-300 rounded-full"></div>
          <div className="absolute animate-bounce delay-2000 bottom-20 left-1/4 w-10 h-10 bg-yellow-300 rounded-full"></div>
          <div className="absolute animate-bounce delay-3000 bottom-32 right-1/3 w-7 h-7 bg-green-300 rounded-full"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-6 text-center text-white">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 animate-fade-in">
            Skill Swap
          </h1>
          <p className="text-2xl mb-12 opacity-90">Teach and Learn</p>
          
          {/* Character Illustrations */}
          <div className="flex justify-center items-center space-x-8 mb-12 flex-wrap gap-8">
            {['🎸', '👩‍🎤', '📱', '💻', '📸'].map((emoji, index) => (
              <div 
                key={index}
                className="flex flex-col items-center animate-bounce"
                style={{ animationDelay: `${index * 0.5}s` }}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-3xl mb-3 shadow-lg">
                  {emoji}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center space-x-6 flex-wrap gap-4">
            <Link
              href={isAuthenticated ? '/skills/create' : '/auth/login'}
              className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Offer a Skill
            </Link>
            <Link
              href="/skills"
              className="bg-gray-800 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-700 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Learn a Skill
            </Link>
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth/login'}
              className="bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-full font-semibold border-2 border-white/30 hover:bg-white/30 transition-all duration-300 hover:scale-105"
            >
              Explore
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="bg-white">
        {/* How It Works */}
        <section id="how-it-works" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-5xl font-bold text-center mb-16 text-gray-800">How It Works</h2>
            
            <div className="grid md:grid-cols-4 gap-8 mb-16">
              {[
                { icon: <Lightbulb className="w-8 h-8" />, title: "Discover", desc: "Find skills you want to learn and people who want to teach them" },
                { icon: <LinkIcon className="w-8 h-8" />, title: "Connect", desc: "Match with people whose skills complement yours" },
                { icon: <HandHeart className="w-8 h-8" />, title: "Exchange", desc: "Trade skills in a mutually beneficial learning experience" },
                { icon: <GraduationCap className="w-8 h-8" />, title: "Learn", desc: "Gain new abilities while sharing your expertise with others" }
              ].map((step, index) => (
                <div key={index} className="text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white mx-auto mb-6">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Skills */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-5xl font-bold text-center mb-16 text-gray-800">Popular Skills</h2>
            
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
              {popularSkills.map((skill, index) => (
                <div key={index} className="bg-white p-6 rounded-2xl text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-blue-200">
                  <div className="text-4xl mb-4">{skill.icon}</div>
                  <h3 className="font-semibold text-gray-800 mb-2">{skill.name}</h3>
                  <p className="text-sm text-gray-500">{skill.category}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-5xl font-bold text-center mb-16 text-gray-800">Testimonials</h2>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl shadow-lg">
                <div className="text-center">
                  <div className="text-6xl mb-6">{testimonials[currentTestimonial].avatar}</div>
                  <blockquote className="text-xl text-gray-700 mb-6 italic leading-relaxed">
                    "{testimonials[currentTestimonial].text}"
                  </blockquote>
                  <div className="flex items-center justify-center space-x-4">
                    <div>
                      <p className="font-semibold text-gray-800">{testimonials[currentTestimonial].name}</p>
                      <p className="text-gray-500">{testimonials[currentTestimonial].skill}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center mt-8 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentTestimonial ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating AI Assistant */}
      <SkillSwapAIAssistant />
    </div>
  );
};

export default SkillSwap;