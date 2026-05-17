"use client";

import React, { useEffect, useState, useContext } from "react";
import { useAuth } from "@/context/auth/authContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import noteContext from "@/context/noteContext";
import NoteItem from "@/components/notes/NoteItem";
import Loader from "@/components/common/Loader";
import RichTextEditor from "./RichTextEditor";

export default function Bookmarks() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const context = useContext(noteContext);
  const { editNote } = context || {};

  const [bookmarks, setBookmarks] = useState([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [note, setNote] = useState({
    id: "",
    etitle: "",
    edescription: "",
    etag: "",
  });
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [replaceImages, setReplaceImages] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"

  // ── Tag options ───────────────────────────────────────────────────────────
  const tagOptions = [
    { id: 1, value: "General", color: "bg-blue-500" },
    { id: 2, value: "Basic", color: "bg-gray-500" },
    { id: 3, value: "Finance", color: "bg-green-500" },
    { id: 4, value: "Grocery", color: "bg-orange-500" },
    { id: 5, value: "Office", color: "bg-purple-500" },
    { id: 6, value: "Personal", color: "bg-pink-500" },
    { id: 7, value: "Work", color: "bg-indigo-500" },
    { id: 8, value: "Ideas", color: "bg-teal-500" },
  ];

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && !loading) fetchBookmarks();
  }, [isAuthenticated, loading]);

  // ── Close modal on Escape ─────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isEditModalOpen) closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isEditModalOpen]);

  // ── Prevent body scroll when modal is open ────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isEditModalOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isEditModalOpen]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchBookmarks = async () => {
    try {
      setIsLoadingBookmarks(true);
      const response = await fetch("/api/notes/bookmarks", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch bookmarks");
      const data = await response.json();
      const bookmarkedNotes = (data.bookmarks || []).map((n) => ({
        ...n,
        isBookmarked: true,
      }));
      setBookmarks(bookmarkedNotes);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      toast.error("Failed to load bookmarks");
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  // ── Bookmark toggle (remove from list instantly) ──────────────────────────
  const handleBookmarkToggle = (noteId, isNowBookmarked) => {
    if (!isNowBookmarked) {
      setBookmarks((prev) => prev.filter((n) => n._id !== noteId));
    }
  };

  // ── Image upload to Cloudinary ────────────────────────────────────────────
  const uploadImages = async (files) => {
    if (!files || files.length === 0) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append("image", file));
    const res = await fetch("/api/upload/user-media", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) throw new Error("Image upload failed");
    const data = await res.json();
    return Array.isArray(data.imageUrls) ? data.imageUrls : [];
  };

  // ── Open edit modal (called from NoteItem via updateNote prop) ────────────
  const updateNote = (currentNote) => {
    setNote({
      id: currentNote._id,
      etitle: currentNote.title,
      edescription: currentNote.description,
      etag: currentNote.tag,
    });
    setExistingImages(currentNote.images || []);
    setNewImages([]);
    setPreview([]);
    setReplaceImages(false);
    setSaveStatus("idle");
    setIsEditModalOpen(true);
  };

  // ── Close & reset modal ───────────────────────────────────────────────────
  const closeModal = () => {
    setIsEditModalOpen(false);
    setNote({ id: "", etitle: "", edescription: "", etag: "" });
    setExistingImages([]);
    setNewImages([]);
    setPreview([]);
    setReplaceImages(false);
    setSaveStatus("idle");
  };

  // ── Save edited note ──────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaveStatus("saving");
      let uploadedUrls = [];
      if (newImages.length > 0) {
        uploadedUrls = await uploadImages(newImages);
      }
      const finalImages = replaceImages
        ? uploadedUrls
        : [...existingImages, ...uploadedUrls];

      await editNote(
        note.id,
        note.etitle,
        note.edescription,
        note.etag,
        finalImages,
      );

      setSaveStatus("saved");

      // Update the card in place without a full refetch
      setBookmarks((prev) =>
        prev.map((bm) =>
          bm._id === note.id
            ? {
                ...bm,
                title: note.etitle,
                description: note.edescription,
                tag: note.etag,
                images: finalImages,
              }
            : bm,
        ),
      );

      toast.success("Note updated successfully! 🎉");
      closeModal();
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
      toast.error("Failed to update note");
    }
  };

  // ── Field change handler ──────────────────────────────────────────────────
  const onchange = (e) =>
    setNote((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Image helpers ─────────────────────────────────────────────────────────
  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(files);
    setPreview(files.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (index) =>
    setExistingImages((prev) => prev.filter((_, i) => i !== index));

  const removePreviewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setPreview((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Form validation ───────────────────────────────────────────────────────
  const isFormValid =
    note.etitle?.length >= 5 &&
    note.edescription?.length >= 5 &&
    note.etag?.length >= 3;

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredBookmarks = bookmarks.filter((n) => {
    const matchesSearch =
      n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === "all" || n.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  // ── Early returns ─────────────────────────────────────────────────────────
  if (loading || isLoadingBookmarks) return <Loader />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-2 sm:px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Page Header ── */}
        <div className="text-center mb-8 mt-14">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Bookmarked Notes
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Manage and access all your saved bookmarks in one place.
          </p>
        </div>

        {/* ── Search & Filter ── */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-8 mb-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">All Tags</option>
              {tagOptions.map((tag) => (
                <option key={tag.id} value={tag.value}>
                  {tag.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Note Grid / Empty State ── */}
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z"
              />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {searchTerm || selectedTag !== "all"
                ? "No bookmarks match your search."
                : "You haven't saved any bookmarks yet."}
            </p>
            {searchTerm || selectedTag !== "all" ? (
              <button
                onClick={() => { setSearchTerm(""); setSelectedTag("all"); }}
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Start bookmarking notes to see them here.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredBookmarks.map((n) => (
              <NoteItem
                key={n._id}
                note={n}
                updateNote={updateNote}      // ← opens the modal below
                isBookmarked={true}
                onBookmarkToggle={(isNowBookmarked) =>
                  handleBookmarkToggle(n._id, isNowBookmarked)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Edit Modal
      ══════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Edit note"
        >
          <div
            className="max-w-2xl w-full bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── Modal Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Edit Note</h2>
              <button
                onClick={closeModal}
                aria-label="Close modal"
                className="text-gray-400 hover:text-white p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Modal Body (scrollable) ── */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="etitle"
                  value={note.etitle}
                  onChange={onchange}
                  minLength={5}
                  placeholder="Note title (min 5 characters)"
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                {note.etitle.length > 0 && note.etitle.length < 5 && (
                  <p className="text-xs text-red-400 mt-1">Minimum 5 characters required.</p>
                )}
              </div>

              {/* Tag */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tag <span className="text-red-400">*</span>
                </label>
                <select
                  name="etag"
                  value={note.etag}
                  onChange={onchange}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">-- Select a tag --</option>
                  {tagOptions.map((tag) => (
                    <option key={tag.id} value={tag.value}>
                      {tag.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description — RichTextEditor */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description <span className="text-red-400">*</span>
                </label>
                <RichTextEditor
                  value={note.edescription}
                  onChange={(val) =>
                    setNote((prev) => ({ ...prev, edescription: val }))
                  }
                />
                {note.edescription.length > 0 && note.edescription.length < 5 && (
                  <p className="text-xs text-red-400 mt-1">Minimum 5 characters required.</p>
                )}
              </div>

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Images
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {existingImages.map((img, index) => (
                      <div key={index} className="relative group/img">
                        <img
                          src={img}
                          alt={`Existing image ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                        />
                        <button
                          onClick={() => removeExistingImage(index)}
                          aria-label={`Remove image ${index + 1}`}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {existingImages.length > 0 ? "Add More Images" : "Attach Images"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewImageChange}
                  className="w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                    file:bg-blue-600 file:text-white hover:file:bg-blue-700
                    file:cursor-pointer file:transition-colors"
                />

                {/* New image previews */}
                {preview.length > 0 && (
                  <div className="flex gap-3 flex-wrap mt-3">
                    {preview.map((src, index) => (
                      <div key={index} className="relative group/prev">
                        <img
                          src={src}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-blue-500/50"
                        />
                        <button
                          onClick={() => removePreviewImage(index)}
                          aria-label={`Remove preview image ${index + 1}`}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Replace toggle — only if there are existing images */}
                {existingImages.length > 0 && newImages.length > 0 && (
                  <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={replaceImages}
                      onChange={(e) => setReplaceImages(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-sm text-gray-400">
                      Replace existing images with new ones
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* ── Modal Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 flex-shrink-0 gap-3">
              {/* Status indicator */}
              <div className="text-xs text-gray-500">
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1 text-blue-400">
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-red-400">Something went wrong. Try again.</span>
                )}
              </div>

              <div className="flex gap-3 ml-auto">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isFormValid || saveStatus === "saving"}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {saveStatus === "saving" ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}