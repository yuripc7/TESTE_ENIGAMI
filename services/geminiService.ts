import { GoogleGenAI } from "@google/genai";

export const generateChatResponse = async (
    query: string,
    systemInstruction: string
): Promise<string> => {
    try {
        if (!process.env.API_KEY) {
            throw new Error("API Key not found");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Upgraded model for better reasoning
            contents: query,
            config: {
                systemInstruction: systemInstruction,
                thinkingConfig: { thinkingBudget: 2048 } // Allow "thinking" time for complex project analysis
            },
        });
        
        return response.text || "Desculpe, não consegui processar isso.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Erro ao conectar com a inteligência artificial. Verifique sua chave de API.";
    }
};