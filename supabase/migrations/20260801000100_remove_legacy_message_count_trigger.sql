-- The legacy production database used an incremental message-count trigger.
-- The migration-managed trigger recalculates the count after inserts, so keeping
-- both causes duplicate conversation writes for every new message.

DROP TRIGGER IF EXISTS messages_count_trigger ON public.messages;
DROP FUNCTION IF EXISTS public.update_conversation_message_count();
