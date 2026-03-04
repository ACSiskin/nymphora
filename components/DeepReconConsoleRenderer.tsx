"use client"

import { useEffect, useState } from "react"
import { useNymphoraConsole } from "./NymphoraConsoleContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Copy, Terminal, Globe, Activity, Search, Bug } from "lucide-react"
import { cn } from "@/lib/utils"

const toolIcons: Record<string, any> = {
  rustscan: <Activity size={16} />,
  naabu: <Terminal size={16} />,
  nmap: <Search size={16} />,
  whatweb: <Globe size={16} />,
  dns: <Globe size={16} />,
  whois: <Search size={16} />,
  amass: <Activity size={16} />,
  nuclei: <Bug size={16} />,
}

export function DeepReconConsoleRenderer() {
  const { consoleMessages } = useNymphoraConsole()
  const [deepMessages, setDeepMessages] = useState<any[]>([])

  useEffect(() => {
    setDeepMessages(
      consoleMessages.filter((m) => m.type === "deep-recon").sort((a, b) => b.timestamp - a.timestamp)
    )
  }, [consoleMessages])

  if (deepMessages.length === 0)
    return (
      <div className="text-muted-foreground text-sm text-center p-4">
        No Deep Recon logs yet.
      </div>
    )

  return (
    <ScrollArea className="h-[400px] rounded-md border bg-background/40 backdrop-blur-sm p-2">
      {deepMessages.map((msg) => (
        <Card
          key={msg.id}
          className={cn(
            "mb-3 bg-background/60 border border-border/40 shadow-sm hover:shadow-md transition-all duration-200",
            "rounded-2xl"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
            <div className="flex items-center space-x-2">
              {toolIcons[msg.tool] ?? <Terminal size={16} />}
              <CardTitle className="text-sm font-semibold capitalize">
                {msg.tool}
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </CardHeader>

          <CardContent className="p-3 pt-2">
            <pre className="whitespace-pre-wrap text-xs font-mono leading-tight text-foreground/90 max-h-[200px] overflow-y-auto">
              {msg.content}
            </pre>
            <div className="flex justify-end mt-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => navigator.clipboard.writeText(msg.content)}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </ScrollArea>
  )
}
