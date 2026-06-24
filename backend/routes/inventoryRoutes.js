import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import StockItem from '../models/StockItem.js';

const router = express.Router();

/**
 * POST /api/inventory/stock-items
 * 
 * Creates a new inventory stock item under the active company context.
 * Enforces unique item name per company.
 */
router.post('/stock-items', requireAuth, async (req, res) => {
  try {
    const { itemName, sku, gstPercentage, purchasePrice, openingQty } = req.body;
    const companyId = req.headers['x-company-id'];

    // 1. Validation checks
    if (!companyId) {
      return res.status(400).json({
        error: 'Active Company ID is required for tenant isolation.',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({
        error: 'Item name is required.',
        code: 'ITEM_NAME_REQUIRED'
      });
    }

    // 2. Check for duplicate stock item name under this company
    const existingItem = await StockItem.findOne({ 
      companyId, 
      itemName: { $regex: new RegExp(`^${itemName.trim()}$`, 'i') } 
    });
    
    if (existingItem) {
      return res.status(400).json({
        error: `A stock item with the name "${itemName.trim()}" already exists.`,
        code: 'DUPLICATE_ITEM_NAME'
      });
    }

    // 3. Create and save the stock item
    const newItem = new StockItem({
      itemName: itemName.trim(),
      sku: sku ? sku.trim() : '',
      gstPercentage: Number(gstPercentage) || 18,
      purchasePrice: Number(purchasePrice) || 0,
      openingQty: Number(openingQty) || 0,
      companyId
    });

    await newItem.save();

    return res.status(201).json({
      success: true,
      message: 'Stock item created successfully.',
      item: newItem
    });

  } catch (error) {
    console.error('Stock Item Creation Failure:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

export default router;
