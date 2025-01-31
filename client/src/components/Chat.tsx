import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
    content: string;
    sender: { username: string; _id: string };
    type?: 'system' | 'private' | 'normal';
}

interface User {
    username: string;
    _id: string;
}

const Chat: React.FC = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState('');
    const [room, setRoom] = useState('general');
    const [rooms, setRooms] = useState<string[]>(['general']);
    const [nickname, setNickname] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [searchChannel, setSearchChannel] = useState('');

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

        // Socket event listeners
        newSocket.on('message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        newSocket.on('userList', (userList: User[]) => {
            setUsers(userList);
        });

        newSocket.on('roomList', (roomList: string[]) => {
            setRooms(roomList);
        });

        newSocket.on('privateMessage', (msg: Message) => {
            setMessages(prev => [...prev, { ...msg, type: 'private' }]);
        });

        newSocket.on('systemMessage', (msg: Message) => {
            setMessages(prev => [...prev, { ...msg, type: 'system' }]);
        });

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [room]);

    const handleCommand = (input: string) => {
        if (!socket) return;

        const args = input.split(' ');
        const command = args[0].toLowerCase();

        switch (command) {
            case '/nick':
                if (args[1]) {
                    socket.emit('setNickname', args[1]);
                    setNickname(args[1]);
                }
                break;
            case '/list':
                socket.emit('listRooms', args[1] || '');
                break;
            case '/create':
                if (args[1]) {
                    socket.emit('createRoom', args[1]);
                }
                break;
            case '/delete':
                if (args[1]) {
                    socket.emit('deleteRoom', args[1]);
                }
                break;
            case '/join':
                if (args[1]) {
                    socket.emit('joinRoom', args[1]);
                    setRoom(args[1]);
                    setMessages([]);
                }
                break;
            case '/quit':
                if (args[1]) {
                    socket.emit('quitRoom', args[1]);
                    setRoom('general');
                    setMessages([]);
                }
                break;
            case '/users':
                socket.emit('getUsers', room);
                break;
            case '/msg':
                if (args[1] && args.slice(2).join(' ')) {
                    socket.emit('privateMessage', {
                        to: args[1],
                        content: args.slice(2).join(' ')
                    });
                }
                break;
            default:
                return false;
        }
        return true;
    };

    const sendMessage = () => {
        if (!socket || !message.trim()) return;

        if (message.startsWith('/')) {
            const isCommand = handleCommand(message);
            if (!isCommand) {
                socket.emit('message', { room, content: message });
            }
        } else {
            socket.emit('message', { room, content: message });
        }
        setMessage('');
    };

    const getMessageStyle = (type?: string) => {
        switch (type) {
            case 'system':
                return 'italic text-gray-500';
            case 'private':
                return 'text-purple-600';
            default:
                return 'text-black';
        }
    };

    return (
        <div className="flex flex-col h-screen p-4">
            {/* Channel Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search channels..."
                    value={searchChannel}
                    onChange={(e) => {
                        setSearchChannel(e.target.value);
                        handleCommand(`/list ${e.target.value}`);
                    }}
                    className="w-full p-2 border rounded"
                />
            </div>

            {/* Room Selection */}
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Current Room: {room}
                </label>
                <select
                    value={room}
                    onChange={(e) => handleCommand(`/join ${e.target.value}`)}
                    className="shadow border rounded w-full py-2 px-3"
                >
                    {rooms.map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
            </div>

            {/* Users List */}
            <div className="mb-4">
                <h3 className="font-bold mb-2">Users in {room}:</h3>
                <div className="flex flex-wrap gap-2">
                    {users.map((user) => (
                        <span key={user._id} className="bg-gray-200 px-2 py-1 rounded">
                            {user.username}
                        </span>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-4 border rounded p-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`mb-2 ${getMessageStyle(msg.type)}`}>
                        <span className="font-bold">{msg.sender.username}:</span> {msg.content}
                    </div>
                ))}
            </div>

            {/* Message Input */}
            <div className="flex">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message or command (/help for commands)"
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