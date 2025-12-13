import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import CouchLayout from './CouchLayout';

const RoomPage = () => {
    const { roomId } = useParams();
    const location = useLocation();

    // In real app, we fetch user from context/auth
    // For MVP, we pass via router state or generate temporary
    const [user, setUser] = useState(location.state?.user || {
        id: Math.floor(Math.random() * 10000),
        displayName: 'You'
    });

    const { localStream, peers, shareScreen } = useWebRTC(roomId, user);

    // Copy Invite Link
    const copyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center">
            {/* Header / Nav */}
            <div className="w-full h-16 bg-gray-800/50 backdrop-blur-md flex items-center justify-between px-6 border-b border-white/5">
                <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                    you&me
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={copyLink}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-colors"
                    >
                        Copy Invite Link
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500" />
                </div>
            </div>

            {/* Main Stage Area (For Screen Share / Media) */}
            <div className="flex-1 w-full max-w-7xl flex flex-col justify-center items-center p-6">
                {/* Placeholder for Media Player / Screen Share */}
                {/* <MediaPlayer /> */}
                <div className="w-full h-full flex flex-col justify-end">
                    <CouchLayout localStream={localStream} peers={peers} user={user} />
                </div>
            </div>

            {/* Bottom Controls (Module 1.3) */}
            <div className="w-full h-20 bg-gray-800 border-t border-white/10 flex items-center justify-center gap-6">
                <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all">
                    📷
                </button>
                <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all">
                    🎤
                </button>
                <button
                    onClick={shareScreen}
                    className="p-4 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30 transition-all">
                    Share Screen
                </button>
                <button className="p-4 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-500 transition-all">
                    🚪
                </button>
            </div>
        </div>
    );
};

export default RoomPage;
