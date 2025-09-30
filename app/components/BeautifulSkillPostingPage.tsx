"use client";

import React, { useState, useRef } from 'react';
import { 
  Camera, Star, Award, Users, Book, Calendar, Clock, 
  Plus, X, Upload, Play, Pause, Video, Image as ImageIcon, File as FileIcon,
  DollarSign, Globe, Shield, CheckCircle, AlertCircle,
  Eye, TrendingUp, Target, Zap, BookOpen, GraduationCap,
  ChevronDown, ChevronRight, Save, Send, ArrowLeft, 
  Sparkles, Lightbulb, Rocket, Heart, Tag, Layers
} from 'lucide-react';

export default function BeautifulSkillPostingPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [skillData, setSkillData] = useState<any>({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    duration: '60',
    price: '',
    maxStudents: '10',
    tags: [] as string[],
    prerequisites: '',
    learningOutcomes: [''] as string[],
    skillImage: null as File | null,
    videoPreview: null as File | null,
    materials: [] as File[],
    availability: {
      days: [] as string[],
      timeSlots: [] as string[]
    }
  });

  const [dragActive, setDragActive] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const totalSteps = 4;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const categories = [
    { id: 'technology', label: 'Technology', icon: '💻', color: 'from-blue-500 to-cyan-500' },
    { id: 'design', label: 'Design', icon: '🎨', color: 'from-purple-500 to-pink-500' },
    { id: 'business', label: 'Business', icon: '📊', color: 'from-green-500 to-emerald-500' },
    { id: 'language', label: 'Languages', icon: '🌍', color: 'from-orange-500 to-red-500' },
    { id: 'creative', label: 'Creative Arts', icon: '✨', color: 'from-indigo-500 to-purple-500' },
    { id: 'health', label: 'Health & Fitness', icon: '🏃‍♂️', color: 'from-teal-500 to-green-500' }
  ];

  const difficultyLevels = [
    { id: 'beginner', label: 'Beginner', desc: 'No prior experience needed', icon: '🌱', color: 'text-green-600 bg-green-50' },
    { id: 'intermediate', label: 'Intermediate', desc: 'Some experience required', icon: '🌿', color: 'text-blue-600 bg-blue-50' },
    { id: 'advanced', label: 'Advanced', desc: 'Strong foundation needed', icon: '🌳', color: 'text-purple-600 bg-purple-50' },
    { id: 'expert', label: 'Expert', desc: 'Professional level', icon: '🏆', color: 'text-yellow-600 bg-yellow-50' }
  ];

  const suggestedTags = [
    'React', 'JavaScript', 'Python', 'Design', 'UI/UX', 'Node.js', 
    'Machine Learning', 'Photography', 'Writing', 'Marketing', 
    'Blockchain', 'Mobile App', 'Data Science', 'DevOps'
  ];

  const PageHeader = () => (
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl opacity-90"></div>
      <div className="absolute inset-0 bg-blue-700/20 rounded-3xl"></div>
      <div className="relative px-8 py-12 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <button className="w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-opacity-30 transition-all">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Share Your Expertise</h1>
                <p className="text-lg opacity-90">Create a skill and start teaching others while earning credits</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <div className="flex-1 bg-white bg-opacity-20 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all duration-700" style={{ width: `${progressPercentage}%` }} />
              </div>
              <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="relative">
              <div className="w-32 h-32 border border-white border-opacity-20 rounded-3xl rotate-12"></div>
              <div className="absolute top-4 left-4 w-24 h-24 border border-white border-opacity-30 rounded-2xl -rotate-6"></div>
              <Sparkles size={32} className="absolute top-8 left-8 opacity-70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const StepNavigation = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-lg border border-gray-100">
        {[
          { step: 1, title: 'Basic Info', icon: BookOpen },
          { step: 2, title: 'Content', icon: Layers },
          { step: 3, title: 'Pricing', icon: DollarSign },
          { step: 4, title: 'Review', icon: Eye }
        ].map(({ step, title, icon: Icon }) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              currentStep === step ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : currentStep > step ? 'text-green-600 hover:bg-green-50' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{title}</span>
            {currentStep > step && <CheckCircle size={16} />}
          </button>
        ))}
      </div>
    </div>
  );

  const BasicInfoStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Lightbulb size={20} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Skill Title & Description</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What skill will you teach? *</label>
                <input type="text" value={skillData.title} onChange={(e) => setSkillData({ ...skillData, title: e.target.value })} placeholder="e.g., React Development for Beginners" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg" />
                <p className="text-xs text-gray-500 mt-1">Make it clear and compelling - this is what students will see first</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Describe your skill *</label>
                <textarea value={skillData.description} onChange={(e) => setSkillData({ ...skillData, description: e.target.value })} placeholder="Explain what students will learn, your teaching approach, and what makes this skill valuable..." rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Detailed descriptions get more enrollments</span>
                  <span>{skillData.description.length}/500</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Tag size={20} className="text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Category & Level</h3>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Choose a category *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((category) => (
                    <button key={category.id} onClick={() => setSkillData({ ...skillData, category: category.id })} className={`p-4 rounded-xl border-2 transition-all text-left ${skillData.category === category.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <div className="text-2xl mb-2">{category.icon}</div>
                      <div className="font-medium text-gray-900">{category.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Difficulty Level *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {difficultyLevels.map((level) => (
                    <button key={level.id} onClick={() => setSkillData({ ...skillData, difficulty: level.id })} className={`p-4 rounded-xl border-2 transition-all text-left ${skillData.difficulty === level.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{level.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{level.label}</div>
                          <div className="text-sm text-gray-600">{level.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Lightbulb size={16} className="text-white" />
              </div>
              <h4 className="font-semibold text-green-800">Pro Tips</h4>
            </div>
            <ul className="space-y-2 text-sm text-green-700">
              <li>• Use clear, specific titles</li>
              <li>• Highlight unique benefits</li>
              <li>• Mention your experience</li>
              <li>• Include what tools you'll use</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold mb-4">Preview</h4>
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <Camera size={24} className="text-gray-400" />
              </div>
              <h5 className="font-medium text-gray-900 mb-2">{skillData.title || 'Your Skill Title'}</h5>
              <p className="text-sm text-gray-600 mb-3">{skillData.description ? skillData.description.substring(0, 60) + '...' : 'Your skill description will appear here...'}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full capitalize">{skillData.difficulty}</span>
                <span className="text-gray-500">{skillData.category ? categories.find(c => c.id === skillData.category)?.label : 'Category'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ContentStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <ImageIcon size={20} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold">Skill Media</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`} onDragEnter={() => setDragActive(true)} onDragLeave={() => setDragActive(false)} onDrop={(e) => { e.preventDefault(); setDragActive(false); }}>
                <Camera size={32} className="text-gray-400 mx-auto mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Cover Image</h4>
                <p className="text-sm text-gray-600 mb-4">Upload an attractive cover image</p>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Choose Image</button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" />
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors">
                <Video size={32} className="text-gray-400 mx-auto mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Preview Video</h4>
                <p className="text-sm text-gray-600 mb-4">Optional intro video (2-5 min)</p>
                <button onClick={() => videoInputRef.current?.click()} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Add Video</button>
                <input ref={videoInputRef} type="file" className="hidden" accept="video/*" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Target size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Learning Outcomes</h3>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">What will students be able to do after taking your skill?</p>
              {skillData.learningOutcomes.map((outcome: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <input type="text" value={outcome} onChange={(e) => { const newOutcomes = [...skillData.learningOutcomes]; newOutcomes[index] = e.target.value; setSkillData({ ...skillData, learningOutcomes: newOutcomes }); }} placeholder={`Learning outcome ${index + 1}`} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {skillData.learningOutcomes.length > 1 && (
                    <button onClick={() => { const newOutcomes = skillData.learningOutcomes.filter((_: any, i: number) => i !== index); setSkillData({ ...skillData, learningOutcomes: newOutcomes }); }} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"><X size={16} /></button>
                  )}
                </div>
              ))}
              <button onClick={() => setSkillData({ ...skillData, learningOutcomes: [...skillData.learningOutcomes, ''] })} className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Plus size={16} />Add Learning Outcome</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <GraduationCap size={20} className="text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold">Prerequisites</h3>
            </div>
            <textarea value={skillData.prerequisites} onChange={(e) => setSkillData({ ...skillData, prerequisites: e.target.value })} placeholder="What should students know before taking this skill? (Optional)" rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold mb-4">Tags</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {skillData.tags.map((tag: string, index: number) => (
                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {tag}
                  <button onClick={() => { const newTags = skillData.tags.filter((_: any, i: number) => i !== index); setSkillData({ ...skillData, tags: newTags }); }}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedTags.filter(tag => !skillData.tags.includes(tag)).slice(0, 6).map((tag) => (
                <button key={tag} onClick={() => { if (skillData.tags.length < 5) setSkillData({ ...skillData, tags: [...skillData.tags, tag] }); }} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors">+ {tag}</button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Add up to 5 relevant tags</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h4 className="font-semibold mb-4">Session Duration</h4>
            <div className="grid grid-cols-2 gap-2">
              {['30', '60', '90', '120'].map((duration) => (
                <button key={duration} onClick={() => setSkillData({ ...skillData, duration })} className={`px-3 py-2 rounded-lg border text-sm transition-colors ${skillData.duration === duration ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover;border-gray-300'}`}>{duration} min</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const PricingStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <DollarSign size={20} className="text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold">Pricing</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price per session (in credits) *</label>
              <div className="relative">
                <input type="number" value={skillData.price} onChange={(e) => setSkillData({ ...skillData, price: e.target.value })} placeholder="50" className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium" />
                <div className="absolute left-4 top-3 text-gray-400"><Star size={20} /></div>
              </div>
              <div className="mt-2 text-xs text-gray-500">Suggested range: 30-100 credits ({skillData.difficulty === 'beginner' ? '30-50' : skillData.difficulty === 'intermediate' ? '50-75' : '75-100'} for {skillData.difficulty} level)</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum students per session</label>
              <select value={skillData.maxStudents} onChange={(e) => setSkillData({ ...skillData, maxStudents: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="1">1 (Private)</option>
                <option value="3">3 students</option>
                <option value="5">5 students</option>
                <option value="10">10 students</option>
                <option value="15">15 students</option>
              </select>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Potential Earnings</h4>
              <div className="space-y-1 text-sm text-green-700">
                <div className="flex justify-between"><span>Per session:</span><span className="font-medium">{skillData.price || 0} credits</span></div>
                <div className="flex justify-between"><span>Per week (3 sessions):</span><span className="font-medium">{(Number(skillData.price) || 0) * 3} credits</span></div>
                <div className="flex justify-between"><span>Per month (12 sessions):</span><span className="font-medium">{(Number(skillData.price) || 0) * 12} credits</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold">Session Format</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Session Type</label>
              <div className="space-y-2">
                {[
                  { id: 'live', label: 'Live Video Session', desc: 'Real-time interactive teaching' },
                  { id: 'recorded', label: 'Pre-recorded + Q&A', desc: 'Video content + live discussion' },
                  { id: 'mixed', label: 'Mixed Format', desc: 'Combination of both approaches' }
                ].map((type) => (
                  <button key={type.id} className="w-full p-4 text-left border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors">
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm text-gray-700">Provide session recording</span></label>
              <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm text-gray-700">Include course materials</span></label>
              <label className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm text-gray-700">Offer follow-up support</span></label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ReviewStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
            <div className="absolute inset-0 bg-blue-700/30"></div>
            <div className="absolute bottom-4 left-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-xs font-medium">{categories.find(c => c.id === skillData.category)?.label || 'Category'}</span>
                <span className="px-2 py-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-xs font-medium capitalize">{skillData.difficulty}</span>
              </div>
              <h2 className="text-2xl font-bold">{skillData.title || 'Your Skill Title'}</h2>
              <p className="opacity-90">{skillData.duration} minutes • Max {skillData.maxStudents} students</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="font-semibold mb-3">Description</h3>
                <p className="text-gray-700 mb-4">{skillData.description || 'Your skill description will appear here...'}</p>
                <h4 className="font-semibold mb-2">What you'll learn</h4>
                <ul className="space-y-1 mb-4">
                  {skillData.learningOutcomes.filter((o: string) => o.trim()).map((outcome: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700"><CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />{outcome}</li>
                  ))}
                </ul>
                {skillData.prerequisites && (<><h4 className="font-semibold mb-2">Prerequisites</h4><p className="text-gray-700 mb-4">{skillData.prerequisites}</p></>)}
                {skillData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">{skillData.tags.map((tag: string, idx: number) => (<span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{tag}</span>))}</div>
                )}
              </div>
              <div className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-600 mb-1">{skillData.price || 0} <span className="text-lg">credits</span></div>
                  <div className="text-sm text-green-700">per session</div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-600">Duration:</span><span className="font-medium">{skillData.duration} minutes</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Max Students:</span><span className="font-medium">{skillData.maxStudents}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Level:</span><span className="font-medium capitalize">{skillData.difficulty}</span></div>
                </div>
                <div className="space-y-2 pt-4">
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">Book Session</button>
                  <button className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">Message Teacher</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Publication Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-start gap-3"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded mt-1" defaultChecked /><div><div className="font-medium">Publish immediately</div><div className="text-sm text-gray-600">Make this skill available for booking right away</div></div></label>
              <label className="flex items-start gap-3"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded mt-1" /><div><div className="font-medium">Featured listing</div><div className="text-sm text-gray-600">Pay 10 extra credits to feature this skill</div></div></label>
            </div>
            <div className="space-y-4">
              <label className="flex items-start gap-3"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded mt-1" defaultChecked /><div><div className="font-medium">Email notifications</div><div className="text-sm text-gray-600">Get notified when students book sessions</div></div></label>
              <label className="flex items-start gap-3"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded mt-1" /><div><div className="font-medium">Auto-approve bookings</div><div className="text-sm text-gray-600">Automatically accept session requests</div></div></label>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Pre-publication Checklist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Skill title is clear and descriptive', completed: !!skillData.title },
              { label: 'Category and difficulty level selected', completed: !!skillData.category && !!skillData.difficulty },
              { label: 'Detailed description provided', completed: skillData.description.length > 50 },
              { label: 'Learning outcomes defined', completed: skillData.learningOutcomes.some((o: string) => o.trim()) },
              { label: 'Price set appropriately', completed: !!skillData.price && Number(skillData.price) > 0 },
              { label: 'Session duration specified', completed: !!skillData.duration }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                {item.completed ? (<CheckCircle size={20} className="text-green-600" />) : (<AlertCircle size={20} className="text-orange-500" />)}
                <span className={`text-sm ${item.completed ? 'text-gray-700' : 'text-orange-700'}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const SuccessModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Rocket size={32} className="text-green-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Skill Published Successfully!</h3>
        <p className="text-gray-600 mb-6">Your skill "{skillData.title}" is now live and students can start booking sessions.</p>
        <div className="space-y-3">
          <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium">View My Skill</button>
          <button onClick={() => setShowSuccessModal(false)} className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50">Create Another Skill</button>
        </div>
      </div>
    </div>
  );

  const NavigationButtons = () => (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex justify-between">
        <button onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${currentStep === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}><ArrowLeft size={16} />Previous</button>
        <div className="flex gap-3">
          <button onClick={() => setPreviewMode(!previewMode)} className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"><Eye size={16} />{previewMode ? 'Edit Mode' : 'Preview'}</button>
          {currentStep < totalSteps ? (
            <button onClick={() => setCurrentStep(currentStep + 1)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all">Next<ChevronRight size={16} /></button>
          ) : (
            <button onClick={() => setShowSuccessModal(true)} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"><Send size={16} />Publish Skill</button>
          )}
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return <BasicInfoStep />;
      case 2: return <ContentStep />;
      case 3: return <PricingStep />;
      case 4: return <ReviewStep />;
      default: return <BasicInfoStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-30 -translate-y-48 -translate-x-48"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-pink-100 to-orange-100 rounded-full opacity-30 translate-y-48 translate-x-48"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-green-100 to-blue-100 rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <PageHeader />
        <StepNavigation />
        {renderCurrentStep()}
        <NavigationButtons />
      </div>
      {showSuccessModal && <SuccessModal />}
    </div>
  );
}
