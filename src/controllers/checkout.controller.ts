import { OrderModel }    from "@/models/order.model";
import { ProductModel }  from "@/models/product.model";
import { UserModel }     from "@/models/user.model";
import { SettingsModel } from "@/models/settings.model";

// ── Tipos compartidos ─────────────────────────────────────────

export type CartItem = {
  productId:     string;
  variantId?:    string;
  quantity:      number;
  productName:   string;
  variantLabel?: string;
  unitPrice:     number;
  totalPrice:    number;
};

export type ShippingInfo = {
  name:    string;
  phone:   string;
  street:  string;
  city:    string;
  state:   string;
  zip:     string;
  country: string;
};

export type CheckoutInput = {
  email:                string;
  shipping:             ShippingInfo;
  paymentMethod:        string;
  cartItems:            CartItem[];
  subscribeNewsletter?: boolean;
};

// ── Validación de stock ───────────────────────────────────────

export async function validateStock(cartItems: CartItem[]): Promise<string | null> {
  const productIds = cartItems.filter((i) => !i.variantId).map((i) => i.productId);
  const variantIds = cartItems.filter((i) =>  i.variantId).map((i) => i.variantId!);

  const [products, variants] = await Promise.all([
    ProductModel.findStockByIds(productIds),
    ProductModel.findVariantStockByIds(variantIds),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p.stock]));
  const variantMap = new Map(variants.map((v) => [v.id, v.stock]));

  for (const item of cartItems) {
    const stock = item.variantId
      ? (variantMap.get(item.variantId) ?? 0)
      : (productMap.get(item.productId) ?? 0);

    if (stock < item.quantity) {
      const label = item.variantLabel
        ? `${item.productName} — ${item.variantLabel}`
        : item.productName;
      return `Stock insuficiente para "${label}". Disponible: ${stock}`;
    }
  }
  return null;
}

// ── Cálculo de totales ────────────────────────────────────────

async function calcTotals(cartItems: CartItem[]) {
  const settings     = await SettingsModel.findSingleton();
  const freeFrom     = settings?.freeShippingFrom ?? 30000;
  const stdShip      = settings?.standardShipping  ?? 5990;
  const subtotal     = cartItems.reduce((s, i) => s + i.totalPrice, 0);
  const shippingCost = subtotal >= freeFrom ? 0 : stdShip;
  return { subtotal, shippingCost, total: subtotal + shippingCost };
}

// ── Builder de ítems para Prisma ──────────────────────────────

function buildOrderItems(cartItems: CartItem[]) {
  return cartItems.map((item) => ({
    productId:    item.productId,
    variantId:    item.variantId ?? null,
    productName:  item.productName,
    variantLabel: item.variantLabel ?? null,
    saleType:     "UNIT" as const,
    quantity:     item.quantity,
    unitPrice:    item.unitPrice,
    totalPrice:   item.totalPrice,
  }));
}

// ── Orden para usuario autenticado ────────────────────────────

export async function createOrderForUser(input: CheckoutInput, userId: string) {
  const stockError = await validateStock(input.cartItems);
  if (stockError) return { error: stockError };

  const { subtotal, shippingCost, total } = await calcTotals(input.cartItems);

  // Reutiliza la dirección por defecto o crea una nueva
  let address = await UserModel.findDefaultAddress(userId);
  if (!address) {
    address = await UserModel.createAddress({
      userId,
      name:    input.shipping.name,
      phone:   input.shipping.phone,
      street:  input.shipping.street,
      city:    input.shipping.city,
      state:   input.shipping.state,
      zip:     input.shipping.zip,
      country: input.shipping.country,
    });
  }

  const order = await OrderModel.create({
    orderNumber:       OrderModel.generateOrderNumber(),
    userId,
    shippingAddressId: address.id,
    subtotal,
    shippingAmount:    shippingCost,
    total,
    paymentMethod:     input.paymentMethod,
    status:            "PENDING" as never,
    paymentStatus:     "UNPAID"  as never,
    items:             { create: buildOrderItems(input.cartItems) },
  });

  return { success: true as const, orderId: order.id, orderNumber: order.orderNumber, paymentMethod: input.paymentMethod };
}

// ── Orden para invitado ───────────────────────────────────────

export async function createOrderForGuest(input: CheckoutInput) {
  const stockError = await validateStock(input.cartItems);
  if (stockError) return { error: stockError };

  const { subtotal, shippingCost, total } = await calcTotals(input.cartItems);

  const order = await OrderModel.create({
    orderNumber:    OrderModel.generateOrderNumber(),
    guestEmail:     input.email,
    guestName:      input.shipping.name,
    guestPhone:     input.shipping.phone,
    guestStreet:    input.shipping.street,
    guestCity:      input.shipping.city,
    guestState:     input.shipping.state,
    guestZip:       input.shipping.zip,
    guestCountry:   input.shipping.country,
    subtotal,
    shippingAmount: shippingCost,
    total,
    paymentMethod:  input.paymentMethod,
    status:         "PENDING" as never,
    paymentStatus:  "UNPAID"  as never,
    items:          { create: buildOrderItems(input.cartItems) },
  });

  if (input.subscribeNewsletter) {
    await UserModel.upsertNewsletter(input.email, {
      name:   input.shipping.name,
      source: "checkout",
    }).catch(() => {});
  }

  return { success: true as const, orderId: order.id, orderNumber: order.orderNumber, paymentMethod: input.paymentMethod };
}

// ── Crear cuenta + orden ──────────────────────────────────────

export async function createAccountWithOrder(
  input: CheckoutInput & { passwordHash: string },
) {
  const stockError = await validateStock(input.cartItems);
  if (stockError) return { error: stockError };

  const { subtotal, shippingCost, total } = await calcTotals(input.cartItems);

  const user = await UserModel.create({
    name:         input.shipping.name,
    email:        input.email,
    passwordHash: input.passwordHash,
  });

  if (input.subscribeNewsletter !== false) {
    await UserModel.upsertNewsletter(input.email, {
      name:   user.name ?? undefined,
      userId: user.id,
      source: "registration",
    }).catch(() => {});
  }

  const address = await UserModel.createAddress({
    userId:    user.id,
    name:      input.shipping.name,
    phone:     input.shipping.phone,
    street:    input.shipping.street,
    city:      input.shipping.city,
    state:     input.shipping.state,
    zip:       input.shipping.zip,
    country:   input.shipping.country,
    isDefault: true,
  });

  const order = await OrderModel.create({
    orderNumber:       OrderModel.generateOrderNumber(),
    userId:            user.id,
    shippingAddressId: address.id,
    subtotal,
    shippingAmount:    shippingCost,
    total,
    paymentMethod:     input.paymentMethod,
    status:            "PENDING" as never,
    paymentStatus:     "UNPAID"  as never,
    items:             { create: buildOrderItems(input.cartItems) },
  });

  return {
    success:       true as const,
    orderId:       order.id,
    orderNumber:   order.orderNumber,
    paymentMethod: input.paymentMethod,
    userId:        user.id,
  };
}
