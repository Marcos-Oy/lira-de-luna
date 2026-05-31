export type BrandColors = {
  sand:       string;
  taupe:      string;
  dark:       string;
  cream:      string;
  beige:      string;
  beigeLight: string;
};

export type PageTexts = {
  announcementBar?:  string;
  featuresStrip?:    string;
  footerTagline?:    string;
  socialLinks?:      string;
  nosotros?:         string;
  guiaCuidado?:      string;
  guiaCuidadoQuote?: string;
  privacidad?:       string;
  terminos?:         string;
  preguntas?:        string;
  envios?:           string;
};

export const DEFAULT_COLORS: BrandColors = {
  sand:       '#CDA78F',
  taupe:      '#8E7A6B',
  dark:       '#5C4A3E',
  cream:      '#F7F4F1',
  beige:      '#D8BFAE',
  beigeLight: '#EDE2D8',
};

export const DEFAULT_ANNOUNCEMENT = 'Envíos gratis en pedidos +$30.000 CLP';

export const DEFAULT_FEATURES_STRIP = JSON.stringify([
  { icon: "Moon",        title: "Diseños exclusivos",    subtitle: "Hechos con intención" },
  { icon: "Leaf",        title: "Materiales de calidad", subtitle: "Plata .925 y baño de oro" },
  { icon: "Gift",        title: "Empaque especial",      subtitle: "Listo para regalar" },
  { icon: "ShieldCheck", title: "Compra segura",         subtitle: "Pagos protegidos" },
]);

export const DEFAULT_FOOTER_TAGLINE =
  `Joyas que cuentan tu historia.\nHechas con intención, para acompañarte siempre.`;

export type StoreLocation = {
  id:      string;
  name:    string;
  address: string;
  mapUrl?: string;
};

export const DEFAULT_PAGE_TEXTS: Required<PageTexts> = {
  announcementBar: DEFAULT_ANNOUNCEMENT,
  featuresStrip:   DEFAULT_FEATURES_STRIP,
  footerTagline:   DEFAULT_FOOTER_TAGLINE,
  socialLinks:     '[{"platform":"instagram","url":"https://instagram.com"},{"platform":"tiktok","url":"https://tiktok.com"}]',

  nosotros: `Lira de Luna nació de la creencia de que cada joya cuenta una historia. No vendemos accesorios: vendemos símbolos personales, recuerdos que se llevan en la piel, energía que acompaña cada momento de tu vida.

Nuestra inspiración viene de la luna, esa presencia constante y silenciosa que nos recuerda que la belleza más profunda está en la calma, en los ciclos, en la conexión con lo esencial.

Cada pieza es diseñada con minimalismo y propósito. Plata .925, baño de oro de 18k y piedras naturales seleccionadas con intención. Para que cuando la uses, sientas que algo especial te acompaña.`,

  guiaCuidado:
    'Tus joyas están hechas para durar. Con el cuidado correcto, acompañarán cada momento de tu historia.',

  guiaCuidadoQuote:
    '"Una joya cuidada es una joya que te acompaña toda la vida."',

  privacidad: `### 1. Responsable del tratamiento

Lira de Luna es responsable del tratamiento de los datos personales que recopilamos a través de nuestro sitio web. Para consultas sobre privacidad, contáctanos en hola@liradeluna.com.

### 2. Datos que recopilamos

Recopilamos nombre, correo, dirección de envío, historial de pedidos y datos de navegación mediante cookies. Los datos de pago son procesados por MercadoPago y no los almacenamos.

### 3. Finalidad del tratamiento

Usamos tus datos para procesar pedidos, enviarte confirmaciones, gestionar tu cuenta y, con tu consentimiento, enviarte comunicaciones de marketing.

### 4. Conservación de datos

Conservamos tus datos mientras mantengas una cuenta activa o según lo requiera la legislación chilena vigente.

### 5. Tus derechos

Tienes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos. Escríbenos a hola@liradeluna.com para ejercer estos derechos.

### 6. Cookies

Usamos cookies propias para recordar tu carrito y sesión, y cookies de terceros para analítica. Puedes desactivarlas en tu navegador.

### 7. Cambios en esta política

Podemos actualizar esta política ocasionalmente. Te notificaremos por correo de cambios significativos.`,

  terminos: `### 1. Aceptación de los términos

Al acceder y utilizar este sitio web, aceptas quedar vinculado por estos Términos y Condiciones.

### 2. Productos y precios

Todos los precios están en Pesos Chilenos (CLP). Nos reservamos el derecho de modificar precios sin previo aviso.

### 3. Proceso de compra

Una vez confirmado tu pedido y procesado el pago, recibirás un correo de confirmación. En caso de producto agotado, procesaremos el reembolso completo.

### 4. Pagos

Aceptamos tarjetas de crédito y débito (Visa, Mastercard) y transferencia bancaria. Todos los pagos son procesados de forma segura.

### 5. Envíos

Realizamos envíos a todo Chile. Los tiempos y costos se detallan en nuestra Política de Envíos.

### 6. Devoluciones y cambios

Aceptamos devoluciones dentro de los 15 días naturales de recepción, en estado original. Contacta a hola@liradeluna.com.

### 7. Garantía

Todos nuestros productos tienen 6 meses de garantía contra defectos de fabricación.

### 8. Propiedad intelectual

Todo el contenido de este sitio (fotografías, textos, diseños, logo) es propiedad exclusiva de Lira de Luna.

### 9. Legislación aplicable

Estos términos se rigen por las leyes de la República de Chile.`,

  preguntas: `### Productos

¿De qué materiales están hechas las joyas?
Todas nuestras piezas están fabricadas con plata .925 y algunas tienen baño de oro de 18 quilates. También trabajamos con piedras naturales como la piedra de luna y perlas cultivadas.

¿El baño de oro se desgasta?
El baño de oro es una capa aplicada sobre plata .925. Con el cuidado adecuado puede durar mucho tiempo. Evita el contacto con agua, perfumes y cremas.

¿Son joyas hipoalergénicas?
Nuestra plata .925 es generalmente bien tolerada por pieles sensibles. Contáctanos si tienes alergias específicas.

¿Cómo sé mi talla de anillo?
Mide el diámetro interior de un anillo que te quede bien: Talla 5 = 15.7mm, Talla 6 = 16.5mm, Talla 7 = 17.3mm, Talla 8 = 18.2mm.

### Pedidos y pagos

¿Qué métodos de pago aceptan?
Aceptamos tarjetas de crédito y débito (Visa, Mastercard) y transferencia bancaria.

¿Es seguro pagar en la tienda?
Sí. Todos los pagos se procesan con cifrado SSL. Nunca almacenamos datos de tu tarjeta.

¿Puedo modificar o cancelar mi pedido?
Puedes cancelar dentro de las primeras 2 horas. Una vez en proceso de empaque, no es posible hacer cambios.

### Envíos

¿Cuánto tarda en llegar mi pedido?
Los pedidos se procesan en 1–2 días hábiles y la entrega toma entre 3–7 días hábiles.

¿El envío es gratis?
Sí, el envío es completamente gratis en pedidos mayores a $30.000 CLP. Para pedidos menores, el costo es de $5.990 CLP.

### Cuidado y garantía

¿Tienen garantía las joyas?
Sí, todas nuestras piezas tienen 6 meses de garantía contra defectos de fabricación.

¿Hacen reparaciones?
Contáctanos en hola@liradeluna.com y te orientamos según el tipo de reparación.`,

  envios: `### Política de envíos

¿Cuánto cuesta el envío?
El envío es GRATIS en pedidos mayores a $30.000 CLP. Para pedidos menores, el costo es de $5.990 CLP a todo Chile.

¿Cuánto tarda en llegar mi pedido?
Los pedidos se procesan en 1–2 días hábiles. La entrega tarda entre 3–7 días hábiles según tu ubicación.

¿Puedo rastrear mi pedido?
Sí. Una vez enviado tu pedido, recibirás un email con el número de rastreo.

### Tiempos de procesamiento

¿Cuándo se procesa mi pedido?
Los pedidos confirmados antes de las 2:00 PM en días hábiles se procesan el mismo día.

¿Qué pasa si compro en fin de semana?
Los pedidos del fin de semana se procesan el siguiente lunes hábil.

### Cambios y devoluciones

¿Puedo devolver mi joya?
Aceptamos devoluciones dentro de los 15 días naturales de recepción, en estado original.

¿Cómo solicito una devolución?
Escríbenos a hola@liradeluna.com con tu número de pedido y el motivo.

¿El envío de devolución tiene costo?
Si el producto llegó defectuoso, nosotros cubrimos el costo. Si es por cambio de opinión, el envío corre por cuenta del cliente.

### Paquetería

¿Qué paquetería usan?
Trabajamos con las principales empresas de courier según la zona de entrega.

¿Mi joya viene asegurada?
Sí. Todos los envíos están asegurados contra pérdida o daño durante el transporte.`,
};
