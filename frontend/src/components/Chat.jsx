import React, { useState, useEffect, useRef } from 'react';

const Chat = ({ messages, onSendMessage, username }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-inner border border-white/40">
            <div className="bg-white/40 p-4 border-b border-white/30 backdrop-blur-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    Chat
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-sm mt-4">
                        No messages yet. Say hi! 👋
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.user === username ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-gray-500 mb-1 px-1">{msg.user}</span>
                        <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm max-w-[85%] break-words ${msg.user === username
                            ? 'bg-indigo-500 text-white rounded-br-none'
                            : 'bg-white text-gray-700 rounded-bl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 bg-white/40 border-t border-white/30 backdrop-blur-sm">
                <div className="relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/80 border-none focus:ring-2 focus:ring-indigo-400 shadow-sm placeholder-gray-400 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chat;
