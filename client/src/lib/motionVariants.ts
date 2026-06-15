import {
  createElement,
  Fragment,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

export type Variants = Record<string, Record<string, unknown>>;

type MotionExtra = {
  variants?: Variants;
  initial?: string | boolean;
  animate?: string;
  exit?: string;
  layout?: boolean | string;
  layoutId?: string;
};

type MotionProps<T extends ElementType> = ComponentPropsWithoutRef<T> & MotionExtra;

function motionFactory<T extends ElementType>(Tag: T) {
  const MotionComponent = forwardRef<HTMLElement, MotionProps<T>>(
    ({ variants: _v, initial: _i, animate: _a, exit: _e, layout: _l, layoutId: _lid, ...props }, ref) =>
      createElement(Tag, { ref, ...props })
  );
  MotionComponent.displayName = `Motion(${String(Tag)})`;
  return MotionComponent;
}

/** No-op motion elements — same API, zero animation overhead */
export const motion = {
  div: motionFactory("div"),
  tr: motionFactory("tr"),
  button: motionFactory("button"),
  span: motionFactory("span"),
};

export function AnimatePresence({
  children,
}: {
  children?: ReactNode;
  mode?: string;
  initial?: boolean;
}) {
  return createElement(Fragment, null, children);
}

/** Instant page shell — no stagger so route changes feel immediate */
export const pageContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

/** Instant sections — keep motion wrappers without entrance delay */
export const pageItemVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

/** Cards inside dashboards / rankings */
export const cardItemVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

export const sidebarEase = [0.4, 0, 0.2, 1] as const;

export const sidebarLabelVariants: Variants = {
  hidden: { opacity: 1, x: 0 },
  visible: { opacity: 1, x: 0 },
};

export const sidebarBrandMarkVariants: Variants = {
  hidden: { opacity: 1, scale: 1 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 1, scale: 1 },
};

export const sidebarBrandFullVariants: Variants = {
  hidden: { opacity: 1, x: 0 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 1, x: 0 },
};
