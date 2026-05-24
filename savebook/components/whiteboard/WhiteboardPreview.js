"use client";

import WhiteboardCanvas from "@/components/whiteboard/WhiteboardCanvas";

export default function WhiteboardPreview({ data, theme = "dark", className = "" }) {
  return (
    <div className={`border border-gray-700 bg-gray-900 rounded-2xl overflow-hidden ${className}`.trim()}>
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800 text-sm text-gray-300">
        Whiteboard Preview
      </div>
      <div className="h-[420px]">
        <WhiteboardCanvas initialData={data} theme={theme} viewModeEnabled />
      </div>
    </div>
  );
}
