import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import Item from '../models/Item.js';

const router = express.Router();

/**
 * POST /api/items/create
 * Creates a new inventory item under the active company context
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId || (req.user && req.user.activeCompanyId);

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required in x-company-id header.' });
    }

    const { itemName, sku, unit, openingQty, purchasePrice, sellingPrice, reorderLevel } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item name is required.' });
    }

    if (!sku || !sku.trim()) {
      return res.status(400).json({ error: 'SKU is required.' });
    }

    // Check unique SKU per company context
    const existingItem = await Item.findOne({ companyId, sku: sku.trim() });
    if (existingItem) {
      return res.status(400).json({ error: `SKU '${sku}' already exists for this company.` });
    }

    const oQty = Number(openingQty) || 0;

    const newItem = new Item({
      companyId,
      itemName: itemName.trim(),
      sku: sku.trim(),
      unit: unit || 'PCS',
      openingQty: oQty,
      currentQty: oQty,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      reorderLevel: Number(reorderLevel) || 0
    });

    await newItem.save();
    return res.status(201).json(newItem);
  } catch (error) {
    console.error('Create item error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/items/list
 * Lists all active inventory records for the active company
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId || (req.user && req.user.activeCompanyId);

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required in x-company-id header.' });
    }

    const items = await Item.find({ companyId }).sort({ itemName: 1 });

    const itemsWithValuation = items.map(item => {
      const itemObj = item.toObject();
      itemObj.valuation = (Number(itemObj.currentQty) || 0) * (Number(itemObj.purchasePrice) || 0);
      return itemObj;
    });

    return res.status(200).json(itemsWithValuation);
  } catch (error) {
    console.error('List items error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
