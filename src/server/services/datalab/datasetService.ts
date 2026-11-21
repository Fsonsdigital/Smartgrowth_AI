import crypto from 'node:crypto';
import type {
  DatasetBatch,
  DatasetFormat,
  DatasetQualityReport,
  DatasetRecordItem,
  DatasetSplit,
  DatasetType,
} from '../../../shared/types.js';
import type { IDatasetRepository } from '../../repositories/interfaces.js';

export interface ParsedDatasetRow {
  rowNumber: number;
  externalId: string;
  audience: 'individual' | 'sme' | 'all';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  split: DatasetSplit;
  validationStatus: 'valid' | 'invalid' | 'duplicate';
  validationErrors: string[];
  contentHash: string;
}

export function parseCsvText(csvText: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"' && normalized[i + 1] === '"') {
        currentField += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = cells[idx] ?? '';
    });
    return obj;
  });
}

export function parseJsonlText(jsonlText: string): Array<Record<string, unknown>> {
  const lines = jsonlText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('JSONL input contains no records.');
  }

  return lines.map((line, idx) => {
    try {
      const parsed = JSON.parse(line);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Line must be a JSON object.');
      }
      return parsed as Record<string, unknown>;
    } catch (err) {
      throw new Error(
        `JSONL parse error on line ${idx + 1}: ${err instanceof Error ? err.message : 'Invalid JSON'}`
      );
    }
  });
}

function computeContentHash(datasetType: DatasetType, title: string, content: string): string {
  const canonical = `${datasetType}|${title.trim().toLowerCase()}|${content.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function normalizeAudience(raw: unknown): 'individual' | 'sme' | 'all' | null {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'individual' || v === 'sme' || v === 'all') return v;
  return null;
}

function normalizeSplit(raw: unknown): DatasetSplit {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'train' || v === 'validation' || v === 'test') return v;
  return 'unassigned';
}

export class DatasetService {
  constructor(private readonly datasetRepo: IDatasetRepository) {}

  parseAndValidate(params: {
    datasetType: DatasetType;
    format: DatasetFormat;
    rawText: string;
  }): {
    parsedRows: ParsedDatasetRow[];
    qualityReport: DatasetQualityReport;
  } {
    const rawObjects =
      params.format === 'csv' ? parseCsvText(params.rawText) : parseJsonlText(params.rawText);

    const existingHashes = this.datasetRepo.listExistingHashes(params.datasetType);
    const seenInBatch = new Set<string>();
    const schemaIssues: Array<{ rowNumber: number; errors: string[] }> = [];
    const audienceBreakdown: Record<string, number> = { individual: 0, sme: 0, all: 0 };
    const splitBreakdown: Record<DatasetSplit, number> = {
      unassigned: 0,
      train: 0,
      validation: 0,
      test: 0,
    };

    const parsedRows: ParsedDatasetRow[] = rawObjects.map((row, index) => {
      const rowNumber = index + 1;
      const errors: string[] = [];

      const externalId = String(row.external_id ?? row.id ?? `rec_${rowNumber}`).trim();
      const audience = normalizeAudience(row.audience);
      if (!audience) {
        errors.push('Field "audience" must be one of: individual, sme, all.');
      }

      let title = '';
      let content = '';
      const metadata: Record<string, unknown> = {};

      if (params.datasetType === 'knowledge_base') {
        title = String(row.title ?? '').trim();
        content = String(row.content ?? '').trim();
        if (title.length < 3) errors.push('Knowledge-base record requires "title" (min 3 chars).');
        if (content.length < 20)
          errors.push('Knowledge-base record requires "content" (min 20 chars).');
        metadata.source = String(row.source ?? 'Administrator Upload').trim();
        metadata.version = String(row.version ?? '1.0').trim();
        metadata.topic = String(row.topic ?? 'general').trim();
      } else if (params.datasetType === 'evaluation') {
        title = String(row.title ?? row.prompt ?? '').trim();
        content = String(row.expected_criteria ?? row.expected_behavior ?? row.content ?? '').trim();
        if (title.length < 5)
          errors.push('Evaluation example requires "prompt" or "title" (min 5 chars).');
        if (content.length < 10)
          errors.push('Evaluation example requires "expected_criteria" (min 10 chars).');
        metadata.prompt = String(row.prompt ?? title).trim();
        metadata.expected_criteria = content;
        metadata.safety_category = String(row.safety_category ?? 'grounding').trim();
      } else {
        // fine_tuning
        title = String(row.instruction ?? row.prompt ?? row.title ?? '').trim();
        content = String(row.completion ?? row.response ?? row.content ?? '').trim();
        if (title.length < 5)
          errors.push('Fine-tuning example requires "instruction" or "prompt" (min 5 chars).');
        if (content.length < 15)
          errors.push('Fine-tuning example requires "completion" or "response" (min 15 chars).');
        metadata.instruction = title;
        metadata.completion = content;
        metadata.source_policy = String(row.source_policy ?? 'synthetic_curated').trim();
      }

      const contentHash = computeContentHash(params.datasetType, title, content);
      let validationStatus: ParsedDatasetRow['validationStatus'] = 'valid';
      if (errors.length > 0) {
        validationStatus = 'invalid';
        schemaIssues.push({ rowNumber, errors });
      } else if (existingHashes.has(contentHash) || seenInBatch.has(contentHash)) {
        validationStatus = 'duplicate';
        errors.push('Duplicate record detected via SHA-256 content hash.');
        schemaIssues.push({ rowNumber, errors });
      }
      seenInBatch.add(contentHash);

      const safeAudience = audience ?? 'all';
      const split = normalizeSplit(row.split);
      audienceBreakdown[safeAudience] = (audienceBreakdown[safeAudience] ?? 0) + 1;
      splitBreakdown[split] = (splitBreakdown[split] ?? 0) + 1;

      return {
        rowNumber,
        externalId,
        audience: safeAudience,
        title,
        content,
        metadata,
        split,
        validationStatus,
        validationErrors: errors,
        contentHash,
      };
    });

    const totalRows = parsedRows.length;
    const validRows = parsedRows.filter((r) => r.validationStatus === 'valid').length;
    const duplicateRows = parsedRows.filter((r) => r.validationStatus === 'duplicate').length;
    const invalidRows = parsedRows.filter((r) => r.validationStatus === 'invalid').length;

    const qualityReport: DatasetQualityReport = {
      totalRows,
      validRows,
      invalidRows,
      duplicateRows,
      completenessRate: totalRows > 0 ? Math.round((validRows / totalRows) * 1000) / 10 : 0,
      audienceBreakdown,
      splitBreakdown,
      schemaIssues,
    };

    return { parsedRows, qualityReport };
  }

  importBatch(params: {
    name: string;
    datasetType: DatasetType;
    format: DatasetFormat;
    version: string;
    rawText: string;
    uploadedBy: string;
  }): { batch: DatasetBatch; records: DatasetRecordItem[] } {
    const { parsedRows, qualityReport } = this.parseAndValidate({
      datasetType: params.datasetType,
      format: params.format,
      rawText: params.rawText,
    });

    const batchId = `batch_${crypto.randomUUID()}`;
    // IMPORTANT: Never auto-train and never auto-approve upon upload; always start in pending_review.
    const batch = this.datasetRepo.createBatchWithRecords({
      batch: {
        id: batchId,
        name: params.name.trim(),
        datasetType: params.datasetType,
        sourceFormat: params.format,
        version: params.version.trim() || '1.0.0',
        status: 'pending_review',
        uploadedBy: params.uploadedBy,
        reviewedBy: null,
        reviewNotes: null,
        qualityReport,
        totalRecords: qualityReport.totalRows,
        validRecords: qualityReport.validRows,
        duplicateCount: qualityReport.duplicateRows,
      },
      records: parsedRows.map((row) => ({
        id: `drec_${crypto.randomUUID()}`,
        batchId,
        datasetType: params.datasetType,
        externalId: row.externalId,
        audience: row.audience,
        title: row.title,
        content: row.content,
        metadata: row.metadata,
        split: row.split,
        contentHash: row.contentHash,
        validationStatus: row.validationStatus,
        validationErrors: row.validationErrors,
        isActiveInKb: false,
      })),
    });

    return {
      batch,
      records: this.datasetRepo.listRecordsForBatch(batch.id),
    };
  }

  exportBatch(batchId: string, format: DatasetFormat): { filename: string; mimeType: string; content: string } {
    const batch = this.datasetRepo.getBatchById(batchId);
    if (!batch) {
      throw new Error('Dataset batch not found.');
    }
    const records = this.datasetRepo.listRecordsForBatch(batchId);
    const safeName = batch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (format === 'jsonl') {
      const lines = records.map((r) =>
        JSON.stringify({
          external_id: r.externalId,
          dataset_type: r.datasetType,
          audience: r.audience,
          title: r.title,
          content: r.content,
          split: r.split,
          validation_status: r.validationStatus,
          metadata: r.metadata,
        })
      );
      return {
        filename: `${safeName}-v${batch.version}.jsonl`,
        mimeType: 'application/x-ndjson',
        content: lines.join('\n'),
      };
    }

    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const header = 'external_id,dataset_type,audience,title,content,split,validation_status,source';
    const rows = records.map((r) =>
      [
        escapeCsv(r.externalId),
        escapeCsv(r.datasetType),
        escapeCsv(r.audience),
        escapeCsv(r.title),
        escapeCsv(r.content),
        escapeCsv(r.split),
        escapeCsv(r.validationStatus),
        escapeCsv(String(r.metadata.source ?? '')),
      ].join(',')
    );
    return {
      filename: `${safeName}-v${batch.version}.csv`,
      mimeType: 'text/csv',
      content: [header, ...rows].join('\n'),
    };
  }
}
