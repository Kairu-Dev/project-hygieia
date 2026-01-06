import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateDynamicTimes = (
  startTime: string,
  endTime: string,
  intervalMinutes: number = 30
): Array<{ label: string; value: string }> => {
  // Validate time format
  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    console.error('Invalid time format. Expected HH:MM or H:MM');
    return [];
  }

  const times = [];

  // Parse start time (format: "07:00" or "7:00")
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Validate time values
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    console.error('Hour must be between 0 and 23');
    return [];
  }
  if (startMin < 0 || startMin > 59 || endMin < 0 || endMin > 59) {
    console.error('Minutes must be between 0 and 59');
    return [];
  }

  // Convert to minutes for easier calculation
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle midnight crossover logic
  // If end time is earlier or equal to start time, assume it's next day
  const actualEndMinutes = endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes;

  // Generate times every intervalMinutes
  for (let minutes = startMinutes; minutes < actualEndMinutes; minutes += intervalMinutes) {
    const hour = Math.floor(minutes / 60) % 24; // Ensure 0-23 range
    const min = minutes % 60;

    // Format to 12-hour time
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const timeString = `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;

    times.push({
      label: timeString,
      value: timeString
    });
  }

  return times;
};

export const maskName = (name: string): string => {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0) + "***";
  return parts.map(part => part.charAt(0) + "***").join(" ");
};

export const maskPhone = (phone: string): string => {
  if (!phone) return "";
  const visibleDigits = 4;
  if (phone.length <= visibleDigits) return phone;
  return "*".repeat(phone.length - visibleDigits) + phone.slice(-visibleDigits);
};

export const maskID = (id: string): string => {
  if (!id) return "";
  const visibleChars = 8;
  if (id.length <= visibleChars) return id;
  return id.slice(0, visibleChars) + "...";
};
