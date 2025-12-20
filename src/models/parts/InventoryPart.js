import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1, min: 0 },
  reservedQuantity: { type: Number, default: 0, min: 0 },
}, { _id: false });

const activeStarBoostSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  multiplier: { type: Number, required: true },
  durationMinutes: { type: Number, required: true },
  appliedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { _id: false });

const activeLuckCloverSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  luckBoostFactor: { type: Number, required: true },
  affectsLootboxCategories: [{ type: String }],
}, { _id: false });

export const attachInventoryMethods = (userProfileSchema) => {
    userProfileSchema.methods.countItem = function(itemId) {
        const item = this.inventory.find(invItem => invItem.itemId === itemId);
        return item ? item.quantity : 0;
    };

    userProfileSchema.methods.hasItem = function(itemId, quantity = 1) {
        const item = this.inventory.find(invItem => invItem.itemId === itemId);
        return item && item.quantity >= quantity;
    };

    userProfileSchema.methods.addItemToInventory = async function(itemId, quantity = 1) {
        if (quantity <= 0) return false;
        const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);
        if (itemIndex > -1) {
            this.inventory[itemIndex].quantity += quantity;
        } else {
            this.inventory.push({ itemId, quantity, reservedQuantity: 0 });
        }
        return true;
    };

    userProfileSchema.methods.removeItemFromInventory = async function(itemId, quantity = 1) {
        if (quantity <= 0) return false;
        const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);
        if (itemIndex > -1) {
            if (this.inventory[itemIndex].quantity >= quantity) {
                this.inventory[itemIndex].quantity -= quantity;
                if (this.inventory[itemIndex].quantity === 0 && this.inventory[itemIndex].reservedQuantity === 0) {
                    this.inventory.splice(itemIndex, 1);
                }
                return true;
            }
        }
        return false;
    };

    userProfileSchema.methods.reserveItem = function(itemId, quantityToReserve) {
        if (quantityToReserve <= 0) return false;
        const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);
    
        if (itemIndex > -1) {
            if (this.inventory[itemIndex].quantity >= quantityToReserve) {
                this.inventory[itemIndex].quantity -= quantityToReserve;
                this.inventory[itemIndex].reservedQuantity = (this.inventory[itemIndex].reservedQuantity || 0) + quantityToReserve;
                return true;
            }
        }
        return false;
    };
    
    userProfileSchema.methods.releaseReservedItem = function(itemId, quantityToRelease) {
        if (quantityToRelease <= 0) return false;
        const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);
    
        if (itemIndex > -1) {
            if (this.inventory[itemIndex].reservedQuantity >= quantityToRelease) {
                this.inventory[itemIndex].reservedQuantity -= quantityToRelease;
                this.inventory[itemIndex].quantity += quantityToRelease;
                return true;
            }
        }
        return false;
    };
    
    userProfileSchema.methods.consumeReservedItem = function(itemId, quantityToConsume) {
        if (quantityToConsume <= 0) return false;
        const itemIndex = this.inventory.findIndex(item => item.itemId === itemId);
    
        if (itemIndex > -1) {
            if (this.inventory[itemIndex].reservedQuantity >= quantityToConsume) {
                this.inventory[itemIndex].reservedQuantity -= quantityToConsume;
                if (this.inventory[itemIndex].quantity === 0 && this.inventory[itemIndex].reservedQuantity === 0) {
                    this.inventory.splice(itemIndex, 1);
                }
                return true;
            }
        }
        return false;
    };
};

export {
    inventoryItemSchema,
    activeStarBoostSchema,
    activeLuckCloverSchema
};