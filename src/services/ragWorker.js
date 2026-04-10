import { pipeline, env } from '@huggingface/transformers';

// We disable local models feature and only use the cache.
env.allowLocalModels = false;

class PipelineSingleton {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;

  static async getInstance(progress_callback = null) {
      if (this.instance === null) {
          this.instance = pipeline(this.task, this.model, { 
            progress_callback,
            dtype: 'q8' // quantized version, approx 23MB
          });
      }
      return this.instance;
  }
}

self.addEventListener('message', async (event) => {
    try {
        const { id, text } = event.data;
        
        let extractor = await PipelineSingleton.getInstance(x => {
            self.postMessage({ status: 'progress', data: x });
        });
        
        // Output is a Tensor (pool over tokens)
        let output = await extractor(text, { pooling: 'mean', normalize: true });
        
        self.postMessage({
            id,
            status: 'complete',
            output: output.tolist()[0] // Get inner array instead of Tensor object
        });
    } catch (err) {
        self.postMessage({
            id: event.data.id,
            status: 'error',
            error: err.message
        });
    }
});
