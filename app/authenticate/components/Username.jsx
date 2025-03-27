import Image from "next/image";
import { cn } from "@/app/lib/utils";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/app/components/ui/avatar";

export function Username({ name, email, imageUrl, className }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={imageUrl} alt={name || "User avatar"} />
        <AvatarFallback>
          {name ? name.charAt(0).toUpperCase() : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium leading-none">{name}</span>
        {email && (
          <span className="text-xs text-muted-foreground mt-0.5">{email}</span>
        )}
      </div>
    </div>
  );
}
