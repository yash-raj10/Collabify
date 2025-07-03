package main

import (
	"collabify-backend/auth"
	"collabify-backend/docs"
	"collabify-backend/drawings"
	"collabify-backend/socket"
	"log"

	"github.com/gin-gonic/gin"
)

// cors middleware
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "https://collabify.c.rachitkhurana.tech")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	// init MongoDB
	if err := auth.InitMongoDB(); err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	// get users collection and pass it to socket package
	usersCollection := auth.GetUsersCollection()
	socket.SetUsersCollection(usersCollection)

	// 	setup collections and setup docs/draws collection
	client := usersCollection.Database().Client()
	docsCollection := client.Database("collabify").Collection("documents")
	drawingsCollection := client.Database("collabify").Collection("drawings")
	docs.SetDocsCollection(docsCollection)
	drawings.SetDrawingsCollection(drawingsCollection)

	r := gin.Default()

	r.Use(CORSMiddleware())

	// r.LoadHTMLFiles("chat.html")

	// WebSocket route 
	r.GET("/ws", func(c *gin.Context) {
		socket.HandleWBConnections(c.Writer, c.Request)
	})

	// Chat route
	// r.GET("/chat", func(c *gin.Context) {
	// 	c.HTML(http.StatusOK, "chat.html", gin.H{
	// 		"title": "Chat Room"})
	// })

	// auth routes
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/register", auth.Register)
		authGroup.POST("/login", auth.Login)
	}

	api := r.Group("/api")
	api.Use(auth.AuthMiddleware())
	{
		api.GET("/profile", auth.GetProfile)
		
		// docs routes
		api.POST("/documents", docs.SaveDocument)
		api.GET("/documents", docs.GetUserDocuments)
		api.GET("/documents/:docId", docs.GetDocument)
		api.DELETE("/documents/:docId", docs.DeleteDocument)

		// drawings routes
		api.POST("/drawings", drawings.SaveDrawing)
		api.GET("/drawings", drawings.GetUserDrawings)
		api.GET("/drawings/:drawingId", drawings.GetDrawing)
		api.DELETE("/drawings/:drawingId", drawings.DeleteDrawing)
	}

	r.Run(":8080")
}
