"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import noteContext from "@/context/noteContext";
import { useAuth } from "@/context/auth/authContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import WhiteboardCanvas from "@/components/whiteboard/WhiteboardCanvas";
import WhiteboardToolbar from "@/components/whiteboard/WhiteboardToolbar";

export default function WhiteboardEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { isAuthenticated, loading, needsRelogin, getMasterKey } = useAuth();
  const { editNote } = useContext(noteContext);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("Ideas");
  const [whiteboardData, setWhiteboardData] = useState(null);
  const [images, setImages] = useState([]);
  const [audio, setAudio] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!loading && !isAuthenticated && !needsRelogin) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, needsRelogin, router]);

  useEffect(() => {
    const loadNote = async () => {
      if (!id || !isAuthenticated) return;
      setIsLoading(true);

      try {
        const response = await fetch(`/api/notes/${id}`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to load whiteboard note");
        }

        const raw = await response.json();
        const decrypted = await decryptNote(raw, getMasterKey());

        if (!decrypted?.isWhiteboard) {
          toast.error("This note is not a whiteboard.");
          router.push("/notes");
          return;
        }

        setTitle(decrypted.title || "");
        setDescription(decrypted.description || "");
        setTag(decrypted.tag || "Ideas");
        setWhiteboardData(decrypted.whiteboardData || null);
        setImages(Array.isArray(decrypted.images) ? decrypted.images : []);
        setAudio(decrypted.audio || null);
        setSaveStatus("saved");
        hasLoaded.current = true;
      } catch (error) {
        console.error(error);
        toast.error("Unable to load this whiteboard.");
      } finally {
        setIsLoading(false);
      }
    };

    loadNote();
  }, [id, isAuthenticated, getMasterKey, router]);

  useEffect(() => {
    if (!hasLoaded.current || isSaving) return;
    if (!title.trim() || !description.trim()) return;

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveStatus("saving");
        await editNote(
          id,
          title.trim(),
          description.trim(),
          tag.trim() || "Ideas",
          images,
          audio,
          whiteboardData,
          true
        );
        setSaveStatus("saved");
      } catch (error) {
        console.error(error);
        setSaveStatus("error");
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, description, tag, whiteboardData, images, audio, id, editNote, isSaving]);

  const handleSaveNow = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      setSaveStatus("saving");
      await editNote(
        id,
        title.trim(),
        description.trim(),
        tag.trim() || "Ideas",
        images,
        audio,
        whiteboardData,
        true
      );
      setSaveStatus("saved");
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
      toast.error("Failed to save whiteboard");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
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
          title="Whiteboard Editor"
          description="Draw, brainstorm, and autosave your whiteboard notes."
          saveStatus={saveStatus}
          secondaryActionLabel="New Whiteboard"
          onSecondaryAction={() => router.push("/notes/whiteboard")}
          primaryActionLabel={isSaving ? "Saving..." : "Save now"}
          onPrimaryAction={handleSaveNow}
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
                placeholder="Describe the whiteboard"
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

async function decryptNote(note, key) {
  if (!key) return note;
  const { decryptWithKey } = await import("@/lib/utils/clientCrypto");

  const decrypted = {
    ...note,
    title: await decryptWithKey(note.title, key),
    description: await decryptWithKey(note.description, key),
  };

  if (note.whiteboardData && typeof note.whiteboardData === "string") {
    try {
      const whiteboardJson = await decryptWithKey(note.whiteboardData, key);
      decrypted.whiteboardData = JSON.parse(whiteboardJson);
    } catch {
      decrypted.whiteboardData = null;
    }
  }

  return decrypted;
}
