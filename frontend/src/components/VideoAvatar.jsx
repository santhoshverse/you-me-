import React, { useEffect, useRef } from 'react';

const VideoAvatar = ({ stream, isLocal, user }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="flex flex-col items-center mx-2 group">
            {/* Kosmi-style Circular Avatar */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-indigo-600 shadow-[0_0_20px_rgba(124,58,237,0.5)] bg-gray-900 transition-transform duration-300 hover:scale-105">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal} // Mute local to prevent feedback
                    className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                />

                {/* Floating Indicators */}
                <div className="absolute bottom-2 right-4 flex gap-1">
                    {!stream?.getAudioTracks()[0]?.enabled && (
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                            🎤
                        </div>
                    )}
                </div>
            </div>

            {/* Name Label */}
            <div className="mt-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium border border-white/10 shadow-lg">
                {user?.displayName || (isLocal ? 'You' : 'Guest')}
            </div>
        </div>
    );
};

export default VideoAvatar;
