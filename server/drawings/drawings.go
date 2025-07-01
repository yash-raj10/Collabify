package drawings

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Drawing struct {
	ID          interface{} `json:"id" bson:"_id,omitempty"`
	DrawingID   string      `json:"drawingId" bson:"drawingId"`
	Content     string      `json:"content" bson:"content"`
	CreatedBy   string      `json:"createdBy" bson:"createdBy"`
	CreatedAt   time.Time   `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt" bson:"updatedAt"`
}

// represents the request body for saving a drawing
type SaveDrawingRequest struct {
	DrawingID string `json:"drawingId" binding:"required"`
	Content   string `json:"content" binding:"required"`
}

var drawingsCollection *mongo.Collection

//  sets the drawings collection
func SetDrawingsCollection(collection *mongo.Collection) {
	drawingsCollection = collection
}

// saves a new drawing or updates existing one
func SaveDrawing(c *gin.Context) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var req SaveDrawingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// check if drawing already exists for this user and drawingId
	var existingDrawing Drawing
	filter := bson.M{
		"drawingId": req.DrawingID,
		"createdBy": userEmail,
	}

	err := drawingsCollection.FindOne(context.Background(), filter).Decode(&existingDrawing)
	
	if err == nil {
		// exists, update it
		update := bson.M{
			"$set": bson.M{
				"content":   req.Content,
				"updatedAt": time.Now(),
			},
		}

		_, err := drawingsCollection.UpdateOne(context.Background(), filter, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update drawing"})
			return
		}

		// updated drawing
		existingDrawing.Content = req.Content
		existingDrawing.UpdatedAt = time.Now()
		c.JSON(http.StatusOK, gin.H{
			"message": "Drawing updated successfully",
			"drawing": existingDrawing,
		})
		return
	}

	// doesn't exist, create new one
	drawing := Drawing{
		DrawingID: req.DrawingID,
		Content:   req.Content,
		CreatedBy: userEmail.(string),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result, err := drawingsCollection.InsertOne(context.Background(), drawing)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save drawing"})
		return
	}

	drawing.ID = result.InsertedID
	c.JSON(http.StatusCreated, gin.H{
		"message": "Drawing saved successfully",
		"drawing": drawing,
	})
}

// retrieves a specific drawing
func GetDrawing(c *gin.Context) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	drawingID := c.Param("drawingId")
	if drawingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Drawing ID is required"})
		return
	}

	var drawing Drawing
	filter := bson.M{
		"drawingId": drawingID,
		"createdBy": userEmail,
	}

	err := drawingsCollection.FindOne(context.Background(), filter).Decode(&drawing)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Drawing not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve drawing"})
		return
	}

	c.JSON(http.StatusOK, drawing)
}

// retrieves all drawings for the current user
func GetUserDrawings(c *gin.Context) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	filter := bson.M{"createdBy": userEmail}
	cursor, err := drawingsCollection.Find(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve drawings"})
		return
	}
	defer cursor.Close(context.Background())

	var drawings []Drawing
	if err = cursor.All(context.Background(), &drawings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode drawings"})
		return
	}

	if drawings == nil {
		drawings = []Drawing{}
	}

	c.JSON(http.StatusOK, gin.H{
		"drawings": drawings,
	})
}

func DeleteDrawing(c *gin.Context) {
	userEmail, exists := c.Get("user_email")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	drawingID := c.Param("drawingId")
	if drawingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Drawing ID is required"})
		return
	}

	filter := bson.M{
		"drawingId": drawingID,
		"createdBy": userEmail,
	}

	result, err := drawingsCollection.DeleteOne(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete drawing"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Drawing not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Drawing deleted successfully",
	})
}
