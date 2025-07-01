package docs

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Document struct {
	ID          interface{} `json:"id" bson:"_id,omitempty"`
	DocID       string      `json:"docId" bson:"docId"`
	Content     string      `json:"content" bson:"content"`
	CreatedBy   string      `json:"createdBy" bson:"createdBy"`
	CreatedAt   time.Time   `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt" bson:"updatedAt"`
}

// SaveDocumentRequest represents the request body for saving a document
type SaveDocumentRequest struct {
	DocID   string `json:"docId" binding:"required"`
	Content string `json:"content" binding:"required"`
}

var docsCollection *mongo.Collection

// SetDocsCollection sets the documents collection
func SetDocsCollection(collection *mongo.Collection) {
	docsCollection = collection
}

// saves a new document or updates existing one
func SaveDocument(c *gin.Context) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req SaveDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// check if document already exists for this user and docId
	var existingDoc Document
	filter := bson.M{
		"docId":     req.DocID,
		"createdBy": userEmail,
	}

	err := docsCollection.FindOne(context.Background(), filter).Decode(&existingDoc)
	
	if err == nil {
		// doc exists, update it
		update := bson.M{
			"$set": bson.M{
				"content":   req.Content,
				"updatedAt": time.Now(),
			},
		}

		_, err := docsCollection.UpdateOne(context.Background(), filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update document"})
			return
		}

		// Return updated document
		existingDoc.Content = req.Content
		existingDoc.UpdatedAt = time.Now()
		c.JSON(http.StatusOK, gin.H{
			"message": "Document updated successfully",
			"document": existingDoc,
		})
		return
	}

	// doc doesn't exist, create new one
	doc := Document{
		DocID:     req.DocID,
		Content:   req.Content,
		CreatedBy: userEmail.(string),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result, err := docsCollection.InsertOne(context.Background(), doc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document"})
		return
	}

	doc.ID = result.InsertedID
	c.JSON(http.StatusCreated, gin.H{
		"message": "Document saved successfully",
		"document": doc,
	})
}

// retrieves a specific document
func GetDocument(c *gin.Context) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	docID := c.Param("docId")
	if docID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Document ID is required"})
		return
	}

	var doc Document
	filter := bson.M{
		"docId":     docID,
		"createdBy": userEmail,
	}

	err := docsCollection.FindOne(context.Background(), filter).Decode(&doc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve document"})
		return
	}

	c.JSON(http.StatusOK, doc)
}

// retrieves all documents for the current user
func GetUserDocuments(c *gin.Context) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	filter := bson.M{"createdBy": userEmail}
	cursor, err := docsCollection.Find(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve documents"})
		return
	}
	defer cursor.Close(context.Background())

	var documents []Document
	if err = cursor.All(context.Background(), &documents); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode documents"})
		return
	}

	if documents == nil {
		documents = []Document{}
	}

	c.JSON(http.StatusOK, gin.H{
		"documents": documents,
	})
}

func DeleteDocument(c *gin.Context) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	docID := c.Param("docId")
	if docID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Document ID is required"})
		return
	}

	filter := bson.M{
		"docId":     docID,
		"createdBy": userEmail,
	}

	result, err := docsCollection.DeleteOne(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete document"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Document deleted successfully",
	})
}
