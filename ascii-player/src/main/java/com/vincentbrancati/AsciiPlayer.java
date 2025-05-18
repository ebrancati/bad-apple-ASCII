package com.vincentbrancati;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class AsciiPlayer
{
    private static final int DEFAULT_FPS = 30; // Reduced FPS for better fluidity
    private static final String JSON_RESOURCE_NAME = "bad-apple-ascii.json";

    private String jsonFilePath;

    // Store ASCII frames
    private List<List<String>> frames = new ArrayList<>();

    // Random generator for line numbers
    private final Random random = new Random();

    /**
     * Constructor - loads ASCII data
     */
    public AsciiPlayer()
    {
        try
        {
            // Get the resource path
            jsonFilePath = resolveResourcePath(JSON_RESOURCE_NAME);
            parseJsonResource();
        }
        catch (Exception e)
        {
            System.err.println("Error loading frames: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    /**
     * Resolves the path of a resource in the resources directory
     */
    private String resolveResourcePath(String resourceName)
    {
        // Method 1: Try to get the resource from the classloader
        URL resourceUrl = getClass().getClassLoader().getResource(resourceName);
        if (resourceUrl != null)
        {
            try
            {
                // Convert URL to file path
                return new File(resourceUrl.toURI()).getAbsolutePath();
            }
            catch (URISyntaxException e)
            {
                // Fallback to the path as a string
                return resourceUrl.getPath();
            }
        }

        // Method 2: Use the path relative to the project's resources directory
        String projectDir = System.getProperty("user.dir");
        String resourcePath = projectDir + File.separator +
                "src" + File.separator +
                "main" + File.separator +
                "resources" + File.separator +
                resourceName;

        File resourceFile = new File(resourcePath);
        if (resourceFile.exists())
        {
            return resourceFile.getAbsolutePath();
        }

        // If we're here, the resource was not found
        System.err.println("Resource not found");
        return resourceName;
    }

    /**
     * Parse the JSON file using Jackson
     */
    private void parseJsonResource() throws IOException
    {
        System.out.println("Loading ASCII data from: " + jsonFilePath);

        try
        {
            // Create a Jackson ObjectMapper to parse JSON
            ObjectMapper mapper = new ObjectMapper();

            // Read the JSON file into a tree structure
            JsonNode rootNode = mapper.readTree(new File(jsonFilePath));

            // Get the frames array
            JsonNode framesArray = rootNode.get("frames");
            if (framesArray == null || !framesArray.isArray())
            {
                throw new IOException("Invalid JSON format: 'frames' array not found");
            }

            // Process each frame in the array
            for (JsonNode frameNode : framesArray)
            {
                // Get the content array within this frame
                JsonNode contentArray = frameNode.get("content");

                if (contentArray != null && contentArray.isArray())
                {
                    List<String> frameLines = new ArrayList<>();

                    // Add each line of content to the frame
                    for (JsonNode lineNode : contentArray)
                    {
                        frameLines.add(lineNode.asText());
                    }

                    // Add the complete frame to our frames list
                    if (!frameLines.isEmpty())
                    {
                        frames.add(frameLines);
                    }
                }
            }

            System.out.println("Loaded " + frames.size() + " frames using Jackson");
        }
        catch (Exception e)
        {
            System.err.println("Error parsing JSON with Jackson: " + e.getMessage());
            e.printStackTrace();
            throw new IOException("Failed to parse JSON", e);
        }
    }

    private void clearConsole()
    {
        for (int i = 0; i < 100; i++)
        {
            System.err.println();
        }
    }

    /**
     * Pre-generate a frame with all line numbers
     */
    private String generateFrameOutput(List<String> frameLines)
    {
        StringBuilder sb = new StringBuilder();

        // Add exception header
        sb.append("Exception in thread \"main\" java.lang.NullPointerException\n");

        // Add each line with pre-generated line number
        for (String line : frameLines)
        {
            int lineNumber = 100 + random.nextInt(400);
            sb.append("\tat ").append(line).append(" (HelloWorldMainLauncherClass.java:").append(lineNumber).append(")\n");
        }

        return sb.toString();
    }

    /**
     * Display a single ASCII frame as stack trace
     */
    private void displayFrame(int frameIndex)
    {
        if (frameIndex < 0 || frameIndex >= frames.size()) return;

        // Get current frame lines
        List<String> frameLines = frames.get(frameIndex);

        // Pre-generate the entire frame output
        String frameOutput = generateFrameOutput(frameLines);

        // Clear screen
        clearConsole();

        // Print the entire frame at once
        System.err.print(frameOutput);
    }

    /**
     * Play the entire animation
     */
    public void play()
    {
        if (frames.isEmpty())
        {
            System.err.println("No frames to play");
            return;
        }

        try
        {
            // Calculate frame delay
            long frameDelay = 1000 / DEFAULT_FPS;

            // Play all frames
            for (int i = 0; i < frames.size(); i++)
            {
                long startTime = System.currentTimeMillis();

                // Display current frame
                displayFrame(i);

                // Calculate sleep time
                long elapsed = System.currentTimeMillis() - startTime;
                long sleepTime = Math.max(0, frameDelay - elapsed);

                // Wait until next frame
                if (sleepTime > 0)
                {
                    Thread.sleep(sleepTime);
                }
            }

            // Final Clear
            for (int i = 0; i < 3000; i++) clearConsole();
        }
        catch (Exception e)
        {
            System.err.println("Playback interrupted: " + e.getMessage());
        }
    }

    /**
     * Main method to run the player
     */
    public static void main(String[] args)
    {
        AsciiPlayer player = new AsciiPlayer();
        player.play();
    }
}