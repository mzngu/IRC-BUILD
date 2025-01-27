import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  content: string;
  sender: string;
}

const Chat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState('general');
  const [rooms, setRooms] = useState<string[]>(['general', 'tech', 'random']);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // Initialiser le socket avec le token
    const newSocket = io('http://localhost:3000', {
      auth: { token },
    });

    setSocket(newSocket);

    newSocket.emit('joinRoom', room);

    newSocket.on('message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [room]);

  const sendMessage = () => {
    if (socket && message) {
      socket.emit('message', { room, message });
      setMessage('');
    }
  };

return (
    <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Chat Room: {room}</h1>

        {/* Liste des Rooms */}
        <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">Rooms</h3>
            {rooms.map((r) => (
                <button
                    key={r}
                    onClick={() => setRoom(r)}
                    className={`px-4 py-2 mr-2 mb-2 rounded ${
                        room === r ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
                >
                    {r}
                </button>
            ))}
        </div>

        {/* Liste des messages */}
        <div className="border border-black h-72 overflow-y-scroll mb-4 p-2">
            {messages.map((msg, index) => (
                <p key={index} className="mb-2">
                    <strong>{msg.sender}:</strong> {msg.content}
                </p>
            ))}
        </div>

        {/* Input pour envoyer un message */}
        <div className="flex">
            <input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-grow p-2 border border-gray-300 rounded mr-2"
            />
            <button onClick={sendMessage} className="px-4 py-2 bg-blue-500 text-white rounded">
                Send
            </button>
        </div>
    </div>
);
};

export default Chat;