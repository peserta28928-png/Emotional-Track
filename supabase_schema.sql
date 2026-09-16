-- EmoTrack AutoBK MultiUser — Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher','student')),
  full_name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, join_code text not null unique, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.class_students (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(class_id,student_id)
);
create table if not exists public.emotion_entries (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  mood_id text not null check(mood_id in ('happy','calm','excited','sad','anxious','angry')),
  intensity smallint not null check(intensity between 1 and 5), private_note text, created_at timestamptz not null default now()
);
create table if not exists public.bk_followups (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade, teacher_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'baru' check(status in ('baru','dipantau','dihubungi','selesai')), service_type text,
  followup_note text, followup_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.is_class_teacher(p_class uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.classes where id=p_class and teacher_id=auth.uid()); $$;

-- Join by code is the only student-side class discovery path; it does not expose all classes.
create or replace function public.join_class_by_code(p_join_code text) returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid; begin
 select id into c from public.classes where active=true and upper(join_code)=upper(trim(p_join_code));
 if c is null then raise exception 'Kode kelas tidak ditemukan atau kelas tidak aktif'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and role='student') then raise exception 'Hanya akun siswa yang dapat bergabung dengan kelas'; end if;
 insert into public.class_students(class_id,student_id) values(c,auth.uid()) on conflict do nothing;
 return c;
end; $$;
revoke all on function public.join_class_by_code(text) from public; grant execute on function public.join_class_by_code(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.emotion_entries enable row level security;
alter table public.bk_followups enable row level security;

-- Drop policies so this script can safely be re-run.
do $$ declare r record; begin for r in select policyname,tablename from pg_policies where schemaname='public' and tablename in ('profiles','classes','class_students','emotion_entries','bk_followups') loop execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename); end loop; end $$;

create policy profiles_self on public.profiles for select using(id=auth.uid());
create policy profiles_insert_self on public.profiles for insert with check(id=auth.uid());
create policy profiles_update_self on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());

create policy classes_teacher_all on public.classes for all using(teacher_id=auth.uid()) with check(teacher_id=auth.uid());
create policy classes_student_joined on public.classes for select using(exists(select 1 from public.class_students cs where cs.class_id=id and cs.student_id=auth.uid()));

create policy membership_student_self on public.class_students for select using(student_id=auth.uid());
create policy membership_teacher_read on public.class_students for select using(public.is_class_teacher(class_id));

create policy entries_student_own on public.emotion_entries for all using(student_id=auth.uid()) with check(student_id=auth.uid() and exists(select 1 from public.class_students cs where cs.class_id=emotion_entries.class_id and cs.student_id=auth.uid()));
create policy entries_teacher_read on public.emotion_entries for select using(public.is_class_teacher(class_id));

create policy followups_teacher_own on public.bk_followups for all using(teacher_id=auth.uid() and public.is_class_teacher(class_id)) with check(teacher_id=auth.uid() and public.is_class_teacher(class_id));

-- Views used only by future reporting/integrations; journal text is intentionally present only for the teacher's own class through RLS-backed base queries.
create or replace view public.bk_student_summary as
select e.class_id,e.student_id,p.full_name,count(*) total_entries,
 count(*) filter(where e.mood_id='happy') happy,count(*) filter(where e.mood_id='calm') calm,count(*) filter(where e.mood_id='excited') excited,
 count(*) filter(where e.mood_id='sad') sad,count(*) filter(where e.mood_id='anxious') anxious,count(*) filter(where e.mood_id='angry') angry,
 max(e.created_at) last_checkin,max(e.intensity) filter(where e.created_at=(select max(e2.created_at) from public.emotion_entries e2 where e2.student_id=e.student_id and e2.class_id=e.class_id)) last_intensity
from public.emotion_entries e join public.profiles p on p.id=e.student_id group by e.class_id,e.student_id,p.full_name;
create or replace view public.bk_student_journals as
select e.id,e.class_id,e.student_id,p.full_name,e.mood_id,e.intensity,e.private_note as journal_text,e.created_at
from public.emotion_entries e join public.profiles p on p.id=e.student_id;
