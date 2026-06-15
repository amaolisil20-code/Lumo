import * as React from "react";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const onChange = () => setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    setMatches(mediaQuery.matches);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
