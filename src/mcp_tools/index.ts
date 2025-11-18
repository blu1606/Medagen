import { DynamicTool } from '@langchain/core/tools';
import { CVService } from '../services/cv.service.js';
import { TriageRulesService } from '../services/triage-rules.service.js';
import { RAGService } from '../services/rag.service.js';
import { createDermCVTool, createEyeCVTool, createWoundCVTool } from './cv-tools.js';
import { createTriageRulesTool } from './triage-tool.js';
import { createGuidelineRAGTool } from './rag-tool.js';

export function createAllTools(
  cvService: CVService,
  triageService: TriageRulesService,
  ragService: RAGService
): DynamicTool[] {
  return [
    createDermCVTool(cvService),
    createEyeCVTool(cvService),
    createWoundCVTool(cvService),
    createTriageRulesTool(triageService),
    createGuidelineRAGTool(ragService)
  ];
}

export * from './cv-tools.js';
export * from './triage-tool.js';
export * from './rag-tool.js';

