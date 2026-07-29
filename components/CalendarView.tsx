"use client";

import { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import type { EventDropArg, EventClickArg } from "@fullcalendar/core";
import { useCalendar } from "@/lib/queries";
import { useMoveItem, useUpdateItem } from "@/lib/mutations";
import { eventFromRow, minuteOfDayPKT, dayStringPKT } from "@/lib/calendar-events";
import type { DateRange, CalendarView as ViewName } from "@/lib/query-keys";
import type { BoardRow } from "@/lib/types";

// FullCalendar 6 wrapper (daygrid / timegrid / interaction only). Month, week
// and day; both kinds at true scale; timeZone Asia/Karachi with plain date
// strings. Navigation is driven by the app header, so the built-in toolbar is
// off and the view is controlled via the imperative API.

const FC_VIEW: Record<ViewName, string> = {
  month: "dayGridMonth",
  week: "timeGridWeek",
  day: "timeGridDay",
};

export function CalendarView({
  day,
  view,
  range,
  onOpen,
  onPickDay,
}: {
  day: string;
  view: ViewName;
  range: DateRange;
  onOpen: (id: string) => void;
  onPickDay: (day: string) => void;
}) {
  const calendarRef = useRef<FullCalendar>(null);
  const { data } = useCalendar(range);
  const move = useMoveItem();
  const update = useUpdateItem();

  const events = (data ?? []).map(eventFromRow);

  // Keep FullCalendar's view + date in sync with the app's state.
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (api.view.type !== FC_VIEW[view]) api.changeView(FC_VIEW[view], day);
    else api.gotoDate(day);
  }, [day, view]);

  // Register the section-pane rows as external draggables (brief §11, route 2).
  useEffect(() => {
    const container = document.querySelector<HTMLElement>("[data-drag-source]");
    if (!container) return;
    const draggable = new Draggable(container, {
      itemSelector: "[data-item-id]",
      eventData: (el) => ({
        id: el.getAttribute("data-item-id") ?? undefined,
        title: el.getAttribute("data-item-title") ?? "",
      }),
    });
    return () => draggable.destroy();
  }, []);

  function handleEventDrop(arg: EventDropArg | EventResizeDoneArg) {
    const ev = arg.event;
    if (!ev.start) return;
    const newDay = ev.startStr.length >= 10 ? ev.startStr.slice(0, 10) : dayStringPKT(ev.start);
    const startMinute = ev.allDay ? null : minuteOfDayPKT(ev.start);
    move.mutate({ id: ev.id, day: newDay, start_minute: startMinute });
  }

  function handleEventResize(arg: EventResizeDoneArg) {
    const ev = arg.event;
    if (!ev.start || !ev.end) return;
    const minutes = Math.round((ev.end.getTime() - ev.start.getTime()) / 60000);
    if (minutes >= 1 && minutes <= 1440) {
      update.mutate({ id: ev.id, kind: ev.extendedProps.kind as BoardRow["kind"], changes: { duration_minutes: minutes } });
    }
  }

  return (
    <div className="minute-calendar h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={FC_VIEW[view]}
        initialDate={day}
        timeZone="Asia/Karachi"
        headerToolbar={false}
        firstDay={1}
        height="100%"
        nowIndicator
        editable
        droppable
        eventDurationEditable
        snapDuration="00:05:00"
        slotDuration="00:30:00"
        dayMaxEvents={3}
        events={events}
        eventClick={(arg: EventClickArg) => {
          arg.jsEvent.preventDefault();
          onOpen(arg.event.id);
        }}
        dateClick={(arg: DateClickArg) => onPickDay(arg.dateStr.slice(0, 10))}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        drop={(info) => {
          const id = info.draggedEl.getAttribute("data-item-id");
          if (!id) return;
          const newDay = info.dateStr.slice(0, 10);
          const startMinute = info.allDay ? null : minuteOfDayPKT(info.date);
          move.mutate({ id, day: newDay, start_minute: startMinute });
        }}
        eventReceive={(info) => info.event.remove()} // our query state is the source of truth
      />
    </div>
  );
}
