import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const SIGNALING_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : window.location.origin;

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
        // Placeholder for TURN
        // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
    ]
};

export const useWebRTC = (roomId, user) => {
    const [peers, setPeers] = useState({}); // { peerId: { connection, stream, user } }
    const [localStream, setLocalStream] = useState(null);
    const socketRef = useRef(null);
    const peersRef = useRef({}); // Refs for mutable access in callbacks
    const myPeerId = useRef(uuidv4());

    useEffect(() => {
        // Initialize Socket
        socketRef.current = io(SIGNALING_URL);
        const s = socketRef.current;

        // Get Local Stream
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                setLocalStream(stream);

                // Register & Join
                s.emit('register', { peerId: myPeerId.current });
                s.emit('join-room', {
                    roomId,
                    peerId: myPeerId.current,
                    userId: user?.id,
                    displayName: user?.displayName
                });
            })
            .catch(err => console.error("Failed to get local stream", err));

        // Signaling Events
        s.on('new-peer', handleNewPeer);
        s.on('offer', handleOffer);
        s.on('answer', handleAnswer);
        s.on('ice-candidate', handleIceCandidate);
        s.on('user-left', handleUserLeft); // Need to implement in backend

        return () => {
            s.disconnect();
            if (localStream) localStream.getTracks().forEach(track => track.stop());
        };
    }, [roomId]);

    const createPeer = (peerId, initiator, stream) => {
        const peer = new RTCPeerConnection(ICE_SERVERS);

        if (stream) {
            stream.getTracks().forEach(track => peer.addTrack(track, stream));
        }

        peer.onicecandidate = (e) => {
            if (e.candidate) {
                socketRef.current.emit('ice-candidate', {
                    toPeerId: peerId,
                    fromPeerId: myPeerId.current,
                    candidate: e.candidate
                });
            }
        };

        peer.ontrack = (e) => {
            setPeers(prev => ({
                ...prev,
                [peerId]: { ...prev[peerId], stream: e.streams[0] }
            }));
        };

        return peer;
    };

    const handleNewPeer = async ({ peerId, displayName }) => {
        const peer = createPeer(peerId, true, localStream);
        peersRef.current[peerId] = peer;

        // Add to state immediately to show placeholder
        setPeers(prev => ({ ...prev, [peerId]: { connection: peer, user: { displayName } } }));

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socketRef.current.emit('offer', {
            toPeerId: peerId,
            fromPeerId: myPeerId.current,
            sdp: peer.localDescription
        });
    };

    const handleOffer = async ({ fromPeerId, sdp }) => {
        const peer = createPeer(fromPeerId, false, localStream);
        peersRef.current[fromPeerId] = peer;
        setPeers(prev => ({ ...prev, [fromPeerId]: { connection: peer } })); // Update user later via side-channel?

        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socketRef.current.emit('answer', {
            toPeerId: fromPeerId,
            fromPeerId: myPeerId.current,
            sdp: peer.localDescription
        });
    };

    const handleAnswer = async ({ fromPeerId, sdp }) => {
        const peer = peersRef.current[fromPeerId];
        if (peer) {
            await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    };

    const handleIceCandidate = async ({ fromPeerId, candidate }) => {
        const peer = peersRef.current[fromPeerId];
        if (peer) {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const handleUserLeft = ({ peerId }) => {
        if (peersRef.current[peerId]) {
            peersRef.current[peerId].close();
            delete peersRef.current[peerId];
            setPeers(prev => {
                const newState = { ...prev };
                delete newState[peerId];
                return newState;
            });
        }
    };

    const shareScreen = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            screenTrack.onended = () => stopScreenShare();

            // Replace video track in all peer connections
            Object.values(peersRef.current).forEach(peer => {
                const senders = peer.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(screenTrack);
                }
            });

            setLocalStream(prev => {
                // Keep audio, replace video
                if (!prev) return screenStream;
                const newStream = new MediaStream([
                    screenTrack,
                    ...prev.getAudioTracks()
                ]);
                return newStream;
            });

            socketRef.current.emit('screen-started', { roomId, peerId: myPeerId.current });

        } catch (err) {
            console.error("Screen Share Error:", err);
        }
    };

    const stopScreenShare = async () => {
        try {
            const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoTrack = camStream.getVideoTracks()[0];

            // Replace screen track with cam track
            Object.values(peersRef.current).forEach(peer => {
                const senders = peer.getSenders();
                const videoSender = senders.find(s => s.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            });

            setLocalStream(camStream);
            socketRef.current.emit('screen-stopped', { roomId });

        } catch (err) {
            console.error("Stop Screen Share Error:", err);
        }
    };

    return { localStream, peers, shareScreen, stopScreenShare };
};
