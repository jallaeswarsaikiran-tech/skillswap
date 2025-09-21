import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Force this route to run on the Node.js runtime (not Edge)
export const runtime = 'nodejs';

// Lazily create the OpenAI client to avoid throwing during module import on build
function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

// System prompt to make GPT understand SkillSwap context
const SKILLSWAP_SYSTEM_PROMPT = `
You are the official AI assistant for SkillSwap, a peer-to-peer micro-learning platform. Your role is to help users navigate the platform, learn skills, and have a smooth experience.

PLATFORM FEATURES:
- Credit-based system (earn by teaching, spend by learning)
- HD video calling with Jitsi Meet integration
- Real-time chat between students and teachers
- Digital blockchain certificates
- Exam system (70%+ score to become teacher)
- Mobile-responsive interface like WhatsApp
- Payment system for teacher earnings
- Rating system (1-5 stars) with monetary rewards

USER JOURNEY SUPPORT:
1. Profile setup and photo upload
2. Finding and booking skills
3. Video call troubleshooting
4. Understanding credits and payments
5. Taking certification exams
6. Starting to teach (student → teacher transition)
7. Managing sessions and feedback

TONE: Friendly, helpful, concise, encouraging
RESPONSES: Always actionable, include specific steps
EMOJIS: Use relevant emojis to make responses engaging
MOBILE-FIRST: Consider mobile users in all advice

Remember: You can access user context like their role (student/teacher), credits, courses, and session history.
`;

export async function POST(req: Request) {
  try {
    const { message, userContext, conversationHistory = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const enhancedPrompt = buildContextualPrompt(message, userContext, conversationHistory);

    const client = getOpenAIClient();
    if (!client) {
      // Graceful fallback when no API key is configured
      const fallback = getFallbackResponse(message);
      return NextResponse.json(
        {
          success: true,
          response: { text: fallback, quickActions: ['profile_help', 'video_help', 'credits_help'] },
          usage: null,
          note: 'OPENAI_API_KEY not set; returned fallback response.',
        },
        { status: 200 }
      );
    }

    const completion = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SKILLSWAP_SYSTEM_PROMPT },
        ...conversationHistory.map((msg: any) => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })),
        { role: 'user', content: enhancedPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices?.[0]?.message?.content || '';
    const structuredResponse = parseAIResponse(aiResponse);

    return NextResponse.json(
      {
        success: true,
        response: structuredResponse,
        usage: completion.usage,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    let fallback: string | undefined = undefined;

    try {
      const { message } = await req.json();
      fallback = getFallbackResponse(String(message || ''));
    } catch {}

    return NextResponse.json(
      {
        error: 'AI service temporarily unavailable',
        fallback,
      },
      { status: 500 }
    );
  }
}

function buildContextualPrompt(message: string, userContext: any, conversationHistory: any[] = []) {
  let contextPrompt = `User Message: "${message}"\n\n`;

  if (userContext) {
    contextPrompt += `USER CONTEXT:\n`;
    contextPrompt += `- Role: ${userContext.role || 'new user'}\n`;
    contextPrompt += `- Credits: ${userContext.credits || 0}\n`;
    contextPrompt += `- Completed Courses: ${userContext.completedCourses || 0}\n`;
    contextPrompt += `- Teaching Subjects: ${userContext.teachingSubjects?.join(', ') || 'none'}\n`;
    contextPrompt += `- Last Activity: ${userContext.lastActivity || 'first time'}\n\n`;
  }

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const lastFewMessages = conversationHistory.slice(-3);
    contextPrompt += `RECENT CONVERSATION:\n`;
    lastFewMessages.forEach((msg: any) => {
      contextPrompt += `${msg.type}: ${String(msg.text || '').substring(0, 100)}\n`;
    });
  }

  return contextPrompt;
}

function parseAIResponse(aiResponse: string) {
  const hasQuickActions = aiResponse.includes('QUICK_ACTION:');
  const hasFollowUp = aiResponse.includes('FOLLOW_UP:');

  const parsedResponse: any = {
    text: aiResponse,
    quickActions: [] as string[],
    followUp: null as string | null,
    type: 'text',
  };

  if (hasQuickActions) {
    const actionMatch = aiResponse.match(/QUICK_ACTION:\s*(.+)/);
    if (actionMatch) {
      parsedResponse.quickActions = actionMatch[1].split(',').map((a) => a.trim());
      parsedResponse.text = aiResponse.replace(/(QUICK_ACTION:\s*.+)/, '').trim();
    }
  }

  if (hasFollowUp) {
    const followUpMatch = aiResponse.match(/FOLLOW_UP:\s*(.+)/);
    if (followUpMatch) {
      parsedResponse.followUp = followUpMatch[1];
      parsedResponse.text = parsedResponse.text.replace(/(FOLLOW_UP:\s*.+)/, '').trim();
    }
  }

  return parsedResponse;
}

function getFallbackResponse(message: string) {
  const fallbacks: Record<string, string> = {
    profile:
      'I can help you set up your profile! Go to Settings → Profile and upload a clear photo. Need specific help with photo upload?',
    video:
      'For video calls, make sure to allow camera/microphone permissions and use Chrome browser for best results. Having connection issues?',
    credits:
      'You earn credits by teaching (1 credit per session) and spend them to learn. Check your balance in the dashboard!',
    exam:
      'To become a teacher, take the certification exam for your subject. You need 70%+ to pass. Want exam tips?',
    default:
      "I'm here to help with SkillSwap! I can assist with profile setup, finding skills, video calls, credits, and becoming a teacher. What do you need help with?",
  };

  const lowerMessage = message.toLowerCase();
  for (const [key, response] of Object.entries(fallbacks)) {
    if (key !== 'default' && lowerMessage.includes(key)) return response;
  }
  return fallbacks.default;
}
