-- Trigger: Apply metadata before insert or update
-- ---------------------------------------------------------
-- LangChain inserts embeddings automatically; this trigger
-- allows customizing the insert by populating columns based on the provided document metadata.
CREATE TRIGGER langchain_embeddings_apply_metadata
BEFORE INSERT OR UPDATE ON public.embeddings
FOR EACH ROW
EXECUTE FUNCTION langchain.embeddings_apply_metadata();