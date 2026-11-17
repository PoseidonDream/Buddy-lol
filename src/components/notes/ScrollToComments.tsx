"use client";

import { useEffect } from "react";

/**
 * The comments stream in after the page, so a link to "#comments" finds
 * nothing to scroll to on arrival. This scrolls there once they're in.
 */
export function ScrollToComments() {
  useEffect(() => {
    if (window.location.hash === "#comments") {
      document.getElementById("comments")?.scrollIntoView({ block: "start" });
    }
  }, []);
  return null;
}
