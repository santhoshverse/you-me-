import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Player from './Player';
import Chat from './Chat';
import ParticipantList from './ParticipantList';
import MediaControls from './MediaControls';

const SIGNALING_URL = 'http://localhost:4000'; // New backend port

const CouchRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    // State
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [participants, setParticipants] = useState([]); // { id, name, isLocal, stream }
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null); // For Screen Share view
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Player State (Sync logic similar to Room.jsx, assuming backend updated or ignored for now)
    // Note: The new server.js didn't show explicit sync logic for Player (play/pause), 
    // it focused on signaling. I will include basic placeholders or assume server handles it similarly.
    // The user's prompt focused on Signaling. I'll implement basic chat/video first.

    // Refs
    const localCamStreamRef = useRef(null);
    const peersRef = useRef({}); // { [peerId]: RTCPeerConnection }
    const myPeerId = useRef(uuidv4());

    useEffect(() => {
        const user = prompt('Enter your display name:') || `Guest-${Math.floor(Math.random() * 1000)}`;
        setUsername(user);
        setParticipants([{ id: myPeerId.current, name: user, isLocal: true, stream: null }]);
    }, []);

    useEffect(() => {
        if (!username) return;

        console.log('Connecting to signaling server...', SIGNALING_URL);
        const s = io(SIGNALING_URL);
        setSocket(s);

        // 1. Connect & Register
        s.on('connect', () => {
            console.log('Socket connected:', s.id);
            s.emit('register', { peerId: myPeerId.current });

            // 2. Join Room
            s.emit('join-room', {
                roomId,
                peerId: myPeerId.current,
                // userId: ... if we had auth
                displayName: username
            });
        });

        // 3. New Peer Joined (Initiator logic)
        s.on('new-peer', async ({ peerId, displayName }) => {
            console.log('New Peer Joined:', peerId, displayName);
            const peer = createPeer(peerId, s, localCamStreamRef.current, true); // Initiator
            peersRef.current[peerId] = peer;

            addParticipant(peerId, displayName);
        });

        // 4. Request Offer (Screen Share logic / late joiner logic)
        s.on('request-offer-to-peer', ({ toPeerId }) => {
            console.log('Requested to offer to:', toPeerId);
            // I am the screen sharer, I need to call this new person with my screen stream?
            // Or just general connection? 
            // The server logic seemed to imply screen sharer acts as initiator for screen track.
            // Let's assume standard connection for now.
        });

        // 5. Receive Offer (Receiver logic)
        s.on('offer', async ({ fromPeerId, sdp }) => {
            console.log('Received Offer from:', fromPeerId);
            const peer = createPeer(fromPeerId, s, localCamStreamRef.current, false); // Not Initiator
            peersRef.current[fromPeerId] = peer;
            addParticipant(fromPeerId, `User ${fromPeerId.slice(0, 4)}`);

            await peer.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            s.emit('answer', {
                toPeerId: fromPeerId,
                fromPeerId: myPeerId.current,
                sdp: peer.localDescription
            });
        });

        // 6. Receive Answer
        s.on('answer', async ({ fromPeerId, sdp }) => {
            console.log('Received Answer from:', fromPeerId);
            const peer = peersRef.current[fromPeerId];
            if (peer) {
                await peer.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        });

        // 7. ICE Candidate
        s.on('ice-candidate', async ({ fromPeerId, candidate }) => {
            const peer = peersRef.current[fromPeerId];
            if (peer) {
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        return () => {
            s.disconnect();
            Object.values(peersRef.current).forEach(p => p.close());
            peersRef.current = {};
        };
    }, [roomId, username]);

    const createPeer = (targetPeerId, socket, stream, initiator) => {
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
                socket.emit('ice-candidate', {
                    toPeerId: targetPeerId,
                    fromPeerId: myPeerId.current,
                    candidate: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            console.log('Received Track from:', targetPeerId);
            // Update stream for this participant
            setParticipants(prev => prev.map(p =>
                p.id === targetPeerId ? { ...p, stream: event.streams[0] } : p
            ));
        };

        if (initiator) {
            peer.onnegotiationneeded = async () => {
                try {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    socket.emit('offer', {
                        toPeerId: targetPeerId,
                        fromPeerId: myPeerId.current,
                        sdp: peer.localDescription
                    });
                } catch (err) {
                    console.error('Negotiation Error:', err);
                }
            };
        }

        return peer;
    };

    const addParticipant = (id, name) => {
        setParticipants(prev => {
            if (prev.find(p => p.id === id)) return prev;
            return [...prev, { id, name, isLocal: false, stream: null }];
        });
    };

    const handleMediaChange = async ({ stream, isScreen, mic, cam }) => {
        if (!isScreen) {
            localCamStreamRef.current = stream;
            setLocalStream(stream);

            // Update local in UI
            setParticipants(prev => prev.map(p => p.isLocal ? { ...p, stream } : p));

            // Add tracks to all existing peers
            Object.values(peersRef.current).forEach(peer => {
                stream.getTracks().forEach(track => {
                    const sender = peer.getSenders().find(s => s.track && s.track.kind === track.kind);
                    if (sender) sender.replaceTrack(track);
                    else peer.addTrack(track, stream);
                });
            });
        }
    };

    // UI RENDER (Reusing Virtual Couch)
    return (
        <div className="flex h-screen p-4 gap-4 overflow-hidden bg-slate-900">
            {/* Main Stage */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                <div className="glass-panel p-3 px-6 flex justify-between items-center">
                    <span className="text-white font-bold">Couch Room (Production Arch)</span>
                    <MediaControls onMediaChange={handleMediaChange} />
                </div>

                <div className="flex-1 glass-panel p-4 flex flex-col relative overflow-hidden">
                    {/* Couch UI */}
                    <div className="w-full h-full relative overflow-hidden bg-[#1a1130] flex items-end justify-center perspective-1000">
                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#2a1b4e] to-[#150e26] pointer-events-none" />

                        {/* Couch */}
                        <div className="relative z-10 w-[90%] max-w-4xl h-[40%] mb-4 md:mb-12">
                            <div className="absolute bottom-0 left-0 right-0 top-[-30%] bg-[#5c5423] rounded-[3rem] shadow-2xl transform scale-x-110 origin-bottom" />
                            <div className="absolute bottom-0 left-0 right-0 h-full bg-[#4a431c] rounded-[2rem] shadow-xl flex items-end justify-center pb-4 md:pb-8 px-4 gap-4 md:gap-8 overflow-x-auto">

                                {participants.map(p => (
                                    <div key={p.id} className="relative group shrink-0 hover:-translate-y-2 transition-all">
                                        <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 ${p.isLocal ? 'border-purple-500' : 'border-indigo-500'} overflow-hidden bg-gray-800 shadow-2xl relative`}>
                                            {p.stream ? (
                                                <video
                                                    ref={vid => { if (vid) vid.srcObject = p.stream; }}
                                                    autoPlay
                                                    playsInline
                                                    muted={p.isLocal}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <img
                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover bg-amber-100"
                                                />
                                            )}
                                        </div>
                                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white font-bold bg-black/30 px-3 py-1 rounded-full text-sm">
                                            {p.name}
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CouchRoom;
