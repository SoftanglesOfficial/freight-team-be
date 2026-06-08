import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationExceptionFilter } from './common/filters/validation.filter';
import { DefaultValidationPipe } from './common/pipes/default-validation.pipe';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new DefaultValidationPipe());
  app.useGlobalFilters(new ValidationExceptionFilter());

  const packageJson = fs.readFileSync('package.json', 'utf8');
  const packageJsonObject = JSON.parse(packageJson);

  const config = new DocumentBuilder()
    .setTitle(packageJsonObject.name)
    .setDescription(packageJsonObject.description)
    .setVersion(packageJsonObject.version)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addSecurityRequirements('bearer')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, {
    swaggerOptions: {
      docExpansion: 'none',
    },
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(function (error) {
  console.error(error);
  process.exit(1);
});
