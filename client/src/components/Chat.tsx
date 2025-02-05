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
    const [users, setUsers] = useState<User[]>([]);
    
    // New state for modals and interactions
    const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
    const [newNickname, setNewNickname] = useState('');
    const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [searchRoomTerm, setSearchRoomTerm] = useState('');
    const [isPrivateMessageModalOpen, setIsPrivateMessageModalOpen] = useState(false);
    const [privateMessageRecipient, setPrivateMessageRecipient] = useState('');
    const [privateMessageContent, setPrivateMessageContent] = useState('');

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

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [room]);

    const sendMessage = () => {
        if (!socket || !message.trim()) return;
        socket.emit('message', { room, content: message });
        setMessage('');
    };

    const changeNickname = () => {
        if (socket && newNickname.trim()) {
            socket.emit('setNickname', newNickname);
            setIsNicknameModalOpen(false);
            setNewNickname('');
        }
    };

    const createRoom = () => {
        if (socket && newRoomName.trim()) {
            socket.emit('createRoom', newRoomName);
            setIsCreateRoomModalOpen(false);
            setNewRoomName('');
        }
    };

    const sendPrivateMessage = () => {
        if (socket && privateMessageRecipient.trim() && privateMessageContent.trim()) {
            socket.emit('privateMessage', {
                to: privateMessageRecipient,
                content: privateMessageContent
            });
            setIsPrivateMessageModalOpen(false);
            setPrivateMessageRecipient('');
            setPrivateMessageContent('');
        }
    };

    const Modal: React.FC<{
        isOpen: boolean, 
        onClose: () => void, 
        children: React.ReactNode
    }> = ({ isOpen, onClose, children }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                <div className="bg-white p-6 rounded-lg shadow-xl">
                    {children}
                    <button 
                        onClick={onClose}
                        className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen p-4">
            {/* Feature Buttons */}
            <div className="flex space-x-2 mb-4">
                <button 
                    onClick={() => setIsNicknameModalOpen(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Change Nickname
                </button>
                <button 
                    onClick={() => setIsCreateRoomModalOpen(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded"
                >
                    Create Room
                </button>
                <button 
                    onClick={() => setIsPrivateMessageModalOpen(true)}
                    className="bg-purple-500 text-white px-4 py-2 rounded"
                >
                    Send Private Message
                </button>
            </div>

            {/* Room Selection */}
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Current Room: {room}
                </label>
                <select
                    value={room}
                    onChange={(e) => {
                        if (socket) {
                            socket.emit('joinRoom', e.target.value);
                            setRoom(e.target.value);
                            setMessages([]);
                        }
                    }}
                    className="shadow border rounded w-full py-2 px-3"
                >
                    {rooms.map((r) => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
            </div>

            {/* Nickname Change Modal */}
            <Modal 
                isOpen={isNicknameModalOpen} 
                onClose={() => setIsNicknameModalOpen(false)}
            >
                <h2 className="text-xl mb-4">Change Nickname</h2>
                <input 
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="Enter new nickname"
                    className="w-full p-2 border rounded mb-4"
                />
                <button 
                    onClick={changeNickname}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Save Nickname
                </button>
            </Modal>

            {/* Create Room Modal */}
            <Modal 
                isOpen={isCreateRoomModalOpen} 
                onClose={() => setIsCreateRoomModalOpen(false)}
            >
                <h2 className="text-xl mb-4">Create New Room</h2>
                <input 
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name"
                    className="w-full p-2 border rounded mb-4"
                />
                <button 
                    onClick={createRoom}
                    className="bg-green-500 text-white px-4 py-2 rounded"
                >
                    Create Room
                </button>
            </Modal>

            {/* Private Message Modal */}
            <Modal 
                isOpen={isPrivateMessageModalOpen} 
                onClose={() => setIsPrivateMessageModalOpen(false)}
            >
                <h2 className="text-xl mb-4">Send Private Message</h2>
                <select
                    value={privateMessageRecipient}
                    onChange={(e) => setPrivateMessageRecipient(e.target.value)}
                    className="w-full p-2 border rounded mb-4"
                >
                    <option value="">Select Recipient</option>
                    {users.map((user) => (
                        <option key={user._id} value={user.username}>
                            {user.username}
                        </option>
                    ))}
                </select>
                <textarea 
                    value={privateMessageContent}
                    onChange={(e) => setPrivateMessageContent(e.target.value)}
                    placeholder="Enter your private message"
                    className="w-full p-2 border rounded mb-4 h-24"
                />
                <button 
                    onClick={sendPrivateMessage}
                    className="bg-purple-500 text-white px-4 py-2 rounded"
                >
                    Send Private Message
                </button>
            </Modal>

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
                    <div key={index} className="mb-2">
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
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message"
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