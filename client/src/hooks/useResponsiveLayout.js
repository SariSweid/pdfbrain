import { useEffect, useState } from "react";

function getViewport() {
  if (typeof window === "undefined") {
    return { width: 1200, isMobile: false, isTablet: false, isCompact: false };
  }

  const width = window.innerWidth;
  const isMobile = width <= 700;
  const isTablet = width > 700 && width <= 1024;

  return {
    width,
    isMobile,
    isTablet,
    isCompact: isMobile || isTablet,
  };
}

export function useResponsiveLayout() {
  const [viewport, setViewport] = useState(getViewport);

  useEffect(() => {
    const handleResize = () => setViewport(getViewport());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewport;
}
