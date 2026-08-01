-- Split the known legacy Social Skills table into its actual saved-plan topics.
-- This moves complete Markdown rows without rewriting their intervention content.

DO $$
DECLARE
  target_id UUID;
  exercise_block JSONB;
  social_block JSONB;
  review_block JSONB;
  sources_block JSONB;
  table_header TEXT;
  learning_rows TEXT;
  social_rows TEXT;
  school_rows TEXT;
BEGIN
  FOR target_id IN
    SELECT id
    FROM composed_plans
    WHERE title = 'Foot arch and balance routine; Memory and social skills plan'
    ORDER BY created_at
  LOOP
    exercise_block := NULL;
    social_block := NULL;
    review_block := NULL;
    sources_block := NULL;
    table_header := NULL;
    learning_rows := NULL;
    social_rows := NULL;
    school_rows := NULL;

  SELECT block INTO exercise_block
  FROM composed_plans AS plan,
       jsonb_array_elements(plan.intervention_blocks) AS block
  WHERE plan.id = target_id AND lower(block->>'title') = 'exercise & movement'
  LIMIT 1;

  SELECT block INTO social_block
  FROM composed_plans AS plan,
       jsonb_array_elements(plan.intervention_blocks) AS block
  WHERE plan.id = target_id AND lower(block->>'title') = 'social skills'
  LIMIT 1;

  SELECT block INTO review_block
  FROM composed_plans AS plan,
       jsonb_array_elements(plan.intervention_blocks) AS block
  WHERE plan.id = target_id AND lower(block->>'title') = 'review and adjust'
  LIMIT 1;

  SELECT block INTO sources_block
  FROM composed_plans AS plan,
       jsonb_array_elements(plan.intervention_blocks) AS block
  WHERE plan.id = target_id AND lower(block->>'title') = 'plan sources'
  LIMIT 1;

    IF exercise_block IS NULL OR social_block IS NULL THEN
      CONTINUE;
    END IF;

  SELECT string_agg(line, E'\n' ORDER BY position)
  INTO table_header
  FROM unnest(string_to_array(social_block->>'contentMarkdown', E'\n')) WITH ORDINALITY AS row(line, position)
  WHERE position <= 2;

  SELECT string_agg(line, E'\n' ORDER BY position)
  INTO learning_rows
  FROM unnest(string_to_array(social_block->>'contentMarkdown', E'\n')) WITH ORDINALITY AS row(line, position)
  WHERE position > 2
    AND (
      line ILIKE '%The 3-minute school check-in%'
      OR line ILIKE '%One-sentence recap%'
      OR line ILIKE '%Visual reminder wall%'
    );

  SELECT string_agg(line, E'\n' ORDER BY position)
  INTO social_rows
  FROM unnest(string_to_array(social_block->>'contentMarkdown', E'\n')) WITH ORDINALITY AS row(line, position)
  WHERE position > 2
    AND (
      line ILIKE '%Teach 2 "go-to" phrases%'
      OR line ILIKE '%Role-play one scenario%'
    );

  SELECT string_agg(line, E'\n' ORDER BY position)
  INTO school_rows
  FROM unnest(string_to_array(social_block->>'contentMarkdown', E'\n')) WITH ORDINALITY AS row(line, position)
  WHERE position > 2
    AND line ILIKE '%Ask the teacher for one small accommodation%';

    IF table_header IS NULL OR learning_rows IS NULL OR social_rows IS NULL OR school_rows IS NULL THEN
      CONTINUE;
    END IF;

  UPDATE composed_plans
  SET
    topic_categories = ARRAY['exercise', 'learning', 'social', 'school'],
    intervention_blocks = jsonb_build_array(
      exercise_block,
      jsonb_build_object('title', 'Learning Strategies', 'contentMarkdown', table_header || E'\n' || learning_rows),
      jsonb_build_object('title', 'Social Skills', 'contentMarkdown', table_header || E'\n' || social_rows),
      jsonb_build_object('title', 'School Communication', 'contentMarkdown', table_header || E'\n' || school_rows),
      review_block,
      sources_block
    )
    WHERE id = target_id;
  END LOOP;
END $$;
