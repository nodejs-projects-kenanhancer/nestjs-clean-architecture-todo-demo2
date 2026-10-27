import { Module } from '@nestjs/common';

import { ApplicationModule } from '@application/application.module';
import { PipelineModule } from '@common/pipeline';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { LoggingMiddleware } from '@infrastructure/pipeline';
import { PresentationModule } from '@presentation/presentation.module';

@Module({
  imports: [
    PipelineModule.register(LoggingMiddleware),
    InfrastructureModule,
    ApplicationModule,
    PresentationModule,
  ],
})
export class AppModule {}
