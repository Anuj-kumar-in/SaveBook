"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import noteContext from "@/context/noteContext";
import { useAuth } from "@/context/auth/authContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import WhiteboardCanvas from "@/components/whiteboard/WhiteboardCanvas";
import WhiteboardToolbar from "@/components/whiteboard/WhiteboardToolbar";

const DRAFT_KEY = "savebook_whiteboard_draft";

export default function NewWhiteboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isAuthenticated, loading, needsRelogin } = useAuth();
  const { addNote } = useContext(noteContext);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("Ideas");
  const [whiteboardData, setWhiteboardData] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRestored = useRef(false);

  useEffect(() => {
    if (!loading && !isAuthenticated && !needsRelogin) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, needsRelogin, router]);

  useEffect(() => {
    if (hasRestored.current) return;
    const draft = window.localStorage.getItem(DRAFT_KEY);
    if (!draft) return;

    try {
      const parsed = JSON.parse(draft);
      setTitle(parsed.title || "");
      setDescription(parsed.description || "");
      setTag(parsed.tag || "Ideas");
      setWhiteboardData(parsed.whiteboardData || null);
      hasRestored.current = true;
      toast.success("Restored your whiteboard draft");
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!title && !description && !whiteboardData) return;
    const timer = setTimeout(() => {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ title, description, tag, whiteboardData })
      );
      if (saveStatus !== "saving") setSaveStatus("saved");
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, description, tag, whiteboardData, saveStatus]);

  const handleSave = async () => {
    if (isSubmitting) return;
    if (title.trim().length < 5 || description.trim().length < 5) {
      toast.error("Title and description must be at least 5 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSaveStatus("saving");
      const created = await addNote(
        title.trim(),
        description.trim(),
        tag.trim() || "Ideas",
        [],
        null,
        whiteboardData,
        true
      );

      if (!created?._id) {
        throw new Error("Failed to create whiteboard note");
      }

      window.localStorage.removeItem(DRAFT_KEY);
      setSaveStatus("saved");
      router.push(`/notes/whiteboard/${created._id}`);
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
      toast.error("Failed to save whiteboard note");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (needsRelogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 border border-yellow-700 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-yellow-400 text-4xl mb-4">🔑</div>
          <h2 className="text-xl font-semibold text-white mb-2">Re-login required</h2>
          <p className="text-gray-400 text-sm mb-6">
            Your encryption key was cleared after refresh. Please sign in again to continue.
          </p>
          <a href="/login" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Sign in again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 pb-16 pt-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <WhiteboardToolbar
          title="New Whiteboard"
          description="Sketch ideas, diagrams, or mind maps directly inside your note."
          saveStatus={saveStatus}
          primaryActionLabel={isSubmitting ? "Saving..." : "Create Whiteboard"}
          onPrimaryAction={handleSave}
          onBack={() => router.push("/notes")}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="wb-title">
                Title
              </label>
              <input
                id="wb-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus("idle");
                }}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500"
                placeholder="Whiteboard title"
                minLength={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="wb-description">
                Description
              </label>
              <textarea
                id="wb-description"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSaveStatus("idle");
                }}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500"
                placeholder="What is this whiteboard about?"
                minLength={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="wb-tag">
                Tag
              </label>
              <input
                id="wb-tag"
                type="text"
                value={tag}
                onChange={(e) => {
                  setTag(e.target.value);
                  setSaveStatus("idle");
                }}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500"
                placeholder="Ideas"
                minLength={2}
              />
            </div>
          </div>

          <div className="border border-gray-700 rounded-2xl overflow-hidden bg-gray-900">
            <div className="h-[620px]">
              <WhiteboardCanvas
                initialData={whiteboardData}
                onChange={(data) => {
                  setWhiteboardData(data);
                  setSaveStatus("idle");
                }}
                theme={theme}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
