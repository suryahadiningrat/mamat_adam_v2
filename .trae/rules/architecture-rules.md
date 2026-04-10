Image generation is always async. Always use poll pattern with image_task_id stored in DB.
All scene images must generate in PARALLEL, never sequentially (use Promise.all).
Every storyboard generation must save to: storyboard_sessions, storyboards, scenes, and chat_messages.
RLS is always enabled. Never bypass with service_role on client side.