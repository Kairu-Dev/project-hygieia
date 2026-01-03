import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateDynamicTimes = (startTime: string, endTime: string, intervalMinutes: number = 30) => {
  const times = [];

  // Parse start time (format: "07:00" or "7:00")
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Convert to minutes for easier calculation
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Generate times every intervalMinutes
  for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
    const hour = Math.floor(minutes / 60);
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
