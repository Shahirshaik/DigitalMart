"use client";

import { MessageCircle } from "lucide-react";

interface Props {
  href: string;
  sellerId: string;
  courseId: string;
}

export function WhatsAppLeadButton({ href, sellerId, courseId }: Props) {
  const handleClick = () => {
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, courseId }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick}
      className="btn-secondary w-full py-2.5 mb-2">
      <MessageCircle className="h-4 w-4" /> Connect on WhatsApp
    </a>
  );
}
