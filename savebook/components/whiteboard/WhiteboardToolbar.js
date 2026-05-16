"use client";

export default function WhiteboardToolbar({
  title,
  description,
  saveStatus = "idle",
  onBack,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  const statusStyles = {
    idle: "text-gray-400",
    saving: "text-blue-400",
    saved: "text-green-400",
    error: "text-red-400",
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-700 bg-gray-900 p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${statusStyles[saveStatus] || statusStyles.idle}`}>
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "All changes saved"}
            {saveStatus === "error" && "Save failed"}
            {saveStatus === "idle" && "Ready"}
          </span>
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-3 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition-colors"
            >
              {secondaryActionLabel}
            </button>
          )}
          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {primaryActionLabel}
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
