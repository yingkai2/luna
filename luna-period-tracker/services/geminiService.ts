
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSymptomAdvice = async (symptoms: string[], phase: string) => {
  if (symptoms.length === 0) return "You're doing great! Keep tracking your health daily.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user is in their "${phase}" phase of their menstrual cycle and is experiencing these symptoms: ${symptoms.join(', ')}. Provide a short, comforting, 2-sentence piece of health advice. Focus on natural relief or wellness. Keep it empathetic.`,
    });
    return response.text || "Rest well and stay hydrated. Your body is doing important work.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Listen to your body's needs today. Prioritize rest and gentle movement.";
  }
};
