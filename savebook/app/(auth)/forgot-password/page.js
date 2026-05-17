"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, Mail, ShieldAlert, Sparkles } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Reset Method: "otp" or "recoveryCode"
  const [method, setMethod] = useState("otp");

  // Step 1: Request OTP or Enter Recovery Code Details
  const [identifier, setIdentifier] = useState(""); // Email for OTP, Email/Username for Recovery
  const [recoveryCode, setRecoveryCode] = useState("");

  // Step 2: Reset Password (OTP specific or Shared)
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState(1); // 1: Initial (Email/Recovery Code), 2: OTP Entry & New Password

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorType, setErrorType] = useState(""); // "identifier", "otp", "password", etc.

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!identifier) {
      setMessage("Email is required");
      setErrorType("identifier");
      return;
    }

    setLoading(true);
    setMessage("");
    setErrorType("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "OTP sent to your email.");
        setErrorType("success");
        setTimeout(() => {
          setStep(2);
          setMessage("");
          setErrorType("");
        }, 1500);
      } else {
        setMessage(data.message || "Failed to send OTP.");
        setErrorType("identifier");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
      setErrorType("general");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    const cleanIdentifier = identifier.trim();
    const cleanRecoveryCode = recoveryCode.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase();

    if (method === "otp" && !otp) {
      setMessage("OTP is required");
      setErrorType("otp");
      return;
    }

    if (method === "recoveryCode" && !cleanRecoveryCode) {
      setMessage("Recovery code is required");
      setErrorType("recoveryCode");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      setErrorType("password");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setErrorType("confirmPassword");
      return;
    }

    setLoading(true);
    setMessage("");
    setErrorType("");

    try {
      let newEncryptedMasterKey = null;

      if (method === "recoveryCode") {
        const mkRes = await fetch("/api/auth/master-key-for-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: cleanIdentifier }),
        });
        
        if (mkRes.ok) {
          const mkData = await mkRes.json();
          console.log("Master key response:", mkData);
          if (mkData.recoveryBlobs && Array.isArray(mkData.recoveryBlobs) && mkData.recoveryBlobs.length > 0) {
            try {
              const { decryptWithKey, deriveKeyFromPassword, importKey, encryptMasterKey } = await import('@/lib/utils/clientCrypto');
              
              const blobs = mkData.recoveryBlobs;
              console.log("Recovery attempt for userId:", mkData.userId);
              console.log("Number of blobs to check:", blobs.length);
              
              let decryptedMasterKeyHex = null;
              const wrapKey = await deriveKeyFromPassword(cleanRecoveryCode, mkData.userId);

              for (let i = 0; i < blobs.length; i++) {
                try {
                  decryptedMasterKeyHex = await decryptWithKey(blobs[i], wrapKey);
                  if (decryptedMasterKeyHex) {
                    console.log("Successfully unlocked notes with recovery blob index:", i);
                    break;
                  }
                } catch (e) {
                  console.log("Failed to decrypt blob", i, ":", e.message);
                  continue;
                }
              }

              if (decryptedMasterKeyHex) {
                const masterKey = await importKey(decryptedMasterKeyHex);
                newEncryptedMasterKey = await encryptMasterKey(masterKey, password, mkData.userId);
                console.log("Successfully created new encrypted master key");
              } else {
                console.error("None of the stored blobs could be decrypted.");
                setMessage("Invalid recovery code for these notes.");
                setErrorType("recoveryCode");
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Key recovery failed:", err);
              setMessage("Technical error during recovery. Try again.");
              setErrorType("recoveryCode");
              setLoading(false);
              return;
            }
          } else {
            console.log("No recovery blobs found for user");
            setMessage("Your account does not have backup recovery keys set up. Resetting will delete your notes.");
            // We don't return here, we let them decide if they want to proceed with the deletion
          }
        } else {
          console.error("Failed to fetch master key for reset:", mkRes.status);
          setMessage("Failed to retrieve recovery information. Please try again.");
          setErrorType("recoveryCode");
          setLoading(false);
          return;
        }
      }
      
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: cleanIdentifier,
          password,
          otp: method === "otp" ? otp : undefined,
          recoveryCode: cleanRecoveryCode,
          method,
          newEncryptedMasterKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Reset failed");
        setErrorType(data.message?.toLowerCase().includes("otp") ? "otp" :
          data.message?.toLowerCase().includes("recovery") ? "recoveryCode" : "general");
        return;
      }

      setMessage(data.message || "Password reset successful");
      setErrorType("success");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error) {
      console.error("Reset password error", error);
      setMessage("Something went wrong. Please try again.");
      setErrorType("general");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password Reset"
      title="Regain access to your notes and continue where you left off."
      description="Reset your password using email verification or a recovery code. Your SaveBook workspace will be ready once you're back in."
      asideTitle="Recovery options"
      asideCopy="Choose email verification for a quick reset, or use your recovery code to preserve your encrypted notes and maintain full access to your content."
    >
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--background)]/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-2)]">
          <ShieldAlert className="h-3.5 w-3.5" />
          {step === 1 ? "Reset password" : "Set new password"}
        </div>
        <h2 className="mt-5 text-3xl font-semibold text-[color:var(--foreground)]">
          {step === 1 ? "Choose recovery method" : "Create new password"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
          {step === 1
            ? "Select how you'd like to reset your password and regain access to your account."
            : "Enter the verification code and set a new password for your SaveBook account."}
        </p>
      </div>

      <div className="rounded-[2rem] border border-[var(--border)] bg-[color:var(--background)]/55 p-6 md:p-7">
        {step === 1 && (
          <div className="mb-6 flex gap-2 rounded-[1.2rem] border border-[var(--border)] bg-[color:var(--background)]/70 p-1">
            <button
              onClick={() => { setMethod("otp"); setErrorType(""); setMessage(""); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[0.9rem] px-4 py-2.5 text-sm font-medium transition-all ${
                method === "otp"
                  ? "bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-3)] text-[color:var(--button-text)] shadow-md"
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              <Mail className="h-4 w-4" />
              Email OTP
            </button>
            <button
              onClick={() => { setMethod("recoveryCode"); setErrorType(""); setMessage(""); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[0.9rem] px-4 py-2.5 text-sm font-medium transition-all ${
                method === "recoveryCode"
                  ? "bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-3)] text-[color:var(--button-text)] shadow-md"
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Recovery Code
            </button>
          </div>
        )}

        {step === 1 && method === "otp" && (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label htmlFor="email-otp" className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Email Address
              </label>
              <div className={`field-shell px-4 py-3 ${errorType === "identifier" ? "!border-red-500" : ""}`}>
                <input
                  id="email-otp"
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="field-input"
                  placeholder="Enter your registered email"
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                We'll send a one-time password to this email address.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="site-button w-full disabled:opacity-60"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {(step === 2 || (step === 1 && method === "recoveryCode")) && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            {method === "recoveryCode" && (
              <>
                <div>
                  <label htmlFor="identifier-recovery" className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                    Username or Email
                  </label>
                  <div className={`field-shell px-4 py-3 ${errorType === "identifier" ? "!border-red-500" : ""}`}>
                    <input
                      id="identifier-recovery"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      className="field-input"
                      placeholder="Enter your username or email"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="recovery-code" className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                    Recovery Code
                  </label>
                  <div className={`field-shell px-4 py-3 ${errorType === "recoveryCode" ? "!border-red-500" : ""}`}>
                    <input
                      id="recovery-code"
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      required
                      className="field-input font-mono tracking-wider"
                      placeholder="e.g. a1b2c3d4"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    Enter one of the recovery codes you saved when creating your account.
                  </p>
                </div>
              </>
            )}

            {method === "otp" && step === 2 && (
              <div>
                <label htmlFor="otp-code" className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                  One-Time Password (OTP)
                </label>
                <div className={`field-shell px-4 py-3 ${errorType === "otp" ? "!border-red-500" : ""}`}>
                  <input
                    id="otp-code"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.trim())}
                    required
                    className="field-input font-mono tracking-wider text-center text-lg"
                    placeholder="000000"
                    disabled={loading}
                    maxLength={6}
                  />
                </div>
                <p className="mt-2 text-xs text-[color:var(--muted)]">
                  Check your email for the 6-digit verification code.
                </p>
              </div>
            )}

            {method === "otp" && step === 2 && (
              <div className="flex items-start gap-3 rounded-[1.2rem] border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
                <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>
                  <strong>Warning:</strong> Resetting via OTP will permanently delete all your encrypted notes. Use a recovery code to preserve them.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                New Password
              </label>
              <div className={`field-shell relative px-4 py-3 ${errorType === "password" ? "!border-red-500" : ""}`}>
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="field-input pr-10"
                  placeholder="Enter new password"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                Password must be at least 6 characters long.
              </p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">
                Confirm Password
              </label>
              <div className={`field-shell relative px-4 py-3 ${errorType === "confirmPassword" ? "!border-red-500" : ""}`}>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="field-input pr-10"
                  placeholder="Confirm new password"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="site-button w-full disabled:opacity-60"
            >
              {loading ? "Processing..." : "Reset Password"}
            </button>
          </form>
        )}

        {message && (
          <div
            className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-center text-sm ${
              errorType === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-[color:var(--accent)] hover:opacity-80 transition-opacity"
          >
            Back to Login
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-[1.5rem] border border-[var(--border)] bg-[color:var(--background)]/45 px-4 py-3 text-sm text-[color:var(--muted)]">
        <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
        Your notes are waiting. Reset your password to continue.
      </div>
    </AuthShell>
  );
}
