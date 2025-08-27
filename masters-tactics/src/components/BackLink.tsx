// src/components/BackLink.tsx
import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";

type Props = {
  /** rota de fallback se não houver histórico nem state.from */
  fallback?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function BackLink({
  fallback = "/",
  children = "← Back",
  className,
  style,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  // RRv6 grava o índice do histórico em window.history.state.idx
  const canGoBack =
    typeof window !== "undefined" &&
    window.history &&
    typeof window.history.state?.idx === "number" &&
    window.history.state.idx > 0;

  // Se a página anterior foi passada via state, use-a como fallback “inteligente”
  const from = (location.state as any)?.from;
  const fromHref =
    from && typeof from === "object"
      ? `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`
      : undefined;

  const target = fromHref || fallback;

  return (
    <a
      href={target}
      onClick={(e) => {
        e.preventDefault();
        if (canGoBack) navigate(-1);
        else navigate(target);
      }}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}