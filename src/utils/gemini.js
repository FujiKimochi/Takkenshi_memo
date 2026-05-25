import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSavedCredentials } from './supabase';

// Helper to convert File to generative part (base64 object)
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        inlineData: {
          data: reader.result.split(',')[1],
          mimeType: file.type
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const analyzeScreenshot = async (file) => {
  const { geminiKey, geminiModel } = getSavedCredentials();
  if (!geminiKey) {
    throw new Error('請先在設定中配置 Gemini API Key！');
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const modelName = geminiModel || 'gemini-2.5-flash';
  
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const imagePart = await fileToGenerativePart(file);
  
  const prompt = `你是一位日本宅建士（Real Estate Broker）考試對策專家。
請分析這張課本或講義的截圖，並完成以下任務：
1. 辨識與提取圖中日文法條或核心文字。
2. 判斷該內容屬於以下哪一個宅建士考科領域，必須從中精確選擇一個（繁體中文）：
   - "權利關係"
   - "宅建業法"
   - "法令上の制限"
   - "稅・その他"
3. 將該課本內容翻譯並整理成一篇條理分明、非常精美且豐富的繁體中文學習筆記（Markdown 格式），包含法條核心要旨、關鍵術語解釋（附日文對照）、重點對照（如有）或記憶口訣，以及歷屆試題常考點。

請嚴格以 JSON 格式回傳，格式如下：
{
  "title": "符合法條重點的繁體中文標題",
  "subject": "權利關係 或 宅建業法 或 法令上の制限 或 稅・その他",
  "markdownContent": "這裡填寫詳細整理的 Markdown 格式筆記，包含適當的標題(#、##、###)、粗體、點列表以及引用區塊(> )來突顯重點。"
}`;

  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text();
  
  try {
    const parsedData = JSON.parse(responseText);
    return parsedData;
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON. Raw response:', responseText);
    
    // Fallback parsing if JSON formatting wasn't fully respected but text is there
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    try {
      return JSON.parse(cleanedText);
    } catch (err) {
      // Return structured fallback
      return {
        title: '已辨識課本筆記',
        subject: '宅建業法',
        markdownContent: responseText
      };
    }
  }
};
