import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Player from './Player';
import Chat from './Chat';
import ParticipantList from './ParticipantList';
import MediaControls from './MediaControls';

const Room = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [url, setUrl] = useState('');
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [copied, setCopied] = useState(false);
    const [seekTime, setSeekTime] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // WebRTC Refs
    const localStreamRef = React.useRef(null);
    const peersRef = React.useRef({}); // Keep track of peer connections by socket ID

    // Prompt for username if not present
    useEffect(() => {
        // Use styled prompt logic in future iteration. For MVP using native prompt.
        const user = prompt('Enter your display name:') || `Guest-${Math.floor(Math.random() * 1000)}`;
        setUsername(user);
    }, []);

    useEffect(() => {
        if (!username) return;

        const s = io('http://localhost:3001');
        setSocket(s);

        s.emit('join_room', roomId);

        s.on('room_state', (state) => {
            if (state.currentMedia) setUrl(state.currentMedia.url);
            if (state.playback) setPlaying(state.playback.isPlaying);
        });

        s.on('play', () => setPlaying(true));
        s.on('pause', () => setPlaying(false));
        s.on('change_media', ({ url }) => {
            setUrl(url);
            setPlaying(true);
        });

        s.on('seek', ({ mediaTime }) => {
            setSeekTime(mediaTime);
        });



        // --- WebRTC Listeners ---
        s.on('stream_started', ({ streamerId }) => {
            console.log('Stream started by:', streamerId);
            // Request feed from streamer
            s.emit('request_feed', { to: streamerId, from: s.id });
        });

        s.on('request_feed', async ({ from }) => {
            // I am the streamer, someone wants my feed
            console.log('Received feed request from:', from);
            const peer = createPeer(from, s, localStreamRef.current);
            peersRef.current[from] = peer;
        });

        s.on('signal', async ({ from, signal }) => {
            const peer = peersRef.current[from];
            if (peer) {
                // If we have a peer, it's an answer or candidate
                await peer.addIceCandidate(new RTCIceCandidate(signal.candidate)); // Simplification: assuming candidate for now. Need robust signal handler.
                // Wait, signal object structure matters. 
                if (signal.sdp) {
                    await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    if (signal.sdp.type === 'offer') {
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        s.emit('signal', { to: from, from: s.id, signal: { sdp: peer.localDescription } });
                    }
                } else if (signal.candidate) {
                    await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } else {
                // Incoming Offer (Viewer receives offer from Streamer)
                if (signal.sdp && signal.sdp.type === 'offer') {
                    const peer = createPeer(from, s, null); // Viewer has no stream to send usually
                    peersRef.current[from] = peer;

                    // Handle the offer
                    await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    s.emit('signal', { to: from, from: s.id, signal: { sdp: peer.localDescription } });
                }
            }
        });

        s.on('stream_stopped', () => {
            setRemoteStream(null);
            // Cleanup peers?
        });

        s.on('chat_message', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => s.disconnect();
    }, [roomId, username]);

    const handlePlay = (time) => socket?.emit('play', { roomId, mediaTime: time });
    const handlePause = (time) => socket?.emit('pause', { roomId, mediaTime: time });
    const handleSeek = (time) => socket?.emit('seek', { roomId, mediaTime: time });

    const handleSendMessage = (text) => {
        if (socket) socket.emit('chat_message', { roomId, text, user: username });
    };

    const handleUrlChange = (e) => {
        e.preventDefault();
        const newUrl = e.target.elements.url.value;
        if (socket && newUrl) {
            socket.emit('change_media', { roomId, type: 'video', url: newUrl });
            e.target.elements.url.value = '';
        }
    };

    const copyInvite = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleMediaChange = async ({ stream, isScreen }) => {
        console.log('Media Changed:', isScreen, stream);
        if (isScreen && stream) {
            localStreamRef.current = stream;
            setIsScreenSharing(true);
            socket.emit('start_stream', { roomId });
        } else {
            // Stop stream Logic
            if (isScreenSharing && !stream) {
                setIsScreenSharing(false);
                socket.emit('stop_stream', { roomId });
                localStreamRef.current = null;
                // Close all peers
                Object.values(peersRef.current).forEach(p => p.close());
                peersRef.current = {};
            }
        }
    };

    // Helper to create Peer
    const createPeer = (targetId, socket, stream) => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        if (stream) {
            stream.getTracks().forEach(track => peer.addTrack(track, stream));
        }

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', { to: targetId, from: socket.id, signal: { candidate: event.candidate } });
            }
        };

        peer.ontrack = (event) => {
            console.log('Received Remote Stream');
            setRemoteStream(event.streams[0]);
        };

        // If we have a stream (Streamer), we create offer immediately? 
        // No, flow is: Viewer requests -> Streamer creates peer & offer.
        if (stream) {
            peer.onnegotiationneeded = async () => {
                try {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit('signal', { to: targetId, from: socket.id, signal: { sdp: peer.localDescription } });
                } catch (err) {
                    console.error(err);
                }
            };
        }

        return peer;
    };

    return (
        <div className="flex h-screen p-4 gap-4 overflow-hidden">
            {/* COLUMN 1: Discovery / Nav */}
            <div className="hidden lg:flex flex-col w-64 glass-panel p-4 gap-4">
                <div
                    className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 cursor-pointer text-center"
                    onClick={() => navigate('/')}
                >
                    you&me
                </div>
                <div className="text-gray-500 text-sm font-medium uppercase tracking-wider mt-4">Discover</div>
                <div className="space-y-2">
                    <div onClick={() => navigate('/')} className="p-3 bg-white/50 rounded-lg text-slate-700 cursor-pointer hover:bg-white/80 transition-colors font-medium">🔥 Trending</div>
                    <div onClick={() => navigate('/')} className="p-3 rounded-lg text-slate-500 hover:bg-white/50 cursor-pointer transition-colors">🎵 Music</div>
                    <div onClick={() => navigate('/')} className="p-3 rounded-lg text-slate-500 hover:bg-white/50 cursor-pointer transition-colors">🎮 Gaming</div>
                </div>

                <div className="mt-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-2 bg-red-50 text-red-500 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Leave Room
                    </button>
                </div>
            </div>

            {/* COLUMN 2: Main Stage (Player + Controls) */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Header Bar */}
                <div className="glass-panel p-3 px-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <span className="font-semibold text-slate-700 hidden sm:inline">Room: <span className="text-indigo-600">{roomId.slice(0, 8)}...</span></span>
                        <button
                            onClick={copyInvite}
                            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                        >
                            {copied ? 'Copied!' : 'Copy Invite'}
                        </button>
                    </div>

                    <MediaControls onMediaChange={handleMediaChange} />
                </div>

                {/* Video Player */}
                <div className="flex-1 glass-panel p-4 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <form onSubmit={handleUrlChange} className="flex gap-2 shadow-lg">
                            <input name="url" placeholder="Paste YouTube URL..." className="input-field py-2 text-sm w-64" />
                            <button type="submit" className="btn-primary py-2 text-sm">Load</button>
                        </form>
                    </div>

                    <div className="flex-1 bg-black rounded-xl overflow-hidden shadow-inner relative">
                        {/* Player wrapper */}
                        <div className="full-size-player h-full">
                            {(remoteStream || isScreenSharing) ? (
                                <div className="w-full h-full relative">
                                    <video
                                        ref={vid => {
                                            if (vid) vid.srcObject = isScreenSharing ? localStreamRef.current : remoteStream;
                                        }}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <Player
                                    url={url}
                                    playing={playing}
                                    seekToTime={seekTime}
                                    onPlay={handlePlay}
                                    onPause={handlePause}
                                    onSeek={handleSeek}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMN 3: Chat & Participants */}
            <div className="w-80 flex flex-col gap-4 shrink-0">
                {/* Participants (Top Half) */}
                <div className="h-1/3 min-h-[200px]">
                    <ParticipantList participants={[{ id: 'me', name: username, isLocal: true, mic: false, cam: false }]} />
                </div>

                {/* Chat (Bottom Half) */}
                <div className="flex-1 min-h-0 glass-panel flex flex-col overflow-hidden">
                    <Chat
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        username={username}
                    />
                </div>
            </div>
        </div>
    );
};

export default Room;
