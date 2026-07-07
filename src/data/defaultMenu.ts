/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MenuItem } from '../types';

export const DEFAULT_MENU: MenuItem[] = [
  {
    id: 'm1',
    serialNumber: 'SN-001',
    name: 'Wagyu Ribeye Steak',
    description: 'A5 Grade Japanese Wagyu ribeye, perfectly seared with gold-infused herb butter, served with truffle mash.',
    category: 'Main Course',
    price: 180,
    vat: 15,
    discount: 5,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    available: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm2',
    serialNumber: 'SN-002',
    name: 'Saffron Lobster Risotto',
    description: 'Slow-simmered Acquerello rice with Iranian saffron, fresh Maine lobster tail, and 24K gold leaf garnish.',
    category: 'Main Course',
    price: 145,
    vat: 15,
    discount: 10,
    image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=600&auto=format&fit=crop&q=80',
    available: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm3',
    serialNumber: 'SN-003',
    name: 'Truffle Caviar Arancini',
    description: 'Crisp golden risotto spheres filled with molten smoked mozzarella, shaved black winter truffle, and Beluga caviar.',
    category: 'Appetizers',
    price: 45,
    vat: 12,
    discount: 0,
    image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=600&auto=format&fit=crop&q=80',
    available: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm4',
    serialNumber: 'SN-004',
    name: 'Gilded Truffle Tagliatelle',
    description: 'Hand-rolled egg pasta tossed in a rich butter sauce with wild mountain mushrooms, freshly shaved black truffle, and micro-herbs.',
    category: 'Main Course',
    price: 85,
    vat: 15,
    discount: 0,
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80',
    available: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm5',
    serialNumber: 'SN-005',
    name: 'Royal Valrhona Chocolate Dome',
    description: 'Dark Valrhona chocolate shell, warm salted caramel pour-over, hazelnut praline core, and gold flake dust.',
    category: 'Desserts',
    price: 32,
    vat: 10,
    discount: 15,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    available: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm6',
    serialNumber: 'SN-006',
    name: 'Smoked Rosemary Old Fashioned',
    description: 'Premium reserve bourbon wood-smoked table-side with a torch of organic rosemary, organic bitters, and crystal ice block.',
    category: 'Beverages',
    price: 28,
    vat: 10,
    discount: 0,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=80',
    available: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm7',
    serialNumber: 'SN-007',
    name: 'Golden Calamari Fritto',
    description: 'Crisp hand-cut calamari tossed in edible gold dust and sea salt, accompanied by a saffron lemon aioli.',
    category: 'Appetizers',
    price: 38,
    vat: 12,
    discount: 5,
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&auto=format&fit=crop&q=80',
    available: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'm8',
    serialNumber: 'SN-008',
    name: 'Royal Hibiscus Nectar',
    description: 'Cold-pressed hibiscus flower essence, sparkling wild honey water, elderflower sprig, and silver shimmer mist.',
    category: 'Beverages',
    price: 18,
    vat: 10,
    discount: 0,
    image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80',
    available: true,
    createdAt: new Date().toISOString()
  }
];
