package socket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type ContentData struct {
	Content  string   `json:"content"`
	Position Position `json:"position"`
	UserData UserData `json:"userData"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type UserData struct {
	UserId    string `json:"userId"`
	UserName  string `json:"userName"`
	UserColor string `json:"userColor"`
}

var JWT_KEY   string 

func init(){
	_ = godotenv.Load()
	JWT_KEY = os.Getenv("JWT_KEY")
}

var (
	jwtSecret = []byte(JWT_KEY) // should match auth package
	animalEmojis = []string{"🦁", "🐮", "🐯", "🐰", "🐻", "🐼", "🐨", "🐸", "🐷", "🐵", "🦊", "🐺", "🐴", "🦄", "🐧", "🐦", "🦅", "🦆", "🐔", "🐢"}
	usersCollection *mongo.Collection // Will be set from main package
)

// allows main package to set the users collection
func SetUsersCollection(collection *mongo.Collection) {
	usersCollection = collection
}

// user struct for database queries
type User struct {
	ID    interface{} `bson:"_id,omitempty"`
	Email string      `bson:"email"`
	Name  string      `bson:"name"`
}

// extract user info from JWT and get name from DB
func extractUserFromToken(tokenString string) (string, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return "", "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", fmt.Errorf("invalid token claims")
	}

	userEmail, ok := claims["user_email"].(string)
	if !ok {
		return "", "", fmt.Errorf("invalid user email in token")
	}

	// get user name from database
	var user User
	if usersCollection != nil {
		err := usersCollection.FindOne(context.Background(), bson.M{"email": userEmail}).Decode(&user)
		if err != nil {
			log.Printf("Could not find user in database: %v", err)
			return userEmail, "Unknown User", nil
		}
		return userEmail, user.Name, nil
	}

	return userEmail, "Unknown User", nil
}

// random animal emoji
func getRandomAnimalEmoji() string {
	return animalEmojis[rand.Intn(len(animalEmojis))]
}

type ChatMessage struct {
	Data interface{} `json:"data"` 
	Type string      `json:"type"` // "content" or "user-data", "user-added", etc.
}

type Client struct{
	Conn *websocket.Conn
	Send chan []byte  
	ID string
	SessionID string // add session ID to client
	Data map[string]UserData
}

// this manages websocket connections for a specific session
type WebSocketManager struct {
	Clients map[*Client]bool
	Broadcast chan []byte // channel for broadcasting messages to all clients
	Register chan *Client
	Unregister chan *Client
	Mutex sync.RWMutex
	SessionID string // Add session ID to manager
}

// global session managers
var (
	sessionManagers = make(map[string]*WebSocketManager)
	sessionMutex    sync.RWMutex
)

func NewWebSocketManager(sessionID string) *WebSocketManager {
	return &WebSocketManager{
		Clients: make(map[*Client]bool),
		Broadcast: make(chan []byte), // buffered channel for broadcasting messages
		Register: make(chan *Client),
		Unregister: make(chan *Client),
		SessionID: sessionID,
	}
}

// Get or create a session manager
func GetOrCreateSessionManager(sessionID string) *WebSocketManager {
	sessionMutex.Lock()
	defer sessionMutex.Unlock()
	
	if manager, exists := sessionManagers[sessionID]; exists {
		return manager
	}
	
	manager := NewWebSocketManager(sessionID)
	sessionManagers[sessionID] = manager
	go manager.Run()
	log.Printf("Created new session manager for session: %s", sessionID)
	return manager
}

func(manager *WebSocketManager) Run(){
	for{
		select{
		case client := <-manager.Register:
			manager.Mutex.Lock()
			manager.Clients[client] = true
			manager.Mutex.Unlock()

		case client := <- manager.Unregister:
			manager.Mutex.Lock()
			if _, ok := manager.Clients[client]; ok {
				delete(manager.Clients, client)
				close(client.Send)

				// notify other clients about the disconnection
				go manager.HandleDeleteUser(client)
				
				// cleanup empty session managers
				if len(manager.Clients) == 0 {
					go cleanupEmptySession(manager.SessionID)
				}
			}
			manager.Mutex.Unlock()
			log.Printf("Client disconnected from session %s: %s", manager.SessionID, client.ID)	

		case message := <- manager.Broadcast:
			manager.Mutex.RLock()
			log.Printf("Broadcasting message to %d clients", len(manager.Clients))
			for client := range manager.Clients{
				select {
				case client.Send <- message:

				default:
					log.Printf("Client %s send channel is full, removing client", client.ID)
					close(client.Send)
					delete(manager.Clients, client)
				}
			}
			manager.Mutex.RUnlock()
		}
	}
}

func HandleWBConnections(w http.ResponseWriter, r *http.Request) {
	// extract session id
	sessionID := r.URL.Query().Get("session")
	if sessionID == "" {
		http.Error(w, "Session ID required", http.StatusBadRequest)
		return
	}

	var tokenString string
	
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		tokenString = strings.TrimPrefix(authHeader, "Bearer ")
	} else {
		tokenString = r.URL.Query().Get("token")
	}

	if tokenString == "" {
		http.Error(w, "Authorization token required", http.StatusUnauthorized)
		return
	}

	// get user information from token
	userEmail, userName, err := extractUserFromToken(tokenString)
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Always allow WebSocket connection
	manager := GetOrCreateSessionManager(sessionID)

	// making Upgrader
	upgarder := websocket.Upgrader{
		ReadBufferSize: 1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			// allow all origins 
			return true 
		},
	}

	// making connection
	conn , err := upgarder.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not upgrade connection", http.StatusInternalServerError)
		return
	}

	emoji := getRandomAnimalEmoji()
	data := map[string]UserData{
		"userData": {
			UserId:    userEmail,
			UserName:  userName + " " + emoji,
			UserColor: GetRandomColor(),
		},
	}

	client := &Client{
		Conn: conn,
		Send: make(chan []byte, 512), 
		ID: userEmail, 
		SessionID: sessionID,
		Data: data,
	}

  	// will hit case client := <-manager.Register: in Run() func 
	manager.Register <- client

	go manager.HandleClientRead(client)
	go manager.HandleClientWrite(client)

	// Handle user data after adding client to the map
	go manager.HandleUserData(client)
	
	log.Printf("User %s connected to session %s", userName, sessionID)
}

func (manager *WebSocketManager) HandleDeleteUser(client *Client) {

	message := ChatMessage{
		Data: client.Data,
		Type: "user-removed",
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("marshal user removed error: %v", err)
		return
	}

	manager.Broadcast <- jsonData
}

func(manager *WebSocketManager) HandleUserData(client *Client) {
	// 1. send user data to itself first
	selfMessage := ChatMessage{
		Data: client.Data,
		Type: "user-data",
	}

	jsonData, err := json.Marshal(selfMessage)
	if err != nil {
		log.Printf("marshal error: %v", err)
		return
	}

	client.Send <- jsonData
	log.Printf("Sent user data to client %s", client.ID)

	// 2. send existing users to the new client
	manager.Mutex.RLock()
	for existingClient := range manager.Clients {
		if existingClient.ID == client.ID { continue } // avoid sending to itself

		existingUserMeg := ChatMessage{
			Data: existingClient.Data,
			Type: "user-added",
		}

		existingUserData , err := json.Marshal(existingUserMeg)
		if err != nil {
			log.Printf("marshal existingUserData: %v", err)
			continue
		}

		//send directly to the client 
		client.Send <- existingUserData
		log.Printf("Sent existing user data to new client %s: %v", client.ID, existingClient.ID)
	}
	manager.Mutex.RUnlock()

	//3. announce new client to all other clinets
	newUserMessage := ChatMessage{
		Data: client.Data,
		Type: "user-added",
	}
	newUserData, err := json.Marshal(newUserMessage)
	if err != nil {
		log.Printf("error marshelling new user announcement: %v", err)
		return
	}


	// broadcast to all clients
	manager.Broadcast <- newUserData
	log.Printf("Announced new user %s to all clients", client.ID)
}

func(manager *WebSocketManager) HandleClientRead(client *Client) {
	defer func(){
		client.Conn.Close()
		manager.Unregister <- client
	}()

	for{
		_, message , err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("websocket read error: %v", err)
			}
			break 
		}

		// check if there are other clients before processing message
		manager.Mutex.RLock()
		clientCount := len(manager.Clients)
		manager.Mutex.RUnlock()

		// only process and broadcast if there are multiple clients
		if clientCount <= 1 {
			continue // skip processing if user is alone
		}

		// 1st, parse just the type to determine message structure
		var typeOnly struct {
			Type string `json:"type"`
		}
		
		err = json.Unmarshal(message, &typeOnly)
		if err != nil {
			log.Printf("unmarshal type error: %v", err)
			continue 
		}

		if typeOnly.Type == "content" {
			// handle content messages with ContentData structure
			var contentMsg struct {
				Type string      `json:"type"`
				Data ContentData `json:"data"`
			}
			
			err = json.Unmarshal(message, &contentMsg)
			if err != nil {
				log.Printf("unmarshal content error: %v", err)
				continue 
			}

			log.Printf("Received content from %s (user: %s): content length=%d, position=(%f,%f)", 
				client.ID, contentMsg.Data.UserData.UserId, len(contentMsg.Data.Content), 
				contentMsg.Data.Position.X, contentMsg.Data.Position.Y)

			// broadcast the original message
			log.Printf("Broadcasting content message from %s", client.ID)
			manager.Broadcast <- message
		} else {
			// handle other message types (user-data, user-added, etc.)
			log.Printf("Received %s message from %s", typeOnly.Type, client.ID)
			manager.Broadcast <- message
		}
	}
}

func(manager *WebSocketManager) HandleClientWrite(client *Client) {
	defer func() {
		client.Conn.Close()
	}()

	for message := range client.Send {
		err := client.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Printf("websocket write error: %v", err)
			return
		}
	}
}

// cleanup empty session managers
func cleanupEmptySession(sessionID string) {
	time.Sleep(5 * time.Second) // Wait a bit to avoid premature cleanup
	
	sessionMutex.Lock()
	defer sessionMutex.Unlock()
	
	if manager, exists := sessionManagers[sessionID]; exists {
		manager.Mutex.RLock()
		clientCount := len(manager.Clients)
		manager.Mutex.RUnlock()
		
		if clientCount == 0 {
			delete(sessionManagers, sessionID)
			log.Printf("Cleaned up empty session manager: %s", sessionID)
		}
	}
}