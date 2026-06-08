import { Global, Module } from '@nestjs/common';
import { SequenceService } from './services/sequence/sequence.service';

@Global()
@Module({
  imports: [],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class CommonModule {}
