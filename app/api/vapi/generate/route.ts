// [source: 1] route.ts
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

// تعريف الـ Headers لمرة واحدة لاستخدامها في كل الاستجابات
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  return Response.json(
    { success: true, data: "Service is online!" },
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}

export async function OPTIONS() {
  // هذا الرد ضروري جداً لـ Vapi لتجاوز حماية الـ CORS في المتصفح
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, role, level, techstack, amount, userid } = body;

    // طباعة البيانات للتأكد من وصولها في الـ Vercel Logs
    console.log("Request received for user:", userid);

    const { text: questions } = await generateText({
      // استخدام موديل 8b لأنه أسرع بمراحل ويمنع الـ Timeout
      model: groq("llama-3.1-8b-instant"), 
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you!
    `,
    });

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: typeof techstack === "string" ? techstack.split(",") : techstack,
      questions: JSON.parse(questions),
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // حفظ البيانات في Firestore
    await db.collection("interviews").add(interview);

    return Response.json(
      { success: true },
      {
        status: 200,
        headers: corsHeaders, // ضروري لنجاح الطلب في واجهة Vapi[cite: 1]
      }
    );
  } catch (error: any) {
    console.error("FULL ERROR IN ROUTE:", error);

    return Response.json(
      { 
        success: false, 
        error: error.message || "Internal Server Error",
      }, 
      { 
        status: 500, 
        headers: corsHeaders // حتى في الخطأ نحتاج الـ CORS لكي يراها Vapi[cite: 1]
      }
    );
  }
}