-- ============ 芽芽轩的小世界 · 留言板数据库 ============
-- 使用方法：在 Supabase 左侧菜单 SQL Editor（SQL 编辑器）里，
-- 把下面整段内容粘贴进去，然后点 Run（运行）。
-- 注意：匿名用户无需登录即可查看和留言；点赞走安全函数，防恶意刷数据。

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 1 and 200),
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

-- 任何人（无需登录）都可以查看和发布留言
create policy "anyone_select" on public.comments for select using (true);
create policy "anyone_insert" on public.comments for insert with check (true);

-- 点赞专用安全函数：只能 +1，不能直接改数值
create or replace function public.increment_likes(comment_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.comments set likes = likes + 1 where id = comment_id;
$$;

revoke all on function public.increment_likes(uuid) from public;
grant execute on function public.increment_likes(uuid) to anon;
