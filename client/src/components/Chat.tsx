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

interface Channel {
    name: string;
    users: User[];
}

const Chat: React.FC = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState('');
    const [room, setRoom] = useState('general');
    const [rooms, setRooms] = useState<string[]>(['general']);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
    const [newNickname, setNewNickname] = useState('');
    const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [isRoomListModalOpen, setIsRoomListModalOpen] = useState(false);
    const [isUsersListModalOpen, setIsUsersListModalOpen] = useState(false);
    const [isPrivateMessageModalOpen, setIsPrivateMessageModalOpen] = useState(false);
    const [privateMessageRecipient, setPrivateMessageRecipient] = useState('');
    const [privateMessageContent, setPrivateMessageContent] = useState('');
    const [availableRooms, setAvailableRooms] = useState<Channel[]>([]);

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
            setMessages(prev => [...prev, msg]);
        });

        newSocket.on('previousMessages', (messages: Message[]) => {
            setMessages(messages);
        });

        newSocket.on('channelCreated', (channel: Channel) => {
            setRooms(prev => [...prev, channel.name]);
        });

        newSocket.on('channelList', (channels: string[]) => {
            setRooms(channels);
        });

        newSocket.on('userJoined', (channelName: string, user: User) => {
            if (channelName === room) {
                setUsers(prev => [...prev, user]);
            }
        });

        newSocket.on('userLeft', (channelName: string, userId: string) => {
            if (channelName === room) {
                setUsers(prev => prev.filter(user => user._id !== userId));
            }
        });

        newSocket.on('channelDeleted', (channelName: string) => {
            setRooms(prev => prev.filter(room => room !== channelName));
        });

        newSocket.on('userConnected', (user: User) => {
            setUsers(prev => [...prev, user]);
        });

        newSocket.on('userDisconnected', (userId: string) => {
            setUsers(prev => prev.filter(user => user._id !== userId));
        });

        newSocket.on('userList', (userList: User[]) => {
            setUsers(userList);
        });

        newSocket.on('currentUser', (user: User) => {
            setCurrentUser(user);
        });

        newSocket.on('privateMessage', (msg: Message) => {
            setMessages(prev => [...prev, { ...msg, type: 'private' }]);
        });

        newSocket.on('nicknameChanged', (newNickname: string) => {
            setCurrentUser(prev => prev ? { ...prev, username: newNickname } : null);
        });

        newSocket.on('roomChanged', (newRoom: string) => {
            setRoom(newRoom);
            setMessages([]);
        });

        newSocket.on('roomList', (rooms: Channel[]) => {
            setAvailableRooms(rooms);
        });

        newSocket.on('error', (error: string) => {
            setError(error);
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

    const deleteRoom = (roomName: string) => {
        if (socket) {
            socket.emit('deleteRoom', roomName);
        }
    };

    const handleModalSubmit = (
        e: React.FormEvent,
        action: () => void,
        closeModal: () => void
    ) => {
        e.preventDefault();
        action();
        closeModal();
    };

    const Modal: React.FC<{
        isOpen: boolean;
        onClose: () => void;
        children: React.ReactNode;
        title?: string;
        onSubmit?: (e: React.FormEvent) => void;
    }> = ({ isOpen, onClose, children, title, onSubmit }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-96" onClick={e => e.stopPropagation()}>
                    {title && <h2 className="text-xl mb-4 font-bold">{title}</h2>}
                    {onSubmit ? (
                        <form onSubmit={onSubmit}>{children}</form>
                    ) : (
                        children
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-4 bg-red-500 text-white px-4 py-2 rounded w-full"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen p-4">
            {/* Error Display */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* User and Room Management Buttons */}
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
                    onClick={() => {
                        socket?.emit('getRoomList');
                        setIsRoomListModalOpen(true);
                    }}
                    className="bg-yellow-500 text-white px-4 py-2 rounded"
                >
                    Room List
                </button>
                <button
                    onClick={() => {
                        socket?.emit('getAllUsers');
                        setIsUsersListModalOpen(true);
                    }}
                    className="bg-purple-500 text-white px-4 py-2 rounded"
                >
                    Users List
                </button>
                <button
                    onClick={() => {
                        socket?.emit('leaveRoom', room);
                        setRoom('general');
                    }}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                >
                    Quit Room
                </button>
            </div>

            {/* Nickname Change Modal */}
            <Modal
                isOpen={isNicknameModalOpen}
                onClose={() => setIsNicknameModalOpen(false)}
                title="Change Nickname"
                onSubmit={(e) => handleModalSubmit(
                    e,
                    () => {
                        if (socket && newNickname.trim()) {
                            socket.emit('setNickname', newNickname);
                            setNewNickname('');
                        }
                    },
                    () => setIsNicknameModalOpen(false)
                )}
            >
                <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="Enter new nickname"
                    className="w-full p-2 border rounded mb-4"
                    autoFocus
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded w-full"
                >
                    Save Nickname
                </button>
            </Modal>

            {/* Create Room Modal */}
            <Modal
                isOpen={isCreateRoomModalOpen}
                onClose={() => setIsCreateRoomModalOpen(false)}
                title="Create New Room"
                onSubmit={(e) => handleModalSubmit(
                    e,
                    () => {
                        if (socket && newRoomName.trim()) {
                            socket.emit('createRoom', newRoomName);
                            setNewRoomName('');
                        }
                    },
                    () => setIsCreateRoomModalOpen(false)
                )}
            >
                <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name"
                    className="w-full p-2 border rounded mb-4"
                    autoFocus
                />
                <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded w-full"
                >
                    Create Room
                </button>
            </Modal>

            {/* Room List Modal */}
            <Modal
                isOpen={isRoomListModalOpen}
                onClose={() => setIsRoomListModalOpen(false)}
                title="Available Rooms"
            >
                <input
                    type="text"
                    placeholder="Search rooms..."
                    onChange={(e) => {
                        const searchTerm = e.target.value;
                        socket?.emit('getRoomList', searchTerm);
                    }}
                    className="w-full p-2 border rounded mb-4"
                    autoFocus
                />
                <div className="max-h-64 overflow-y-auto">
                    {availableRooms.map((roomItem) => (
                        <div
                            key={roomItem.name}
                            className="flex justify-between items-center p-2 border-b"
                        >
                            <span>{roomItem.name}</span>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        socket?.emit('joinRoom', roomItem.name);
                                        setRoom(roomItem.name);
                                        setIsRoomListModalOpen(false);
                                    }}
                                    className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                                >
                                    Join
                                </button>
                                {roomItem.name !== 'general' && (
                                    <button
                                        onClick={() => deleteRoom(roomItem.name)}
                                        className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Users List Modal */}
            <Modal
                isOpen={isUsersListModalOpen}
                onClose={() => setIsUsersListModalOpen(false)}
                title="Connected Users"
            >
                <div className="max-h-64 overflow-y-auto">
                    {users.map((user) => (
                        <div
                            key={user._id}
                            className="flex justify-between items-center p-2 border-b"
                        >
                            <span>{user.username}</span>
                            <button
                                onClick={() => {
                                    setPrivateMessageRecipient(user.username);
                                    setIsUsersListModalOpen(false);
                                    setIsPrivateMessageModalOpen(true);
                                }}
                                className="bg-purple-500 text-white px-2 py-1 rounded text-sm"
                            >
                                Message
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Private Message Modal */}
            <Modal
                isOpen={isPrivateMessageModalOpen}
                onClose={() => setIsPrivateMessageModalOpen(false)}
                title="Send Private Message"
                onSubmit={(e) => handleModalSubmit(
                    e,
                    () => {
                        if (socket && privateMessageRecipient.trim() && privateMessageContent.trim()) {
                            socket.emit('privateMessage', {
                                to: privateMessageRecipient,
                                content: privateMessageContent,
                            });
                            setPrivateMessageContent('');
                        }
                    },
                    () => setIsPrivateMessageModalOpen(false)
                )}
            >
                <input
                    type="text"
                    value={privateMessageRecipient}
                    onChange={(e) => setPrivateMessageRecipient(e.target.value)}
                    placeholder="Recipient"
                    className="w-full p-2 border rounded mb-4"
                    autoFocus
                />
                <textarea
                    value={privateMessageContent}
                    onChange={(e) => setPrivateMessageContent(e.target.value)}
                    placeholder="Enter your private message"
                    className="w-full p-2 border rounded mb-4 h-24"
                />
                <button
                    type="submit"
                    className="bg-purple-500 text-white px-4 py-2 rounded w-full"
                >
                    Send Private Message
                </button>
            </Modal>

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

            {/* Users List Modal */}
            <Modal
                isOpen={isUsersListModalOpen}
                onClose={() => setIsUsersListModalOpen(false)}
                title="Connected Users"
            >
                <div className="max-h-64 overflow-y-auto">
                    {users.map((user) => (
                        <div
                            key={user._id}
                            className="flex justify-between items-center p-2 border-b"
                        >
                            <span>{user.username}</span>
                            <button
                                onClick={() => {
                                    setPrivateMessageRecipient(user.username);
                                    setIsUsersListModalOpen(false);
                                    setIsPrivateMessageModalOpen(true);
                                }}
                                className="bg-purple-500 text-white px-2 py-1 rounded text-sm"
                            >
                                Message
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Private Message Modal */}
            <Modal
                isOpen={isPrivateMessageModalOpen}
                onClose={() => setIsPrivateMessageModalOpen(false)}
                title="Send Private Message"
                onSubmit={(e) => handleModalSubmit(
                    e,
                    () => {
                        if (socket && privateMessageRecipient.trim() && privateMessageContent.trim()) {
                            socket.emit('privateMessage', {
                                to: privateMessageRecipient,
                                content: privateMessageContent,
                            });
                            setPrivateMessageRecipient('');
                            setPrivateMessageContent('');
                        }
                    },
                    () => setIsPrivateMessageModalOpen(false)
                )}
            >
                <input
                    type="text"
                    value={privateMessageRecipient}
                    onChange={(e) => setPrivateMessageRecipient(e.target.value)}
                    placeholder="Recipient"
                    className="w-full p-2 border rounded mb-4"
                    autoFocus
                />
                <textarea
                    value={privateMessageContent}
                    onChange={(e) => setPrivateMessageContent(e.target.value)}
                    placeholder="Enter your private message"
                    className="w-full p-2 border rounded mb-4 h-24"
                />
                <button
                    type="submit"
                    className="bg-purple-500 text-white px-4 py-2 rounded w-full"
                >
                    Send Private Message
                </button>
            </Modal>

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
                    <div
                        key={index}
                        className={`mb-2 ${msg.type === 'system' ? 'italic text-gray-500' : ''}`}
                    >
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