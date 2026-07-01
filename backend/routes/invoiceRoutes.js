import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import Invoice from '../models/Invoice.js';
import Item from '../models/Item.js';

const router = express.Router();

/**
 * POST /api/invoices/create
 * Creates a sales invoice, calculates totals, and decrements stock items atomically
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId || (req.user && req.user.activeCompanyId);

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required in x-company-id header.' });
    }

    let { invoiceNumber, customerName, date, items, taxAmount } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item row is required.' });
    }

    // Auto-generate invoice number if missing
    if (!invoiceNumber || !invoiceNumber.trim()) {
      const count = await Invoice.countDocuments({ companyId });
      invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`;
    }

    // Ensure invoice number is unique for this company
    const existingInvoice = await Invoice.findOne({ companyId, invoiceNumber: invoiceNumber.trim() });
    if (existingInvoice) {
      return res.status(400).json({ error: `Invoice number '${invoiceNumber}' already exists for this company.` });
    }

    // Validate rows, calculate totals, and update stock
    let grossTotal = 0;
    const processedItems = [];

    for (const entry of items) {
      if (!entry.itemId) {
        return res.status(400).json({ error: 'Item selection is required for all rows.' });
      }

      const dbItem = await Item.findById(entry.itemId);
      if (!dbItem || dbItem.companyId.toString() !== companyId.toString()) {
        return res.status(400).json({ error: `Stock item not found or unauthorized.` });
      }

      const qty = Number(entry.qty) || 0;
      const rate = Number(entry.rate) || 0;
      const rowAmount = qty * rate;

      grossTotal += rowAmount;
      processedItems.push({
        itemId: entry.itemId,
        qty,
        rate,
        amount: rowAmount
      });
    }

    const tax = Number(taxAmount) || 0;
    const netPayable = grossTotal + tax;

    // Create Invoice
    const newInvoice = new Invoice({
      companyId,
      invoiceNumber: invoiceNumber.trim(),
      customerName: customerName.trim(),
      date: date ? new Date(date) : new Date(),
      items: processedItems,
      grossTotal,
      taxAmount: tax,
      netPayable
    });

    await newInvoice.save();

    // Atomic stock deduction
    for (const entry of processedItems) {
      await Item.findByIdAndUpdate(
        entry.itemId,
        { $inc: { currentQty: -entry.qty } },
        { new: true }
      );
    }

    return res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Invoice creation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/invoices/list
 * Lists all sales invoices for the active company
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId || (req.user && req.user.activeCompanyId);

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required in x-company-id header.' });
    }

    const invoices = await Invoice.find({ companyId })
      .populate('items.itemId')
      .sort({ date: -1 });

    return res.status(200).json(invoices);
  } catch (error) {
    console.error('List invoices error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
