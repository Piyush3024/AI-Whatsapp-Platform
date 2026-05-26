import SmartParser from 'pdf-parse-new/lib/SmartPDFParser';
import mammoth from 'mammoth';

export interface Chunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: {
    page?: number;
    section?: string;
  };
}

const DEFAULT_CHUNK_SIZE = Number(process.env.KB_CHUNK_SIZE_TOKENS || 512);
const DEFAULT_OVERLAP = Number(process.env.KB_CHUNK_OVERLAP_TOKENS || 102);

const smartParser = new SmartParser();

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
function normalizeText(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType) {
    case 'application/pdf': {
      const pdfData = await smartParser.parse(buffer);
      return pdfData.text;
    }
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const docxResult = await mammoth.extractRawText({ buffer });
      return docxResult.value;
    }
    case 'text/plain':
      return buffer.toString('utf-8');
    default:
      throw new Error(`Unsupported file type for text extraction: ${fileType}`);
  }
}

export async function chunkText(
  buffer: Buffer,
  fileType: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP,
): Promise<Chunk[]> {
  const rawText = await extractText(buffer, fileType);
  const normalizedText = normalizeText(rawText);
  const sentences = normalizedText.split(/(?<=[.!?])\s+/);

  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokenCount = countTokens(sentence);
    if (
      currentTokenCount + sentenceTokenCount > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push({
        content: currentChunk.join(' '),
        chunkIndex,
        tokenCount: currentTokenCount,
        metadata: {},
      });
      chunkIndex++;
      currentChunk = [];
      currentTokenCount = 0;
    }
    currentChunk.push(sentence);
    currentTokenCount += sentenceTokenCount;
  }

  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join(' '),
      chunkIndex,
      tokenCount: currentTokenCount,
      metadata: {},
    });
  }

  const finalChunks: Chunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let chunkContent = chunk.content;
    if (i > 0) {
      const prevChunk = chunks[i - 1];
      const prevSentences = prevChunk.content.split(/(?<=[.!?])\s+/);
      const overlapSentences = prevSentences.slice(-Math.ceil(overlap / 10));
      const overlapText = overlapSentences.join(' ');
      chunkContent = `${overlapText} ${chunkContent}`;
    }
    finalChunks.push({
      ...chunk,
      content: chunkContent,
      tokenCount: countTokens(chunkContent),
    });
  }
  return finalChunks;
}

export { DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP };
