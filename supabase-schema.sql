-- SkillSwap Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  photo_url TEXT,
  credits INTEGER DEFAULT 30,
  skills_learned INTEGER DEFAULT 0,
  skills_taught INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('teaching', 'learning')),
  duration INTEGER DEFAULT 60,
  price INTEGER DEFAULT 0,
  live_link TEXT,
  notes TEXT,
  demo_link TEXT,
  exam_link TEXT,
  teacher_certificate_file_id TEXT,
  teacher_certificate_file_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_email TEXT,
  status TEXT DEFAULT 'active',
  rating_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  skill_title TEXT,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_name TEXT,
  learner_name TEXT,
  learner_message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  price INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 60,
  participants UUID[] DEFAULT '{}',
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  certificate_eligible BOOLEAN DEFAULT FALSE,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT,
  message TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'video')),
  file_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  skill_title TEXT,
  teacher_name TEXT,
  learner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  grade TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_number TEXT UNIQUE
);

-- Create webrtc_rooms table
CREATE TABLE IF NOT EXISTS webrtc_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open',
  offered_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  answered_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  offer JSONB,
  answer JSONB,
  offer_candidates JSONB[] DEFAULT '{}',
  answer_candidates JSONB[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  file_id TEXT,
  file_url TEXT,
  file_name TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE webrtc_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Skills: Public read, users can manage their own
CREATE POLICY "Skills are viewable by everyone" ON skills FOR SELECT USING (true);
CREATE POLICY "Users can insert their own skills" ON skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own skills" ON skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own skills" ON skills FOR DELETE USING (auth.uid() = user_id);

-- Sessions: Users can see sessions they're part of
CREATE POLICY "Users can view their sessions" ON sessions FOR SELECT USING (auth.uid() = teacher_id OR auth.uid() = learner_id);
CREATE POLICY "Users can create sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = learner_id);
CREATE POLICY "Teachers can update their sessions" ON sessions FOR UPDATE USING (auth.uid() = teacher_id);

-- Messages: Users can see messages from their sessions
CREATE POLICY "Users can view session messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = messages.session_id 
    AND (sessions.teacher_id = auth.uid() OR sessions.learner_id = auth.uid())
  )
);
CREATE POLICY "Users can send messages to their sessions" ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = messages.session_id 
    AND (sessions.teacher_id = auth.uid() OR sessions.learner_id = auth.uid())
  )
);

-- Ratings: Users can rate sessions they participated in
CREATE POLICY "Users can view ratings" ON ratings FOR SELECT USING (true);
CREATE POLICY "Learners can rate completed sessions" ON ratings FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = ratings.session_id 
    AND sessions.learner_id = auth.uid() 
    AND sessions.status = 'completed'
  )
);

-- Certificates: Users can view their certificates
CREATE POLICY "Users can view their certificates" ON certificates FOR SELECT USING (auth.uid() = learner_id);

-- WebRTC rooms: Users can access rooms for their sessions
CREATE POLICY "Users can access their webrtc rooms" ON webrtc_rooms FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = webrtc_rooms.session_id 
    AND (sessions.teacher_id = auth.uid() OR sessions.learner_id = auth.uid())
  )
);

-- Recordings: Users can view recordings from their sessions
CREATE POLICY "Users can view session recordings" ON recordings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = recordings.session_id 
    AND (sessions.teacher_id = auth.uid() OR sessions.learner_id = auth.uid())
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id ON sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_learner_id ON sessions(learner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ratings_session_id ON ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_rooms_session_id ON webrtc_rooms(session_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
