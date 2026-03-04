"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export function Accordion({ children, className }: any) {
  return <div className={cn("w-full", className)}>{children}</div>
}

export function AccordionItem({ value, children, className }: any) {
  return <div className={cn("border-b border-border", className)}>{children}</div>
}

export function AccordionTrigger({ children, content, className }: any) {
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between py-3 text-sm font-medium transition-all hover:opacity-80",
          className
        )}
      >
        {children}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AccordionContent open={open}>{content}</AccordionContent>
    </div>
  )
}

export function AccordionContent({ children, open }: any) {
  return (
    <div
      className={cn(
        "overflow-hidden text-sm transition-all",
        open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}
      style={{ transitionDuration: "250ms" }}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  )
}
