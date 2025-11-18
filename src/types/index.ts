export interface Location {
  lat: number;
  lng: number;
}

export interface HealthCheckRequest {
  text: string;
  image_url?: string;
  user_id: string;
  location?: Location;
}

export type TriageLevel = "emergency" | "urgent" | "routine" | "self-care";

export type ConditionSource = "cv_model" | "guideline" | "user_report" | "reasoning";

export type ConditionConfidence = "low" | "medium" | "high";

export interface SuspectedCondition {
  name: string;
  source: ConditionSource;
  confidence: ConditionConfidence;
}

export interface CVFindings {
  model_used: "derm_cv" | "eye_cv" | "wound_cv" | "none";
  raw_output: Record<string, any>;
}

export interface Recommendation {
  action: string;
  timeframe: string;
  home_care_advice: string;
  warning_signs: string;
}

export interface TriageResult {
  triage_level: TriageLevel;
  symptom_summary: string;
  red_flags: string[];
  suspected_conditions: SuspectedCondition[];
  cv_findings: CVFindings;
  recommendation: Recommendation;
}

export interface NearestClinic {
  name: string;
  distance_km: number;
  address: string;
  rating?: number;
}

export interface HealthCheckResponse extends TriageResult {
  nearest_clinic?: NearestClinic;
}

export interface TriageInput {
  symptoms: {
    main_complaint: string;
    duration?: string;
    pain_severity?: "nhẹ" | "vừa" | "nặng";
    fever?: boolean;
    vision_changes?: boolean;
    bleeding?: boolean;
    breathing_difficulty?: boolean;
    chest_pain?: boolean;
    severe_headache?: boolean;
    confusion?: boolean;
  };
  cv_results?: any;
}

export interface CVResult {
  top_conditions: Array<{
    name: string;
    prob: number;
  }>;
}

export interface GuidelineQuery {
  symptoms: string;
  suspected_conditions: string[];
  triage_level: string;
}

