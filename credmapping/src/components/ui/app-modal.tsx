"use client"

import * as React from "react"

import { cn } from "~/lib/utils"
import { DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog"

function ModalContent({ className, ...props }: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn("sm:max-w-lg", className)}
      {...props}
    />
  )
}

function ModalContent120({ className, ...props }: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn("sm:max-w-[120px]", className)}
      {...props}
    />
  )
}

function ModalHeader({ className, ...props }: React.ComponentProps<typeof DialogHeader>) {
  return (
    <DialogHeader
      className={cn("text-left", className)}
      {...props}
    />
  )
}

function ModalTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle
      className={cn("text-left", className)}
      {...props}
    />
  )
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex w-full items-center gap-2 [&>*]:flex-1", className)}
      {...props}
    />
  )
}

export { ModalContent, ModalContent120, ModalFooter, ModalHeader, ModalTitle }
