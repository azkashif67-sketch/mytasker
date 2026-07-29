// ---------------------------------------------------------------------
// PLACEHOLDER generated-types file.
//
// Regenerate from the live database once the Supabase project exists:
//   npm run gen:types           (uses SUPABASE_PROJECT_ID)
// or
//   supabase gen types typescript --project-id <ref> --schema public > lib/types.ts
//
// Hand-written here to mirror supabase/schema.sql (Appendix A) so the app
// type-checks before a project is provisioned. Keep in sync with the schema
// until the generated version replaces it.
// ---------------------------------------------------------------------

export type ItemKind = "task" | "goal";
export type ItemStatus = "unfinished" | "ongoing" | "completed";

// NOTE: the row/insert shapes below are `type` aliases, not interfaces, on
// purpose — supabase-js requires each to be assignable to Record<string,
// unknown> (GenericSchema), and interfaces are not implicitly assignable to an
// index signature. Keep them as `type` when regenerating by hand.

/** Columns shared by the writable `tasks` / `goals` views. */
type SectionViewRow = {
  id: string;
  user_id: string;
  kind: ItemKind;
  title: string;
  notes: string | null;
  day: string; // 'YYYY-MM-DD'
  start_minute: number | null;
  duration_minutes: number | null;
  status: ItemStatus;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

type SectionViewInsert = {
  id?: string;
  user_id?: string;
  kind?: ItemKind; // defaults correctly per view
  title: string;
  notes?: string | null;
  day?: string;
  start_minute?: number | null;
  duration_minutes?: number | null;
  status?: ItemStatus;
  sort_order?: number;
}

type SectionViewUpdate = Partial<SectionViewInsert>;

/** Enriched read rows from `*_board` / `calendar` (brief §5). */
export type BoardRow = {
  id: string;
  user_id: string;
  kind: ItemKind;
  title: string;
  notes: string | null;
  day: string;
  day_label: string;
  start_minute: number | null;
  duration_minutes: number | null;
  block: string | null;
  status: ItemStatus;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
  is_overlapped: boolean;
  overlaps_with_ids: string[];
  overlaps_with_titles: string[];
}

/** Per-day load row from `daily_load` (brief §5). */
export type DailyLoadRow = {
  user_id: string;
  day: string;
  day_label: string;
  minutes_allotted: number;
  goal_minutes: number;
  task_minutes: number;
  daily_budget_minutes: number;
  over_budget: boolean;
  unfinished_count: number;
  ongoing_count: number;
  completed_count: number;
}

export type SettingsRow = {
  user_id: string;
  timezone: string;
  daily_budget_minutes: number;
  week_starts_on: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      settings: {
        Row: SettingsRow;
        Insert: Partial<SettingsRow>;
        Update: Partial<SettingsRow>;
        Relationships: [];
      };
    };
    Views: {
      tasks: {
        Row: SectionViewRow;
        Insert: SectionViewInsert;
        Update: SectionViewUpdate;
        Relationships: [];
      };
      goals: {
        Row: SectionViewRow;
        Insert: SectionViewInsert;
        Update: SectionViewUpdate;
        Relationships: [];
      };
      tasks_board: { Row: BoardRow; Relationships: [] };
      goals_board: { Row: BoardRow; Relationships: [] };
      items_board: { Row: BoardRow; Relationships: [] };
      calendar: { Row: BoardRow; Relationships: [] };
      daily_load: { Row: DailyLoadRow; Relationships: [] };
    };
    Functions: {
      move_item: {
        Args: { p_id: string; p_day: string; p_start_minute?: number | null };
        Returns: unknown;
      };
      move_items: {
        Args: { p_ids: string[]; p_day: string };
        Returns: number;
      };
      trash_item: { Args: { p_id: string }; Returns: undefined };
      restore_item: { Args: { p_id: string }; Returns: undefined };
      purge_trash: { Args: Record<string, never>; Returns: number };
      today_pkt: { Args: Record<string, never>; Returns: string };
      fmt_day: { Args: { d: string }; Returns: string };
    };
    Enums: {
      item_kind: ItemKind;
      item_status: ItemStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
