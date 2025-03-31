"use client";

import { useState } from "react";
import { Clock, Calendar } from "lucide-react";
import { Switch } from "@/app/components/ui/switch";
import { Button } from "@/app/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Calendar as CalendarComponent } from "@/app/components/ui/calendar";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

export function ScheduleToggle({ scheduled, onToggle }) {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("12:00");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      timeOptions.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  // Handle toggle with date picker visibility
  const handleToggle = () => {
    const newScheduled = !scheduled;
    onToggle(newScheduled, date, time);

    // Show date picker if turning on scheduling
    if (newScheduled) {
      setShowDatePicker(true);
    }
  };

  // Handle date change
  const handleDateChange = (newDate) => {
    if (newDate) {
      setDate(newDate);
      onToggle(scheduled, newDate, time);
    }
  };

  // Handle time change
  const handleTimeChange = (newTime) => {
    setTime(newTime);
    onToggle(scheduled, date, newTime);
  };

  // Format the selected date and time for display
  const formattedDateTime = scheduled
    ? `${format(date, "MMM d, yyyy")} at ${time}`
    : "";

  return (
    <div className="flex items-center mt-4 mb-2">
      <Popover
        open={showDatePicker && scheduled}
        onOpenChange={setShowDatePicker}
      >
        <PopoverTrigger asChild>
          <div
            className={`flex items-center gap-3 px-6 py-3 rounded-full cursor-pointer ${
              scheduled
                ? "bg-primary text-primary-foreground"
                : "bg-transparent border-2 border-muted-foreground/30 text-muted-foreground"
            }`}
            onClick={handleToggle}
          >
            <Clock className="h-5 w-5" />
            <span className="text-base font-medium">
              {scheduled ? formattedDateTime : "Schedule Post"}
            </span>
            <Switch
              checked={scheduled}
              onCheckedChange={handleToggle}
              className="ml-3 scale-110"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="end"
          side="right"
          sideOffset={20}
        >
          <div className="space-y-3 p-3">
            <h4 className="font-medium">Schedule Post</h4>
            <div className="space-y-1">
              <h5 className="text-sm font-medium">Date</h5>
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                initialFocus
                className="rounded-md border"
              />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-medium">Time</h5>
              <Select value={time} onValueChange={handleTimeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((timeOption) => (
                    <SelectItem key={timeOption} value={timeOption}>
                      {timeOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDatePicker(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
