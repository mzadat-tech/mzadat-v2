'use client'

import { useEffect, useState, useCallback } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

export function useCountdown(endDate: Date | string | null): TimeLeft {
  const calculateTimeLeft = useCallback((): TimeLeft => {
    if (!endDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }

    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    const total = end.getTime() - Date.now()

    if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }

    return {
      days: Math.floor(total / (1000 * 60 * 60 * 24)),
      hours: Math.floor((total / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((total / (1000 * 60)) % 60),
      seconds: Math.floor((total / 1000) % 60),
      total,
    }
  }, [endDate])

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [calculateTimeLeft])

  return timeLeft
}
