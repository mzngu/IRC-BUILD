import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
    content: string;
    sender: { username: string; _id: string };
}

const Chat: React.FC = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState('');
    const [room, setRoom] = useState('general'); 
    const [rooms, setRooms] = useState<string[]>(['general', 'tech', 'random']); 

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            console.error('No token found');
            return;
        }

        const newSocket = io('http://localhost:3000', {
            auth: { token },
        });

        setSocket(newSocket);

        
        newSocket.emit('joinRoom', room);

        newSocket.on('message', (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => {
            if (newSocket) { 
                newSocket.disconnect();
            }
        };
    }, [room]); 

    const sendMessage = () => {
        if (socket && message) {
            socket.emit('message', { room, content: message });
            setMessage('');
        }
    };

    const switchRoom = (newRoom: string) => {
      setRoom(newRoom); 
      setMessages([]); 
    };

    return (
        <div className="flex flex-col h-screen p-4">

            {/* Room Selection */}
            <div className="mb-4">
              <label htmlFor="roomSelect" className="block text-gray-700 text-sm font-bold mb-2">Select Room:</label>
              <select
                id="roomSelect"
                value={room}
                onChange={(e) => switchRoom(e.target.value)} 
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                {rooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
                {messages.map((msg, index) => (
                    <div key={index} className="mb-2">
                        <span className="font-bold">{msg.sender.username}:</span> {msg.content}
                    </div>
                ))}
            </div>
            <div className="flex">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 border rounded p-2 mr-2"
                />
                <button
                    onClick={sendMessage}
                    className="bg-blue-500 text-white rounded p-2"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default Chat;