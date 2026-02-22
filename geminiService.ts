import { GoogleGenerativeAI } from "@google/generative-ai";

// Accessing environment variable according to Vite standards
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Generates a response from the Gemini AI model.
 * @param query The user's query or prompt.
 * @param systemInstruction The system instruction to guide the AI's behavior.
 * @returns A promise that resolves to the generated text.
 */
export const generateChatResponse = async (
    query: string,
    systemInstruction: string
): Promise<string> => {
    try {
        // Fallback for missing or placeholder API Key
        if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
            console.warn("API Key missing or invalid. Using mock response.");
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            return `🤖 [MODO DEMO] A I.A. ENIGAMI está em modo demonstração. 
            Sua pergunta foi: "${query}". 
            (Para respostas reais, configure uma API Key válida no arquivo .env.local).`;
        }

        const genAI = new GoogleGenerativeAI(API_KEY);

        // Using 'gemini-1.5-flash-latest' which is more stable across API versions
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: systemInstruction,
        });

        const result = await model.generateContent(query);
        const response = await result.response;
        const text = response.text();

        return text || "Desculpe, a I.A. não retornou texto.";
    } catch (error) {
        console.error("Gemini API Error details:", error);

        const errorMessage = error instanceof Error ? error.message : 'desconhecido';

        // Providing more context if it's a specific API error
        if (errorMessage.includes("API_KEY_INVALID")) {
            return "Erro: Sua API Key parece ser inválida. Verifique se copiou corretamente.";
        }
        if (errorMessage.includes("quota")) {
            return "Erro: Você atingiu o limite de uso (quota) da sua chave Gemini.";
        }

        return `Erro de conexão (${errorMessage}). Verifique o console do navegador (F12) para detalhes.`;
    }
};