import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const Landing = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');

    const createRoom = () => {
        const newId = uuidv4();
        navigate(`/room/${newId}`);
    };

    const joinRoom = (e) => {
        e.preventDefault();
        if (roomId.trim()) {
            navigate(`/room/${roomId}`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="glass p-8 md:p-12 w-full max-w-lg text-center transform transition-all duration-300 hover:scale-[1.01]">
                {/* Logo / Title */}
                <h1 className="text-5xl font-extrabold pb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
                    you&me
                </h1>
                <p className="text-gray-500 mb-10 text-lg">
                    Watch together. Listen together. Be together.
                </p>

                <div className="space-y-8">
                    {/* Create Room Section */}
                    <div>
                        <button
                            onClick={createRoom}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-xl shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            <span>Create & Join Room</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                            Instantly create a temporary room and join it.
                        </p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 text-gray-500 bg-white/50 backdrop-blur-sm rounded-full">
                                OR JOIN FRIEND
                            </span>
                        </div>
                    </div>

                    {/* Join Room Form */}
                    <form onSubmit={joinRoom} className="space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Paste Room ID here..."
                                className="input-field text-center text-lg tracking-wide group-hover:bg-white/90 transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!roomId.trim()}
                            className="w-full py-3 bg-white/70 hover:bg-white text-indigo-600 font-bold rounded-xl border border-indigo-100 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Join Existing Room
                        </button>
                    </form>
                </div>
            </div>

            <footer className="mt-8 text-gray-500 text-sm font-medium">
                © 2025 you&me • Clean. Simple. Social.
            </footer>
        </div>
    );
};

export default Landing;
