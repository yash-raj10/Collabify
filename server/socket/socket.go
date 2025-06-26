package socket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
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

type ChatMessage struct {
	Data interface{} `json:"data"` // Can handle both ContentData and map[string]map[string]string
	Type string      `json:"type"` // "content" or "user-data", "user-added", etc.
}

type Client struct{
	Conn *websocket.Conn
	Send chan []byte  // buffered channel for sending messages
	ID string
	Data map[string]UserData
}

// this manages websocket connections
type WebSocketManager struct {
	Clients map[*Client]bool
	Broadcast chan []byte // channel for broadcasting messages to all clients
	Register chan *Client
	Unregister chan *Client
	Mutex sync.RWMutex
}

func NewWebSocketManager() *WebSocketManager {
	return &WebSocketManager{
		Clients: make(map[*Client]bool),
		Broadcast: make(chan []byte), // buffered channel for broadcasting messages
		Register: make(chan *Client),
		Unregister: make(chan *Client),
	}
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

				// Notify other clients about the disconnection
				go manager.HandleDeleteUser(client)
			}
			manager.Mutex.Unlock()
			log.Printf("Client disconnected: %s", client.ID)	

		case message := <- manager.Broadcast:
			manager.Mutex.RLock()
			log.Printf("Broadcasting message to %d clients", len(manager.Clients))
			for client := range manager.Clients{
				select {
				case client.Send <- message:
					// Message sent successfully
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

func(manager *WebSocketManager) HandleWBConnections(w http.ResponseWriter, r *http.Request) {
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

	data := map[string]UserData{
		"userData": {
			UserId:    r.RemoteAddr,
			UserName:  GetRandomName(),
			UserColor: GetRandomColor(),
		},
	}

	client := &Client{
		Conn: conn,
		Send: make(chan []byte, 512), // Increased buffer for better handling
		ID: r.RemoteAddr, // using remote address as id 
		Data: data,
	}

  	// will hit case client := <-manager.Register: in Run() func 
	manager.Register <- client

	go manager.HandleClientRead(client)
	go manager.HandleClientWrite(client)

	// Handle user data after adding client to the map
	go manager.HandleUserData(client)
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


	// Broadcast to all clients
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
			break // exit the loop on error
		}

		// First, parse just the type to determine message structure
		var typeOnly struct {
			Type string `json:"type"`
		}
		
		err = json.Unmarshal(message, &typeOnly)
		if err != nil {
			log.Printf("unmarshal type error: %v", err)
			continue 
		}

		if typeOnly.Type == "content" {
			// Handle content messages with ContentData structure
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

			// Broadcast the original message
			log.Printf("Broadcasting content message from %s", client.ID)
			manager.Broadcast <- message
		} else {
			// Handle other message types (user-data, user-added, etc.)
			log.Printf("Received %s message from %s", typeOnly.Type, client.ID)
			manager.Broadcast <- message
		}
	}
}

func(manager *WebSocketManager) HandleClientWrite(client *Client) {
	defer func() {
		client.Conn.Close()
	}()

	for {
		select{
			case message, ok := <-client.Send:
				if !ok {
					client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}

				// Send each message separately to avoid JSON concatenation issues
				err := client.Conn.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("websocket write error: %v", err)
					return
				}
		}
	}
}