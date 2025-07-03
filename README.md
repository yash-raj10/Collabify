# Collabify 🚀

> **Real-time collaboration made simple** - A powerful platform for collaborative document editing and whiteboard drawing with cloud storage and multi-user support.

## 🌟 Features

### 📝 **Doc Online** - Collaborative Document Editor

- **Real-time editing** with live cursor tracking
- **Multi-user collaboration** with instant updates
- **Cloud storage** - Save and access documents from anywhere
- **Personal library** - Manage all your documents in one place
- **Cross-device sync** - Work seamlessly across all devices
- **Secure authentication** - Your documents are private and secure

### 🎨 **ExcaliDraw** - Collaborative Whiteboard _(Beta)_

- **Interactive whiteboard** for diagrams and sketches
- **Real-time collaboration** _(Beta feature)_
- **Multi-user cursors** - See where others are working
- **Cloud save** - Store drawings online
- **Personal drawings library** - Access your creations anywhere

### 🔐 **Authentication & Security**

- **Secure user registration** and login
- **JWT-based authentication**
- **Protected routes** and personal workspaces

### ☁️ **Cloud Features**

- **MongoDB integration** for reliable data storage
- **Cross-device synchronization**
- **Personal workspace** for each user

## 🛠️ Tech Stack

### Backend

- **Go** - High-performance backend server
- **Gin Framework** - Fast HTTP web framework
- **WebSockets** - Real-time bidirectional communication
- **MongoDB** - NoSQL database for document storage
- **JWT** - Secure authentication tokens

### Frontend

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **WebSocket Client** - Real-time communication

## 🚀 Getting Started

### Prerequisites

- **Go** 1.19+ installed
- **Node.js** 18+ installed
- **MongoDB** database (local or cloud)

### 🖥️ Backend Setup

1. **Navigate to server directory**

   ```bash
   cd server
   ```

2. **Install dependencies**

   ```bash
   go mod tidy
   ```

3. **Set up environment variables**
   Create a `.env` file in the server directory:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=8080
   ```

4. **Run the server**
   ```bash
   go run main.go
   ```
   Server will start on `http://localhost:8080`

### 🌐 Frontend Setup

1. **Navigate to client directory**

   ```bash
   cd client
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the client directory:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   NEXT_PUBLIC_WS_URL=ws://localhost:8080
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Frontend will start on `http://localhost:3000`

## 🎯 Usage

### Creating a New Session

1. **Visit the homepage**
2. **Choose your tool**: Doc Online or ExcaliDraw
3. **Click "Create New Session"**
4. **Start collaborating** - Share the URL with others

### Joining an Existing Session

1. **Get the session ID** from a collaborator
2. **Click "Join Existing Session"**
3. **Enter the session ID**
4. **Start collaborating** in real-time

### Managing Your Work

1. **Sign in** to access personal features
2. **View your saved documents** and drawings
3. **Access your work** from any device
4. **Organize your personal library**

### 📁 Project Structure

```
Collabify/
├── server/           # Go backend
│   ├── main.go      # Main server file
│   ├── auth/        # Authentication handlers
│   ├── docs/        # Document management
│   ├── drawings/    # Drawing management
│   └── socket/      # WebSocket handlers
└── client/          # Next.js frontend
    ├── app/         # Next.js App Router
    ├── components/  # React components
    ├── contexts/    # React contexts
    └── public/      # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Yash Raj**

- LinkedIn: [@yash-raj-in](https://www.linkedin.com/in/yash-raj-in/)
- Twitter: [@ya_shtwt](https://x.com/ya_shtwt)
- YouTube: [@yashraj.10](https://www.youtube.com/@yashraj.10)

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

<div align="center">
  <p>Built with ❤️ by <strong>Ya.sh</strong></p>
  <p><em>Real-time collaboration made simple</em></p>
</div>
