"use server";

import { generateObject } from "ai";
import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { groq } from "@ai-sdk/groq";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;
  console.log(feedbackId);
  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`,
      )
      .join("");

    const {
      object: {
        totalScore,
        categoryScores,
        strengths,
        finalAssessment,
        areasForImprovement,
      },
    } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      providerOptions: {
        groq: { structuredOutputs: false },
      },

      schema: feedbackSchema,
      prompt: `
You are an AI interviewer analyzing a mock interview.
Transcript:
${formattedTranscript}

Please score the candidate and return a JSON object with EXACTLY these fields:
{
  "totalScore": <number 0-100>,
  "categoryScores": [
    {"name": "Communication Skills", "score": <number>, "comment": "<string>"},
    {"name": "Technical Knowledge", "score": <number>, "comment": "<string>"},
    {"name": "Problem-Solving", "score": <number>, "comment": "<string>"},
    {"name": "Cultural & Role Fit", "score": <number>, "comment": "<string>"},
    {"name": "Confidence & Clarity", "score": <number>, "comment": "<string>"}
  ],
  "strengths": ["<string>", "<string>"],
  "areasForImprovement": ["<string>", "<string>"],
  "finalAssessment": "<string>"
}
`,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Always respond in JSON format.",
    });

    const feedback = await db.collection("feedback").add({
      interviewId,
      userId,
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
      createdat: new Date().toISOString(),
    });
    return {
      success: true,
      feedbackId: feedback.id,
    };

    // let feedbackRef;

    // if (feedbackId) {
    //   feedbackRef = db.collection("feedback").doc(feedbackId);
    // } else {
    //   feedbackRef = db.collection("feedback").doc();
    // }

    // await feedbackRef.set(feedback);
    // await db.collection("interviews").doc(interviewId).update({
    //   finalized: true,
    // });

    // return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams,
): Promise<Feedback | null> {
  const { id, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", id)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams,
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "in", [true, false])
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string,
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}
export async function saveTranscript(params: {
  interviewId: string;
  transcript: { role: string; content: string }[];
}) {
  const { interviewId, transcript } = params;

  try {
    await db.collection("interviews").doc(interviewId).update({
      transcript: transcript,
      finalized: [true,false], 
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving transcript:", error);
    return { success: false };
  }
}
