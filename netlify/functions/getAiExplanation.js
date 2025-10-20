// File: netlify/functions/getAiExplanation.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key from Netlify's environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const prompts = {
  simplify: (term, definition) => `Explain the insurance concept '${term}' in a very simple, easy-to-understand way for a beginner. The textbook definition is: "${definition}". Don't just repeat the definition. Use an analogy if it helps. Keep it concise (2-3 sentences).`,
  scenario: (term, definition) => `Give me a simple, real-world scenario or example of the insurance principle '${term}'. The official definition is: "${definition}". The scenario should clearly illustrate how the principle works in practice. Keep it brief.`,
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { term, definition, promptType } = JSON.parse(event.body);

    const prompt = prompts[promptType];
    if (!prompt) {
      return { statusCode: 400, body: 'Invalid prompt type' };
    }

    const result = await model.generateContent(prompt(term, definition));
    const response = result.response;
    const text = response.text();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ explanation: text }),
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get explanation from AI.' }),
    };
  }
};