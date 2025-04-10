"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

// Array of testimonials to rotate through
const testimonials = [
  {
    quote:
      "Postmore has completely transformed how we manage our social media presence. The scheduling feature saves us hours each week.",
    author: "Sofia Davis",
    role: "Social Media Manager",
  },
  {
    quote:
      "We've increased our engagement by 40% since using Postmore. The analytics provide valuable insights that help us optimize our content strategy.",
    author: "Michael Chen",
    role: "Marketing Director",
  },
  {
    quote:
      "The multi-platform posting feature is a game-changer. One click and our content goes everywhere we need it to be.",
    author: "Aisha Johnson",
    role: "Content Creator",
  },
  {
    quote:
      "As a small business owner, Postmore has made social media management feasible for me. It's intuitive and time-saving.",
    author: "James Wilson",
    role: "Entrepreneur",
  },
];

export function LoginReviews() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState("up"); // "up" or "down"
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Handle rotation of testimonials
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      if (!isAnimating) {
        rotateTestimonial();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentIndex, isAnimating, isVisible]);

  // Toast-like animation for rotating testimonials
  const rotateTestimonial = () => {
    if (!isVisible) return;

    setIsAnimating(true);

    // First animate out current testimonial (move up and fade out)
    setDirection("up");

    // After animation out completes, change to next testimonial
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
      setDirection("down"); // Next testimonial comes in from bottom

      // Animation complete
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }, 500);
  };

  // Dismiss the testimonial card
  const dismissCard = () => {
    // Store dismissal in localStorage to remember user preference
    if (typeof window !== "undefined") {
      localStorage.setItem("testimonial-dismissed", "true");
    }
    setDirection("right");
    setTimeout(() => {
      setIsVisible(false);
    }, 500);
  };

  // Check if card was previously dismissed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed =
        localStorage.getItem("testimonial-dismissed") === "true";
      setIsVisible(!isDismissed);
    }
  }, []);

  const currentTestimonial = testimonials[currentIndex];

  // Calculate animation properties based on direction
  const getAnimationProps = () => {
    if (direction === "up") {
      return {
        initial: { y: 0, opacity: 1 },
        animate: { y: -100, opacity: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      };
    } else if (direction === "down") {
      return {
        initial: { y: 100, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      };
    } else if (direction === "right") {
      return {
        initial: { x: 0, opacity: 1 },
        animate: { x: 300, opacity: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      };
    }
  };

  if (!isVisible) return null;
  const animationProps = getAnimationProps();

  return (
    <motion.div
      className="relative z-20 mt-auto w-full"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative backdrop-blur-sm bg-white/10 dark:bg-black/10 rounded-xl border border-white/20 shadow-lg p-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={dismissCard}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          aria-label="Dismiss testimonial"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="relative overflow-hidden">
          <motion.div
            key={currentIndex + direction}
            initial={animationProps.initial}
            animate={animationProps.animate}
            transition={animationProps.transition}
            className="w-full"
          >
            <blockquote className="space-y-2">
              <p className="text-lg text-white">
                &ldquo;{currentTestimonial.quote}&rdquo;
              </p>
              <footer className="text-sm text-white/70">
                <span className="font-medium">{currentTestimonial.author}</span>{" "}
                - {currentTestimonial.role}
              </footer>
            </blockquote>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
