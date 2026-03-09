import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@freegull-flow/contracts';
import { SurfaceCard } from '@freegull-flow/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      pin: '',
    },
  });

  return (
    <SurfaceCard className="mx-auto max-w-xl text-right">
      <h2 className="text-2xl font-black">כניסה חדשה ל-web + mobile</h2>
      <p className="mt-2 text-sm text-slate-500">
        הטופס החדש משתמש ב-Zod ו-React Hook Form ויתחבר ל-session API המשותף.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={handleSubmit((values) => {
          console.log('login scaffold', values);
        })}
      >
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-black"
          placeholder="אימייל"
          {...register('identifier')}
        />
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-black"
          placeholder="PIN"
          type="password"
          {...register('pin')}
        />
        {formState.errors.identifier ? (
          <div className="text-sm font-bold text-rose-600">{formState.errors.identifier.message}</div>
        ) : null}
        {formState.errors.pin ? (
          <div className="text-sm font-bold text-rose-600">{formState.errors.pin.message}</div>
        ) : null}
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white">
          התחברות
        </button>
      </form>
    </SurfaceCard>
  );
}
