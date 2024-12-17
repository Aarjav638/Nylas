import OpenAI from "openai";

const OpenAIClient = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY
})

export default OpenAIClient;