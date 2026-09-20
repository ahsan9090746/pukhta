"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const params = useParams();
  const token = params.token as string;

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await api.get(`/auth/verify-email/${token}`);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };
    verifyEmail();
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-12"
    >
      <div className="text-center space-y-6 max-w-md">
        {status === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
            <h1 className="text-3xl font-bold">Verifying your email...</h1>
            <p className="text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-3xl font-bold">Email Verified!</h1>
            <p className="text-muted-foreground">
              Your email has been successfully verified. You can now access all
              features of your account.
            </p>
            <Button asChild>
              <Link href="/login">Continue to Login</Link>
            </Button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-3xl font-bold">Verification Failed</h1>
            <p className="text-muted-foreground">
              The verification link is invalid or has expired. Please request a
              new one.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Back to Login</Link>
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
