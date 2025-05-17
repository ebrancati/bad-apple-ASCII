const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath);

const CONFIG = {
    // Video settings
    videoPath:  path.join(__dirname, 'input/bad-apple.mp4'),
    outputPath: path.join(__dirname, 'output/bad-apple-ascii.json'),
    frameDir:   path.join(__dirname, 'tmp_frames'), // temporary directory for extracted frames

    // ASCII settings
    width: 80,                // width in characters
    height: 30,               // height in characters
    charset: 'WM@21ira;:,. ', // characters from darkest to lightest
    frameInterval: 3,         // process every n frames (increase to reduce file size)

    // Debug settings
    verbose: true,            // log detailed progress
    cleanup: true,            // clean up temporary files when done
    
    // Output settings
    compressOutput: false,    // whether to compress the output JSON
};

/**
 * Extracts frames from a video using ffmpeg
 * @param {string} videoPath Path to the video file
 * @param {string} outputDir Directory to save frames
 * @param {number} interval Take 1 frame every N frames
 * @returns {Promise<string[]>} Array of frame file paths
 */
async function extractFrames(videoPath, outputDir, interval) {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir))
        await mkdirAsync(outputDir, { recursive: true });

    // Get video info
    const videoInfo = await getVideoInfo(videoPath);
    log(`Video info: ${videoInfo.width}x${videoInfo.height}, ${videoInfo.duration}s, ${videoInfo.fps} fps`);

    // Calculate total frames
    const totalFrames = Math.floor(videoInfo.duration * videoInfo.fps);
    log(`Total frames: ~${totalFrames}, extracting 1 frame every ${interval} frames`);

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .outputOptions([
                `-vf fps=${videoInfo.fps / interval}`, // Extract 1 frame for every N frames
            ])
            .output(path.join(outputDir, 'frame-%04d.png'))
            .on('start', (commandLine) => {
                log(`Executing ffmpeg command: ${commandLine}`);
            })
            .on('progress', (progress) => {
                if (progress && progress.percent)
                    process.stdout.write(`Extracting frames: ${Math.floor(progress.percent)}%           \r`);
            })
            .on('end', () => {
                process.stdout.write('Extracting frames: 100%\n');
                // Get list of extracted frame files
                const files = fs.readdirSync(outputDir)
                    .filter(file => file.startsWith('frame-') && file.endsWith('.png'))
                    .sort()
                    .map(file => path.join(outputDir, file));

                log(`Extracted ${files.length} frames`);
                resolve(files);
            })
            .on('error', (err) => {
                reject(new Error(`Error extracting frames: ${err.message}`));
            })
            .run();
    });
}

/**
 * Get info about a video file
 * @param {string} videoPath Path to the video file
 * @returns {Promise<Object>} Video info (width, height, duration, fps)
 */
function getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {

            if (err) return reject(err);

            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (!videoStream)
                return reject(new Error('No video stream found'));

            // Parse frame
            let fps = 30; // default
            if (videoStream.r_frame_rate) {
                const parts = videoStream.r_frame_rate.split('/');

                if (parts.length === 2) fps = parseInt(parts[0]) / parseInt(parts[1]);
                else                    fps = parseFloat(videoStream.r_frame_rate);
            }

            resolve({
                width: videoStream.width,
                height: videoStream.height,
                duration: parseFloat(metadata.format.duration),
                fps: fps
            });
        });
    });
}

/**
 * Convert an image to ASCII art
 * @param {string} imagePath Path to the image file
 * @param {number} width Width in characters
 * @param {number} height Height in characters
 * @param {string} charset Characters from darkest to lightest
 * @returns {Promise<string[]>} Array of ASCII lines
 */
async function imageToAscii(imagePath, width, height, charset) {

    const image = await loadImage(imagePath);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert to ASCII
    const lines = [];
    for (let y = 0; y < height; y++) {
        let line = '';

        for (let x = 0; x < width; x++) {
            // Get pixel position (each pixel is 4 values: r,g,b,a)
            const pos = (y * width + x) * 4;

            const gray = data[pos]; // Use red channel
            
            // Invert the grayscale value (255 - gray) for the inverted effect
            const invertedGray = 255 - gray;

            // Map inverted grayscale to ASCII character
            const charIndex = Math.floor(invertedGray * charset.length / 256);
            line += charset[Math.min(charIndex, charset.length - 1)];
        }

        lines.push(line);
    }

    return lines;
}

/**
 * Utility function for logging when verbose mode is enabled
 * @param {string} message Message to log
 */
function log(message) {
    if (CONFIG.verbose) console.log(message);
}

/**
 * Main function to convert Bad Apple video to ASCII
 */
async function convertBadAppleToAscii() {
    if (!fs.existsSync(CONFIG.videoPath)) {
        console.error(`Error: Video file not found at ${CONFIG.videoPath}`);
        return;
    }

    // Ensure output directory exists
    const outputDir = path.dirname(CONFIG.outputPath);
    if (!fs.existsSync(outputDir))
        await mkdirAsync(outputDir, { recursive: true });

    const { width, height, charset, frameInterval } = CONFIG;
    
    // Prepare result object
    let result = { frames: [] };

    try {
        log('Starting Bad Apple to Inverted ASCII conversion');
        log(`Settings: ${width}x${height} characters, interval: ${frameInterval}`);
        log(`Charset (from dark to light): "${charset}"`);

        const framePaths = await extractFrames(CONFIG.videoPath, CONFIG.frameDir, frameInterval);

        log('Converting frames to ASCII...');
        
        // Convert each frame to ASCII
        for (let i = 0; i < framePaths.length; i++) {
            const framePath = framePaths[i];

            // Update progress
            if (i % 10 === 0 || i === framePaths.length - 1)
                process.stdout.write(`Converting: ${Math.floor((i / framePaths.length) * 100)}%\r`)

            // Convert frame to ASCII
            const asciiLines = await imageToAscii(framePath, width, height, charset);

            // Add to result
            result.frames.push({ content: asciiLines });
        }
        process.stdout.write('Converting: 100%\n');

        log(`\nConverted ${result.frames.length} frames to ASCII`);

        // Save result to file
        if (CONFIG.compressOutput) {
            // Compressed output (no whitespace)
            fs.writeFileSync(CONFIG.outputPath, JSON.stringify(result));
            log(`Saved compressed ASCII data to ${CONFIG.outputPath}`);
        } else {
            // Pretty output with indentation
            fs.writeFileSync(CONFIG.outputPath, JSON.stringify(result, null, 2));
            log(`Saved ASCII data to ${CONFIG.outputPath}`);
        }

        // Clean up temporary files if requested
        if (CONFIG.cleanup && fs.existsSync(CONFIG.frameDir)) {
            fs.rmSync(CONFIG.frameDir, { recursive: true, force: true });
            log('Cleaned up temporary files');
        }

        console.log('Conversion complete!');
    } catch (error) {
        console.error('Conversion failed:', error);
    }
}

convertBadAppleToAscii();