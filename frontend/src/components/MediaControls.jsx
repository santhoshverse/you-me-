import React, { useState, useEffect } from 'react';

const MediaControls = ({ onMediaChange }) => {
    const [stream, setStream] = useState(null);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCamOn, setIsCamOn] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const toggleMedia = async (type) => {
        try {
            setError('');

            // If turning OFF
            if ((type === 'mic' && isMicOn) || (type === 'cam' && isCamOn)) {
                if (stream) {
                    if (type === 'mic') {
                        stream.getAudioTracks().forEach(t => t.enabled = false);
                        setIsMicOn(false);
                    } else {
                        stream.getVideoTracks().forEach(t => t.enabled = false);
                        setIsCamOn(false);
                        // If we want to fully stop video track to turn off light:
                        stream.getVideoTracks().forEach(t => t.stop());
                    }
                }

                // Notify parent
                onMediaChange?.({ mic: type === 'mic' ? false : isMicOn, cam: type === 'cam' ? false : isCamOn });
                return;
            }

            // If turning ON
            const constraints = {
                audio: type === 'mic' || (isMicOn && type === 'cam'), // Keep audio if already on
                video: type === 'cam' || (isCamOn && type === 'mic')
            };

            if (type === 'mic') constraints.audio = true;
            if (type === 'mic') constraints.audio = true;
            if (type === 'cam') constraints.video = true;

            let newStream;
            if (type === 'screen') {
                newStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } else {
                newStream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            // If we already have a stream, we might need to add tracks or just enable them
            // For MVP simplicity: request new stream with desired constraints
            if (!newStream && !isMicOn && !isCamOn && type !== 'screen') {
                // Fallback if logic flow missed
                newStream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            // Stop old tracks if replacing entire stream
            if (stream) {
                // Merge or replace logic (simplified here: just use new stream)
                // In a real app we'd carefully manage tracks. 
                // For now, let's just use the new stream.
                stream.getTracks().forEach(t => t.stop());
            }

            setStream(newStream);
            if (type !== 'screen') {
                if (constraints.audio) setIsMicOn(true);
                if (constraints.video) setIsCamOn(true);
            }

            onMediaChange?.({ mic: !!constraints.audio, cam: !!constraints.video, stream: newStream, isScreen: type === 'screen' });

        } catch (err) {
            console.error("Media Error:", err);
            setError('Permission denied or device not found');
        }
    };

    return (
        <div className="flex gap-2 items-center">
            {/* Camera Toggle */}
            <button
                onClick={() => toggleMedia('cam')}
                className={`p-3 rounded-full transition-all duration-200 shadow-md ${isCamOn ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                title={isCamOn ? "Turn Camera Off" : "Turn Camera On"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Mic Toggle */}
            <button
                onClick={() => toggleMedia('mic')}
                className={`p-3 rounded-full transition-all duration-200 shadow-md ${isMicOn ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 10.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-5v-2.07z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Screen Share */}
            <button
                onClick={() => toggleMedia('screen')}
                className="p-3 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-all duration-200 shadow-md"
                title="Share Screen"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.9 1.348a1 1 0 01-.832 1.554h-5.7a1 1 0 01-.832-1.554l.9-1.348H5a2 2 0 01-2-2V5zm2 0v8h10V5H5z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Local Preview (Small) */}
            {isCamOn && stream && (
                <div className="w-16 h-12 bg-black rounded-lg overflow-hidden ml-2 border-2 border-indigo-200 relative shadow-sm">
                    <video
                        autoPlay
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                        ref={video => { if (video) video.srcObject = stream; }}
                    />
                </div>
            )}

            {error && <span className="text-xs text-red-500 font-bold ml-2">!</span>}
        </div>
    );
};

export default MediaControls;
