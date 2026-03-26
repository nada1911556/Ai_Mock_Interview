"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

// تحديد أنواع الـ Form (Sign-in أو Sign-up)
type FormType = "sign-in" | "sign-up";

const authFormSchema = (type: FormType) => {
    return z.object({
        name: type === "sign-up" ? z.string().min(3, "Name must be at least 3 characters") : z.string().optional(),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
    });
};

const AuthForm = ({ type }: { type: FormType }) => {
    const router = useRouter();
    const formSchema = authFormSchema(type);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            if (type === "sign-up") {
                // --- منطق إنشاء حساب جديد ---
                const { name, email, password } = data;

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                const result = await signUp({
                    uid: userCredential.user.uid,
                    name: name!,
                    email,
                    password,
                });

                if (!result.success) {
                    toast.error(result.message);
                    return;
                }

                toast.success("Account created successfully. Please sign in.");
                router.push("/sign-in");

            } else {
                // --- منطق تسجيل الدخول ---
                const { email, password } = data;

                // 1. تسجيل الدخول في Firebase Client
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                // 2. الحصول على الـ ID Token
                const idToken = await userCredential.user.getIdToken();
                if (!idToken) {
                    toast.error("Authentication failed. Please try again.");
                    return;
                }

                // 3. استدعاء الـ Server Action لإنشاء الـ Session Cookie
                const response = await signIn({
                    email,
                    idToken,
                });

                // 4. التعامل مع النتيجة والـ Redirect
                if (response?.success) {
                    toast.success("Signed in successfully.");

                    // تحديث الصفحة عشان الـ Middleware يحس بالـ Cookie الجديدة
                    router.refresh();

                    // التوجيه للصفحة الرئيسية (أو الـ Dashboard)
                    router.push("/");
                } else {
                    toast.error(response?.message || "Sign in failed");
                }
            }

        } catch (error: any) {
            console.error(error);
            // معالجة أخطاء Firebase الشائعة بشكل أفضل
            const errorMessage = error.code === "auth/invalid-credential"
                ? "Invalid email or password"
                : error.message || "An unexpected error occurred";

            toast.error(errorMessage);
        }
    };

    const isSignIn = type === "sign-in";

    return (
        <div className="card-border lg:min-w-[566px]">
            <div className="flex flex-col gap-6 card py-14 px-10">
                <div className="flex flex-row gap-2 justify-center">
                    <Image src="/logo.svg" alt="logo" height={32} width={38} />
                    <h2 className="text-primary-100 font-bold text-2xl">PrepWise</h2>
                </div>

                <h3 className="text-center text-gray-400">Practice job interviews with AI</h3>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="w-full space-y-6 mt-4 form"
                    >
                        {!isSignIn && (
                            <FormField
                                control={form.control}
                                name="name"
                                label="Name"
                                placeholder="Your Name"
                                type="text"
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="email"
                            label="Email"
                            placeholder="Your email address"
                            type="email"
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            label="Password"
                            placeholder="Enter your password"
                            type="password"
                        />

                        <Button className="btn w-full" type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Processing..." : (isSignIn ? "Sign In" : "Create an Account")}
                        </Button>
                    </form>
                </Form>

                <p className="text-center text-sm">
                    {isSignIn ? "No account yet?" : "Have an account already?"}
                    <Link
                        href={isSignIn ? "/sign-up" : "/sign-in"}
                        className="font-bold text-primary-100 ml-1 hover:underline"
                    >
                        {isSignIn ? "Sign Up" : "Sign In"}
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default AuthForm;