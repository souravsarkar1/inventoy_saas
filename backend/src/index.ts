import { httpServer } from './app.js';
import connectDB from './config/db.js';
import Tenant from './models/Tenant.js';
import { seedData } from './utils/seedData.js';

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
    // Auto-seed if empty
    const tenantCount = await Tenant.countDocuments();
    if (tenantCount === 0) {
        console.log('No tenants found, auto-seeding sample data...');
        await seedData();
    }

    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
