"use client"

import { useEffect } from "react"

export default function TestErrorPage() {
  useEffect(() => {
    // This will trigger the error boundary and show your custom 500 page
    throw new Error("Test error for 500 page")
  }, [])

  return <div>This should not render</div>
}
