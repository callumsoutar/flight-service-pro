"use client";
import React from "react";
import sanitizeHtml from "sanitize-html";

export default function LessonProgressComments({ comments }: { comments?: string | null }) {
  if (!comments) {
    return <span className="text-muted-foreground">No comments provided.</span>;
  }
  const sanitized = sanitizeHtml(comments, {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'u', 'p', 'ul', 'ol', 'li', 'br', 'h3', 'h4', 'h5', 'h6', 'span', 'a'
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
  return (
    <div
      className="text-base text-gray-800 min-h-[60px] prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
} 