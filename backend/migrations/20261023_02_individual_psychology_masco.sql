-- Preview-only additive seed for Individual; no personal or production data.
-- Must run after 20261022_01_career_radar.sql.
CREATE TABLE IF NOT EXISTS futureproof.psychology_questions (
  assessment_version TEXT NOT NULL,
  scenario_id TEXT NOT NULL CHECK (scenario_id IN ('S1','S2','S3','S4','S5')),
  title TEXT NOT NULL,
  situation TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL CHECK (jsonb_typeof(options)='object'),
  dimension TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_version,scenario_id)
);
ALTER TABLE futureproof.career_roles ADD COLUMN IF NOT EXISTS masco_code TEXT;
ALTER TABLE futureproof.career_roles ADD COLUMN IF NOT EXISTS role_source_url TEXT;
ALTER TABLE futureproof.career_roles ADD COLUMN IF NOT EXISTS role_source_version TEXT;
ALTER TABLE futureproof.career_roles ADD COLUMN IF NOT EXISTS source_verification TEXT NOT NULL DEFAULT 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS career_roles_masco_unique ON futureproof.career_roles(masco_code) WHERE masco_code IS NOT NULL;
ALTER TABLE futureproof.role_skills ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE futureproof.role_skills ADD COLUMN IF NOT EXISTS model_version TEXT;
ALTER TABLE futureproof.role_skills ADD COLUMN IF NOT EXISTS prompt_version TEXT;
ALTER TABLE futureproof.role_skills ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
ALTER TABLE futureproof.role_skills ADD COLUMN IF NOT EXISTS basis TEXT;
CREATE TABLE IF NOT EXISTS futureproof.dosm_demand_signals (
  role_id TEXT NOT NULL REFERENCES futureproof.career_roles(role_id),
  reporting_period TEXT NOT NULL,
  region TEXT NOT NULL,
  granularity TEXT NOT NULL CHECK (granularity IN ('named_occupation','major_group_context')),
  job_offerings INTEGER CHECK (job_offerings >= 0),
  source_url TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending_value_review','verified','source_conflict')),
  limitations TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id,reporting_period,region)
);
-- Seed only role code/name and traceable links. Do not activate roles until
-- MASCO tasks, model-derived skill rows and demand scope have been validated.
INSERT INTO futureproof.career_roles(role_id,field_id,name,summary,catalogue_version,is_active,masco_code,role_source_url,role_source_version,source_verification)
VALUES
('role_masco_2512','field_data','Software Developers','MASCO metadata candidate; detailed task and skills pending verified import.','masco-2020-pending',false,'2512','https://emasco.mohr.gov.my/system-api/storage/uploads/masco_2020_en.pdf','MASCO 2020','pending'),
('role_masco_2411','field_business','Accountants and Auditors','MASCO metadata candidate; detailed task and skills pending verified import.','masco-2020-pending',false,'2411','https://emasco.mohr.gov.my/system-api/storage/uploads/masco_2020_en.pdf','MASCO 2020','pending'),
('role_masco_2431','field_business','Advertising and Marketing Professionals','MASCO metadata candidate; detailed task and skills pending verified import.','masco-2020-pending',false,'2431','https://emasco.mohr.gov.my/system-api/storage/uploads/masco_2020_en.pdf','MASCO 2020','pending')
ON CONFLICT (role_id) DO NOTHING;
INSERT INTO futureproof.dosm_demand_signals(role_id,reporting_period,region,granularity,job_offerings,source_url,verification_status,limitations)
VALUES
('role_masco_2512','2026-Q2','MY','named_occupation',NULL,'https://www.dosm.gov.my/site/downloadrelease?id=big-data-analytics-job-market-insights-q22026&lang=English','pending_value_review','Occupation/category exact mapping and reported counts require source review; not displayed as verified demand.'),
('role_masco_2411','2026-Q2','MY','named_occupation',NULL,'https://www.dosm.gov.my/site/downloadrelease?id=big-data-analytics-job-market-insights-q22026&lang=English','pending_value_review','Occupation/category exact mapping and reported counts require source review; not displayed as verified demand.'),
('role_masco_2431','2026-Q2','MY','named_occupation',NULL,'https://www.dosm.gov.my/site/downloadrelease?id=big-data-analytics-job-market-insights-q22026&lang=English','pending_value_review','Occupation/category exact mapping and reported counts require source review; not displayed as verified demand.')
ON CONFLICT (role_id,reporting_period,region) DO NOTHING;
INSERT INTO futureproof.psychology_questions (assessment_version,scenario_id,title,situation,prompt,options,dimension) VALUES ('1.0','S1','Navigating Structural Change','Your company announces a major shift in how your department operates. Roles, tools, and daily workflows will be restructured over the next year.','How do you naturally respond to this kind of news?','{"A":"I feel stuck or overwhelmed because it’s hard to predict where my role will end up.","B":"I assume leadership will decide my fate, so I just wait and see what happens to me.","C":"I get worried that my experience won''t hold value anymore, making effort feel pointless.","D":"I look for small, manageable areas within the change where I can build new skills.","E":"Other (Open response)"}'::jsonb,'uncertainty_tolerance') ON CONFLICT (assessment_version,scenario_id) DO NOTHING;
INSERT INTO futureproof.psychology_questions (assessment_version,scenario_id,title,situation,prompt,options,dimension) VALUES ('1.0','S2','Pace of Skill Demands','You notice that the expectations for your field are evolving rapidly. Every few months, new methods and tools are introduced that change how work gets done.','Which statement best matches your internal reaction?','{"A":"No matter how hard I try to learn, the bar keeps moving faster than I can keep up.","B":"I''m capable of learning, but I feel like I''m constantly starting from scratch as a beginner.","C":"I feel confident that my core human judgment and problem-solving matter more than mastering every tool.","D":"I don''t bother trying to learn every new trend; it’s usually just temporary hype.","E":"Other (Open response)"}'::jsonb,'obsolescence_concern') ON CONFLICT (assessment_version,scenario_id) DO NOTHING;
INSERT INTO futureproof.psychology_questions (assessment_version,scenario_id,title,situation,prompt,options,dimension) VALUES ('1.0','S3','Career Ownership & Direction','Think about your professional growth over the next 3 to 5 years.','Who or what do you feel is currently driving your professional trajectory?','{"A":"External market trends, corporate decisions, and economic factors outside my control.","B":"My immediate manager''s demands and whatever my current job requires today.","C":"My own deliberate choices, personal goals, and long-term vision.","D":"Pure chance and luck—I just react to whatever comes my way.","E":"Other (Open response)"}'::jsonb,'career_agency') ON CONFLICT (assessment_version,scenario_id) DO NOTHING;
INSERT INTO futureproof.psychology_questions (assessment_version,scenario_id,title,situation,prompt,options,dimension) VALUES ('1.0','S4','Connection to Work & Purpose','Imagine completing a major project at work after weeks of intense effort.','What thought gives you the deepest sense of satisfaction?','{"A":"I''m just glad it''s over and I checked the box so I can get my paycheck.","B":"I proved that I am capable and expanded my personal mastery.","C":"I solved a real problem that positively impacted other people or a broader cause.","D":"I don''t really feel much satisfaction from work anymore.","E":"Other (Open response)"}'::jsonb,'intrinsic_motivation') ON CONFLICT (assessment_version,scenario_id) DO NOTHING;
INSERT INTO futureproof.psychology_questions (assessment_version,scenario_id,title,situation,prompt,options,dimension) VALUES ('1.0','S5','Approach to Learning & Mastery','You are asked to master a completely new skill set to remain competitive in your field.','When you look at the total list of things you don''t know yet, what is your initial reaction?','{"A":"I freeze—the gap feels too wide, and I don''t know where to start without making a mistake.","B":"I feel anxious, but I try to swallow the whole list at once by frantically cramming.","C":"I prefer to break it down into one tiny, bite-sized step at a time so I can see organic progress.","D":"I feel confident in my ability to learn anything once I have a clear roadmap.","E":"Other (Open response)"}'::jsonb,'learning_self_efficacy') ON CONFLICT (assessment_version,scenario_id) DO NOTHING;
