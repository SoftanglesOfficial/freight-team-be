import { User } from 'src/user/entities/user.entity';

type ShipmentLike = {
  customer?: { email?: string; name?: string };
  quote?: { email?: string; full_name?: string };
};

export function resolveShipmentCustomerContact(
  shipment: ShipmentLike,
  linkedCustomer?: Pick<User, 'email' | 'first_name' | 'last_name'> | null,
) {
  const email =
    shipment.customer?.email ||
    linkedCustomer?.email ||
    shipment.quote?.email ||
    null;

  const name =
    shipment.customer?.name ||
    (linkedCustomer?.first_name
      ? `${linkedCustomer.first_name} ${linkedCustomer.last_name || ''}`.trim()
      : null) ||
    shipment.quote?.full_name ||
    'Customer';

  return { email, name };
}
