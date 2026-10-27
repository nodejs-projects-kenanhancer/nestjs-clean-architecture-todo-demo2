/** A pipeline set-up that cannot work; thrown while the application starts. */
export class PipelineConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineConfigurationError';
  }
}
