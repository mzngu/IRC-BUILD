import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
    content: string;
    sender: { username: string; _id: string };
    type?: 'system' | 'private' | 'normal';
    room?: string;
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

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        setSocket(newSocket);
        newSocket.emit('joinRoom', 'general');
        newSocket.emit('getPreviousMessages', 'general');

        newSocket.on('previousMessages', (prevMessages: Message[]) => {
            console.log('Received previous messages:', prevMessages);
            setMessages(prevMessages);
        });

        newSocket.on('channelCreated', (channel: Channel) => {
            console.log('Channel created:', channel);
            setRooms(prev => [...prev, channel.name]);
            setAvailableRooms(prev => [...prev, channel]);
        });

        newSocket.on('channelList', (channels: Channel[]) => {
            console.log('Received channel list:', channels);
            const roomNames = channels.map(c => c.name);
            if (!roomNames.includes('general')) {
                roomNames.unshift('general');
            }
            setRooms(roomNames);
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
        });

        newSocket.on('roomJoined', (typingUsers: string[]) => {
            console.log('Users typing:', typingUsers);
        });

        newSocket.on('roomList', (rooms: Channel[]) => {
            console.log('Received channel list:', rooms);
            setAvailableRooms(rooms);
        });

        newSocket.on('error', (error: string) => {
            console.error(error);
        });

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, []);


    useEffect(() => {
        if (socket) {
            socket.on('roomList', (channels: Channel[]) => {
                const roomNames = channels.map(channel => channel.name);
                if (!roomNames.includes('general')) {
                    roomNames.unshift('general');
                }
                setRooms(roomNames);
            });

            socket.emit('getRoomList');

            return () => {
                socket.off('roomList');
            };
        }
    }, [socket]);

    useEffect(() => {
        if (socket) {
            socket.on('roomChanged', (newRoom: string) => {
                setRoom(newRoom);
            });

            return () => {
                socket.off('roomChanged');
            };
        }
    }, [socket]);

    useEffect(() => {
        if (socket) {
            const handleMessage = (msg: Message) => {
                if (msg.room === room || msg.type === 'private') {
                    setMessages(prev => [...prev, msg]);
                }
            };

            socket.on('message', handleMessage);

            return () => {
                socket.off('message', handleMessage);
            };
        }
    }, [socket, room]);

    const sendMessage = () => {
        if (!socket || !message.trim()) return;

        socket.emit('message', {
            room,
            content: message
        });
        setMessage('');
    };

    const quitChannel = () => {
        if (socket && room !== 'general') {
            socket.emit('quitRoom', room);
            setRoom('general');
        }
    };

    const changeNickname = (e: React.FormEvent) => {
        e.preventDefault();
        if (socket && newNickname.trim()) {
            socket.emit('setNickname', newNickname);
            setIsNicknameModalOpen(false);
            setNewNickname('');
        }
    };

    const createRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (socket && newRoomName.trim()) {
            socket.emit('createRoom', newRoomName);
            setIsCreateRoomModalOpen(false);
            setNewRoomName('');
        }
    };

    const deleteRoom = (roomName: string) => {
        if (socket) {
            socket.emit('deleteRoom', roomName);
        }
    };

    const sendPrivateMessage = (e: React.FormEvent) => {
        e.preventDefault();
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

    const handleRoomChange = (newRoom: string) => {
        if (socket && newRoom !== room) {
            setMessages([]);
            socket.emit('quitRoom', room);
            socket.emit('joinRoom', newRoom);
            setRoom(newRoom);

            socket.emit('getPreviousMessages', newRoom);
            socket.emit('getRoomList');
            socket.emit('getUserList');
        }
    };

    const Modal: React.FC<{
        isOpen: boolean,
        onClose: () => void,
        children: React.ReactNode,
        title?: string
    }> = ({ isOpen, onClose, children, title }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                    {title && <h2 className="text-xl mb-4 font-bold">{title}</h2>}
                    {children}
                    <button
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
                    onClick={quitChannel}
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
            >
                <form onSubmit={changeNickname}>
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
                </form>
            </Modal>

            {/* Create Room Modal */}
            <Modal
                isOpen={isCreateRoomModalOpen}
                onClose={() => setIsCreateRoomModalOpen(false)}
                title="Create New Room"
            >
                <form onSubmit={createRoom}>
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
                </form>
            </Modal>

            {/* Room List Modal */}
            <Modal
                isOpen={isRoomListModalOpen}
                onClose={() => setIsRoomListModalOpen(false)}
                title="Available Rooms"
            >
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
                {/* Add the Quit Room button here */}
                <button
                    onClick={() => {
                        quitChannel();
                        setIsRoomListModalOpen(false);
                    }}
                    className="mt-4 bg-red-500 text-white px-4 py-2 rounded w-full"
                >
                    Quit Current Room
                </button>
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
            >
                <form onSubmit={sendPrivateMessage}>
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
                </form>
            </Modal>

            {/* Room Selection */}
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Current Room: {room}
                </label>
                <div className="flex space-x-2">
                    <select
                        value={room}
                        onChange={(e) => handleRoomChange(e.target.value)}
                        className="shadow border rounded w-full py-2 px-3"
                    >
                        {rooms.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            socket?.emit('getRoomList');  // Refresh room list when clicking button
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Refresh Rooms
                    </button>
                    <button
                        onClick={quitChannel}
                        className="bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Quit Room
                    </button>
                </div>
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