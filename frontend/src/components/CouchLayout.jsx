import React from 'react';
import VideoAvatar from './VideoAvatar';

const CouchLayout = ({ localStream, peers, user }) => {
    // Convert peers object to array for mapping
    const peerList = Object.entries(peers).map(([id, peer]) => ({
        id,
        ...peer
    }));

    return (
        <div className="relative w-full max-w-6xl mx-auto h-[400px] md:h-[500px] flex items-end justify-center pb-12">
            {/* Couch Background (Pure CSS implementation for cleanliness, or can use IMG) */}
            <div className="absolute bottom-0 w-full h-32 md:h-40 bg-gradient-to-b from-purple-800 to-indigo-900 rounded-t-[50px] shadow-2xl skew-x-50">
                <div className="absolute top-0 w-full h-4 bg-black/20" />
            </div>

            {/* Avatars Container */}
            <div className="flex items-end -mb-10 md:-mb-12 space-x-[-20px] md:space-x-4 z-10 overflow-x-auto p-4 w-full justify-center">
                {/* Local User */}
                <VideoAvatar
                    stream={localStream}
                    isLocal={true}
                    user={user}
                />

                {/* Remote Peers */}
                {peerList.map(peer => (
                    <VideoAvatar
                        key={peer.id}
                        stream={peer.stream}
                        isLocal={false}
                        user={peer.user || { displayName: `Guest ${peer.id.substr(0, 4)}` }}
                    />
                ))}
            </div>

            {/* Room Name/Decor */}
            <div className="absolute top-4 left-4 text-white/20 font-bold text-4xl select-none">
                Virtual Lounge
            </div>
        </div>
    );
};

export default CouchLayout;
