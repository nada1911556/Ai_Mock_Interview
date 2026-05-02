import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, role, level, techstack, amount, userid } = body;
  console.log("REQUEST BODY:", body); // ← ضيف دي
  console.log("userid:", userid); // ← وده

  try {
    const { text: questions } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });
    console.log("RAW AI RESPONSE:", questions);
    const cleanedQuestions = questions.replace(/```json|```/g, "").trim();

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(","),
      questions: JSON.parse(cleanedQuestions),
      userid: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    // [source: 1] تعديل نهاية دالة الـ POST
    return Response.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  } catch (error: any) {
    console.error("FULL ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error.message || error,
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
