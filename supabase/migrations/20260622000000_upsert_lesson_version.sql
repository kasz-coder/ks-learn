create or replace function public.upsert_lesson_with_version(
  p_workspace_id uuid,
  p_slug text,
  p_title text,
  p_content text
) returns void
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_version integer;
  v_order integer;
  v_old_title text;
  v_old_content text;
begin
  select id, version, "order", title, content
  into v_id, v_version, v_order, v_old_title, v_old_content
  from public.lessons
  where workspace_id = p_workspace_id and slug = p_slug
  for update;

  if found then
    insert into public.lesson_versions (lesson_id, version, title, content)
    values (v_id, v_version, v_old_title, v_old_content);

    update public.lessons
    set title = p_title, content = p_content, version = v_version + 1
    where id = v_id;
  else
    select coalesce(max("order"), 0) + 1
    into v_order
    from public.lessons
    where workspace_id = p_workspace_id;

    insert into public.lessons (workspace_id, slug, title, content, "order", version)
    values (p_workspace_id, p_slug, p_title, p_content, v_order, 1);
  end if;
end;
$$;
