import { NextResponse } from 'next/server';
import natural from 'natural';
import Sentiment from 'sentiment';

class FreeAIEngine {
  private sentiment: any;
  private stemmer: typeof natural.PorterStemmer;
  private tokenizer: natural.WordTokenizer;
  private classifier: natural.BayesClassifier;

  constructor() {
    this.sentiment = new Sentiment();
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    this.trainClassifier();
  }

  private trainClassifier() {
    const trainingData = [
      { text: 'profile photo upload image picture avatar', intent: 'profile_help' },
      { text: 'setup account create profile register sign up', intent: 'profile_help' },
      { text: 'edit profile update information change details', intent: 'profile_help' },

      { text: 'video call not working camera microphone permission', intent: 'video_help' },
      { text: 'cannot see other person black screen video', intent: 'video_help' },
      { text: 'audio sound voice call problem connection', intent: 'video_help' },

      { text: 'credits money earn payment withdraw cash', intent: 'credits_help' },
      { text: 'how much cost price session booking', intent: 'credits_help' },
      { text: 'payment failed transaction error billing', intent: 'payment_help' },

      { text: 'find teacher skill learn course subject', intent: 'find_skills' },
      { text: 'book session schedule time availability', intent: 'booking_help' },
      { text: 'certificate exam test qualification', intent: 'exam_help' },

      { text: 'become teacher teach skill create course', intent: 'teaching_help' },
      { text: 'student request session manage teaching', intent: 'teaching_help' },

      { text: 'mobile app not working phone tablet', intent: 'mobile_help' },
      { text: 'browser chrome firefox safari edge', intent: 'browser_help' },
      { text: 'error bug problem issue not working', intent: 'technical_help' },
    ];

    trainingData.forEach((data) => {
      this.classifier.addDocument(data.text, data.intent);
    });
    this.classifier.train();
  }

  analyzeMessage(message: string, userContext: any = {}) {
    const tokens = this.tokenizer.tokenize(message.toLowerCase());
    const stemmedTokens = tokens.map((token) => this.stemmer.stem(token));
    const sentimentResult = this.sentiment.analyze(message);
    const joined = stemmedTokens.join(' ');

    const classifications = this.classifier.getClassifications(joined);
    const top = classifications?.[0];
    const intent = top?.label || 'default';
    const confidence = typeof top?.value === 'number' ? top.value : 0.5;

    const entities = this.extractEntities(message, tokens);

    return {
      intent,
      confidence,
      sentiment: sentimentResult,
      entities,
      tokens: stemmedTokens,
    };
  }

  private extractEntities(message: string, tokens: string[]) {
    const lower = message.toLowerCase();
    const entities: any = {};

    const skills = ['javascript', 'python', 'react', 'node', 'java', 'php', 'css', 'html'];
    const devices = ['mobile', 'phone', 'desktop', 'tablet', 'laptop'];
    const browsers = ['chrome', 'firefox', 'safari', 'edge'];

    entities.skills = skills.filter((skill) => lower.includes(skill));
    entities.devices = devices.filter((device) => lower.includes(device));
    entities.browsers = browsers.filter((browser) => lower.includes(browser));

    return entities;
  }

  generateResponse(analysis: any, userContext: any) {
    const { intent, confidence, sentiment, entities } = analysis;
    const template = this.getResponseTemplate(intent);
    const personalized = this.personalizeResponse(template, userContext, entities);
    const emotional = this.addEmotionalIntelligence(personalized, sentiment);

    return {
      text: emotional.text,
      quickActions: template.quickActions || [],
      followUp: emotional.followUp,
      confidence,
    };
  }

  private getResponseTemplate(intent: string) {
    const templates: Record<string, { text: string; quickActions?: string[] }> = {
      profile_help: {
        text: `📸 Profile Setup Help\n\nUpload Photo:\n1) Avatar → Edit Profile → Upload Photo\n2) Use a clear face photo (JPG/PNG, <5MB)\n3) Save changes\n\nTips:\n• Use a professional-looking image\n• Add 3-5 skills\n• Short, friendly bio\n• Set availability clearly`,
        quickActions: ['test_upload', 'profile_examples', 'contact_support'],
      },
      video_help: {
        text: `🎥 Video Call Troubleshooting\n\nQuick fixes:\n• Refresh page\n• Allow camera/mic\n• Close other camera apps\n• Test connection (speed > 2Mbps)\n\nBrowsers:\n• Chrome recommended\n• Firefox good alternative\n• Safari: enable camera in settings`,
        quickActions: ['test_video', 'browser_guide', 'connection_test'],
      },
      credits_help: {
        text: `💰 Credits System\n\nEarn:\n• Welcome bonus: 5\n• Teaching: +1 per session\n• 5-star reviews: bonus\n• Referrals: +3\n\nSpend:\n• Most skills: 1 credit\n• Premium: 2-3\n• Certifications: 2-5`,
        quickActions: ['view_balance', 'start_teaching', 'refer_friend'],
      },
      find_skills: {
        text: `🔍 Finding Skills\n\nTips:\n• Search specific keywords\n• Filter by price/level/duration\n• Check reviews & response time\n\nPopular:\n• Tech: JS, Python, Web\n• Creative: Photoshop, Drawing\n• Business: Excel, Marketing\n• Languages: English, Spanish`,
        quickActions: ['browse_skills', 'popular_categories', 'booking_tips'],
      },
      exam_help: {
        text: `📝 Certification Exams\n\nProcess:\n1) Find Exam\n2) Study materials\n3) 10-20 Qs, 45 mins\n4) Pass 70%+\n5) Get certified`,
        quickActions: ['browse_exams', 'study_materials', 'practice_questions'],
      },
      teaching_help: {
        text: `👨‍🏫 Start Teaching\n\nSteps:\n1) Pass subject exam (70%+)\n2) Post skill from dashboard\n3) Set price/duration/level\n4) Clear description\n5) Reply fast to requests`,
        quickActions: ['take_exam', 'create_skill', 'teaching_tips'],
      },
      technical_help: {
        text: `🔧 Technical Support\n\nTry:\n• Refresh page\n• Clear cache\n• Incognito mode\n• Update browser\n• Restart browser`,
        quickActions: ['system_status', 'browser_guide', 'contact_support'],
      },
      default: {
        text: `👋 Welcome! I can help with technical issues, credits & payments, finding skills, certifications, and getting started teaching. What do you need help with?`,
        quickActions: ['profile_help', 'video_help', 'teaching_help', 'credits_help'],
      },
    };

    return templates[intent] || templates.default;
  }

  private personalizeResponse(template: any, userContext: any, entities: any) {
    let text = template.text;

    if (userContext?.role === 'teacher') {
      text = text.replace(/Start Teaching/g, 'Improve Teaching');
    }

    if (typeof userContext?.credits === 'number') {
      text = text.replace('Credits System', `Credits System (You have ${userContext.credits})`);
    }

    if (Array.isArray(entities?.devices) && entities.devices.includes('mobile')) {
      text += `\n\n📱 Mobile tip: Use landscape mode for video calls and stable WiFi.`;
    }

    if (Array.isArray(entities?.skills) && entities.skills.length > 0) {
      text += `\n\n💡 ${entities.skills[0].toUpperCase()} is popular! Consider both learning and teaching it.`;
    }

    return { ...template, text };
  }

  private addEmotionalIntelligence(response: any, sentiment: any) {
    let text = response.text;
    let followUp: string | null = null;

    if (sentiment.score < -2) {
      text = `I know this can be frustrating. I'm here to help you fix it quickly.\n\n` + text;
      followUp = "Don't worry — most issues have simple fixes. I'm with you until it's resolved.";
    } else if (sentiment.score > 2) {
      text = `Love the energy! 🎉\n\n` + text;
      followUp = "You're doing great! Want to explore more?";
    } else if (sentiment.comparative < -0.5) {
      followUp = 'I hope this helps. Want me to clarify anything?';
    }

    return { text, followUp };
  }
}

const aiEngine = new FreeAIEngine();

export async function POST(req: Request) {
  try {
    const { message, userContext = {}, conversationHistory = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const analysis = aiEngine.analyzeMessage(message, userContext);
    const response = aiEngine.generateResponse(analysis, userContext);

    return NextResponse.json(
      {
        success: true,
        response,
        analysis: {
          intent: analysis.intent,
          confidence: analysis.confidence,
          sentiment: analysis.sentiment.score,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Free AI Error:', error);
    return NextResponse.json(
      {
        error: 'AI temporarily unavailable',
        response: {
          text: "I'm having a small technical hiccup! But I'm still here to help. What specific issue can I assist you with?",
          quickActions: ['profile_help', 'video_help', 'contact_support'],
        },
      },
      { status: 500 }
    );
  }
}
