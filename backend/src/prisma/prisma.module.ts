import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global so every feature module can inject PrismaService without re-importing.
// Global afin que chaque module puisse injecter PrismaService sans réimport.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
