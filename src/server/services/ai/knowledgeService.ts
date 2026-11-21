import type { DatasetRecordItem, KnowledgeSourceRef, WorkspaceMode } from '../../../shared/types.js';
import type { IDatasetRepository } from '../../repositories/interfaces.js';

export interface RetrievedKnowledgeResult {
  records: DatasetRecordItem[];
  refs: KnowledgeSourceRef[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export class KnowledgeRetrievalService {
  constructor(private readonly datasetRepo: IDatasetRepository) {}

  retrieveApproved(params: {
    audience: WorkspaceMode;
    queryText: string;
    flags?: string[];
    limit?: number;
  }): RetrievedKnowledgeResult {
    const candidates = this.datasetRepo.listApprovedKnowledgeRecords(params.audience);
    const queryTokens = new Set([
      ...tokenize(params.queryText),
      ...(params.flags ?? []).flatMap((f) => tokenize(f.replace(/_/g, ' '))),
    ]);

    const scored = candidates.map((rec) => {
      const textTokens = tokenize(`${rec.title} ${rec.content} ${JSON.stringify(rec.metadata)}`);
      let score = rec.audience === params.audience ? 2 : 1; // Audience preference boost
      for (const token of textTokens) {
        if (queryTokens.has(token)) {
          score += 3;
        }
      }
      return { rec, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, params.limit ?? 4).map((s) => s.rec);

    const refs: KnowledgeSourceRef[] = top.map((rec) => ({
      recordId: rec.externalId || rec.id,
      title: rec.title,
      audience: rec.audience,
      version: String(rec.metadata.version ?? '1.0'),
      source: String(rec.metadata.source ?? 'SmartGrowth Approved Knowledge Base'),
    }));

    return { records: top, refs };
  }
}
