import { pipeline, env } from '@huggingface/transformers';
env.allowRemoteModels = true;
env.cacheDir = '/home/quinn/nightreign-query/.cache/models';
console.log('Downloading model to', env.cacheDir);
const p = await pipeline('feature-extraction', 'BAAI/bge-large-en-v1.5', { dtype: 'fp32', device: 'cpu' });
console.log('Model downloaded successfully');
