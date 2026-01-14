import { AutoModelForSequenceClassification, AutoTokenizer } from '@huggingface/transformers';

console.log('Downloading bge-reranker-base model...');
const start = Date.now();

await Promise.all([
  AutoModelForSequenceClassification.from_pretrained('BAAI/bge-reranker-base', { dtype: 'fp32' }),
  AutoTokenizer.from_pretrained('BAAI/bge-reranker-base')
]);

console.log('Downloaded in', Date.now() - start, 'ms');
