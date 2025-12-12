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
    const [participants, setParticipants] = useState([]); // List of { id, name, isLocal, stream }
    const [localStream, setLocalStream] = useState(null); // Local Cam/Mic stream

    // WebRTC Refs
    const localStreamRef = React.useRef(null); // For Screen Share
    const localCamStreamRef = React.useRef(null); // For Cam/Mic
    const peersRef = React.useRef({}); // Store peers: { [socketId]: RTCPeerConnection }

    // Prompt for username if not present
    useEffect(() => {
        // Use styled prompt logic in future iteration. For MVP using native prompt.
        const user = prompt('Enter your display name:') || `Guest-${Math.floor(Math.random() * 1000)}`;
        setUsername(user);
        // Initialize local participant
        setParticipants([{ id: 'me', name: user, isLocal: true, stream: null }]);
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



        // --- MESH WebRTC Listeners (User Media) ---
        s.on('user_joined', ({ userId }) => {
            console.log('User Joined:', userId);
            // Initiate connection to new user
            const peer = createPeer(userId, s, localCamStreamRef.current, true); // true = initiator
            peersRef.current[userId] = peer;

            // Add to participants list placeholder
            setParticipants(prev => {
                if (prev.find(p => p.id === userId)) return prev;
                return [...prev, { id: userId, name: `User ${userId.slice(0, 4)}`, isLocal: false }];
            });
        });

        // --- WebRTC Listeners (Screen Share + User Mesh) ---
        s.on('stream_started', ({ streamerId }) => {
            console.log('Stream started by:', streamerId);
            // Request feed from streamer
            s.emit('request_feed', { to: streamerId, from: s.id });
        });

        s.on('request_feed', async ({ from }) => {
            // I am the streamer, sender of screen share
            console.log('Received feed request from:', from);
            const peerId = `${from}-screen`;
            const peer = createPeer(from, s, localStreamRef.current, true, true); // initiator=true, isScreenPeer=true
            peersRef.current[peerId] = peer;
        });

        s.on('signal', async ({ from, signal }) => {
            // Determine if this is a Screen Share peer or Mesh peer
            // Simplified: If we have a peer in memory, use it.
            // If not, and it's an offer, create new.

            let peer = peersRef.current[from];

            // NOTE: Screen Share peers might need distinct ID if separate connection used.
            // Current flow uses SAME socket ID for signaling. 
            // If we want separate connections for Cam vs Screen, we'd need distinct IDs or metadata.
            // For this quick implementation, let's assume if 'isScreenPeer' flag was sent in signal (logic added below), we'd know.
            // But 'signal' event from server is { from, signal }.
            // We need to update backend to pass through extra fields or put them in 'signal' object.
            // Let's rely on 'signal.type' or similar? No.
            // Let's just try using the SAME connection for both?
            // "Sender" logic in createPeer adds tracks.
            // If I add a screen track to existing peer, 'ontrack' fires.
            // I can check 'event.track.kind' but video vs video is hard.
            // checking 'stream.id' is useful if we signaled it.

            // STRATEGY: Use `isScreenPeer` flag in the payload for distinction IF possible.
            // Or just separate Listeners? 'signal_screen', 'signal_mesh'?
            // Updating createPeer to send { isScreenPeer } in the wrapper payload.

            // If payload has isScreenPeer (handled in modified createPeer/signal emit below)
            // But we need to update the Listener to receive it!
            // 's.on' receives what server emits. Server emits { from, signal }. 
            // We need to update Server pass-through? Yes or pack it in 'signal'.
            // Let's pack it in 'signal' for now as a custom field if SDP/Candidate allows, or just wrap it.
            // Actually, server 'signal' handler: socket.on('signal', ({ to, from, signal })).
            // It passes 'signal' object through.

            // We will modify handle: 'signal' arg will be the wrapper { candidate/sdp, isScreenPeer }

            // Unpack isScreenPeer from the signal object (it was packed inside to pass through backend)
            const isScreenPeer = signal.isScreenPeer || false;
            const peerId = isScreenPeer ? `${from}-screen` : from;

            console.log('Signal Received:', { from, type: signal.type || 'candidate', isScreenPeer, peerId });

            // If Screen Share Viewer (initiated by request_feed), we used a special ID?
            // In 'request_feed' below, we used `createPeer` with distinct ID logic?
            // Let's standardize: Screen Share uses "from-screen" ID for peers.

            peer = peersRef.current[peerId];

            if (!peer && signal.sdp && signal.sdp.type === 'offer') {
                peer = createPeer(from, s, localCamStreamRef.current, false, isScreenPeer);
                peersRef.current[peerId] = peer;

                // If Mesh Peer, add to participants
                if (!isScreenPeer) {
                    setParticipants(prev => {
                        if (prev.find(p => p.id === from)) return prev;
                        return [...prev, { id: from, name: `User ${from.slice(0, 4)}`, isLocal: false }];
                    });
                }
            }

            if (peer) {
                if (signal.candidate) {
                    await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
                } else if (signal.type === 'offer' || signal.type === 'answer') { // Check type directly as we spread it
                    await peer.setRemoteDescription(new RTCSessionDescription(signal));
                    if (signal.type === 'offer') {
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        s.emit('signal', {
                            to: from,
                            from: s.id,
                            signal: {
                                type: peer.localDescription.type,
                                sdp: peer.localDescription.sdp,
                                isScreenPeer
                            }
                        });
                    }
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

    const handleMediaChange = async ({ stream, isScreen, mic, cam }) => {
        // Handle User Media (Cam/Mic)
        if (!isScreen) {
            localCamStreamRef.current = stream;
            setLocalStream(stream);

            // Update local participant state
            setParticipants(prev => prev.map(p =>
                p.isLocal ? { ...p, stream: stream, mic, cam } : p
            ));

            // Update all existing peers with new tracks
            Object.values(peersRef.current).forEach(peer => {
                // Remove old tracks? Not easy.
                // Replace tracks?
                // Simple: Add tracks if not present.
                if (stream) {
                    stream.getTracks().forEach(track => {
                        const sender = peer.getSenders().find(s => s.track && s.track.kind === track.kind);
                        if (sender) {
                            sender.replaceTrack(track);
                        } else {
                            peer.addTrack(track, stream);
                            // Adding track requires renegotiation... check simple-peer or native
                            // Native requires renegotiation. 
                            // For MVP, if connection is already up, this might fail without logic.
                            // But 'user_joined' trigger creates connection fresh.
                            // If I toggle cam LATER, I need `onnegotiationneeded`.
                        }
                    });
                }
            });
        }

        // Handle Screen Share
        if (isScreen && stream) {
            localStreamRef.current = stream;
            setIsScreenSharing(true);
            socket.emit('start_stream', { roomId });
        } else if (isScreen && !stream) {
            if (isScreenSharing) {
                setIsScreenSharing(false);
                socket.emit('stop_stream', { roomId });
                localStreamRef.current = null;
            }
        }
    };

    // Helper to create Peer
    const createPeer = (targetId, socket, stream, initiator, isScreenPeer = false) => {
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
                socket.emit('signal', {
                    to: targetId,
                    from: socket.id,
                    signal: { candidate: event.candidate, isScreenPeer }
                });
            }
        };

        peer.ontrack = (event) => {
            console.log('Received Remote Stream', isScreenPeer);
            if (isScreenPeer) {
                setRemoteStream(event.streams[0]);
            } else {
                // Update participant list
                setParticipants(prev => {
                    const exists = prev.find(p => p.id === targetId);
                    if (exists) {
                        return prev.map(p => p.id === targetId ? { ...p, stream: event.streams[0] } : p);
                    }
                    return [...prev, { id: targetId, name: `User ${targetId.slice(0, 4)}`, isLocal: false, stream: event.streams[0] }];
                });
            }
        };

        peer.onnegotiationneeded = async () => {
            // if (!initiator) return; // Allow both sides to negotiate to support bi-directional media changes (e.g. turning cam on later)
            // Risk: Glare. For MVP, we accept this risk.
            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('signal', {
                    to: targetId,
                    from: socket.id,
                    signal: {
                        type: peer.localDescription.type,
                        sdp: peer.localDescription.sdp,
                        isScreenPeer
                    }
                });
            } catch (err) {
                console.error(err);
            }
        };

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
                                url ? (
                                    <Player
                                        url={url}
                                        playing={playing}
                                        seekToTime={seekTime}
                                        onPlay={handlePlay}
                                        onPause={handlePause}
                                        onSeek={handleSeek}
                                    />
                                ) : (
                                    /* Video Call Grid (if no media playing) */
                                    <div className="w-full h-full p-4 overflow-y-auto">
                                        {participants.some(p => p.stream) ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full content-center">
                                                {participants.map(p => (
                                                    <div key={p.id} className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-white/10 group">
                                                        {p.stream ? (
                                                            <video
                                                                ref={vid => { if (vid) vid.srcObject = p.stream; }}
                                                                autoPlay
                                                                playsInline
                                                                muted={p.isLocal} // Mute local to avoid echo
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 font-bold text-2xl">
                                                                {p.name.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-sm font-medium">
                                                            {p.name} {p.isLocal && '(You)'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Empty State Placeholder */
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                                                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.818v6.364a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-lg font-semibold text-slate-400">Ready to join?</h3>
                                                    <p className="text-sm opacity-60">Turn on your camera to start the call</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMN 3: Chat & Participants */}
            <div className="w-80 flex flex-col gap-4 shrink-0">
                {/* Participants (Top Half) */}
                <div className="h-1/3 min-h-[200px]">
                    <ParticipantList participants={participants} />
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
