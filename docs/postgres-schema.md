# PostgreSQL Schema

This schema maps the frontend domain types in `types.ts` to normalized relational tables.

## ERD (v1)

```mermaid
erDiagram
  clubs ||--o{ users : has
  users ||--o{ user_certifications : has
  clubs ||--o{ shifts : has
  shifts ||--o{ shift_bonuses : has
  clubs ||--o{ lessons : has
  clubs ||--o{ rentals : has
  clubs ||--o{ tasks : has
  tasks ||--o{ task_assignees : has
  clubs ||--o{ leads : has
  clubs ||--o{ availability : has
  clubs ||--o{ confirmed_shifts : has
  clubs ||--o{ sea_events : has
  sea_events ||--o{ event_boats : has
  sea_events ||--o{ event_participants : has
  clubs ||--o{ whatsapp_templates : has
  clubs ||--o{ knowledge_files : has
  clubs ||--o{ club_rental_items : has
  clubs ||--o{ club_rental_statuses : has
  users ||--o{ active_shifts : has
```

## Notes

- `club_id` is present across business tables to support multi-club isolation.
- `shifts.break_minutes` stores the total break time for a closed shift in whole minutes.
- `rentals.overdue_minutes` stores extra minutes beyond the planned rental duration when applicable.
- Join tables normalize arrays from the current state model:
  - `user_certifications`
  - `task_assignees`
  - `club_rental_items`
  - `club_rental_statuses`
- `active_shifts.payload` is JSONB because the active shift in the frontend can be partial.
- Raw card data is being removed from the schema; future deposit flows must keep only provider references and masked display fields.
