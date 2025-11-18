-- Migration: Add agent_name and additional columns to hitl_feedback
-- Version: 009
-- Description: Extend hitl_feedback table to support new HITL manager

-- First, make conversation_id nullable (HITL can work without conversations)
ALTER TABLE hitl_feedback 
ALTER COLUMN conversation_id DROP NOT NULL;

-- Add agent_name column
ALTER TABLE hitl_feedback 
ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100);

-- Add action_type column (for feedback about specific actions)
ALTER TABLE hitl_feedback 
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);

-- Add sentiment column (positive, negative, neutral)
ALTER TABLE hitl_feedback 
ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20);

-- Add rating column (1-5 stars)
ALTER TABLE hitl_feedback 
ADD COLUMN IF NOT EXISTS rating INTEGER;

-- Add comment column (freeform feedback)
ALTER TABLE hitl_feedback 
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add feedback_data column (JSONB for structured data)
ALTER TABLE hitl_feedback 
ADD COLUMN IF NOT EXISTS feedback_data JSONB;

-- Add constraint for rating (1-5)
ALTER TABLE hitl_feedback 
ADD CONSTRAINT check_rating_range 
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Add constraint for sentiment
ALTER TABLE hitl_feedback 
ADD CONSTRAINT check_sentiment_valid 
CHECK (sentiment IS NULL OR sentiment IN ('positive', 'negative', 'neutral'));

-- Create index for agent_name
CREATE INDEX IF NOT EXISTS idx_hitl_feedback_agent_name ON hitl_feedback(agent_name);

-- Create index for action_type
CREATE INDEX IF NOT EXISTS idx_hitl_feedback_action_type ON hitl_feedback(action_type);

-- Create index for sentiment
CREATE INDEX IF NOT EXISTS idx_hitl_feedback_sentiment ON hitl_feedback(sentiment);

-- Create index for rating
CREATE INDEX IF NOT EXISTS idx_hitl_feedback_rating ON hitl_feedback(rating);

-- Update existing rows to have default values
UPDATE hitl_feedback 
SET 
    agent_name = COALESCE(agent_name, 'legacy'),
    action_type = COALESCE(action_type, feedback_type),
    sentiment = COALESCE(sentiment, 'neutral'),
    rating = COALESCE(rating, 3)
WHERE agent_name IS NULL;

COMMENT ON COLUMN hitl_feedback.conversation_id IS 'Optional conversation ID (can be NULL for standalone HITL requests)';
COMMENT ON COLUMN hitl_feedback.agent_name IS 'Name of the agent that generated the request (TaskAgent, BoardAgent, etc.)';
COMMENT ON COLUMN hitl_feedback.action_type IS 'Type of action being confirmed (task_update, deadline_change, etc.)';
COMMENT ON COLUMN hitl_feedback.sentiment IS 'User sentiment about the action (positive, negative, neutral)';
COMMENT ON COLUMN hitl_feedback.rating IS 'User rating of the action (1-5 stars)';
COMMENT ON COLUMN hitl_feedback.comment IS 'Freeform user feedback comment';
COMMENT ON COLUMN hitl_feedback.feedback_data IS 'Structured feedback data (JSON)';
