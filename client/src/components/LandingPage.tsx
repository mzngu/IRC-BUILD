import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000'); // Adjust the URL as needed

const LandingPage: React.FC = () => {
    const [nickname, setNickname] = useState<string>('');
    const [channels, setChannels] = useState<string[]>([]);
    const [currentChannel, setCurrentChannel] = useState<string>('');
    const [users, setUsers] = useState<string[]>([]);
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState<string>('');

    useEffect(() => {
        socket.on('message', (message: string) => {
            setMessages((prevMessages) => [...prevMessages, message]);
        });

        socket.on('channels', (channels: string[]) => {
            setChannels(channels);
        });

        socket.on('users', (users: string[]) => {
            setUsers(users);
        });

        return () => {
            socket.off('message');
            socket.off('channels');
            socket.off('users');
        };
    }, []);

    const handleCommand = (command: string) => {
        const parts = command.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);

        switch (cmd) {
            case '/nick':
                setNickname(args[0]);
                socket.emit('nick', args[0]);
                break;
            case '/list':
                socket.emit('list', args[0] || '');
                break;
            case '/create':
                socket.emit('create', args[0]);
                break;
            case '/delete':
                socket.emit('delete', args[0]);
                break;
            case '/join':
                setCurrentChannel(args[0]);
                socket.emit('join', args[0]);
                break;
            case '/quit':
                setCurrentChannel('');
                socket.emit('quit', args[0]);
                break;
            case '/users':
                socket.emit('users', currentChannel);
                break;
            case '/msg':
                socket.emit('private_message', { to: args[0], message: args.slice(1).join(' ') });
                break;
            default:
                socket.emit('message', { channel: currentChannel, message: command });
                break;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleCommand(input);
        setInput('');
    };

    return (
        <div>
            <header className="landing-page-header">
                <h1>Welcome to IRC-BUILD</h1>
            </header>
            <main className="landing-page-main">
                <section className="chat-section">
                    <div className="chat-window">
                        {messages.map((msg, index) => (
                            <div key={index}>{msg}</div>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Enter command or message"
                        />
                        <button type="submit">Send</button>
                    </form>
                </section>
            </main>
            <footer className="landing-page-footer bg-gray-800 text-white p-4 text-center">
                <p>&copy; 2023 IRC-BUILD. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;