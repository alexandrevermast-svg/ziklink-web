import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={`flex min-h-20 w-full rounded-md border border-zik-border bg-zik-card px-3 py-2 text-sm text-zik-text placeholder:text-zik-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zik-purple/50 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }