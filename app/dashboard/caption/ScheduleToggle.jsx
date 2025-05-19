"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Clock } from "lucide-react";
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
import { usePostStore } from "@/app/lib/store/postStore";

// Helper to format time, ensuring valid Date input
const formatTimeFromDate = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "00:00"; // Default or suitable fallback
  }
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes() < 30 ? "00" : "30";
  return `${hours}:${minutes}`;
};

// New helper to create a valid Date object from local parts
const createValidDateFromParts = (dateOnly, timeString_HH_MM) => {
  try {
    if (!(dateOnly instanceof Date) || isNaN(dateOnly.getTime())) {
      // console.error("Invalid dateOnly part provided to createValidDateFromParts:", dateOnly);
      return null;
    }
    if (
      typeof timeString_HH_MM !== "string" ||
      !timeString_HH_MM.match(/^\d{2}:\d{2}$/)
    ) {
      // console.error("Invalid timeString_HH_MM part provided to createValidDateFromParts:", timeString_HH_MM);
      return null;
    }

    const [hours, minutes] = timeString_HH_MM.split(":").map(Number);
    // Create new Date using local year, month, day from dateOnly, and new hours, minutes
    const newDate = new Date(
      dateOnly.getFullYear(),
      dateOnly.getMonth(),
      dateOnly.getDate(),
      hours,
      minutes,
      0,
      0
    );

    if (isNaN(newDate.getTime())) {
      // console.error("Failed to create valid date from parts in createValidDateFromParts");
      return null;
    }
    return newDate;
  } catch (error) {
    console.error("Exception in createValidDateFromParts:", error);
    return null;
  }
};

// Add this near the top of your component file
const MemoizedSwitch = memo(({ checked, onCheckedChange, ...props }) => (
  <Switch checked={checked} onCheckedChange={onCheckedChange} {...props} />
));

const PopoverButton = memo(function PopoverButton({
  isCurrentlyScheduled,
  formattedDateTime,
  onClick,
}) {
  return (
    <Button
      variant="outline"
      className={`flex items-center gap-2 px-4 py-2 rounded-l-full cursor-pointer transition-colors duration-200 h-auto ${
        isCurrentlyScheduled
          ? "bg-muted/20 border-muted-foreground/30 text-foreground hover:bg-muted/30"
          : "border-muted-foreground/30 text-muted-foreground"
      }`}
      disabled={!isCurrentlyScheduled}
      aria-label={
        isCurrentlyScheduled && formattedDateTime
          ? `Change schedule: ${formattedDateTime}`
          : "Schedule for later"
      }
      onClick={onClick}
    >
      <Clock className="h-5 w-5" />
      <span className="text-sm font-medium whitespace-nowrap">
        {isCurrentlyScheduled && formattedDateTime
          ? formattedDateTime
          : "Schedule"}
      </span>
    </Button>
  );
});

export function ScheduleToggle() {
  // --- Zustand Store ---
  const scheduleType = usePostStore((state) => state.scheduleType);
  const scheduledAt = usePostStore((state) => state.scheduledAt);
  const setSchedule = usePostStore((state) => state.setSchedule);

  const isCurrentlyScheduled = scheduleType === "scheduled";
  const [showDatePicker, setShowDatePicker] = useState(false);

  // displayDate is now memoized and ensures a valid Date object is returned
  const displayDate = useMemo(() => {
    if (!scheduledAt) return new Date();

    try {
      const date = new Date(scheduledAt);
      // Check if the result is a valid date
      if (isNaN(date.getTime())) {
        console.warn("Invalid scheduledAt in ScheduleToggle:", scheduledAt);
        return new Date(); // Return current date as fallback
      }
      return date;
    } catch (error) {
      console.error("Error parsing scheduledAt in ScheduleToggle:", error);
      return new Date(); // Return current date as fallback
    }
  }, [scheduledAt]);

  // displayTime is string "HH:MM" derived from displayDate
  const displayTime = useMemo(() => {
    return formatTimeFromDate(displayDate);
  }, [displayDate]);

  // --- Time Options ---
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        options.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return options;
  }, []);
  // --- End Time Options ---

  // --- Handlers ---
  const handleToggle = useCallback(
    (newScheduledState) => {
      const desiredScheduleType = newScheduledState ? "scheduled" : "immediate";

      if (desiredScheduleType === "scheduled") {
        // When enabling scheduling, set a future date (30 minutes from now)
        const futureDate = new Date();
        futureDate.setMinutes(futureDate.getMinutes() + 30);

        // Make sure we're using 30-minute intervals
        const minutes = futureDate.getMinutes();
        futureDate.setMinutes(minutes - (minutes % 30));

        setSchedule("scheduled", futureDate);
        setShowDatePicker(true); // Show date picker immediately when scheduling is enabled
      } else {
        setSchedule("immediate", null);
        setShowDatePicker(false);
      }
    },
    [setSchedule]
  );

  const handleDateChange = useCallback(
    (newDateFromCalendar) => {
      if (!newDateFromCalendar) return;
      const combinedDateTime = createValidDateFromParts(
        newDateFromCalendar,
        displayTime
      );
      if (combinedDateTime) {
        console.log(
          "Setting schedule with combined date/time",
          combinedDateTime.toISOString()
        );
        setSchedule("scheduled", combinedDateTime);
      } else {
        console.error(
          "ScheduleToggle: Failed to create valid date in handleDateChange"
        );
      }
    },
    [displayTime, setSchedule]
  );

  const handleTimeChange = useCallback(
    (newTime_HH_MM) => {
      const combinedDateTime = createValidDateFromParts(
        displayDate,
        newTime_HH_MM
      );
      if (combinedDateTime) {
        setSchedule("scheduled", combinedDateTime);
      } else {
        console.error(
          "ScheduleToggle: Failed to create valid date in handleTimeChange"
        );
      }
    },
    [displayDate, setSchedule]
  );

  const handleOpenChange = useCallback((open) => {
    setShowDatePicker(open);
  }, []);

  const handleButtonClick = useCallback(() => {
    if (isCurrentlyScheduled) {
      setShowDatePicker(true);
    } else {
      // If not scheduled, toggle to scheduled mode and show date picker
      handleToggle(true);
    }
  }, [isCurrentlyScheduled, handleToggle]);

  // Create formatted date time string
  const formattedDateTime = useMemo(() => {
    // Only format when scheduled and display date is valid
    if (
      isCurrentlyScheduled &&
      displayDate instanceof Date &&
      !isNaN(displayDate.getTime())
    ) {
      try {
        // Use the date and displayTime string which is already formatted
        return `${format(displayDate, "MMM d, yyyy")} at ${displayTime}`;
      } catch (error) {
        console.error("Error formatting date in ScheduleToggle:", error);
        return "Invalid date"; // Fallback text
      }
    }
    return "";
  }, [isCurrentlyScheduled, displayDate, displayTime]);

  return (
    <div className="flex flex-col mt-4 mb-2">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          {isCurrentlyScheduled && (
            <Popover open={showDatePicker} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="inline-flex justify-between items-center max-w-fit bg-muted/10 rounded-full px-4 py-2 text-sm"
                  onClick={() => setShowDatePicker(true)}
                >
                  <span>{formattedDateTime || "Select date and time"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="start"
                side="bottom"
                sideOffset={5}
              >
                <div className="space-y-3 p-3">
                  <h4 className="font-medium">Schedule Post</h4>
                  <div className="space-y-1">
                    <h5 className="text-sm font-medium">Date</h5>
                    <CalendarComponent
                      mode="single"
                      selected={displayDate}
                      onSelect={handleDateChange}
                      initialFocus
                      className="rounded-md border"
                      disabled={(d) =>
                        d < new Date(new Date().setHours(0, 0, 0, 0))
                      } // Disable past dates
                    />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-medium">Time</h5>
                    <Select
                      value={displayTime}
                      onValueChange={handleTimeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px] overflow-y-auto">
                        {timeOptions.map((timeOption) => (
                          <SelectItem key={timeOption} value={timeOption}>
                            {timeOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="border-t mt-3 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-primary">
                        {formattedDateTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{formattedDateTime}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDatePicker(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer transition-colors duration-200 ${
            isCurrentlyScheduled
              ? "bg-primary/15 border border-primary/20"
              : "bg-muted/15 border border-muted-foreground/20"
          }`}
          onClick={() => handleToggle(!isCurrentlyScheduled)}
        >
          <span
            className={`text-sm font-medium ${
              isCurrentlyScheduled ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Schedule Post
          </span>
          <MemoizedSwitch
            id="schedule-toggle"
            checked={isCurrentlyScheduled}
            onCheckedChange={handleToggle}
            className="h-5 w-9 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/20"
          />
        </div>
      </div>
    </div>
  );
}
