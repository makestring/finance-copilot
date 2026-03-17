export type DomainEvent<T = any> = {
  name: string;
  clientId: string;
  occurredAt: string; // ISO
  payload: T;
};

export interface EventBus {
  publish<T>(event: DomainEvent<T>): Promise<void> | void;
}

// Implementação MVP: só loga.
// Depois você troca por WebSocket/SSE/Rabbit/Kafka sem mudar os services.
export class ConsoleEventBus implements EventBus {
  publish<T>(event: DomainEvent<T>) {
    // eslint-disable-next-line no-console
    console.log("[DOMAIN_EVENT]", JSON.stringify(event));
  }
}
