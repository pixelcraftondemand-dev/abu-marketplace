"use client";

import { motion } from "framer-motion";

/**
 * Reusable scroll-triggered reveal wrapper.
 *
 * Props:
 *  - direction: "up" | "down" | "left" | "right" | "none"  (default "up")
 *  - delay: seconds before animation starts (default 0)
 *  - duration: animation duration in seconds (default 0.5)
 *  - className: extra classes on the wrapper
 *  - once: trigger only once (default true)
 *  - amount: how much of the element must be visible to trigger (0-1, default 0.2)
 */

const offsets = {
  up: { y: 40, x: 0 },
  down: { y: -40, x: 0 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
  none: { x: 0, y: 0 },
};

export default function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.5,
  className = "",
  once = true,
  amount = 0.2,
}) {
  const offset = offsets[direction] || offsets.up;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered grid reveal — wraps a list of items so they animate in sequence.
 *
 * Usage:
 *   <StaggerReveal className="grid grid-cols-2 gap-4">
 *     {items.map(item => <Card key={item.id} ... />)}
 *   </StaggerReveal>
 */
export function StaggerReveal({
  children,
  className = "",
  stagger = 0.08,
  once = true,
  amount = 0.15,
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger item — use inside StaggerReveal. Each child gets fade+rise.
 */
export function StaggerItem({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
