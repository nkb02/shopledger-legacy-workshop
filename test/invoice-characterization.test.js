var assert = require('node:assert/strict');
var test = require('node:test');
var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');
var reports = require('../lib/reports');

function pricedOrder(items, coupon) {
  var totals = pricing.computeTotals(items, coupon);
  return {
    id: 1001,
    date: '12/11/2021',
    status: 'completed',
    items: items,
    coupon: coupon,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total
  };
}

function mixedSlabItems() {
  // Order creation stores HSN on each line and omits gstRate.
  return [
    { id: 1, sku: 'RICE', name: 'Rice', hsn: '1006', price: 500, qty: 2 },
    { id: 2, sku: 'GHEE', name: 'Ghee', hsn: '0405', price: 1000, qty: 1 }
  ];
}

function defaultRateItems() {
  return [{ id: 3, name: 'Unclassified item', price: 100, qty: 1 }];
}

test('checkout caps SAVE10 and apportions it before calculating mixed-slab GST', function () {
  var totals = pricing.computeTotals(mixedSlabItems(), 'SAVE10');
  assert.deepEqual(
    [totals.subtotal, totals.discount, totals.taxable, totals.tax, totals.cgst, totals.sgst, totals.total],
    [2000, 150, 1850, 157.25, 78.63, 78.62, 2007.25]
  );
  assert.deepEqual(totals.lines.map(function (line) {
    return [line.gstPercent, line.discount, line.taxable, line.tax];
  }), [[5, 75, 925, 46.25], [12, 75, 925, 111]]);
});

test('invoice uses checkout HSN slabs for line GST', function () {
  var order = pricedOrder(mixedSlabItems(), '');
  var figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual([order.tax, order.total], [170, 2170]);
  assert.deepEqual([figures.tax, figures.cgst, figures.sgst, figures.total], [170, 85, 85, 2170]);
  assert.deepEqual(figures.rows.map(function (row) {
    return [row.hsn, row.gstPercent, row.lineTax];
  }), [['1006', 5, 50], ['0405', 12, 120]]);
});

test('invoice prints the billed total and GST after the capped coupon', function () {
  var order = pricedOrder(mixedSlabItems(), 'SAVE10');
  var figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual([order.discount, order.total], [150, 2007.25]);
  assert.deepEqual([figures.discount, figures.tax, figures.total], [150, 157.25, 2007.25]);
  assert.deepEqual(figures.rows.map(function (row) { return row.lineTax; }), [46.25, 111]);

  var html = invoice.render(order);
  assert.match(html, /CGST \+ SGST \(Total GST\)<\/td><td class="r">₹157\.25/);
  assert.match(html, /CGST<\/td><td class="r">₹78\.63/);
  assert.match(html, /SGST<\/td><td class="r">₹78\.62/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹2007\.25/);
});

test('invoice uses checkout line rounding for GST', function () {
  var items = [
    { id: 1, name: 'First item', price: 0.03, qty: 1 },
    { id: 2, name: 'Second item', price: 0.03, qty: 1 }
  ];
  var order = pricedOrder(items, '');
  var figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual([order.tax, order.total], [0.02, 0.08]);
  assert.deepEqual([figures.tax, figures.cgst, figures.sgst, figures.total], [0.02, 0.01, 0.01, 0.08]);
  assert.deepEqual(figures.rows.map(function (row) { return row.lineTax; }), [0.01, 0.01]);
});

test('printed invoice shows the billed discount and GST for each checkout line', function () {
  var order = pricedOrder(mixedSlabItems(), 'SAVE10');
  var html = invoice.render(order);
  var itemRows = html.split('<tbody>')[1].split('</tbody>')[0].split('</tr>');

  assert.match(itemRows[0], /<td class="r">5%<\/td><td class="r">₹46\.25<\/td>/);
  assert.match(itemRows[1], /<td class="r">12%<\/td><td class="r">₹111\.00<\/td>/);
  assert.match(html, /Coupon Discount \(SAVE10\)<\/td><td[^>]*>-₹150\.00<\/td>/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('invoice matches checkout when both use the default GST rate without a coupon', function () {
  var order = pricedOrder(defaultRateItems(), '');
  var figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual([order.tax, order.total], [18, 118]);
  assert.deepEqual([figures.tax, figures.cgst, figures.sgst, figures.total], [18, 9, 9, 118]);
  assert.doesNotMatch(invoice.render(order), /Line GST is unavailable/);
});

test('historical invoices preserve billed amounts when line GST cannot be reconstructed', function () {
  var order = pricedOrder(mixedSlabItems(), '');
  Object.assign(order, { subtotal: '2000.00', discount: 0, tax: '0.00', total: '2000.00' });
  var figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual([figures.subtotal, figures.discount, figures.tax, figures.total], [2000, 0, 0, 2000]);
  assert.deepEqual(figures.rows.map(function (row) {
    return [row.gstPercent, row.lineTax];
  }), [[null, null], [null, null]]);
  assert.match(invoice.render(order), /Line GST is unavailable for this order/);
});

test('invoice uses checkout pricing when recorded amounts are missing', function () {
  var figures = invoice.computeInvoiceFigures({ items: defaultRateItems() });
  assert.deepEqual([figures.subtotal, figures.discount, figures.tax, figures.total], [100, 0, 18, 118]);
});

test('reconciliation matches billed GST and totals and skips cancellations', function () {
  var order = pricedOrder(mixedSlabItems(), 'SAVE10');
  var cancelled = Object.assign({}, order, { id: 1002, status: 'cancelled' });

  var result = reports.getGstReconciliation({ orders: [order, cancelled] });
  assert.deepEqual([result.totalChecked, result.mismatchCount, result.totalDelta], [1, 0, 0]);
  assert.deepEqual(result.rows.map(function (row) {
    return [row.orderId, row.ledgerTax, row.invoiceTax, row.delta, row.matched];
  }), [[1001, 157.25, 157.25, 0, true]]);
});
