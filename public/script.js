console.log("RELEASE v2.6 LOADED - REGEX FIX");
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const socketUrl = isLocal ? 'http://127.0.0.1:3001' : undefined;
const socket = io(socketUrl);

// Robust Room ID extraction (Regex based)
function getRoomId() {
    // 1. Check query param (e.g., room.html?id=123)
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return params.get('id');

    // 2. Regex check for path (e.g., /room/123, /room/123/, /app/room/123)
    // Looking for a segment after 'room/' that is NOT empty
    const match = window.location.pathname.match(/room\/([^\/]+)/);
    if (match && match[1]) {
        return match[1];
    }

    return null;
}

const roomId = getRoomId();

if (!roomId) {
    alert("No room ID found!");
    window.location.href = '/';
}
let username = prompt('Enter your name:') || `Guest-${Math.floor(Math.random() * 1000)}`;
let player;
let isHost = false; // Logic for host buffering could be added
let isTimeSyncing = false; // Prevent feedback loops

// Display Room ID
// Display Room ID - SHOW FULL ID to avoid confusion
document.getElementById('displayRoomId').innerText = roomId;
document.getElementById('displayRoomId').title = roomId; // Tooltip

// Join Room
socket.emit('join_room', roomId);

// --- Socket Events ---

socket.on('room_state', (state) => {
    if (state.currentMedia && state.currentMedia.url) {
        initVideo(state.currentMedia.url);
    }
});

socket.on('play', ({ mediaTime }) => {
    if (player && player.seekTo) {
        isTimeSyncing = true;
        // Only seek if significantly different to avoid jitters
        if (Math.abs(player.getCurrentTime() - mediaTime) > 0.5) {
            player.seekTo(mediaTime);
        }
        player.playVideo();
        setTimeout(() => isTimeSyncing = false, 500);
    }
});

socket.on('pause', ({ mediaTime }) => {
    if (player && player.pauseVideo) {
        isTimeSyncing = true;
        player.seekTo(mediaTime);
        player.pauseVideo();
        setTimeout(() => isTimeSyncing = false, 500);
    }
});

socket.on('seek', ({ mediaTime }) => {
    if (player && player.seekTo) {
        isTimeSyncing = true;
        player.seekTo(mediaTime);
        setTimeout(() => isTimeSyncing = false, 500);
    }
});

socket.on('chat_message', (msg) => {
    addMessageToUI(msg);
});


// --- YouTube Player ---

function onYouTubeIframeAPIReady() {
    // Player placeholder, will be initialized when URL is loaded
    // initVideo('VIDEO_ID'); // Default handled by room state
}

function initVideo(url) {
    const videoId = extractVideoId(url);
    console.log("DEBUG: InitVideo with URL:", url, "Extracted ID:", videoId);
    if (!videoId) {
        console.error("DEBUG: No valid Video ID found!");
        return;
    }

    // Hide placeholder
    if (document.getElementById('placeholder')) document.getElementById('placeholder').style.display = 'none';

    // Ensure player wrapper exists for robust recreation
    let playerElement = document.getElementById('player');
    const playerContainer = document.getElementById('player-wrapper') || playerElement?.parentNode;

    // Add wrapper ID if missing to parent for future reference
    if (playerContainer && !playerContainer.id) playerContainer.id = 'player-wrapper';

    // Destroy existing if needed
    if (player && player.destroy) {
        player.destroy();
    }

    // Re-create div if it was removed by destroy() or doesn't exist
    if (!document.getElementById('player')) {
        const newDiv = document.createElement('div');
        newDiv.id = 'player';
        playerContainer.appendChild(newDiv);
    }

    const origin = window.location.origin === 'null' ? '*' : window.location.origin;

    console.log("DEBUG: Creating NEW YT.Player instance...");
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        host: 'https://www.youtube.com',
        playerVars: {
            'playsinline': 1,
            'controls': 1,
            'rel': 0,
            'enablejsapi': 1,
            'origin': origin,
            'autoplay': 1
        },
        events: {
            'onReady': (event) => {
                console.log("YouTube Player Ready! Auto-playing...");
                event.target.playVideo();
            },
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerError(event) {
    console.error('YouTube Player Error:', event.data);
    let msg = 'An error occurred causing playback to stop.';
    let detail = 'Please try another video.';

    if (event.data === 2) {
        msg = 'Invalid Video ID';
        detail = 'The URL or ID appears to be incorrect.';
    } else if (event.data === 5) {
        msg = 'HTML5 Player Error';
    } else if (event.data === 100) {
        msg = 'Video Not Found';
        detail = 'This video may be private or deleted.';
    } else if (event.data === 101 || event.data === 150) {
        msg = 'Playback Restricted';
        detail = 'The owner has blocked this video from playing on other websites.';
    }

    // Replace player content with friendly error UI
    const playerDiv = document.getElementById('player');
    if (playerDiv) {
        playerDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full bg-gray-900 text-white p-8 text-center">
                <div class="text-4xl mb-4">😕</div>
                <h3 class="text-xl font-bold mb-2">${msg}</h3>
                <p class="text-gray-400 mb-6">${detail}</p>
                <button onclick="document.getElementById('urlInputDiv').classList.remove('hidden')" 
                    class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold transition-colors">
                    Try Another Video
                </button>
            </div>
        `;
    }
}

function onPlayerStateChange(event) {
    if (isTimeSyncing) return;

    const time = player.getCurrentTime();

    if (event.data === YT.PlayerState.PLAYING) {
        socket.emit('play', { roomId, mediaTime: time });
    } else if (event.data === YT.PlayerState.PAUSED) {
        socket.emit('pause', { roomId, mediaTime: time });
    }
    // Buffering/Ended logic omitted for MVP
}

function loadVideo(e) {
    e.preventDefault();
    const url = document.getElementById('videoUrlInput').value;
    // Emit new video URL to server (needs backend support, adding for MVP completeness)
    // For now locally init:
    initVideo(url);

    // Hide website frame if visible
    document.getElementById('websiteFrame').classList.add('hidden');
    if (document.getElementById('player')) document.getElementById('player').style.display = 'block';

    // Hide placeholder
    if (document.getElementById('placeholder')) document.getElementById('placeholder').style.display = 'none';

    // Close the popup
    document.getElementById('urlInputDiv').classList.add('hidden');
}

function loadWebsite(e) {
    e.preventDefault();
    let url = document.getElementById('webUrlInput').value.trim();
    if (!url) return;

    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    // Hide YouTube Player
    if (document.getElementById('player')) document.getElementById('player').style.display = 'none';
    if (player && player.stopVideo) player.stopVideo();

    // Show Website Frame
    const frame = document.getElementById('websiteFrame');
    frame.classList.remove('hidden');
    frame.src = url;

    // Send to chat for others
    addMessageToUI({ user: 'System', text: `Loaded Website: ${url}`, createdAt: new Date().toISOString() });

    // Close the popup
    document.getElementById('webInputDiv').classList.add('hidden');
}

function extractVideoId(url) {
    if (!url) return null;
    // Handle standard watch, short, embed, and disordered query params
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}


// --- Chat ---

function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (text) {
        socket.emit('chat_message', { roomId, text, user: username });
        input.value = '';
    }
}

function addMessageToUI({ user, text, createdAt }) {
    const list = document.getElementById('chatMessages');
    const isMe = user === username;

    const div = document.createElement('div');
    div.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'}`;

    div.innerHTML = `
        <div class="flex items-end gap-2 max-w-[85%]">
            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1">
                <span class="text-xs text-gray-500 font-medium ml-1">${user}</span>
                <div class="${isMe ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-gray-100'} px-4 py-2 rounded-2xl ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} shadow-sm text-sm break-words">
                    ${text}
                </div>
            </div>
        </div>
    `;

    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}


// --- Media Controls (Local Only for MVP) ---

let localStream;
let camEnabled = false;
let micEnabled = false;

async function toggleCam() {
    if (!camEnabled) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            document.getElementById('localVideo').srcObject = stream;
            document.getElementById('localPreviewParams').classList.remove('hidden');

            document.getElementById('camBtn').classList.add('bg-indigo-100', 'text-indigo-600');
            document.getElementById('camBtn').classList.remove('bg-white/50', 'text-slate-500');

            camEnabled = true;
            localStream = stream; // Store reference
        } catch (e) {
            alert('Cannot access camera');
        }
    } else {
        // Stop tracks
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        document.getElementById('localVideo').srcObject = null;
        document.getElementById('localPreviewParams').classList.add('hidden');

        document.getElementById('camBtn').classList.remove('bg-indigo-100', 'text-indigo-600');
        document.getElementById('camBtn').classList.add('bg-white/50', 'text-slate-500');

        camEnabled = false;
    }
    updateMyParticipantStatus();
}

function toggleMic() {
    micEnabled = !micEnabled;
    const btn = document.getElementById('micBtn');
    if (micEnabled) {
        btn.classList.add('bg-indigo-100', 'text-indigo-600');
        btn.classList.remove('bg-white/50', 'text-slate-500');
    } else {
        btn.classList.remove('bg-indigo-100', 'text-indigo-600');
        btn.classList.add('bg-white/50', 'text-slate-500');
    }
    updateMyParticipantStatus();
}

let screenStream;
let isScreenSharing = false;

async function toggleScreenShare() {
    if (!isScreenSharing) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            screenStream = stream;

            // Replace Main Player with Screen Share (Local View)
            const playerContainer = document.getElementById('player').parentNode;

            // Create a video element for screen share if not exists
            let screenVideo = document.getElementById('screenShareVideo');
            if (!screenVideo) {
                screenVideo = document.createElement('video');
                screenVideo.id = 'screenShareVideo';
                screenVideo.className = 'w-full h-full object-contain bg-black';
                screenVideo.autoplay = true;
                screenVideo.playsInline = true;
                screenVideo.muted = true; // Mute local self-view
                playerContainer.appendChild(screenVideo);
            }

            // Hide YouTube Player / Placeholder
            if (document.getElementById('player')) document.getElementById('player').style.display = 'none';
            if (document.getElementById('placeholder')) document.getElementById('placeholder').style.display = 'none';

            screenVideo.style.display = 'block';
            screenVideo.srcObject = stream;

            // Update Button UI
            document.getElementById('screenBtn').classList.add('bg-indigo-100', 'text-indigo-600');
            document.getElementById('screenBtn').classList.remove('bg-white/50', 'text-slate-500');

            isScreenSharing = true;

            // Notify server we are streaming
            socket.emit('start_stream', { roomId });

            // Note: We rely on 'user_joined' to connect to NEW users.
            // For EXISTING users, the server broadcasts 'stream_started', and THEY must request the feed.
            // This is the most reliable initiator pattern for Mesh.

            // Handle stream stop (user clicks "Stop Sharing" in browser UI)
            stream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

        } catch (e) {
            console.error(e);
            alert('Could not share screen: ' + e.message);
        }
    } else {
        stopScreenShare();
    }
}

function stopScreenShare() {
    isScreenSharing = false;
    socket.emit('stop_stream', { roomId });

    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
    }

    // Close all peer connections?
    // In Mesh, keeping connections open is fine, but closing them cleans up resources.
    Object.values(peers).forEach(pc => pc.close());
    // Clear peers object
    for (let key in peers) delete peers[key];

    // UI Cleanup
    const screenVideo = document.getElementById('screenShareVideo');
    if (screenVideo) {
        screenVideo.srcObject = null;
        screenVideo.remove();
    }

    // Show YouTube Player back
    if (document.getElementById('player')) document.getElementById('player').style.display = 'block';

    document.getElementById('screenBtn').classList.remove('bg-indigo-100', 'text-indigo-600');
    document.getElementById('screenBtn').classList.add('bg-white/50', 'text-slate-500');
}

// Listen for when someone ELSE starts streaming
socket.on('stream_started', ({ streamerId }) => {
    // We want to see it!
    // Ask for the feed - this tells the streamer to initiate a connection with US
    console.log('Stream started by', streamerId, 'requesting feed...');
    socket.emit('request_feed', { to: streamerId, from: socket.id });
});

// Streamer responds to request - THIS creates the Offer
socket.on('request_feed', ({ from }) => {
    if (isScreenSharing && screenStream) {
        console.log('Received request for feed from', from);
        // Create a PC for this specific peer
        const pc = createPeerConnection(from, true); // true = initiator (we send offer)
        peers[from] = pc;
    }
});

// --- Participant List ---

function updateMyParticipantStatus() {
    // In a real app, emit 'status_change' to server
    renderParticipantList([{ name: username, cam: camEnabled, mic: micEnabled, isMe: true }]);
}

function renderParticipantList(users) {
    const container = document.getElementById('participantList');
    container.innerHTML = '';

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-2 hover:bg-white/50 rounded-lg transition-colors";
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-xs">
                    ${u.name.substring(0, 2).toUpperCase()}
                </div>
                <span class="text-sm font-medium text-slate-700">${u.name} ${u.isMe ? '(You)' : ''}</span>
            </div>
            <div class="flex gap-2 text-xs">
                ${u.mic ? '<span class="text-green-500">🎤</span>' : '<span class="text-gray-300">🎤</span>'}
                ${u.cam ? '<span class="text-green-500">📷</span>' : '<span class="text-gray-300">📷</span>'}
            </div>
        `;
        container.appendChild(div);
    });
}

// Initial Render
renderParticipantList([{ name: username, cam: false, mic: false, isMe: true }]);


// --- WebRTC Logic ---

const peers = {}; // userId -> RTCPeerConnection
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Handle new user joining - if we are the streamer, we need to connect to them
socket.on('user_joined', ({ userId }) => {
    console.log(`User joined: ${userId}`);
    // Update count UI
    const countEl = document.getElementById('userCount');
    if (countEl) countEl.innerText = parseInt(countEl.innerText) + 1;

    if (isScreenSharing && screenStream) {
        console.log(`Initiating connection to new user ${userId}`);
        // We are streaming, so initiate connection to the new user
        // Create PC specifically for this user
        const pc = createPeerConnection(userId, true);
        peers[userId] = pc;
    }
});

socket.on('user_left', ({ userId }) => {
    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }
    // Update count UI
    const countEl = document.getElementById('userCount');
    if (countEl) countEl.innerText = Math.max(1, parseInt(countEl.innerText) - 1);
});

// Handle signal (Offer, Answer, ICE Candidate)
socket.on('signal', async ({ from, signal }) => {
    console.log(`DEBUG: Received signal type ${signal.type || 'candidate'} from ${from}`);
    let pc = peers[from];

    // If we receive an offer from someone we don't have a PC with, create one (we are receiver)
    if (!pc) {
        console.log("DEBUG: Creating new PC for incoming signal");
        pc = createPeerConnection(from, false);
        peers[from] = pc;
    }

    try {
        if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', { to: from, from: socket.id, signal: pc.localDescription });
        } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
        }
    } catch (error) {
        console.error('Error handling signal:', error);
    }
});

socket.on('stream_stopped', () => {
    console.log("Stream stopped event received");
    // If someone else stopped streaming, remove their video
    const screenVideo = document.getElementById('screenShareVideo');
    if (screenVideo) {
        screenVideo.srcObject = null;
        screenVideo.remove();
    }

    // Restore player
    if (document.getElementById('player')) document.getElementById('player').style.display = 'block';

    // Close all peer connections associated with receiving streams? 
    // Actually, in this simple mesh, we might want to just close all peers or keep them open.
    // For simplicity, let's keep them but renegotiation would be needed for multiple streams.
    // MVP: dynamic cleanup is good.
});

function createPeerConnection(targetUserId, isInitiator) {
    console.log(`Creating PeerConnection with ${targetUserId}. Initiator: ${isInitiator}`);
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { to: targetUserId, from: socket.id, signal: event.candidate });
        }
    };

    pc.ontrack = (event) => {
        console.log("URGENT DEBUG: Received track from", targetUserId);

        // When we receive a track (screen share), display it
        const playerContainer = document.getElementById('player-wrapper') || document.getElementById('player').parentNode;

        // Hide YouTube
        if (document.getElementById('player')) document.getElementById('player').style.display = 'none';

        let screenVideo = document.getElementById('screenShareVideo');
        if (!screenVideo) {
            console.log("Creating new screenShareVideo element");
            screenVideo = document.createElement('video');
            screenVideo.id = 'screenShareVideo';
            screenVideo.className = 'w-full h-full object-contain bg-black';
            screenVideo.autoplay = true;
            screenVideo.playsInline = true;
            screenVideo.muted = true; // IMPORTANT: Mute to allow autoplay
            playerContainer.appendChild(screenVideo);

            // Add click to unmute helper
            screenVideo.onclick = () => {
                screenVideo.muted = !screenVideo.muted;
                console.log("Toggled Mute:", screenVideo.muted);
            };
        }

        screenVideo.srcObject = event.streams[0];
        screenVideo.style.display = 'block';

        screenVideo.play().catch(e => console.error("Auto-Play Error:", e));
    };

    if (isInitiator && screenStream) {
        console.log("Adding local tracks to PC");
        screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
    }

    if (isInitiator) {
        console.log("Creating Offer");
        // Create Offer
        pc.createOffer().then(offer => {
            return pc.setLocalDescription(offer);
        }).then(() => {
            socket.emit('signal', { to: targetUserId, from: socket.id, signal: pc.localDescription });
        }).catch(e => console.error("Error creating offer:", e));
    }

    return pc;
}


// --- Media Sources Logic ---

function triggerLocalMedia() {
    document.getElementById('localFileInput').click();
}

function handleLocalFile(input) {
    const file = input.files[0];
    if (file) {
        const fileURL = URL.createObjectURL(file);

        // Replace player content with standard video tag
        const playerContainer = document.getElementById('player').parentNode;

        // Remove Screen Share if active
        if (isScreenSharing) stopScreenShare();

        // Hide YouTube
        if (document.getElementById('player')) document.getElementById('player').style.display = 'none';
        if (document.getElementById('placeholder')) document.getElementById('placeholder').style.display = 'none';

        // Create or reuse local player
        let localPlayer = document.getElementById('localMediaPlayer');
        if (!localPlayer) {
            localPlayer = document.createElement('video');
            localPlayer.id = 'localMediaPlayer';
            localPlayer.className = 'w-full h-full object-contain';
            localPlayer.controls = true;
            playerContainer.appendChild(localPlayer);
        }

        localPlayer.style.display = 'block';
        localPlayer.src = fileURL;
        localPlayer.play();

        // Notify chat (MVP: syncing local files requires P2P streaming which is complex, just playing locally for now)
        addMessageToUI({ user: 'System', text: `Loaded local file: ${file.name} (Only visible to you)`, createdAt: new Date().toISOString() });
    }
}

function setPlatform(platform) {
    if (platform === 'youtube') {
        const localPlayer = document.getElementById('localMediaPlayer');
        if (localPlayer) {
            localPlayer.pause();
            localPlayer.style.display = 'none';
        }
        if (document.getElementById('player')) document.getElementById('player').style.display = 'block';
    } else {
        // For standard streaming services, guide user to screen share
        alert(`To watch ${platform.charAt(0).toUpperCase() + platform.slice(1)}, please use the 'Screen Share' button in the toolbar!`);
    }
}

// --- Utils ---

function copyInvite() {
    navigator.clipboard.writeText(window.location.href);
    const btn = document.getElementById('copyBtn');
    const originalText = btn.innerText;
    btn.innerText = 'Copied!';
    btn.classList.add('bg-green-500', 'text-white');
    btn.classList.remove('from-indigo-600', 'to-purple-600');
    setTimeout(() => {
        btn.innerHTML = '<span class="text-lg">🔗</span> Copy Link';
        btn.classList.remove('bg-green-500', 'text-white');
        btn.classList.add('from-indigo-600', 'to-purple-600');
    }, 2000);
}
