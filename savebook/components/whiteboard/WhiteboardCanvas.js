"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef } from "react";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false }
);

export default function WhiteboardCanvas({
  initialData,
  onChange,
  theme = "dark",
  viewModeEnabled = false,
  className = "",
}) {
  const preparedInitialData = useMemo(() => {
    if (!initialData) return undefined;
    const appState = initialData.appState || {};
    const { collaborators, ...safeAppState } = appState || {};
    return {
      elements: Array.isArray(initialData.elements) ? initialData.elements : [],
      appState: safeAppState,
      files: initialData.files || {},
    };
  }, [initialData]);

  const initialDataRef = useRef(undefined);
  if (!initialDataRef.current && preparedInitialData) {
    initialDataRef.current = preparedInitialData;
  }

  const lastPayloadRef = useRef("");

  const handleChange = useCallback(
    (elements, appState, files) => {
      if (!onChange) return;
      const { collaborators, ...safeAppState } = appState || {};
      const payload = { elements, appState: safeAppState, files };
      const serialized = JSON.stringify(payload);
      if (serialized === lastPayloadRef.current) return;
      lastPayloadRef.current = serialized;
      onChange(payload);
    },
    [onChange]
  );

  return (
    <div className={`whiteboard-canvas ${className}`.trim()}>
      <Excalidraw
        theme={theme}
        initialData={initialDataRef.current}
        onChange={handleChange}
        viewModeEnabled={viewModeEnabled}
      />
    </div>
  );
}
