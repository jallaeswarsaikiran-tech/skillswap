import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify user is participant in the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('teacher_id, learner_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.teacher_id !== user.id && session.learner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
      .limit(100);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();
    const { sessionId, message, messageType = 'text' } = data;
    // FIRST_EDIT_START: allow optional file metadata
    const { fileName } = data as { fileName?: string };
    // FIRST_EDIT_END

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is participant in the session
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionDoc.data();
    if (!session?.participants?.includes(user.uid)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const messageData = {
      sessionId,
      senderId: user.uid,
      senderName: user.displayName || 'Anonymous',
      message,
      messageType,
      // FIRST_EDIT_START: store fileName when applicable
      ...(fileName ? { fileName } : {}),
      // FIRST_EDIT_END
      timestamp: db.FieldValue.serverTimestamp(),
      createdAt: db.FieldValue.serverTimestamp(),
      updatedAt: db.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('messages').add(messageData);

    // Update session with last message info
    await db.collection('sessions').doc(sessionId).update({
      lastMessage: message,
      lastMessageAt: db.FieldValue.serverTimestamp(),
      lastMessageBy: user.uid,
      updatedAt: db.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ 
      success: true, 
      messageId: docRef.id,
      message: { id: docRef.id, ...messageData }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}