'use client'

import { motion, type Variants } from 'framer-motion'
import { type ComponentProps } from 'react'

// ─── Reusable animation variants ───

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

export const slideInFromRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.3 } },
}

export const slideInFromLeft: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { x: '-100%', opacity: 0, transition: { duration: 0.3 } },
}

// ─── Motion Components ───

export const MotionDiv = motion.div
export const MotionSection = motion.section
export const MotionSpan = motion.span
export const MotionH1 = motion.h1
export const MotionH2 = motion.h2
export const MotionP = motion.p
export const MotionNav = motion.nav
export const MotionUl = motion.ul
export const MotionLi = motion.li
export const MotionA = motion.a
export const MotionImg = motion.img
export const MotionButton = motion.button
export const MotionHeader = motion.header
export const MotionFooter = motion.footer
export const MotionArticle = motion.article

// ─── Animated wrapper components ───

interface AnimatedSectionProps extends ComponentProps<typeof motion.section> {
  delay?: number
}

export function AnimatedSection({ children, delay = 0, ...props }: AnimatedSectionProps) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: 'easeOut', delay },
        },
      }}
      {...props}
    >
      {children}
    </motion.section>
  )
}

export function StaggerGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

export function FloatingElement({
  children,
  className,
  duration = 3,
  distance = 10,
}: {
  children: React.ReactNode
  className?: string
  duration?: number
  distance?: number
}) {
  return (
    <motion.div
      animate={{ y: [-distance, distance, -distance] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function CountUpNumber({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {value.toLocaleString()}
      </motion.span>
    </motion.span>
  )
}
