---

# 💬 IRC Client-Server Application

A modern IRC-style chat application with real-time messaging, channel management, and user presence tracking. **ONGOING**

---

## 🚀 Features

### **Server Features**
- ⚡ **Real-time Communication** using **Socket.IO**
- 🎚️ **Channel Management**
  - Create/Delete channels
  - Join/Leave channels
  - List active channels
- 👥 **User Management**
  - Unique nickname system
  - Online status tracking
  - User authentication with JWT
- 💌 **Messaging**
  - Channel messages with persistence
  - Private messages between users
  - Message history storage

### **Client Features**
- 🎨 **Modern UI** with responsive design
- 🔔 **Real-time Notifications**
  - New message alerts
  - User join/leave notifications
  - Channel updates
- 📱 **Responsive Design** works on all devices
- ⌨️ **IRC Commands Support**
  - `/nick <newname>` - Change nickname
  - `/join <channel>` - Join channel
  - `/msg <user> <message>` - Private message
  - `/list` - List channels

---

## 🛠️ Technology Stack

| Category       | Technologies                                                                 |
|----------------|------------------------------------------------------------------------------|
| **Backend**    | NestJS, MongoDB, Socket.IO, Mongoose, JWT Authentication                     |
| **Frontend**   | React, TypeScript, Socket.IO Client, TailwindCSS                             |

---

## 📦 Installation

### Prerequisites
- Node.js v18+
- MongoDB 6.0+
- npm 9+ or yarn 1.22+

```bash
# Clone repository
git clone https://github.com/your-username/irc-project.git
cd irc-project

# Install dependencies
cd server && npm install
cd ../client && npm install
```

---

## ⚙️ Configuration

### Backend Environment (`server/.env`)
```env
MONGODB_URI="mongodb://localhost:27017/irc"
PORT=3000
JWT_SECRET="your_jwt_secret_here"
```

### Frontend Environment (`client/.env`)
```env
VITE_API_URL="http://localhost:5173/"
```

---

## 🖥️ Running the Application

### Start Backend Server
```bash
cd server
npm run start
```

### Start Frontend Development Server
```bash
cd client
npm run dev
```

---

## 📚 API Documentation

### **Users Endpoints**
| Method | Endpoint          | Description                |
|--------|-------------------|----------------------------|
| POST   | `/auth/login`     | User login                 |
| POST   | `/auth/signup`    | User registration          |
| PATCH  | `/users/{id}`     | Update user (e.g., nickname) |

### **Channels Endpoints**
| Method | Endpoint          | Description                |
|--------|-------------------|----------------------------|
| POST   | `/channels`       | Create new channel         |
| DELETE | `/channels/{id}`  | Delete channel             |
| GET    | `/channels`       | List all channels          |

### **Messages Endpoints**
| Method | Endpoint          | Description                |
|--------|-------------------|----------------------------|
| POST   | `/messages`       | Send channel message       |
| POST   | `/messages/private` | Send private message      |
| GET    | `/messages/{channelId}` | Get message history   |

---

## 🔌 WebSocket Events

### **Commands**
| Command                     | Description                          |
|-----------------------------|--------------------------------------|
| `/nick <nickname>`          | Change your nickname                 |
| `/join <channel>`           | Join a channel                       |
| `/leave <channel>`          | Leave a channel                      |
| `/msg <user> <message>`     | Send private message                 |
| `/list`                     | List available channels              |

### **Events**
| Event               | Description                          |
|---------------------|--------------------------------------|
| `newMessage`        | New channel message received         |
| `newPrivateMessage` | New private message received         |
| `userJoined`        | User joined channel notification     |
| `userLeft`          | User left channel notification       |
| `channelCreated`    | New channel created notification     |
| `channelDeleted`    | Channel deleted notification         |

---

## 🚨 Troubleshooting

| Issue                        | Solution                              |
|------------------------------|---------------------------------------|
| CORS Errors                  | Verify `VITE_API_URL` in frontend `.env` |
| MongoDB Connection Issues    | Check if MongoDB service is running  |
| Nickname Conflicts           | Ensure nicknames are unique          |
| Socket Disconnects           | Verify network/firewall configurations |
| Missing Messages             | Check MongoDB connection and indexes |

---
