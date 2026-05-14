const IGV_RATE = 0.18;

const round2 = (value) => {
  return Number(Number(value).toFixed(2));
};

const calcularTotalesVenta = (items = []) => {

  let subtotalGeneral = 0;
  let igvGeneral = 0;
  let totalGeneral = 0;

  const itemsCalculados = items.map((item) => {

    const cantidad = Number(item.quantity);

    const precioConIgv = Number(item.precio);

    const descuento = Number(item.descuento || 0);

    // Precio unitario SIN IGV
    const valorUnitario = round2(precioConIgv / (1 + IGV_RATE));

    // Subtotal SIN IGV
    const subtotal = round2(valorUnitario * cantidad);

    // Total CON IGV antes descuento
    const totalBruto = round2(precioConIgv * cantidad);

    // Total final
    const total = round2(totalBruto - descuento);

    // IGV línea
    const igv = round2(total - subtotal);

    subtotalGeneral += subtotal;
    igvGeneral += igv;
    totalGeneral += total;

    return {

      productId: item.productId,

      quantity: cantidad,

      nombreSnapshot: item.nombreSnapshot,

      precioSnapshot: precioConIgv,

      valorUnitario,

      descuento,

      subtotal,

      igv,

      total
    };
  });

  return {

    subtotal: round2(subtotalGeneral),

    igv: round2(igvGeneral),

    descuento: round2(
      items.reduce((acc, item) =>
        acc + Number(item.descuento || 0), 0)
    ),

    total: round2(totalGeneral),

    itemsCalculados
  };
};

module.exports = {
  calcularTotalesVenta
};