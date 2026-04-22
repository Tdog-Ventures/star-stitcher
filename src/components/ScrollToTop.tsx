import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router v6 does not reset scroll on route change. Mount this once
 * inside the Router so every navigation lands at the top of the page.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
