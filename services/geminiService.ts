import { GoogleGenAI, Type } from "@google/genai";
import { SOPData, SymbolType } from "../types";

const parseJSON = (text: string) => {
    try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) return null;
        return JSON.parse(text.substring(start, end + 1));
    } catch (e) {
        console.error("Failed to parse JSON", e);
        return null;
    }
}

export const generateSOPContent = async (
  topic: string, 
  description: string
): Promise<Partial<SOPData> | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing in process.env.API_KEY");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert SOP (Standard Operating Procedure) consultant for "Yayasan As-Syifa Al-Khoeriyyah".
    Your task is to convert a user's rough process description into a structured SOP JSON format.

    The Format requires:
    1. A Title.
    2. A list of Executor Roles (Pelaksana) involved (e.g., Staff, Kepala Bagian, HRD).
    3. A list of sequential Steps. 
       - Each step must be assigned to ONE specific 'executorRole' from the list you created.
       - Each step has standard requirements (Standar Baku): Requirements, Time (minutes/days), Output.
       - Each step has a flowchart symbol type: 'TERMINATOR' (Start/End), 'PROCESS' (Action), 'DECISION' (Branching/YesNo), 'DOCUMENT'.
    4. Legal Basis (Dasar Hukum) - suggest generic relevant laws or foundation rules.
    5. Related SOPs (Keterkaitan).

    Input Topic: "${topic}"
    Input Description: "${description}"

    Return ONLY raw JSON.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      department: { type: Type.STRING, description: "The unit/department likely responsible" },
      executorColumns: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of distinct roles/titles involved in the flowchart columns"
      },
      legalBasis: { type: Type.ARRAY, items: { type: Type.STRING } },
      relatedSOPs: { type: Type.ARRAY, items: { type: Type.STRING } },
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            activity: { type: Type.STRING, description: "Description of the activity" },
            executorRole: { type: Type.STRING, description: "Must match one value from executorColumns" },
            requirements: { type: Type.STRING, description: "Documents or prerequisites needed" },
            time: { type: Type.STRING, description: "Estimated duration" },
            output: { type: Type.STRING, description: "Result of the step (e.g. Surat, Acc)" },
            symbol: { type: Type.STRING, enum: [SymbolType.TERMINATOR, SymbolType.PROCESS, SymbolType.DECISION, SymbolType.DOCUMENT] }
          }
        }
      }
    },
    required: ["title", "department", "executorColumns", "steps", "legalBasis"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = parseJSON(text);
    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};