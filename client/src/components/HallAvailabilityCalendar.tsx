import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Lock, CalendarX, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface HallAvailabilityCalendarProps {
  hallId: string;
  hallName: string;
  venueOwnerId?: string | null;
  isOwnerView?: boolean;
  selectedDate?: string | null;
  onDateSelect?: (dateStr: string | null, status: "available" | "booked" | "blocked" | "past") => void;
}

interface AvailabilityData {
  hallId: string;
  bookedDates: string[];
  blockedDates: { id: string; date: string; reason: string | null }[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function HallAvailabilityCalendar({ hallId, hallName, venueOwnerId, isOwnerView, selectedDate, onDateSelect }: HallAvailabilityCalendarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [ownerSelectedDate, setOwnerSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false);

  const { data: availability } = useQuery<AvailabilityData>({
    queryKey: [`/api/halls/${hallId}/availability`],
    enabled: !!hallId,
  });

  const blockMutation = useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason: string }) => {
      await apiRequest("POST", `/api/halls/${hallId}/block-date`, { date, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/halls/${hallId}/availability`] });
      setShowBlockForm(false);
      setOwnerSelectedDate(null);
      setBlockReason("");
      toast({ title: "Date blocked successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not block date.", variant: "destructive" });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockedId: string) => {
      await apiRequest("DELETE", `/api/halls/blocked-dates/${blockedId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/halls/${hallId}/availability`] });
      toast({ title: "Date unblocked" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not unblock date.", variant: "destructive" });
    },
  });

  const bookedSet = new Set(availability?.bookedDates || []);
  const blockedMap = new Map(
    (availability?.blockedDates || []).map(bd => [bd.date, bd])
  );

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const canGoPrev = currentYear > today.getFullYear() || (currentYear === today.getFullYear() && currentMonth > today.getMonth());

  const formatDateStr = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${currentYear}-${m}-${d}`;
  };

  const isToday = (day: number) => {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const isPast = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  const canOwnerManage = isOwnerView && user && (user.role === "venue_holder" || user.role === "admin");

  const handleDayClick = (day: number) => {
    if (isPast(day)) {
      onDateSelect?.(null, "past");
      return;
    }
    const dateStr = formatDateStr(day);

    if (canOwnerManage) {
      if (blockedMap.has(dateStr)) {
        const blocked = blockedMap.get(dateStr)!;
        unblockMutation.mutate(blocked.id);
        return;
      }
      if (bookedSet.has(dateStr)) {
        toast({ title: "Cannot modify", description: "This date has an active booking." });
        return;
      }
      setOwnerSelectedDate(dateStr);
      setShowBlockForm(true);
    } else if (onDateSelect) {
      if (bookedSet.has(dateStr)) {
        onDateSelect(dateStr, "booked");
      } else if (blockedMap.has(dateStr)) {
        onDateSelect(dateStr, "blocked");
      } else {
        onDateSelect(dateStr, "available");
      }
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`calendar-hall-${hallId}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-sm">{hallName} — Availability</h4>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-400 inline-block" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-400 inline-block" /> Booked
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-400 inline-block" /> Blocked
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-1 rounded-full hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{MONTHS[currentMonth]} {currentYear}</span>
          <button onClick={nextMonth} className="p-1 rounded-full hover:bg-secondary" data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(day => (
            <div key={day} className="text-center text-[11px] text-foreground/60 font-semibold py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = formatDateStr(day);
            const isBooked = bookedSet.has(dateStr);
            const isBlocked = blockedMap.has(dateStr);
            const past = isPast(day);
            const todayDate = isToday(day);
            const blockedInfo = blockedMap.get(dateStr);
            const isSelected = selectedDate === dateStr;

            let bgClass = "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 cursor-pointer font-medium";
            if (past) {
              bgClass = "bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200";
            } else if (isBooked) {
              bgClass = "bg-red-50 text-red-700 border-red-300 cursor-pointer font-medium";
            } else if (isBlocked) {
              bgClass = "bg-amber-50 text-amber-700 border-amber-300 cursor-pointer font-medium";
              if (canOwnerManage) bgClass += " hover:bg-amber-100";
            } else if (canOwnerManage) {
              bgClass += " cursor-pointer";
            }

            if (isSelected && !past) {
              bgClass += " ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md scale-110 z-10";
            }

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={past}
                className={`relative aspect-square flex items-center justify-center text-xs rounded-lg border transition-all ${bgClass} ${todayDate && !isSelected ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                title={isBooked ? "Booked" : isBlocked ? `Blocked${blockedInfo?.reason ? `: ${blockedInfo.reason}` : ""}` : "Available"}
                data-testid={`day-${dateStr}`}
              >
                {day}
                {isBooked && <Lock className="absolute bottom-0.5 right-0.5 h-2 w-2 opacity-60" />}
                {isBlocked && <CalendarX className="absolute bottom-0.5 right-0.5 h-2 w-2 opacity-60" />}
              </button>
            );
          })}
        </div>
      </div>

      {showBlockForm && ownerSelectedDate && canOwnerManage && (
        <div className="p-4 border-t border-border bg-background/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Block {ownerSelectedDate}</p>
            <button
              onClick={() => { setShowBlockForm(false); setOwnerSelectedDate(null); setBlockReason(""); }}
              className="p-1 rounded-full hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Reason (e.g., Reserved outside platform)"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary mb-3"
            data-testid="input-block-reason"
          />
          <Button
            size="sm"
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white gap-2"
            onClick={() => blockMutation.mutate({ date: ownerSelectedDate, reason: blockReason })}
            disabled={blockMutation.isPending}
            data-testid="button-confirm-block"
          >
            <Plus className="h-3 w-3" /> Block This Date
          </Button>
        </div>
      )}

      {canOwnerManage && !showBlockForm && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-muted-foreground text-center">
            Tap an available date to block it. Tap a blocked date to unblock it.
          </p>
        </div>
      )}
    </div>
  );
}
