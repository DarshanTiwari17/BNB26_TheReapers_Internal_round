import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** True when user prefers reduced motion — all parallax must be disabled. */
export function usePrefersReducedMotionSafe() {
  const framerReduced = useReducedMotion();
  const [mqReduced, setMqReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMqReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setMqReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return Boolean(framerReduced) || mqReduced;
}

/** True on touch / coarse-pointer devices — mouse parallax must be off. */
export function useIsCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setCoarse(mq.matches);
    const fn = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return coarse;
}

/** True below the md breakpoint — parallax intensity reduced ~50%. */
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setMobile(mq.matches);
    const fn = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return mobile;
}

/**
 * Intensity factor for parallax distances.
 * Desktop = 1, mobile = 0.5, reduced-motion = 0.
 */
export function useParallaxIntensity() {
  const reduced = usePrefersReducedMotionSafe();
  const mobile = useIsMobile();
  if (reduced) return 0;
  return mobile ? 0.5 : 1;
}
