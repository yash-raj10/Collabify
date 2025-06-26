package socket

import (
	"fmt"
	"math/rand"
)

var randomNameList = []string{
	"🦊Fox", "🐼Panda", "🐶Dog", "🐱Cat", "🦁Lion", "🐯Tiger",
}

func GetRandomName() string {
	return randomNameList[rand.Intn(len(randomNameList))]
}

func GetRandomColor() string {
	hue := rand.Intn(360)
	return fmt.Sprintf("hsl(%d, 100%%, 50%%)", hue)
}