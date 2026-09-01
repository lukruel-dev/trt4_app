import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UpsertFavorecidoDto } from './dto';
import { FavorecidosService } from './favorecidos.service';

@Controller('favorecidos')
export class FavorecidosController {
  constructor(private readonly service: FavorecidosService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('tipo') tipo?: string,
    @Query('status') status?: string,
    @Query('onlyReview') onlyReview?: string,
    @Query('situacaoEspecial') situacaoEspecial?: string,
  ) {
    return this.service.list({
      search,
      tipo,
      status,
      onlyReview: onlyReview === 'true',
      situacaoEspecial,
    });
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Post()
  create(@Body() body: UpsertFavorecidoDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpsertFavorecidoDto,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}