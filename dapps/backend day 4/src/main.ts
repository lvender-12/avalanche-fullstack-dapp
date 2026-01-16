import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
  });

  const config = new DocumentBuilder()
    .setTitle('Simple Storage dApp API')
    .setDescription(
      'The Simple Storage dApp API description<br><br>' +
      '👤 Nama: Muhammad nur jagat arya damarLvender<br>' +
      '🆔 NIM: 241011400372'
    )

    .setVersion('1.0')
    .addTag('simple-storage')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Swagger di /documentation
  SwaggerModule.setup('documentation', app, document, {
    customSiteTitle: 'Simple Storage dApp Swagger', // title di tab browser
  });

  await app.listen(process.env.PORT ?? 3002);
}

bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  process.exit(1);
});
