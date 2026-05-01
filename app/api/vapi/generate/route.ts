import { groq } from './../../../../node_modules/@ai-sdk/groq/src/groq-provider';
import { generateText } from "ai";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";


export async function GET() {
  return Response.json(
    { success: true, data: "Thank you!" },
    {
      status: 200,
    }
  );
}

export async function POST(request: Request) {
  console.log("API KEY LENGTH:", process.env.GROQ_API_KEY?.length);
  const { type, role, level, techstack, amount, userid } =
    await request.json();

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

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(","),
      questions: JSON.parse(questions),
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json(
      { success: true },
      {
        status: 200,
      }
    );
  } 
  catch (error: any) {
    // اطبعي الخطأ في الـ Terminal بتاع الـ VS Code عشان نشوفه
    console.error("FULL ERROR:", error); 

    return Response.json({ 
        success: false, 
        error: error.message || error, // لو مفيش message يبعت الـ error نفسه
        raw: JSON.stringify(error) // حولي الخطأ لنص عشان نشوفه لو فاضي
    }, { status: 500 });
}
}
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // أو حطي دومين vapi لو عايزة أمان أكتر
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
