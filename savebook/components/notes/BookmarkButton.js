"use client"

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function BookmarkButton({ noteId, initialIsBookmarked = false, size = "md", showLabel = false }) {
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
    const [isLoading, setIsLoading] = useState(false);

    // Sync state when prop changes (e.g. after notes re-fetch or navigation)
    useEffect(() => {
        setIsBookmarked(initialIsBookmarked);
    }, [initialIsBookmarked]);

    const handleBookmarkToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isLoading) return;

        // Optimistic update
        setIsBookmarked(prev => !prev);

        setIsLoading(true);
        try {
            const response = await fetch('/api/notes/bookmarks', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteId }),
            });

            let data = {};
            try {
                data = await response.json();
            } catch {
                throw new Error(`Server error (${response.status}): Could not parse response`);
            }

            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            // Confirm with server's response
            setIsBookmarked(data.isBookmarked);

            toast.success(data.isBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks', {
                duration: 2000,
                icon: data.isBookmarked ? '🔖' : '📌',
            });
        } catch (error) {
            // Revert optimistic update on failure
            setIsBookmarked(prev => !prev);
            console.error('Bookmark error:', error);
            toast.error(error.message || 'Failed to update bookmark');
        } finally {
            setIsLoading(false);
        }
    };

    const sizeClasses = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };
    const buttonSizeClasses = { sm: "p-1.5", md: "p-2", lg: "p-3" };

    return (
        <button
            onClick={handleBookmarkToggle}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isBookmarked
                    ? 'text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300'
                    : 'text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-400'
            } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-110'} ${buttonSizeClasses[size]}`}
            aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
            title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
        >
            {isLoading ? (
                <svg className={`${sizeClasses[size]} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : isBookmarked ? (
                <svg className={sizeClasses[size]} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
                </svg>
            ) : (
                <svg className={sizeClasses[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
                </svg>
            )}
            {showLabel && <span className="text-sm font-medium">{isBookmarked ? 'Saved' : 'Save'}</span>}
        </button>
    );
}