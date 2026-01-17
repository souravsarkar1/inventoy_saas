# Architecture Documentation

## Multi-Tenant Inventory Management System

This document outlines the architectural decisions, data modeling strategies, and technical implementation details of our multi-tenant SaaS inventory management platform.

---

## Table of Contents

1. [Multi-Tenancy Approach](#multi-tenancy-approach)
2. [Data Modeling Decisions](#data-modeling-decisions)
3. [Concurrency Handling](#concurrency-handling)
4. [Performance Optimization](#performance-optimization)
5. [Scalability Considerations](#scalability-considerations)
6. [Security Architecture](#security-architecture)
7. [Trade-offs and Future Improvements](#trade-offs-and-future-improvements)

---

## 1. Multi-Tenancy Approach

### Chosen Strategy: **Row-Level Isolation (Shared Database, Shared Schema)**

We implemented a **row-level multi-tenancy** model where all tenants share the same database and schema, with data isolation enforced through a `tenantId` field in every collection.

### Why This Approach?

#### **Pros:**
1. **Cost-Effective**: Single database instance reduces infrastructure costs
2. **Simplified Maintenance**: Schema updates apply to all tenants simultaneously
3. **Resource Efficiency**: Better resource utilization through connection pooling
4. **Easier Deployment**: Single codebase, single database to manage
5. **Cross-Tenant Analytics**: Easier to implement platform-wide analytics (if needed)

#### **Cons:**
1. **Security Risk**: Potential for data leakage if queries miss `tenantId` filter
2. **Noisy Neighbor**: One tenant's heavy usage can impact others
3. **Limited Customization**: Harder to provide tenant-specific schema modifications
4. **Compliance Challenges**: Some industries require physical data separation

### Implementation Details

Every MongoDB model includes:
```typescript
tenantId: { 
  type: Schema.Types.ObjectId, 
  ref: 'Tenant', 
  required: true, 
  index: true 
}
```

**Middleware Protection**: All database queries automatically filter by `tenantId` through our authentication middleware:

```typescript
// authMiddleware.ts extracts tenantId from JWT
req.tenantId = req.user.tenantId.toString();

// All controllers use this pattern
const products = await Product.find({ tenantId: req.tenantId });
```

### Alternative Approaches Considered

| Approach | Pros | Cons | Why Not Chosen |
|----------|------|------|----------------|
| **Separate Databases** | Complete isolation, easy compliance | High cost, complex migrations | Over-engineered for MVP, expensive at scale |
| **Schema-Based** (PostgreSQL) | Good isolation, shared resources | PostgreSQL-specific, migration complexity | MongoDB doesn't support schemas natively |

---

## 2. Data Modeling Decisions

### Product Variants Strategy

**Decision**: Embedded variant documents within the Product collection

```typescript
interface IProduct {
  tenantId: ObjectId;
  name: string;
  category: string;
  brand: string;
  variants: IVariant[];  // Embedded array
}

interface IVariant {
  sku: string;
  name: string;
  attributes: Record<string, string>;  // { color: "Red", size: "L" }
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  reorderLevel: number;
}
```

#### **Why Embedded Documents?**

1. **Atomic Operations**: Update product and all variants in a single transaction
2. **Query Simplicity**: Fetch product with all variants in one query
3. **Performance**: No joins required (MongoDB's strength)
4. **Business Logic**: Variants rarely exist independently of products

#### **Trade-offs:**

| Aspect | Embedded (Chosen) | Separate Collection |
|--------|-------------------|---------------------|
| **Read Performance** | ✅ Excellent (single query) | ❌ Requires joins |
| **Write Performance** | ⚠️ Updates entire document | ✅ Updates only variant |
| **Flexibility** | ❌ Limited to 16MB document size | ✅ Unlimited variants |
| **Complexity** | ✅ Simple queries | ❌ Complex aggregations |

**Mitigation**: We enforce a practical limit of 100 variants per product to avoid document size issues.

### Stock Movement Tracking

**Decision**: Separate `StockMovement` collection for audit trail

```typescript
interface IStockMovement {
  tenantId: ObjectId;
  productId: ObjectId;
  sku: string;
  type: 'IN' | 'OUT';
  reason: 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';
  quantity: number;
  timestamp: Date;
}
```

#### **Why Separate Collection?**

1. **Audit Trail**: Immutable history of all stock changes
2. **Scalability**: Movements grow independently of products
3. **Analytics**: Easy to query historical trends
4. **Compliance**: Required for inventory accounting

**Index Strategy**:
```typescript
{ tenantId: 1, productId: 1, timestamp: -1 }  // Recent movements
{ tenantId: 1, timestamp: -1 }                // Tenant-wide history
```

### Purchase Order Design

**Decision**: Embedded items with separate tracking for received quantities

```typescript
interface IPurchaseOrder {
  tenantId: ObjectId;
  vendorId: ObjectId;
  items: IPOItem[];
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'RECEIVED' | 'PARTIALLY_RECEIVED';
  totalAmount: number;
  expectedDate?: Date;
  receivedDate?: Date;
}

interface IPOItem {
  productId: ObjectId;
  sku: string;
  quantity: number;
  receivedQuantity: number;  // Tracks partial deliveries
  unitCost: number;
}
```

#### **Why This Design?**

1. **Partial Deliveries**: Track what's been received vs. ordered
2. **Price Variance**: Store actual purchase price (may differ from product's buyingPrice)
3. **Atomic Updates**: Update PO status and stock in a single transaction
4. **Smart Alerts**: Low-stock logic considers pending POs

---

## 3. Concurrency Handling

### Problem: Race Conditions in Stock Management

**Scenario**: Two users simultaneously order the last item in stock.

```
User A: Check stock (5 units) → Place order (3 units)
User B: Check stock (5 units) → Place order (3 units)
Result: -1 units in stock ❌
```

### Solution: MongoDB Transactions + Optimistic Locking

#### **Implementation**:

```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Lock the product document
  const product = await Product.findOneAndUpdate(
    { 
      _id: productId, 
      tenantId,
      'variants.sku': sku,
      'variants.stock': { $gte: quantity }  // Ensure sufficient stock
    },
    { 
      $inc: { 'variants.$.stock': -quantity }  // Atomic decrement
    },
    { session, new: true }
  );

  if (!product) {
    throw new Error('Insufficient stock');
  }

  // 2. Create order
  await Order.create([orderData], { session });

  // 3. Record stock movement
  await StockMovement.create([movementData], { session });

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

#### **Why This Works**:

1. **Atomic Check-and-Set**: `$gte` check and `$inc` update happen atomically
2. **Transaction Rollback**: If any step fails, entire operation rolls back
3. **No Negative Stock**: Query fails if stock < quantity

#### **Alternative Considered: Pessimistic Locking**

```typescript
// Lock document for update
const product = await Product.findOne({ _id }).lock();
```

**Why Not Chosen**: MongoDB doesn't support row-level locks; transactions provide better performance.

---

## 4. Performance Optimization

### Database Indexing Strategy

```typescript
// Product Collection
ProductSchema.index({ tenantId: 1, category: 1 });
ProductSchema.index({ 'variants.sku': 1, tenantId: 1 }, { unique: true });
ProductSchema.index({ name: 'text', category: 'text' });  // Full-text search

// Order Collection
OrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, customerId: 1 });

// StockMovement Collection
StockMovementSchema.index({ tenantId: 1, productId: 1, timestamp: -1 });
```

#### **Index Selection Criteria**:

1. **Query Patterns**: Index fields used in `find()` and `sort()`
2. **Cardinality**: Prioritize high-cardinality fields (e.g., `sku`)
3. **Compound Indexes**: `tenantId` first (highest selectivity)
4. **Write Cost**: Avoid over-indexing (each index slows writes)

### Dashboard Analytics Optimization

**Challenge**: Load dashboard with 10,000+ products in <2 seconds

#### **Solution 1: Aggregation Pipeline**

```typescript
const lowStockItems = await Product.aggregate([
  { $match: { tenantId: new ObjectId(tenantId) } },
  { $unwind: '$variants' },
  { $match: { 
      $expr: { $lt: ['$variants.stock', '$variants.reorderLevel'] }
  }},
  { $limit: 50 }  // Only fetch top 50
]);
```

**Optimization**: Use `$limit` early to reduce pipeline processing.

#### **Solution 2: Materialized Views (Future)**

For complex analytics, pre-compute daily:
```typescript
// DailySummary collection
{
  tenantId: ObjectId,
  date: Date,
  totalInventoryValue: number,
  lowStockCount: number,
  topSellers: Array
}
```

#### **Solution 3: Redis Caching**

Cache frequently accessed data:
```typescript
const cacheKey = `dashboard:${tenantId}:${date}`;
let data = await redis.get(cacheKey);

if (!data) {
  data = await computeDashboard(tenantId);
  await redis.setex(cacheKey, 3600, JSON.stringify(data));
}
```

**Trade-off**: Stale data for 1 hour vs. real-time accuracy.

### Frontend Optimization

1. **React Query**: Automatic caching and background refetching
2. **Pagination**: Load 50 items at a time
3. **Debounced Search**: Wait 300ms before API call
4. **Optimistic Updates**: Update UI before server confirms

---

## 5. Scalability Considerations

### Current Architecture (MVP)

```
[Frontend] → [Express API] → [MongoDB] → [Socket.io]
```

### Scaling Strategy (Future)

#### **Horizontal Scaling**

```
                    [Load Balancer]
                    /      |      \
            [API-1]    [API-2]    [API-3]
                    \      |      /
                  [MongoDB Replica Set]
                  Primary + 2 Secondaries
```

**Implementation**:
1. **Stateless API**: JWT in headers (no session storage)
2. **MongoDB Replica Set**: Read from secondaries for analytics
3. **Redis Session Store**: Share Socket.io sessions across instances

#### **Database Sharding (10M+ products)**

Shard by `tenantId`:
```
Shard 1: tenantId 0000-3333
Shard 2: tenantId 3334-6666
Shard 3: tenantId 6667-9999
```

**Why tenantId**: Ensures all tenant data on one shard (no cross-shard queries).

#### **Microservices Migration**

```
[API Gateway]
    ├─ [Auth Service]
    ├─ [Inventory Service]
    ├─ [Order Service]
    └─ [Analytics Service]
```

**When to Migrate**: When team size > 10 developers or services need independent scaling.

---

## 6. Security Architecture

### Authentication Flow

```
1. User Login → [POST /api/auth/login]
2. Verify credentials (bcrypt)
3. Generate JWT with { userId, tenantId, role }
4. Client stores JWT in localStorage
5. All requests include: Authorization: Bearer <token>
```

### Authorization Layers

#### **1. Middleware-Level**

```typescript
// Protect all routes
router.use(protect);  // Verifies JWT, extracts tenantId

// Role-based access
router.post('/products', authorize(UserRole.OWNER, UserRole.MANAGER), createProduct);
```

#### **2. Query-Level**

```typescript
// ALWAYS filter by tenantId
const products = await Product.find({ tenantId: req.tenantId });
```

#### **3. Document-Level**

```typescript
// Verify ownership before update
const product = await Product.findOne({ _id, tenantId: req.tenantId });
if (!product) throw new Error('Not found');
```

### Data Isolation Guarantees

**Test Suite** (to be implemented):
```typescript
describe('Tenant Isolation', () => {
  it('should not allow cross-tenant data access', async () => {
    const tenant1Product = await createProduct(tenant1);
    const tenant2Token = generateToken(tenant2User);
    
    const res = await request(app)
      .get(`/api/products/${tenant1Product._id}`)
      .set('Authorization', `Bearer ${tenant2Token}`);
    
    expect(res.status).toBe(404);  // Not 200!
  });
});
```

---

## 7. Trade-offs and Future Improvements

### Current Limitations

| Limitation | Impact | Mitigation Plan |
|------------|--------|-----------------|
| **No Real-Time Sync** | Users must refresh to see updates | Implement Socket.io for stock changes |
| **Limited Reporting** | Basic analytics only | Add custom report builder |
| **No Audit Logs** | Can't track who changed what | Add `AuditLog` collection |
| **Single Region** | High latency for global users | Deploy to multiple AWS regions |
| **No Backup Strategy** | Risk of data loss | Implement automated daily backups |

### Technical Debt

1. **Error Handling**: Inconsistent error responses across controllers
   - **Fix**: Implement centralized error handler middleware

2. **Validation**: Mix of Zod and manual validation
   - **Fix**: Standardize on Zod schemas for all endpoints

3. **Testing**: No unit/integration tests
   - **Fix**: Achieve 80% code coverage with Jest

4. **TypeScript**: `any` types in several places
   - **Fix**: Enable `strict` mode, remove all `any`

### Future Enhancements

#### **Phase 2 (Next 3 months)**
- [ ] Barcode scanning (mobile app)
- [ ] Multi-warehouse support
- [ ] Advanced reporting (PDF exports)
- [ ] Email notifications for low stock
- [ ] API rate limiting

#### **Phase 3 (6-12 months)**
- [ ] AI-powered demand forecasting
- [ ] Integration with Shopify/WooCommerce
- [ ] Mobile apps (React Native)
- [ ] Multi-currency support
- [ ] Advanced role permissions (custom roles)

---

## Conclusion

This architecture balances **simplicity** (for rapid MVP development) with **scalability** (for future growth). The row-level multi-tenancy approach is cost-effective and maintainable for our current scale (100-1000 tenants), while the modular design allows migration to separate databases or microservices as needed.

**Key Strengths**:
✅ Strong data isolation through middleware  
✅ Atomic operations prevent race conditions  
✅ Optimized for MongoDB's strengths (embedded docs, aggregations)  
✅ Clear upgrade path to enterprise scale  

**Key Risks**:
⚠️ Requires discipline to always filter by `tenantId`  
⚠️ Performance degrades if one tenant has 10x more data  
⚠️ Limited customization per tenant  

**Recommendation**: This architecture is suitable for the next 12-18 months. Re-evaluate when:
- Single tenant exceeds 1M products
- Platform exceeds 10,000 tenants
- Compliance requires physical data separation
