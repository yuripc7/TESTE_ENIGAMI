import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Gestão da chave de API ──────────────────────────────────────────────
// A chave pode vir de dois lugares (nesta ordem de prioridade):
//  1. Configurada pelo usuário na Matriz (Admin Board) — persiste no navegador
//  2. Variável de ambiente VITE_GEMINI_API_KEY (build)
const RUNTIME_KEY_STORAGE = 'enigami_gemini_key_v1';
const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const isPlaceholder = (k?: string | null) =>
    !k || k === 'PLACEHOLDER_API_KEY' || k === 'COLE_SUA_CHAVE_AQUI';

export const getStoredApiKey = (): string => {
    try { return localStorage.getItem(RUNTIME_KEY_STORAGE) || ''; } catch { return ''; }
};

export const setStoredApiKey = (key: string): void => {
    try {
        if (key.trim()) localStorage.setItem(RUNTIME_KEY_STORAGE, key.trim());
        else localStorage.removeItem(RUNTIME_KEY_STORAGE);
    } catch { /* storage indisponível */ }
};

/** Chave efetiva usada nas chamadas (Matriz > env). */
export const getActiveApiKey = (): string => {
    const stored = getStoredApiKey();
    if (!isPlaceholder(stored)) return stored;
    if (!isPlaceholder(ENV_KEY)) return ENV_KEY as string;
    return '';
};

export type AiKeySource = 'matriz' | 'env' | 'none';
export const getApiKeySource = (): AiKeySource => {
    if (!isPlaceholder(getStoredApiKey())) return 'matriz';
    if (!isPlaceholder(ENV_KEY)) return 'env';
    return 'none';
};

export const isAiConnected = (): boolean => getApiKeySource() !== 'none';

/** Valida uma chave fazendo uma chamada mínima ao modelo. */
export const testApiKey = async (key: string): Promise<{ ok: boolean; message: string }> => {
    try {
        const genAI = new GoogleGenerativeAI(key.trim());
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Responda apenas: OK");
        const text = result.response.text();
        return text
            ? { ok: true, message: 'Chave válida — IA conectada!' }
            : { ok: false, message: 'A chave respondeu vazio. Tente novamente.' };
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'desconhecido';
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
            return { ok: false, message: 'Chave inválida. Verifique se copiou corretamente.' };
        }
        if (msg.includes('quota')) {
            return { ok: false, message: 'Chave válida, mas sem quota disponível.' };
        }
        return { ok: false, message: `Erro ao validar (${msg.slice(0, 80)}).` };
    }
};

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
        const API_KEY = getActiveApiKey();

        // Fallback for missing or placeholder API Key
        if (!API_KEY) {
            console.warn("API Key missing or invalid. Using mock response.");
            await new Promise(resolve => setTimeout(resolve, 800));
            const userQuestion = query.includes('[PERGUNTA]:')
                ? query.split('[PERGUNTA]:').pop()?.trim() ?? query
                : query;
            return `⚠️ **Modo Demo** — A IA não está conectada.\n\nSua pergunta: _"${userQuestion.slice(0, 200)}"_\n\nPara ativar respostas reais:\n1. Acesse **aistudio.google.com** e gere uma API Key gratuita\n2. Abra a **Matriz** (ícone de engrenagem ⚙️ no topo) → seção **Inteligência Artificial**\n3. Cole sua chave e clique em **Salvar**\n\nA chave fica salva neste navegador e a IA passa a gerar relatórios e planejamentos com os dados reais do projeto.`;
        }

        const genAI = new GoogleGenerativeAI(API_KEY);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
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
        if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not valid")) {
            return "Erro: Sua API Key parece ser inválida. Abra a Matriz (⚙️) → Inteligência Artificial e verifique a chave.";
        }
        if (errorMessage.includes("quota")) {
            return "Erro: Você atingiu o limite de uso (quota) da sua chave Gemini.";
        }

        return `Erro de conexão (${errorMessage}). Verifique o console do navegador (F12) para detalhes.`;
    }
};
