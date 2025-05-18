# Bad Apple ASCII Convertor & Player

This project consists of two main parts:

1. **mp4-to-ascii**: A Node.js converter that transforms an MP4 video into a sequence of ASCII frames saved in JSON format
2. **ascii-player**: A Java player that reads the generated JSON file and plays the ASCII animation in the console

## Requirements

### For the converter (mp4-to-ascii)
- Node.js (v18 or higher)
- NPM
- "Bad Apple!!" video (or any other video you want to convert)

### For the player (ascii-player)
- Java 21
- Maven

## Configuration

### Customize the converter

You can modify the conversion settings in the `mp4-to-ascii/badAppleToAscii.js` file:

```javascript
const CONFIG = {
    // Video settings
    videoPath:  path.join(__dirname, 'input/bad-apple.mp4'),  // Change video path
    outputPath: path.join(__dirname, 'output/bad-apple-ascii.json'),  // Change output path
    
    // ASCII settings
    width: 80,                // Width in characters
    height: 30,               // Height in characters
    charset: 'WM@21ira;:,. ', // Characters from darkest to lightest
    frameInterval: 3,         // Process every n frames (increase to reduce file size)
    
    // Debug settings
    verbose: true,            // Detailed logging
    cleanup: true,            // Clean up temporary files
    
    // Output settings
    compressOutput: false,    // Compress the JSON output
};
```

### Customize the player

You can modify the frame rate and JSON file name in the `ascii-player/src/main/java/com/vincentbrancati/AsciiPlayer.java` file:

```java
private static final int DEFAULT_FPS = 30; // Modify to change playback speed
private static final String JSON_RESOURCE_NAME = "bad-apple-ascii.json"; // Modify to change file
```

## Credits

Bad Apple!! video: https://www.youtube.com/watch?v=FtutLA63Cp8
