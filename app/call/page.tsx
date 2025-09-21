'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useAuth } from 'cosmic-authentication';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface SessionData {
  id: string;
  skillTitle: string;
  teacherId: string;
  learnerId: string;
  teacherName: string;
  learnerName: string;
  status: string;
  participants: string[];
}

interface WebRTCRoomDoc {
  id: string;
  status?: 'open' | 'answered' | 'ended';
  offeredBy?: string;
  answeredBy?: string;
  offer?: { type: 'offer'; sdp: string };
  answer?: { type: 'answer'; sdp: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  offerCandidates?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answerCandidates?: any[];
}

function CallContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [usingBackCamera, setUsingBackCamera] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [status, setStatus] = useState<string>('Idle');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pollingRef = useRef<NodeJS.Timer | null>(null);
  const roleRef = useRef<'offer' | 'answer' | null>(null);
  const seenCandidatesRef = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (sessionId && user) {
      void init();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user?.uid]);

  const init = async () => {
    setLoading(true);
    try {
      // Load session info
      const sResp = await fetch('/api/sessions');
      const sJson = await sResp.json();
      const s: SessionData | undefined = (sJson.sessions || []).find((x: SessionData) => x.id === sessionId);
      if (!s) {
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getConstraints = (): MediaStreamConstraints => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const idealWidth = isMobile ? 640 : 1280;
    const idealHeight = isMobile ? 480 : 720;
    const idealFps = isMobile ? 24 : 30;
    return {
      video: {
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
        frameRate: { ideal: idealFps, max: idealFps },
        facingMode: usingBackCamera ? { exact: 'environment' } : 'user',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };
  };

  const ensurePC = () => {
    if (!pcRef.current) {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
        ],
        iceCandidatePoolSize: 8,
      });

      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
        event.streams[0].getTracks().forEach((t) => remoteStreamRef.current?.addTrack(t));
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
        setStatus('Connected');
      };

      pc.oniceconnectionstatechange = () => {
        setStatus(pc.iceConnectionState);
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && sessionId) {
          const payload = {
            action: 'add-candidate',
            sessionId,
            role: roleRef.current || 'offer',
            candidate: event.candidate.toJSON(),
          };
          await fetch('/api/webrtc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      };

      pcRef.current = pc;
    }
    return pcRef.current as RTCPeerConnection;
  };

  const startLocalMedia = async () => {
    const constraints = getConstraints();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = ensurePC();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  };

  const startPreview = async () => {
    try {
      await startLocalMedia();
      alert('Camera & mic enabled. You can now start or join the class.');
    } catch (e) {
      alert('Please allow camera and microphone permissions to continue.');
    }
  };

  const pollRoom = () => {
    if (pollingRef.current || !sessionId) return;
    pollingRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/webrtc?sessionId=${sessionId}`);
        const room: WebRTCRoomDoc | { room: null } = await resp.json();
        if (!('id' in room)) return; // no room yet

        const pc = ensurePC();

        // Apply remote answer if we are offerer and answer exists
        if (roleRef.current === 'offer' && room.answer && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(room.answer));
        }

        // Add any unseen candidates
        const candidates = roleRef.current === 'offer' ? room.answerCandidates : room.offerCandidates;
        if (Array.isArray(candidates)) {
          for (const c of candidates) {
            const key = JSON.stringify(c);
            if (!seenCandidatesRef.current.has(key)) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
                seenCandidatesRef.current.add(key);
              } catch (err) {
                // ignore transient errors when description not set yet
              }
            }
          }
        }
      } catch (err) {
        // ignore poll errors
      }
    }, 1500);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current as unknown as number);
      pollingRef.current = null;
    }
  };

  const startCall = async () => {
    if (!sessionId) return;
    setConnecting(true);
    try {
      await startLocalMedia();
      const pc = ensurePC();

      // Decide role based on existing room state
      const probe = await fetch(`/api/webrtc?sessionId=${sessionId}`);
      const room: WebRTCRoomDoc | { room: null } = await probe.json();

      if ('id' in room && room.offer && !room.answer) {
        // Join as answerer
        roleRef.current = 'answer';
        const remoteDesc = new RTCSessionDescription(room.offer);
        await pc.setRemoteDescription(remoteDesc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fetch('/api/webrtc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-answer', sessionId, answer }),
        });
        setStatus('Answer sent');
        pollRoom();
      } else {
        // Create new offer
        roleRef.current = 'offer';
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        await fetch('/api/webrtc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-offer', sessionId, offer }),
        });
        setStatus('Offer sent, waiting for answer');
        pollRoom();
      }
    } catch (e) {
      console.error('startCall error', e);
      alert('Could not start the call. Please check camera/mic permissions.');
    } finally {
      setConnecting(false);
    }
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted(!muted);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCameraOn(!cameraOn);
  };

  const switchCamera = async () => {
    setUsingBackCamera((prev) => !prev);
    const stream = localStreamRef.current;
    if (!stream) return;

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: usingBackCamera ? 'user' : { exact: 'environment' } },
        audio: true,
      });

      const pc = ensurePC();
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender && newVideoTrack) await sender.replaceTrack(newVideoTrack);

      // Update local video element
      stream.getTracks().forEach((t) => t.stop());
      localStreamRef.current = newStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
    } catch (e) {
      console.error('switchCamera error', e);
    }
  };

  const toggleScreenShare = async () => {
    if (sharingScreen) {
      // revert to camera
      await startLocalMedia();
      setSharingScreen(false);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const displayStream: any = await (navigator.mediaDevices as unknown as { getDisplayMedia: (c?: DisplayMediaStreamConstraints) => Promise<MediaStream> }).getDisplayMedia({ video: true, audio: true });
      const pc = ensurePC();
      const screenTrack = displayStream.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender && screenTrack) await sender.replaceTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;
      setSharingScreen(true);
      screenTrack.onended = async () => {
        await startLocalMedia();
        setSharingScreen(false);
      };
    } catch (e) {
      console.error('screen share error', e);
    }
  };

  const endCall = async () => {
    try {
      if (sessionId) {
        await fetch('/api/webrtc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'end', sessionId }),
        });
      }
    } catch {
      // ignore
    }
    cleanup();
  };

  const stopRecording = async () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // ignore
    }
  };

  const startRecording = async () => {
    const stream = localStreamRef.current;
    if (!stream) {
      alert('Enable your camera first to record.');
      return;
    }
    try {
      recordChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(recordChunksRef.current, { type: 'video/webm' });
        // Upload file
        const fd = new FormData();
        fd.append('file', new File([blob], `session-${sessionId || 'unknown'}-${Date.now()}.webm`, { type: 'video/webm' }));
        const uploadResp = await fetch('/api/files/upload', { method: 'POST', body: fd });
        const uploadJson = await uploadResp.json();
        if (uploadResp.ok && uploadJson?.fileId) {
          await fetch('/api/recordings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, fileId: uploadJson.fileId, fileUrl: uploadJson.fileUrl, fileName: uploadJson.fileName }),
          });
          alert('Recording saved to session.');
        } else {
          alert(uploadJson?.error || 'Upload failed');
        }
      };
      mr.start();
      setIsRecording(true);
    } catch (e) {
      console.error('recording error', e);
      alert('Recording not supported in this browser.');
    }
  };

  const cleanup = () => {
    stopPolling();
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    roleRef.current = null;
    seenCandidatesRef.current.clear();
    setStatus('Idle');
    setMuted(false);
    setCameraOn(true);
    setSharingScreen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing call...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:video-off" width={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Session not found</h3>
          <Link href="/sessions" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Icon icon="material-symbols:arrow-back" width={20} />
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  const partnerName = session.teacherId === user?.uid ? session.learnerName : session.teacherName;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sessions" className="p-2 hover:bg-gray-100 rounded-lg">
              <Icon icon="material-symbols:arrow-back" width={24} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-medium text-gray-900">{session.skillTitle}</h1>
              <p className="text-xs sm:text-sm text-gray-600">With {partnerName}</p>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-gray-600">{status}</div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4">
        <div className="relative rounded-xl overflow-hidden bg-gray-900">
          <video ref={remoteVideoRef} playsInline autoPlay className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-black/50 text-white rounded">Remote</div>
        </div>
        <div className="relative rounded-xl overflow-hidden bg-gray-900 md:order-first md:col-span-1">
          <video ref={localVideoRef} playsInline autoPlay muted className="w-full h-full object-cover scale-x-[-1]" />
          <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-black/50 text-white rounded">You</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={startCall}
            disabled={connecting}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Icon icon="mdi:video" width={20} />
            {connecting ? 'Connecting...' : 'Start / Join'}
          </button>

          <button onClick={startPreview} className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700">
            <Icon icon="mdi:camera" width={20} />
            Enable Camera
          </button>

          <button onClick={toggleMute} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800">
            <Icon icon={muted ? 'mdi:microphone-off' : 'mdi:microphone'} width={20} />
            {muted ? 'Unmute' : 'Mute'}
          </button>

          <button onClick={toggleCamera} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800">
            <Icon icon={cameraOn ? 'mdi:video-outline' : 'mdi:video-off'} width={20} />
            {cameraOn ? 'Camera Off' : 'Camera On'}
          </button>

          <button onClick={switchCamera} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-800">
            <Icon icon="mdi:camera-switch" width={20} />
            Switch Cam
          </button>

          <button onClick={toggleScreenShare} className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700">
            <Icon icon="mdi:monitor-share" width={20} />
            {sharingScreen ? 'Stop Share' : 'Share Screen'}
          </button>

          {!isRecording ? (
            <button onClick={startRecording} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700">
              <Icon icon="mdi:record-rec" width={20} />
              Record
            </button>
          ) : (
            <button onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700">
              <Icon icon="mdi:stop" width={20} />
              Stop & Save
            </button>
          )}

          <button onClick={endCall} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-800 text-white hover:bg-red-900">
            <Icon icon="mdi:phone-hangup" width={20} />
            End
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CallContent />
    </Suspense>
  );
}