import React from 'react';

const ParticipantList = ({ participants = [] }) => {
    // Mock data if empty
    const displayList = participants.length > 0 ? participants : [
        { id: '1', name: 'You', isLocal: true, mic: true, cam: true },
        // { id: '2', name: 'Friend', isLocal: false, mic: false, cam: true } 
    ];

    return (
        <div className="glass-panel h-full flex flex-col p-4 w-full">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                Participants ({displayList.length})
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3">
                {displayList.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm overflow-hidden relative ${user.isLocal ? 'bg-indigo-500' : 'bg-pink-500'}`}>
                                {user.stream ? (
                                    <video
                                        autoPlay
                                        // muted // Mute remote streams here? No, only local. But for this list, maybe mute to avoid echo if audio is handled elsewhere? 
                                        // Actually, if it's a remote user, we want to hear them. Ideally separate <audio> element or unmuted video.
                                        // But if I mute it, I can't hear them. 
                                        // Wait, usually the main audio output comes from these tracks. 
                                        // Let's mute LOCAL only.
                                        muted={user.isLocal}
                                        ref={vid => { if (vid) vid.srcObject = user.stream; }}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <span className="font-semibold text-slate-700">
                                {user.name} {user.isLocal && <span className="text-xs text-gray-400 font-normal">(You)</span>}
                            </span>
                        </div>

                        <div className="flex gap-2 text-gray-400">
                            {/* Mic Icon */}
                            {user.mic ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 10.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-5v-2.07z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12.733l-4.518 2.375a1 1 0 01-1.465-1.124l1.086-6.909L2.2 7.796a1 1 0 01.59-1.815l6.593-.505zM13.684 4.31l1.62-.249.278 1.838a1 1 0 01-.137.93l-1.378 2.214-1.284 2.064-.999 1.603a1 1 0 01-.362.387l-2.002-1.299a1 1 0 01-.265-.257l2.848-4.57 1.05-1.688 1.139-1.831-.508-.142z" clipRule="evenodd" />
                                    {/* Simplified Slash path for visual clarity as placeholder */}
                                    <path d="M6 15L14 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            )}

                            {/* Camera Icon */}
                            {user.cam ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                    <path d="M5 15L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ParticipantList;
