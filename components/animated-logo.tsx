"use client"

import Link from "next/link"
import { useState, useEffect } from "react"

export function AnimatedLogo() {
  const [flickerStates, setFlickerStates] = useState<boolean[]>([true, true, true, true, true, true, true])
  const letters = ["A", "n", "i", "z", "o", "n", "e"]

  useEffect(() => {
    const flickerAnimation = () => {
      const sequence = [
        [true, false, true, true, true, true, true], // 'n' disappears
        [true, true, false, true, true, true, true], // 'i' disappears
        [false, true, true, true, true, true, true], // 'A' disappears
        [true, true, true, true, false, true, true], // 'o' disappears
        [true, true, true, true, true, false, true], // 'n' disappears
        [true, true, true, false, true, true, true], // 'z' disappears
        [true, true, true, true, true, true, false], // 'e' disappears
        [false, false, false, false, false, false, false], // All disappear
        [true, false, true, false, true, false, true], // Alternating pattern
        [false, true, false, true, false, true, false], // Opposite pattern
        [true, true, true, true, true, true, true], // All reappear
      ]

      let step = 0
      const flickerInterval = setInterval(() => {
        if (step < sequence.length) {
          setFlickerStates(sequence[step])
          step++
        } else {
          clearInterval(flickerInterval)
          setFlickerStates([true, true, true, true, true, true, true])
        }
      }, 200)
    }

    const mainInterval = setInterval(flickerAnimation, 10000)
    return () => clearInterval(mainInterval)
  }, [])

  return (
    <Link
      href="/"
      className="text-lg font-extrabold tracking-tight"
      onMouseEnter={() => {
        setFlickerStates([false, false, false, false, false, false, false])
        setTimeout(() => setFlickerStates([true, true, true, true, true, true, true]), 300)
      }}
    >
      <span className="inline-flex">
        {letters.map((letter, index) => (
          <span
            key={index}
            className={`transition-opacity duration-100 ${flickerStates[index] ? "opacity-100" : "opacity-0"}`}
          >
            {letter}
          </span>
        ))}
      </span>
    </Link>
  )
}
