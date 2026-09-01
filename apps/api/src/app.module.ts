import { Module } from '@nestjs/common';
import { FavorecidosController } from './modules/favorecidos/favorecidos.controller';
import { FavorecidosService } from './modules/favorecidos/favorecidos.service';
import { PrismaService } from './prisma/prisma.service';

@Module({ controllers: [FavorecidosController], providers: [PrismaService, FavorecidosService] })
export class AppModule {}
