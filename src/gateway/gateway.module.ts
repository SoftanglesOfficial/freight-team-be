import { RegisterEvents } from 'src/common/decorators/register-events.decorator';
import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { GATEWAY_ACTIONS } from './gateway.actions';

@RegisterEvents(GATEWAY_ACTIONS)
@Module({
  providers: [SocketGateway],
})
export class GatewayModule {}
