import { lessonListItemSchema } from '@freegull-flow/contracts';
import { SurfaceCard } from '@freegull-flow/ui';

const lessons = [
  lessonListItemSchema.parse({
    id: 'lesson_1',
    clientName: 'עומר ישראלי',
    date: '2026-03-09',
    time: '10:00',
    instructorName: 'שחר',
    status: 'scheduled',
  }),
];

export function LessonsPage() {
  return (
    <div className="space-y-4">
      <SurfaceCard className="text-right">
        <h2 className="text-2xl font-black">מודול שיעורים</h2>
        <p className="mt-2 text-sm text-slate-500">
          מבוסס על contracts משותפים ומוכן לעבודה מול API חדש.
        </p>
      </SurfaceCard>
      {lessons.map((lesson) => (
        <SurfaceCard key={lesson.id} className="text-right">
          <div className="flex items-center justify-between gap-4">
            <div className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">
              {lesson.status}
            </div>
            <div>
              <div className="text-lg font-black">{lesson.clientName}</div>
              <div className="text-sm text-slate-500">
                {lesson.date} בשעה {lesson.time} עם {lesson.instructorName}
              </div>
            </div>
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}
