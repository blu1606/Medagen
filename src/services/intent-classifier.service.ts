import { logger } from '../utils/logger.js';

export type IntentType = 'triage' | 'disease_info' | 'symptom_inquiry' | 'general_health' | 'out_of_scope';

export interface Intent {
  type: IntentType;
  confidence: number;
  entities: {
    disease?: string;
    symptoms?: string[];
    info_domain?: 'definition' | 'causes' | 'symptoms' | 'treatment' | 'prevention' | 'complications';
    urgency_indicators?: string[];
  };
  needsClarification: boolean;
  suggestedQuestion?: string;
}

/**
 * Intent Classification Service
 * Phân loại ý định của user theo spec AI-Agent.md
 */
export class IntentClassifierService {
  // Keywords for different intents
  private readonly TRIAGE_KEYWORDS = [
    'đau', 'sốt', 'chảy máu', 'khó thở', 'nôn', 'buồn nôn',
    'ngất', 'chóng mặt', 'mệt', 'yếu', 'tôi bị', 'em bị',
    'con tôi', 'triệu chứng', 'cấp cứu', 'khẩn cấp'
  ];

  private readonly DISEASE_INFO_KEYWORDS = [
    'bệnh', 'là gì', 'như thế nào', 'giải thích', 'cho tôi biết',
    'thông tin về', 'tìm hiểu về', 'định nghĩa', 'nguyên nhân'
  ];

  private readonly TREATMENT_KEYWORDS = [
    'điều trị', 'chữa', 'phòng ngừa', 'phòng bệnh', 'cách chữa',
    'cách điều trị', 'thuốc', 'liệu pháp'
  ];

  private readonly OUT_OF_SCOPE_KEYWORDS = [
    'bảo hiểm', 'bhyt', 'chi phí', 'giá', 'thủ tục',
    'thuốc nam', 'đông y', 'thảo dược', 'bài thuốc'
  ];

  /**
   * Classify user intent based on query text
   */
  classifyIntent(query: string, hasImage: boolean = false): Intent {
    const lowerQuery = query.toLowerCase().trim();
    
    logger.info(`Classifying intent for query: "${query.substring(0, 50)}..."`);

    // Check for out of scope first
    if (this.isOutOfScope(lowerQuery)) {
      return {
        type: 'out_of_scope',
        confidence: 0.9,
        entities: {},
        needsClarification: false
      };
    }

    // If has image, likely triage
    if (hasImage) {
      return this.classifyTriageIntent(lowerQuery, hasImage);
    }

    // Check for triage keywords (personal health concerns)
    const triageScore = this.calculateKeywordScore(lowerQuery, this.TRIAGE_KEYWORDS);
    
    // Check for disease info keywords (educational)
    const diseaseInfoScore = this.calculateKeywordScore(lowerQuery, this.DISEASE_INFO_KEYWORDS);

    // Determine intent based on scores
    if (triageScore > diseaseInfoScore && triageScore > 0.3) {
      return this.classifyTriageIntent(lowerQuery, hasImage);
    } else if (diseaseInfoScore > 0.2) {
      return this.classifyDiseaseInfoIntent(lowerQuery);
    } else if (this.hasPersonalPronouns(lowerQuery)) {
      // "Tôi...", "Em...", "Con tôi..." → likely triage
      return this.classifyTriageIntent(lowerQuery, hasImage);
    } else {
      // Default to disease info for educational queries
      return this.classifyDiseaseInfoIntent(lowerQuery);
    }
  }

  private classifyTriageIntent(query: string, hasImage: boolean = false): Intent {
    const symptoms = this.extractSymptoms(query);
    const urgencyIndicators = this.extractUrgencyIndicators(query);

    // If we have an image, we don't need text clarification
    const needsClarification = !hasImage && symptoms.length === 0 && urgencyIndicators.length === 0;

    return {
      type: 'triage',
      confidence: 0.8,
      entities: {
        symptoms,
        urgency_indicators: urgencyIndicators
      },
      needsClarification,
      suggestedQuestion: needsClarification 
        ? 'Bạn có thể mô tả chi tiết hơn về triệu chứng đang gặp phải không?'
        : undefined
    };
  }

  private classifyDiseaseInfoIntent(query: string): Intent {
    const disease = this.extractDiseaseName(query);
    const infoDomain = this.extractInfoDomain(query);

    return {
      type: 'disease_info',
      confidence: 0.7,
      entities: {
        disease,
        info_domain: infoDomain
      },
      needsClarification: !disease && !infoDomain,
      suggestedQuestion: !disease
        ? 'Bạn muốn tìm hiểu về bệnh gì? Ví dụ: trứng cá, vảy nến, viêm kết mạc...'
        : !infoDomain
        ? `Bạn muốn biết về ${disease}: Định nghĩa / Nguyên nhân / Triệu chứng / Điều trị / Phòng bệnh?`
        : undefined
    };
  }

  private isOutOfScope(query: string): boolean {
    return this.OUT_OF_SCOPE_KEYWORDS.some(keyword => query.includes(keyword));
  }

  private calculateKeywordScore(query: string, keywords: string[]): number {
    const matches = keywords.filter(keyword => query.includes(keyword));
    return matches.length / keywords.length;
  }

  private hasPersonalPronouns(query: string): boolean {
    const pronouns = ['tôi', 'em', 'con tôi', 'con em', 'bố', 'mẹ', 'anh', 'chị'];
    return pronouns.some(pronoun => query.includes(pronoun));
  }

  private extractSymptoms(query: string): string[] {
    const symptoms: string[] = [];
    
    // Common symptom patterns
    const symptomPatterns = [
      /đau\s+(\w+)/gi,
      /sốt/gi,
      /chảy\s+máu/gi,
      /khó\s+thở/gi,
      /nôn/gi,
      /buồn\s+nôn/gi,
      /chóng\s+mặt/gi,
      /ngứa/gi,
      /sưng/gi,
      /đỏ/gi,
      /mẩn/gi,
      /nổi\s+mụn/gi
    ];

    for (const pattern of symptomPatterns) {
      const matches = query.match(pattern);
      if (matches) {
        symptoms.push(...matches);
      }
    }

    return [...new Set(symptoms)];
  }

  private extractUrgencyIndicators(query: string): string[] {
    const urgencyKeywords = [
      'cấp cứu', 'khẩn cấp', 'ngay lập tức', 'gấp', 'nặng',
      'khó thở', 'chảy máu nhiều', 'ngất', 'bất tỉnh'
    ];

    return urgencyKeywords.filter(keyword => query.includes(keyword));
  }

  private extractDiseaseName(query: string): string | undefined {
    // Common disease names in Vietnamese
    const diseases = [
      'trứng cá', 'mụn', 'vảy nến', 'viêm da',
      'viêm kết mạc', 'đau mắt đỏ', 'viêm giác mạc',
      'viêm gan', 'tiểu đường', 'cao huyết áp',
      'hen suyễn', 'dị ứng', 'sốt xuất huyết',
      'cúm', 'covid', 'viêm họng', 'viêm amidan'
    ];

    for (const disease of diseases) {
      if (query.includes(disease)) {
        return disease;
      }
    }

    return undefined;
  }

  private extractInfoDomain(query: string): Intent['entities']['info_domain'] {
    if (/định nghĩa|là gì|như thế nào/.test(query)) {
      return 'definition';
    } else if (/nguyên nhân|tại sao|do đâu/.test(query)) {
      return 'causes';
    } else if (/triệu chứng|dấu hiệu|biểu hiện/.test(query)) {
      return 'symptoms';
    } else if (/điều trị|chữa|cách chữa/.test(query)) {
      return 'treatment';
    } else if (/phòng ngừa|phòng bệnh|cách phòng/.test(query)) {
      return 'prevention';
    } else if (/biến chứng|nguy hiểm|hậu quả/.test(query)) {
      return 'complications';
    }

    return undefined;
  }
}

