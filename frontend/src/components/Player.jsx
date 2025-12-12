import React, { useRef, useState } from 'react';
import ReactPlayer from 'react-player';

const Player = ({ url, playing, onPlay, onPause, onSeek, onProgress }) => {
    const playerRef = useRef(null);
    const [seeking, setSeeking] = useState(false);

    // Helper to get current internal player time
    const getCurrentTime = () => {
        return playerRef.current ? playerRef.current.getCurrentTime() : 0;
    };

    const handlePlay = () => onPlay(getCurrentTime());
    const handlePause = () => onPause(getCurrentTime());

    return (
        <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl group">
            {/* Gradient Overlay for professional look when paused/loading */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.3)] z-10 rounded-xl"></div>

            <ReactPlayer
                ref={playerRef}
                className="react-player"
                url={url || 'https://www.youtube.com/watch?v=LXb3EKWsInQ'}
                width="100%"
                height="100%"
                playing={playing}
                controls={true}
                onPlay={handlePlay}
                onPause={handlePause}
                progressInterval={1000}
                onProgress={(state) => {
                    if (!seeking && onProgress) {
                        onProgress(state);
                    }
                }}
                style={{ borderRadius: '12px', overflow: 'hidden' }}
            />
        </div>
    );
};

export default Player;
