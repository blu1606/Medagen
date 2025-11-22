-- Migration: Add tool execution tracking and report generation support
-- This extends the existing schema to capture full agent execution data

-- Create tool_executions table to store all tool calls and results
CREATE TABLE IF NOT EXISTS tool_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  message_id uuid REFERENCES conversation_history(id) ON DELETE CASCADE,
  tool_name text NOT NULL, -- 'derm_cv', 'rag_query', 'triage_rules', 'knowledge_base', 'maps'
  tool_display_name text, -- Human-readable name
  execution_order int NOT NULL, -- Order of execution in the workflow
  input_data jsonb, -- Input parameters passed to tool
  output_data jsonb, -- Full output from tool
  execution_time_ms int, -- Duration in milliseconds
  status text NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create comprehensive_reports table for generated reports
CREATE TABLE IF NOT EXISTS comprehensive_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  report_type text NOT NULL DEFAULT 'full', -- 'full', 'summary', 'tools_only'
  report_content jsonb NOT NULL, -- Full report structure
  report_markdown text, -- Human-readable markdown version
  generated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tool_executions_session_id ON tool_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_message_id ON tool_executions(message_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_tool_name ON tool_executions(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_executions_created_at ON tool_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comprehensive_reports_session_id ON comprehensive_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_reports_user_id ON comprehensive_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_reports_generated_at ON comprehensive_reports(generated_at DESC);

-- Grant permissions
GRANT ALL ON TABLE tool_executions TO service_role;
GRANT ALL ON TABLE comprehensive_reports TO service_role;

GRANT SELECT, INSERT ON TABLE tool_executions TO anon;
GRANT SELECT, INSERT ON TABLE comprehensive_reports TO anon;

-- Enable RLS
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprehensive_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Service role can access all tool executions" ON tool_executions;
CREATE POLICY "Service role can access all tool executions"
  ON tool_executions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous access to tool executions" ON tool_executions;
CREATE POLICY "Allow anonymous access to tool executions"
  ON tool_executions FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can access own tool executions" ON tool_executions;
CREATE POLICY "Users can access own tool executions"
  ON tool_executions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_sessions cs
      WHERE cs.id = tool_executions.session_id
      AND cs.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Service role can access all reports" ON comprehensive_reports;
CREATE POLICY "Service role can access all reports"
  ON comprehensive_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous access to reports" ON comprehensive_reports;
CREATE POLICY "Allow anonymous access to reports"
  ON comprehensive_reports FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can access own reports" ON comprehensive_reports;
CREATE POLICY "Users can access own reports"
  ON comprehensive_reports FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

