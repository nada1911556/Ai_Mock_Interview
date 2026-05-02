// [source: 1] route.ts
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

// إعدادات الـ CORS لضمان عمل الطلب من واجهة Vapi دون حظر المتصفح
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  return Response.json(
    { success: true, data: "Vapi Interview API is active!" },
    { status: 200, headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, role, level, techstack, amount, userid } = body;

    console.log("Processing interview for user:", userid);

    const { text: questionsResponse } = await generateText({
      model: groq("llama-3.1-8b-instant"), // موديل سريع لتجنب الـ Timeout
      prompt: `Prepare interview questions.
        Role: ${role}, Level: ${level}, Stack: ${techstack}, Type: ${type}, Count: ${amount}.
        Return ONLY a JSON array of strings. No intro, no outro, no explanations.
        Example: ["Question 1", "Question 2"]
      `,
    });

    // منطق تنظيف الاستجابة لاستخراج المصفوفة فقط وتجنب أخطاء الـ JSON
    const startBracket = questionsResponse.indexOf("[");
    const endBracket = questionsResponse.lastIndexOf("]") + 1;
    
    if (startBracket === -1 || endBracket === 0) {
      throw new Error("Model failed to generate a valid JSON array");
    }

    const cleanQuestions = questionsResponse.substring(startBracket, endBracket);
    const parsedQuestions = JSON.parse(cleanQuestions);

    const interviewData = {
      role: role,
      type: type,
      level: level,
      techstack: typeof techstack === "string" ? techstack.split(",") : techstack,
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // حفظ المقابلة في قاعدة بيانات Firestore
    await db.collection("interviews").add(interviewData);

    return Response.json(
      { success: true },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("DETAILED ROUTE ERROR:", error);

    return Response.json(
      { 
        success: false, 
        error: error.message || "Failed to process request",
      }, 
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
}