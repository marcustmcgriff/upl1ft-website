"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function TurnstileWidget({ onToken, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onToken,
      "expired-callback": () => {
        onExpire?.();
      },
      "error-callback": () => {
        onExpire?.();
      },
      theme: "dark",
      size: "flexible",
    });
  }, [onToken, onExpire]);

  useEffect(() => {
    if (!SITE_KEY) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Load script if not yet present
    const existing = document.querySelector(
      'script[src*="turnstile"]'
    );
    if (!existing) {
      window.onTurnstileLoad = () => {
        setScriptLoaded(true);
      };
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
      script.async = true;
      document.head.appendChild(script);
    } else {
      // Script tag exists but turnstile not ready yet — poll briefly
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          setScriptLoaded(true);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [renderWidget]);

  useEffect(() => {
    if (scriptLoaded) renderWidget();
  }, [scriptLoaded, renderWidget]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="mt-2" />;
}
