"use client";

import { useState, useEffect, useContext, useCallback } from "react";
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
import { usePostData } from "@/app/context/PostDataContext";

// Helper function to format time from Date object
const formatTimeFromDate = (date) => {
  if (!(date instanceof Date) || isNaN(date)) {
    return "12:00"; // Default time if date is invalid
  }
  const hours = date.getHours().toString().padStart(2, "0");
  // Snap minutes to the nearest 30 minutes (00 or 30)
  const minutes = date.getMinutes() < 30 ? "00" : "30";
  return `${hours}:${minutes}`;
};

// Removed props: scheduled, initialDate, onToggle
export function ScheduleToggle() {
  // --- Get Data and Setter from Context ---
  const { postData, setSchedule } = usePostData();
  const { scheduleType, scheduledAt } = postData;
  const isCurrentlyScheduled = scheduleType === "scheduled";
  // ---------------------------------------
  const [showDatePicker, setShowDatePicker] = useState(false);

  const currentDate =
    scheduledAt instanceof Date && !isNaN(scheduledAt)
      ? scheduledAt
      : new Date();
  const currentTime = formatTimeFromDate(scheduledAt);

  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      timeOptions.push(`${formattedHour}:${formattedMinute}`);
    }
  }

  // Helper to combine local date/time state into a Date object
  const getCombinedDateTime = (currentDate, currentTime) => {
    try {
      const dateString = currentDate.toISOString().split("T")[0];
      combinedDateTime = new Date(`${dateString}T${currentTime}`);
      if (isNaN(combinedDateTime.getTime())) {
        throw new Error("Invalid Date object created from local state");
      }
      return combinedDateTime;
    } catch (error) {
      console.error("Error creating combined date from local state:", error);
      return null; // Indicate failure
    }
  };

  // Handle toggle - Calls context setter
  const handleToggle = useCallback(
    (newScheduledState) => {
      if (newScheduledState === isCurrentlyScheduled) {
        console.log(
          "ScheduleToggle handleToggle: No change detected, skipping setSchedule."
        );
        if (!newScheduledState && showDatePicker) {
          setShowDatePicker(false);
        }
        return;
      }

      const newScheduleType = newScheduledState ? "scheduled" : "immediate";
      let dateTimeToSend = null;
      if (newScheduledState) {
        dateTimeToSend = getCombinedDateTime(date, time);
        if (!dateTimeToSend) return; // Don't update context if date creation failed
        setShowDatePicker(true); // Show picker only if turning on
      } else {
        setShowDatePicker(false); // Hide picker if turning off
      }
      console.log(
        "ScheduleToggle: Calling setSchedule from handleToggle",
        newScheduleType,
        dateTimeToSend
      );
      setSchedule(newScheduleType, dateTimeToSend);
    },
    // Dependencies for handleToggle
    [
      isCurrentlyScheduled,
      currentDate,
      currentTime,
      showDatePicker,
      setSchedule,
      setShowDatePicker,
    ]
  );

  // Handle date change - Updates local state and calls context setter
  const handleDateChange = useCallback(
    (newDate) => {
      if (!newDate) {
        return;
        const newDateTime = new Date(newDate);
        newDateTime.setHours(
          parseInt(currentTime.split(":")[0]),
          parseInt(currentTime.split(":")[1])
        );
        setSchedule("scheduled", newDateTime);
      }
    },
    [currentTime, setSchedule] // scheduleType is not needed as we hardcode "scheduled"
  );

  // Handle time change - Updates local state and calls context setter
  const handleTimeChange = useCallback(
    (newTime) => {
      const [hours, minutes] = newTime.split(":");
      const newDateTime = new Date(currentDate);
      newDateTime.setHours(hours, minutes);
      setSchedule("scheduled", newDateTime);
    },
    // Dependencies for handleTimeChange
    [currentDate, setSchedule] // scheduleType is not needed as we hardcode "scheduled"
  );

  // Format the selected date and time for display using local state
  const formattedDateTime = isCurrentlyScheduled
    ? `${format(date, "MMM d, yyyy")} at ${time}`
    : "";

  return (
    <div className="flex items-center mt-4 mb-2 gap-2">
      <Popover
        open={showDatePicker && isCurrentlyScheduled} // Visibility depends on context
        onOpenChange={setShowDatePicker}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`flex items-center gap-2 px-4 py-2 rounded-l-full cursor-pointer transition-colors duration-200 h-auto ${
              // Use rounded-l-full
              isCurrentlyScheduled // Style based on context
                ? "bg-muted/20 border-muted-foreground/30 text-foreground hover:bg-muted/30" // Style when scheduled
                : "border-muted-foreground/30 text-muted-foreground" // Style when not scheduled
            }`}
            disabled={!isCurrentlyScheduled} // Disable based on context
            aria-label="Open date time picker"
          >
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium whitespace-nowrap">
              {/* Display based on context */}
              {isCurrentlyScheduled ? formattedDateTime : "Schedule"}
            </span>
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
                selected={currentDate} // Use local state for picker
                onSelect={handleDateChange}
                initialFocus
                className="rounded-md border"
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
              />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-medium">Time</h5>
              <Select value={currentTime} onValueChange={handleTimeChange}>
                {" "}
                {/* Use local state for picker */}
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

      <Switch
        checked={isCurrentlyScheduled} // Control based on context
        onCheckedChange={handleToggle}
        className="scale-100 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input rounded-r-full border border-l-0 border-muted-foreground/30 px-1 h-[40px] w-[50px] data-[state=checked]:[&>span]:bg-primary-foreground data-[state=checked]:border-primary data-[state=unchecked]:hover:bg-muted/10"
        aria-label={
          isCurrentlyScheduled ? "Disable scheduling" : "Enable scheduling"
        }
      />
    </div>
  );
}
