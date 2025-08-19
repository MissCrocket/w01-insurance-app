// File: netlify/functions/getAiExplanation.js

// Using the official Google AI package for Node.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// This is your serverless function handler
exports.handler = async function(event, context) {
  // Ensure the request is a POST request
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the API key from environment variables (NEVER hardcode it)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

    // Get the data sent from the front-end
    const { term, definition, promptType } = JSON.parse(event.body);

    // Create a specific prompt based on which button was clicked
    let prompt;
    if (promptType === 'simplify') {
      prompt = `Explain the following insurance definition in simple terms, as if you were talking to someone new to the industry. Definition: "${definition}"`;
    } else if (promptType === 'scenario') {
      prompt = `Provide a short, clear, real-world scenario or example for the insurance concept "${term}". The definition is: "${definition}"`;
    } else {
      throw new Error("Invalid prompt type.");
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Send the AI's response back to the front-end
    return {
      statusCode: 200,
      body: JSON.stringify({ explanation: text }),
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to get explanation." }),
    };
  }
};