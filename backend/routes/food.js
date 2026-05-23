const express = require('express');
const router = express.Router();
const FoodListing = require('../models/FoodListing');
const User = require('../models/User');

// Haversine distance calculator in kilometers
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth Radius
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// GET Listings Route
router.get('/listings', async (req, res) => {
  try {
    const { category, search, restaurant_id, lat, lng, type } = req.query;
    
    let filter = {};
    filter.status = 'available'; // Only fetch items available for rescue
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (restaurant_id) {
      filter.restaurant_id = restaurant_id;
    }

    let listings = await FoodListing.find(filter).populate('restaurant_id');

    // Manual filtering for complex conditions (ensures compatibility with MockModel)
    if (type === 'donation') {
      listings = listings.filter(item => Number(item.price) === 0);
    } else if (type === 'paid') {
      listings = listings.filter(item => Number(item.price) > 0);
    }

    if (search) {
      const queryStr = search.toLowerCase();
      listings = listings.filter(item => 
        item.title.toLowerCase().includes(queryStr) || 
        (item.description && item.description.toLowerCase().includes(queryStr))
      );
    }

    // Geolocation Recommendations (proximity sorting)
    if (lat && lng) {
      const userLat = Number(lat);
      const userLng = Number(lng);
      
      listings = listings.map(item => {
        const rest = item.restaurant_id;
        let distance = 9999;
        
        // Extract restaurant coordinates (might be nested populated object or raw coordinates)
        if (rest && rest.location) {
          distance = getDistance(userLat, userLng, rest.location.lat, rest.location.lng);
        }
        
        // Convert to a plain object to append properties (important for mongoose documents)
        const itemObj = typeof item.toObject === 'function' ? item.toObject() : { ...item };
        return {
          ...itemObj,
          distance: Number(distance.toFixed(2))
        };
      });

      // Sort by closest distance first
      listings.sort((a, b) => a.distance - b.distance);
    }

    res.json(listings);
  } catch (err) {
    console.error('Error fetching food listings:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST Upload Route
router.post('/upload', async (req, res) => {
  try {
    const { title, description, restaurant_id, price, original_price, quantity, category, pickup_time, image } = req.body;
    
    if (!title || !restaurant_id || price === undefined || !original_price || !quantity || !pickup_time) {
      return res.status(400).json({ error: 'Missing required listing information' });
    }

    // CO2 calculation formula: Each meal saved prevents roughly 2.5 kg of CO2 emissions
    const co2_saved = Number((Number(quantity) * 2.5).toFixed(1));

    // Fallback default images per category
    let itemImage = image;
    if (!itemImage) {
      const categoryImages = {
        meals: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
        groceries: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
        beverages: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
        other: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80'
      };
      itemImage = categoryImages[category] || categoryImages.meals;
    }

    const newListing = await FoodListing.create({
      title,
      description: description || '',
      restaurant_id,
      price: Number(price),
      original_price: Number(original_price),
      quantity: Number(quantity),
      category: category || 'meals',
      pickup_time: new Date(pickup_time),
      co2_saved,
      status: 'available',
      image: itemImage
    });

    res.status(201).json(newListing);
  } catch (err) {
    console.error('Error uploading food listing:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
